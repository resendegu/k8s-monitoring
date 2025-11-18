import * as k8s from '@kubernetes/client-node';
import axios from 'axios';
import { OpenAI } from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Helper function to create API clients from a KubeConfig object
const createK8sApis = (kc: k8s.KubeConfig) => {
  return {
    coreV1Api: kc.makeApiClient(k8s.CoreV1Api),
    appsV1Api: kc.makeApiClient(k8s.AppsV1Api),
    metrics: new k8s.Metrics(kc),
  };
};

export async function connectToCluster(kubeconfig: string): Promise<k8s.CoreV1Api> {
  const kc = new k8s.KubeConfig();
  kc.loadFromString(kubeconfig);
  const { coreV1Api } = createK8sApis(kc);
  await coreV1Api.listNamespacedPod('default'); // Test connection
  return coreV1Api;
}

export async function checkMetricsServer(k8sApi: k8s.CoreV1Api): Promise<boolean> {
  const appsV1Api = k8sApi.kubeConfig.makeApiClient(k8s.AppsV1Api);
  try {
    const res = await appsV1Api.readNamespacedDeployment('metrics-server', 'kube-system');
    return res.body.status?.readyReplicas !== undefined && res.body.status.readyReplicas > 0;
  } catch (error) {
    console.warn('Metrics server not found:', error);
    return false;
  }
}

export async function getClusterOverview(kc: k8s.KubeConfig) {
  const { coreV1Api } = createK8sApis(kc);
  const [nodes, pods, namespaces] = await Promise.all([
    coreV1Api.listNode(),
    coreV1Api.listPodForAllNamespaces(),
    coreV1Api.listNamespace(),
  ]);

  return {
    nodes: {
      total: nodes.body.items.length,
      ready: nodes.body.items.filter(n => n.status?.conditions?.some(c => c.type === 'Ready' && c.status === 'True')).length,
    },
    pods: {
      total: pods.body.items.length,
      running: pods.body.items.filter(p => p.status?.phase === 'Running').length,
    },
    namespaces: {
      total: namespaces.body.items.length,
    },
  };
}

export async function getNodes(kc: k8s.KubeConfig) {
  const { coreV1Api, metrics } = createK8sApis(kc);
  const [nodes, nodeMetrics, pods] = await Promise.all([
    coreV1Api.listNode(),
    metrics.getNodeMetrics(),
    coreV1Api.listPodForAllNamespaces(),
  ]);

  return nodes.body.items.map(node => {
    const metricsData = nodeMetrics.items.find(m => m.metadata.name === node.metadata?.name);
    return {
      name: node.metadata?.name,
      roles: Object.keys(node.metadata?.labels || {}).find(l => l.startsWith('node-role.kubernetes.io/'))?.split('/')[1] || 'worker',
      version: node.status?.nodeInfo?.kubeletVersion,
      cpuUsage: metricsData?.usage.cpu || 'N/A',
      memoryUsage: metricsData?.usage.memory || 'N/A',
      pods: pods.body.items.filter(p => p.spec?.nodeName === node.metadata?.name).length,
    };
  });
}

export async function getWorkloads(kc: k8s.KubeConfig) {
  const { appsV1Api } = createK8sApis(kc);
  const [deployments, statefulsets] = await Promise.all([
    appsV1Api.listDeploymentForAllNamespaces(),
    appsV1Api.listStatefulSetForAllNamespaces(),
  ]);

  return {
    deployments: deployments.body.items.map(d => ({
      namespace: d.metadata?.namespace,
      name: d.metadata?.name,
      ready: `${d.status?.readyReplicas || 0}/${d.spec?.replicas}`,
      image: d.spec?.template.spec?.containers[0]?.image,
      age: d.metadata?.creationTimestamp?.toLocaleString(),
      status: (d.status?.readyReplicas || 0) === d.spec?.replicas ? 'Healthy' : 'Unhealthy',
    })),
    statefulsets: statefulsets.body.items.map(s => ({
      namespace: s.metadata?.namespace,
      name: s.metadata?.name,
      ready: `${s.status?.readyReplicas || 0}/${s.spec?.replicas}`,
      image: s.spec?.template.spec?.containers[0]?.image,
      age: s.metadata?.creationTimestamp?.toLocaleString(),
      status: (s.status?.readyReplicas || 0) === s.spec?.replicas ? 'Healthy' : 'Unhealthy',
    })),
  };
}

export async function getNamespaces(kc: k8s.KubeConfig) {
  const { coreV1Api, appsV1Api, metrics } = createK8sApis(kc);
  const [namespaces, pods, deployments, statefulsets, podMetrics] = await Promise.all([
    coreV1Api.listNamespace(),
    coreV1Api.listPodForAllNamespaces(),
    appsV1Api.listDeploymentForAllNamespaces(),
    appsV1Api.listStatefulSetForAllNamespaces(),
    metrics.getPodMetrics(),
  ]);

  return namespaces.body.items.map(ns => {
    const nsName = ns.metadata?.name;
    const nsPods = pods.body.items.filter(p => p.metadata?.namespace === nsName);
    const nsPodMetrics = podMetrics.items.filter(m => m.metadata.namespace === nsName);

    const cpu = nsPodMetrics.reduce((acc, m) => acc + k8s.cpus(m.containers[0].usage.cpu), 0);
    const memory = nsPodMetrics.reduce((acc, m) => acc + k8s.mem(m.containers[0].usage.memory), 0);

    return {
      name: nsName,
      status: ns.status?.phase,
      pods: nsPods.length,
      deployments: deployments.body.items.filter(d => d.metadata?.namespace === nsName).length,
      statefulsets: statefulsets.body.items.filter(s => s.metadata?.namespace === nsName).length,
      cpu: `${cpu.toFixed(2)}m`,
      memory: `${(memory / 1024 / 1024).toFixed(2)}Mi`,
    };
  });
}

export async function analyzeCluster(kc: k8s.KubeConfig, apiKey: string, provider: string, question: string): Promise<string> {
  const clusterData = await getClusterOverview(kc);
  const prompt = `
    Based on the following Kubernetes cluster data, answer the user's question.
    User Question: "${question}"
    Cluster Data: ${JSON.stringify(clusterData, null, 2)}
  `;

  if (provider === 'OpenAI') {
    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      messages: [{ role: "system", content: prompt }],
      model: "gpt-3.5-turbo",
    });
    return completion.choices[0].message.content || 'No response from OpenAI.';
  } else if (provider === 'Anthropic') {
    const anthropic = new Anthropic({ apiKey });
    const msg = await anthropic.messages.create({
      model: "claude-2.1",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });
    return msg.content[0].text;
  } else if (provider === 'Gemini') {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-pro"});
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } else {
    return 'Invalid AI provider selected.';
  }
}

export async function executeCommand(kc: k8s.KubeConfig, command: string): Promise<string> {
  const { coreV1Api, appsV1Api } = createK8sApis(kc);
  const parts = command.split(' ').filter(p => p);

  if (parts[0] !== 'kubectl') {
    throw new Error('Invalid command. Only kubectl commands are allowed.');
  }

  const [_, verb, resource, name, ...options] = parts;
  let namespace = 'default';
  const nsIndex = options.indexOf('-n');
  if (nsIndex > -1 && options[nsIndex + 1]) {
    namespace = options[nsIndex + 1];
  }

  const resourceMap: { [key: string]: string } = {
    pod: 'pods',
    pods: 'pods',
    node: 'nodes',
    nodes: 'nodes',
    deployment: 'deployments',
    deployments: 'deployments',
    statefulset: 'statefulsets',
    statefulsets: 'statefulsets',
    namespace: 'namespaces',
    namespaces: 'namespaces',
  };
  const standardizedResource = resourceMap[resource];

  const getActions = {
    pods: () => coreV1Api.listNamespacedPod(namespace),
    nodes: () => coreV1Api.listNode(),
    deployments: () => appsV1Api.listNamespacedDeployment(namespace),
    statefulsets: () => appsV1Api.listNamespacedStatefulSet(namespace),
    namespaces: () => coreV1Api.listNamespace(),
  };

  const describeActions = {
    pods: () => coreV1Api.readNamespacedPod(name, namespace),
    nodes: () => coreV1Api.readNode(name),
    deployments: () => appsV1Api.readNamespacedDeployment(name, namespace),
    statefulsets: () => appsV1Api.readNamespacedStatefulSet(name, namespace),
    namespaces: () => coreV1Api.readNamespace(name),
  };

  try {
    let response;
    if (verb === 'get') {
      // @ts-ignore
      response = await getActions[standardizedResource]();
    } else if (verb === 'describe' && name) {
      // @ts-ignore
      response = await describeActions[standardizedResource]();
    } else {
      throw new Error(`Command not allowed or implemented: ${command}`);
    }
    return JSON.stringify(response.body, null, 2);
  } catch (error: any) {
    throw new Error(`Failed to execute command: ${error.message}`);
  }
}
