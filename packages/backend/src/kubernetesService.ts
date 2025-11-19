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

export async function checkMetricsServer(kc: k8s.KubeConfig): Promise<boolean> {
  const appsV1Api = kc.makeApiClient(k8s.AppsV1Api);
  try {
    const res = await appsV1Api.readNamespacedDeployment('metrics-server', 'kube-system');
    return res.body.status?.readyReplicas !== undefined && res.body.status.readyReplicas > 0;
  } catch (error) {
    console.warn('Metrics server not found:', error);
    return false;
  }
}

export async function getClusterOverview(kc: k8s.KubeConfig) {
  const { coreV1Api, appsV1Api, metrics } = createK8sApis(kc);
  
  try {
    // Fetch all required data
    const [nodes, pods, namespaces, deployments, events] = await Promise.all([
      coreV1Api.listNode(),
      coreV1Api.listPodForAllNamespaces(),
      coreV1Api.listNamespace(),
      appsV1Api.listDeploymentForAllNamespaces(),
      coreV1Api.listEventForAllNamespaces().catch(() => ({ body: { items: [] } })),
    ]);

    // Try to get node metrics (may fail if metrics-server is not available)
    let nodeMetrics;
    try {
      nodeMetrics = await metrics.getNodeMetrics();
    } catch (error) {
      console.warn('Metrics server not available, using capacity as fallback');
      nodeMetrics = null;
    }

    // Helper function to parse CPU from Kubernetes format
    const parseCpu = (cpuStr: string): number => {
      if (!cpuStr) return 0;
      if (cpuStr.endsWith('m')) {
        return parseFloat(cpuStr.slice(0, -1)) / 1000; // Convert millicores to cores
      }
      if (cpuStr.endsWith('n')) {
        return parseFloat(cpuStr.slice(0, -1)) / 1000000000; // Convert nanocores to cores
      }
      return parseFloat(cpuStr);
    };

    // Helper function to parse memory from Kubernetes format to GB
    const parseMemory = (memStr: string): number => {
      if (!memStr) return 0;
      if (memStr.endsWith('Ki')) {
        return parseFloat(memStr.slice(0, -2)) / (1024 * 1024); // KB to GB
      }
      if (memStr.endsWith('Mi')) {
        return parseFloat(memStr.slice(0, -2)) / 1024; // MB to GB
      }
      if (memStr.endsWith('Gi')) {
        return parseFloat(memStr.slice(0, -2)); // Already in GB
      }
      return parseFloat(memStr) / (1024 * 1024 * 1024); // Bytes to GB
    };

    // Calculate node CPU and memory metrics
    let totalCpu = 0;
    let totalMemory = 0;
    let usedCpu = 0;
    let usedMemory = 0;
    let requestedCpu = 0;
    let requestedMemory = 0;
    let limitCpu = 0;
    let limitMemory = 0;

    // Get total capacity from nodes
    nodes.body.items.forEach(node => {
      if (node.status?.capacity) {
        totalCpu += parseCpu(node.status.capacity.cpu || '0');
        totalMemory += parseMemory(node.status.capacity.memory || '0');
      }
    });

    // Get actual usage from metrics if available
    if (nodeMetrics?.items) {
      nodeMetrics.items.forEach(metric => {
        if (metric.usage) {
          usedCpu += parseCpu(metric.usage.cpu || '0');
          usedMemory += parseMemory(metric.usage.memory || '0');
        }
      });
    } else {
      // Fallback: use allocatable as an estimate (typically ~90% of capacity)
      nodes.body.items.forEach(node => {
        if (node.status?.allocatable) {
          usedCpu += parseCpu(node.status.allocatable.cpu || '0') * 0.5; // Assume 50% usage
          usedMemory += parseMemory(node.status.allocatable.memory || '0') * 0.5;
        }
      });
    }

    // Calculate resource requests and limits from all pods
    pods.body.items.forEach(pod => {
      if (pod.spec?.containers) {
        pod.spec.containers.forEach(container => {
          if (container.resources?.requests) {
            requestedCpu += parseCpu(container.resources.requests.cpu || '0');
            requestedMemory += parseMemory(container.resources.requests.memory || '0');
          }
          if (container.resources?.limits) {
            limitCpu += parseCpu(container.resources.limits.cpu || '0');
            limitMemory += parseMemory(container.resources.limits.memory || '0');
          }
        });
      }
    });

    // Calculate pod capacity (max pods per node)
    const totalPodCapacity = nodes.body.items.reduce((sum, node) => {
      const podCapacity = parseInt(node.status?.capacity?.pods || '110');
      return sum + podCapacity;
    }, 0);

    // Count pods by status
    const runningPods = pods.body.items.filter(p => p.status?.phase === 'Running').length;
    const pendingPods = pods.body.items.filter(p => p.status?.phase === 'Pending').length;
    const failedPods = pods.body.items.filter(p => p.status?.phase === 'Failed').length;

    // Count deployment availability
    const totalDeployments = deployments.body.items.length;
    const availableDeployments = deployments.body.items.filter(d => 
      (d.status?.readyReplicas || 0) === (d.spec?.replicas || 0) && 
      (d.spec?.replicas || 0) > 0
    ).length;

    // Analyze events for warnings and errors (last 1 hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    let warnings = 0;
    let errors = 0;
    
    events.body.items.forEach(event => {
      const eventTime = event.lastTimestamp || event.eventTime || event.metadata?.creationTimestamp;
      if (eventTime && new Date(eventTime) > oneHourAgo) {
        if (event.type === 'Warning') warnings++;
        if (event.type === 'Error' || event.reason === 'Failed' || event.reason === 'FailedScheduling') errors++;
      }
    });

    // Try to get storage information from PVs
    let storageUsed = 0;
    let storageTotal = 0;
    try {
      const pvs = await coreV1Api.listPersistentVolume();
      pvs.body.items.forEach(pv => {
        if (pv.spec?.capacity?.storage) {
          const storage = parseMemory(pv.spec.capacity.storage);
          storageTotal += storage;
          // If bound, consider it used
          if (pv.status?.phase === 'Bound') {
            storageUsed += storage;
          }
        }
      });
    } catch (error) {
      console.warn('Could not fetch storage info:', error);
    }

    return {
      nodes: {
        total: nodes.body.items.length,
        ready: nodes.body.items.filter(n => 
          n.status?.conditions?.some(c => c.type === 'Ready' && c.status === 'True')
        ).length,
        cpu: {
          used: Math.round(usedCpu * 100) / 100,
          total: Math.round(totalCpu * 100) / 100,
          requests: Math.round(requestedCpu * 100) / 100,
          limits: Math.round(limitCpu * 100) / 100,
        },
        memory: {
          used: Math.round(usedMemory * 100) / 100,
          total: Math.round(totalMemory * 100) / 100,
          requests: Math.round(requestedMemory * 100) / 100,
          limits: Math.round(limitMemory * 100) / 100,
        },
      },
      pods: {
        total: pods.body.items.length,
        running: runningPods,
        pending: pendingPods,
        failed: failedPods,
        capacity: totalPodCapacity,
      },
      namespaces: {
        total: namespaces.body.items.length,
      },
      deployments: {
        total: totalDeployments,
        available: availableDeployments,
      },
      events: {
        warnings,
        errors,
      },
      // Only include storage if we have data
      ...(storageTotal > 0 && {
        storage: {
          used: Math.round(storageUsed * 100) / 100,
          total: Math.round(storageTotal * 100) / 100,
        },
      }),
    };
  } catch (error) {
    console.error('Error fetching cluster overview:', error);
    throw error;
  }
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

    // Parse CPU and memory from strings like "100m" and "256Mi"
    const parseCpu = (cpuStr: string) => {
      if (cpuStr.endsWith('m')) {
        return parseFloat(cpuStr.slice(0, -1));
      }
      return parseFloat(cpuStr) * 1000;
    };

    const parseMem = (memStr: string) => {
      if (memStr.endsWith('Ki')) {
        return parseFloat(memStr.slice(0, -2)) * 1024;
      }
      if (memStr.endsWith('Mi')) {
        return parseFloat(memStr.slice(0, -2)) * 1024 * 1024;
      }
      if (memStr.endsWith('Gi')) {
        return parseFloat(memStr.slice(0, -2)) * 1024 * 1024 * 1024;
      }
      return parseFloat(memStr);
    };

    const cpu = nsPodMetrics.reduce((acc, m) => {
      if (m.containers[0]?.usage?.cpu) {
        return acc + parseCpu(m.containers[0].usage.cpu);
      }
      return acc;
    }, 0);

    const memory = nsPodMetrics.reduce((acc, m) => {
      if (m.containers[0]?.usage?.memory) {
        return acc + parseMem(m.containers[0].usage.memory);
      }
      return acc;
    }, 0);

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
    const firstBlock = msg.content[0];
    if (firstBlock && 'text' in firstBlock) {
      return firstBlock.text;
    }
    return 'No response from Anthropic.';
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
