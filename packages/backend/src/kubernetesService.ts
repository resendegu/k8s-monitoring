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
      console.warn('Metrics server not available');
      nodeMetrics = null;
    }

    // Helper to convert CPU to nanocores
    const toNanocores = (cpuStr: string): number => {
      if (!cpuStr) return 0;
      if (cpuStr.endsWith('m')) {
        return parseFloat(cpuStr.slice(0, -1)) * 1000000; // millicores to nanocores
      }
      if (cpuStr.endsWith('n')) {
        return parseFloat(cpuStr.slice(0, -1)); // already nanocores
      }
      return parseFloat(cpuStr) * 1000000000; // cores to nanocores
    };

    // Helper to convert memory to Ki
    const toKibibytes = (memStr: string): number => {
      if (!memStr) return 0;
      if (memStr.endsWith('Ki')) {
        return parseFloat(memStr.slice(0, -2));
      }
      if (memStr.endsWith('Mi')) {
        return parseFloat(memStr.slice(0, -2)) * 1024;
      }
      if (memStr.endsWith('Gi')) {
        return parseFloat(memStr.slice(0, -2)) * 1024 * 1024;
      }
      if (memStr.endsWith('Ti')) {
        return parseFloat(memStr.slice(0, -2)) * 1024 * 1024 * 1024;
      }
      // Assume bytes
      return parseFloat(memStr) / 1024;
    };

    // Aggregate node resources
    let totalCpuNanocores = 0;
    let totalMemoryKi = 0;
    let usedCpuNanocores = 0;
    let usedMemoryKi = 0;
    let requestedCpuNanocores = 0;
    let requestedMemoryKi = 0;
    let limitCpuNanocores = 0;
    let limitMemoryKi = 0;

    // Get total capacity from nodes
    nodes.body.items.forEach(node => {
      if (node.status?.capacity) {
        totalCpuNanocores += toNanocores(node.status.capacity.cpu || '0');
        totalMemoryKi += toKibibytes(node.status.capacity.memory || '0');
      }
    });

    // Get actual usage from metrics if available
    if (nodeMetrics?.items) {
      nodeMetrics.items.forEach(metric => {
        if (metric.usage) {
          usedCpuNanocores += toNanocores(metric.usage.cpu || '0');
          usedMemoryKi += toKibibytes(metric.usage.memory || '0');
        }
      });
    }

    // Calculate resource requests and limits from all pods
    pods.body.items.forEach(pod => {
      if (pod.spec?.containers) {
        pod.spec.containers.forEach(container => {
          if (container.resources?.requests) {
            requestedCpuNanocores += toNanocores(container.resources.requests.cpu || '0');
            requestedMemoryKi += toKibibytes(container.resources.requests.memory || '0');
          }
          if (container.resources?.limits) {
            limitCpuNanocores += toNanocores(container.resources.limits.cpu || '0');
            limitMemoryKi += toKibibytes(container.resources.limits.memory || '0');
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

    // Try to get storage information from PVs (capacity only, not actual usage)
    let storageTotalKi = 0;
    let storageBoundKi = 0;
    let pvCount = 0;
    try {
      const pvs = await coreV1Api.listPersistentVolume();
      pvCount = pvs.body.items.length;
      pvs.body.items.forEach(pv => {
        if (pv.spec?.capacity?.storage) {
          const capacityKi = toKibibytes(pv.spec.capacity.storage);
          storageTotalKi += capacityKi;
          // If bound, count as "used" (though we don't know actual disk usage)
          if (pv.status?.phase === 'Bound') {
            storageBoundKi += capacityKi;
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
          used: usedCpuNanocores > 0 ? `${Math.round(usedCpuNanocores)}n` : null,
          total: `${Math.round(totalCpuNanocores)}n`,
          requests: `${Math.round(requestedCpuNanocores)}n`,
          limits: `${Math.round(limitCpuNanocores)}n`,
        },
        memory: {
          used: usedMemoryKi > 0 ? `${Math.round(usedMemoryKi)}Ki` : null,
          total: `${Math.round(totalMemoryKi)}Ki`,
          requests: `${Math.round(requestedMemoryKi)}Ki`,
          limits: `${Math.round(limitMemoryKi)}Ki`,
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
      // Include storage info if available
      ...(pvCount > 0 && {
        storage: {
          // Note: This is capacity, not actual disk usage (not available from K8s API)
          totalCapacity: `${Math.round(storageTotalKi)}Ki`,
          boundCapacity: `${Math.round(storageBoundKi)}Ki`, // Capacity of bound PVs
          volumeCount: pvCount,
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
    const nodePods = pods.body.items.filter(p => p.spec?.nodeName === node.metadata?.name);
    const podCapacity = node.status?.capacity?.pods ? parseInt(node.status.capacity.pods) : undefined;
    
    return {
      name: node.metadata?.name,
      roles: Object.keys(node.metadata?.labels || {}).find(l => l.startsWith('node-role.kubernetes.io/'))?.split('/')[1] || 'worker',
      version: node.status?.nodeInfo?.kubeletVersion,
      cpuUsage: metricsData?.usage.cpu || 'N/A',
      memoryUsage: metricsData?.usage.memory || 'N/A',
      cpuCapacity: node.status?.capacity?.cpu ? `${parseFloat(node.status.capacity.cpu) * 1000000000}n` : undefined,
      memoryCapacity: node.status?.capacity?.memory || undefined,
      pods: nodePods.length,
      podCapacity: podCapacity,
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
    const nsDeployments = deployments.body.items.filter(d => d.metadata?.namespace === nsName);
    const nsStatefulSets = statefulsets.body.items.filter(s => s.metadata?.namespace === nsName);
    const nsPodMetrics = podMetrics.items.filter(m => m.metadata.namespace === nsName);

    // Aggregate CPU and memory usage from all containers in all pods
    let totalCpuUsage = '0n';
    let totalMemoryUsage = '0Ki';
    
    if (nsPodMetrics.length > 0) {
      // Sum up all container metrics
      let cpuNanocores = 0;
      let memoryKibibytes = 0;
      
      nsPodMetrics.forEach(podMetric => {
        podMetric.containers.forEach(container => {
          if (container.usage?.cpu) {
            // Convert to nanocores
            const cpuStr = container.usage.cpu;
            if (cpuStr.endsWith('n')) {
              cpuNanocores += parseFloat(cpuStr.slice(0, -1));
            } else if (cpuStr.endsWith('m')) {
              cpuNanocores += parseFloat(cpuStr.slice(0, -1)) * 1000000; // millicores to nanocores
            } else {
              cpuNanocores += parseFloat(cpuStr) * 1000000000; // cores to nanocores
            }
          }
          
          if (container.usage?.memory) {
            // Convert to Ki
            const memStr = container.usage.memory;
            if (memStr.endsWith('Ki')) {
              memoryKibibytes += parseFloat(memStr.slice(0, -2));
            } else if (memStr.endsWith('Mi')) {
              memoryKibibytes += parseFloat(memStr.slice(0, -2)) * 1024;
            } else if (memStr.endsWith('Gi')) {
              memoryKibibytes += parseFloat(memStr.slice(0, -2)) * 1024 * 1024;
            }
          }
        });
      });
      
      totalCpuUsage = `${Math.round(cpuNanocores)}n`;
      totalMemoryUsage = `${Math.round(memoryKibibytes)}Ki`;
    }

    return {
      name: nsName,
      status: ns.status?.phase,
      pods: nsPods.length,
      deployments: nsDeployments.length,
      statefulsets: nsStatefulSets.length,
      cpuUsage: totalCpuUsage,
      memoryUsage: totalMemoryUsage,
    };
  });
}

/**
 * Get detailed storage information (PersistentVolumes and PersistentVolumeClaims)
 * 
 * IMPORTANT: Kubernetes API does NOT provide actual disk usage information.
 * What we can get:
 * - PV/PVC capacity (size allocated)
 * - Status (Bound, Available, Pending, etc.)
 * - StorageClass, AccessModes
 * 
 * What we CANNOT get:
 * - Actual bytes used on disk
 * - Free space on the volume
 * - Real-time usage metrics
 * 
 * To get actual disk usage, you would need:
 * 1. Node exporter with filesystem metrics (Prometheus)
 * 2. CSI driver metrics (if supported by your storage provider)
 * 3. Custom monitoring solution running in pods
 * 4. Access to the underlying storage system's API
 */
export async function getStorage(kc: k8s.KubeConfig) {
  const { coreV1Api } = createK8sApis(kc);
  
  try {
    const [pvs, pvcs] = await Promise.all([
      coreV1Api.listPersistentVolume(),
      coreV1Api.listPersistentVolumeClaimForAllNamespaces(),
    ]);

    // Map PersistentVolumes
    const persistentVolumes = pvs.body.items.map(pv => {
      const claimRef = pv.spec?.claimRef;
      const claim = claimRef ? `${claimRef.namespace}/${claimRef.name}` : null;
      
      return {
        name: pv.metadata?.name,
        capacity: pv.spec?.capacity?.storage || 'Unknown',
        storageClass: pv.spec?.storageClassName || 'default',
        status: pv.status?.phase || 'Unknown',
        claim: claim,
        reclaimPolicy: pv.spec?.persistentVolumeReclaimPolicy || 'Unknown',
        accessModes: pv.spec?.accessModes || [],
        volumeMode: pv.spec?.volumeMode || 'Filesystem',
        createdAt: pv.metadata?.creationTimestamp,
      };
    });

    // Map PersistentVolumeClaims
    const persistentVolumeClaims = pvcs.body.items.map(pvc => {
      return {
        name: pvc.metadata?.name,
        namespace: pvc.metadata?.namespace,
        status: pvc.status?.phase || 'Unknown',
        volume: pvc.spec?.volumeName || 'Pending',
        capacity: pvc.status?.capacity?.storage || pvc.spec?.resources?.requests?.storage || 'Unknown',
        storageClass: pvc.spec?.storageClassName || 'default',
        accessModes: pvc.spec?.accessModes || [],
        volumeMode: pvc.spec?.volumeMode || 'Filesystem',
        createdAt: pvc.metadata?.creationTimestamp,
      };
    });

    return {
      persistentVolumes,
      persistentVolumeClaims,
      summary: {
        totalPVs: persistentVolumes.length,
        boundPVs: persistentVolumes.filter(pv => pv.status === 'Bound').length,
        availablePVs: persistentVolumes.filter(pv => pv.status === 'Available').length,
        totalPVCs: persistentVolumeClaims.length,
        boundPVCs: persistentVolumeClaims.filter(pvc => pvc.status === 'Bound').length,
        pendingPVCs: persistentVolumeClaims.filter(pvc => pvc.status === 'Pending').length,
      },
    };
  } catch (error) {
    console.error('Error fetching storage info:', error);
    throw error;
  }
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
