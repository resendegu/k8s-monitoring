import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from './ui';
import { 
  Server, 
  Cpu, 
  MemoryStick, 
  Box as BoxIcon,
  Sparkles,
  X,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import axios from 'axios';
import { formatCPU, formatMemory, getCPUPercentage, getMemoryPercentage } from '../helpers';

type Node = {
  name: string;
  roles: string;
  version: string;
  cpuUsage: string;
  memoryUsage: string;
  pods: number;
  podCapacity?: number;
  cpuCapacity?: string;
  memoryCapacity?: string;
};

// Mock data based on the provided cluster profile
const mockData: Node[] = [
  { name: 'node-1', roles: 'worker', version: 'v1.34.1', cpuUsage: '120000000n', memoryUsage: '2457600Ki', pods: 8, podCapacity: 110, cpuCapacity: '2000000000n', memoryCapacity: '4096000Ki' },
  { name: 'node-2', roles: 'worker', version: 'v1.34.1', cpuUsage: '80000000n', memoryUsage: '2252800Ki', pods: 10, podCapacity: 110, cpuCapacity: '2000000000n', memoryCapacity: '4096000Ki' },
  { name: 'node-3', roles: 'worker', version: 'v1.34.1', cpuUsage: '50000000n', memoryUsage: '1966080Ki', pods: 5, podCapacity: 110, cpuCapacity: '2000000000n', memoryCapacity: '4096000Ki' },
  { name: 'node-4', roles: 'worker', version: 'v1.34.1', cpuUsage: '20000000n', memoryUsage: '1597440Ki', pods: 2, podCapacity: 110, cpuCapacity: '2000000000n', memoryCapacity: '4096000Ki' },
];

const fetchNodesData = async (): Promise<Node[]> => {
  const { data } = await axios.get('/api/nodes');
  return data;
};

// Generate mock AI insights for nodes
function generateNodeAIInsights(nodes: Node[]): string {
  const insights = [];
  
  insights.push('**📊 Node Analysis**\n');
  insights.push(`You have ${nodes.length} worker nodes in your cluster.`);
  
  // Calculate average CPU and memory usage (as percentage if capacity is available)
  let totalCpuPercent = 0;
  let totalMemPercent = 0;
  let nodesWithMetrics = 0;
  
  nodes.forEach(node => {
    if (node.cpuUsage !== 'N/A' && node.memoryUsage !== 'N/A') {
      // Extract numeric values for rough estimation
      const cpuUsageStr = node.cpuUsage.replace(/[nm]/g, '');
      const memUsageStr = node.memoryUsage.replace(/[KiMG]/g, '');
      
      if (!isNaN(parseFloat(cpuUsageStr)) && !isNaN(parseFloat(memUsageStr))) {
        nodesWithMetrics++;
        // Rough estimation - actual percentages would require capacity
        totalCpuPercent += parseFloat(cpuUsageStr) / 100000000; // Approximate
        totalMemPercent += parseFloat(memUsageStr) / 20000; // Approximate
      }
    }
  });
  
  if (nodesWithMetrics > 0) {
    const avgCpu = totalCpuPercent / nodesWithMetrics;
    const avgMem = totalMemPercent / nodesWithMetrics;
    
    insights.push(`\n**🔵 Average CPU Usage: ~${avgCpu.toFixed(1)}%**`);
    if (avgCpu < 30) {
      insights.push('CPU utilization is low across all nodes. Consider optimizing resource allocation.');
    } else if (avgCpu < 70) {
      insights.push('CPU utilization is healthy across nodes.');
    } else {
      insights.push('CPU utilization is high. Consider adding more nodes or optimizing workloads.');
    }
    
    insights.push(`\n**🟣 Average Memory Usage: ~${avgMem.toFixed(1)}%**`);
    if (avgMem < 50) {
      insights.push('Memory utilization is healthy across nodes.');
    } else if (avgMem < 80) {
      insights.push('Memory usage is moderate. Monitor for memory-intensive workloads.');
    } else {
      insights.push('Memory usage is high. Consider adding more nodes or optimizing memory usage.');
    }
  }
  
  insights.push('\n**💡 Recommendations:**');
  insights.push('• All nodes are running the same Kubernetes version - good for consistency');
  insights.push('• Consider implementing pod anti-affinity rules for better workload distribution');
  insights.push('• Monitor node resource trends to predict when to scale the cluster');
  
  return insights.join('\n');
}

export default function Nodes({ isConnected }: { isConnected: boolean }) {
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiInsights, setAiInsights] = useState<string>('');

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['nodesData'],
    queryFn: fetchNodesData,
    enabled: isConnected,
    refetchInterval: 10000,
    initialData: isConnected ? undefined : mockData,
  });

  const displayData = isConnected ? data : mockData;

  const analyzeNodes = async () => {
    setShowAIDialog(true);
    setAiAnalyzing(true);
    setAiInsights('Analyzing node metrics with AI...');
    
    setTimeout(() => {
      if (displayData) {
        const insights = generateNodeAIInsights(displayData);
        setAiInsights(insights);
      }
      setAiAnalyzing(false);
    }, 2000);
  };

  if (isLoading && isConnected) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (isError && isConnected) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
        Error fetching nodes data: {(error as Error).message}
      </div>
    );
  }

  if (!displayData) {
    return <div className="text-gray-400">No data available.</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header with AI Button */}
      <div className="flex items-center justify-between fade-in">
        <div className="flex items-center gap-2">
          <Server size={18} className="text-blue-400 animate-pulse" />
          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
            Cluster Nodes
          </h2>
        </div>
        
        <button
          onClick={analyzeNodes}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-lg font-medium transition-all shadow-lg hover:shadow-xl hover:shadow-purple-500/50 hover:scale-105 animate-gradient group"
        >
          <Sparkles size={18} className="group-hover:rotate-12 transition-transform" />
          <span>AI Analysis</span>
        </button>
      </div>

      {/* AI Analysis Dialog */}
      {showAIDialog && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 fade-in"
          onClick={() => !aiAnalyzing && setShowAIDialog(false)}
        >
          <div 
            className="bg-gray-900 border border-gray-700 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-auto shadow-2xl scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 glass border-b border-gray-700 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-lg ${aiAnalyzing ? 'ai-thinking animate-gradient' : ''}`}>
                  <Sparkles className="text-white" size={20} />
                </div>
                <h3 className="text-xl font-bold text-gray-100">AI Node Analysis</h3>
              </div>
              {!aiAnalyzing && (
                <button
                  onClick={() => setShowAIDialog(false)}
                  className="text-gray-400 hover:text-gray-100 transition-colors hover:rotate-90 duration-300"
                >
                  <X size={20} />
                </button>
              )}
            </div>
            
            <div className="p-6">
              {aiAnalyzing ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="relative">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-20 blur-xl animate-pulse"></div>
                  </div>
                  <p className="text-gray-400 ai-thinking">Analyzing node metrics...</p>
                </div>
              ) : (
                <div className="prose prose-invert max-w-none fade-in">
                  <div className="whitespace-pre-wrap text-gray-300 text-sm leading-relaxed">
                    {aiInsights}
                  </div>
                </div>
              )}
            </div>
            
            {!aiAnalyzing && (
              <div className="sticky bottom-0 glass border-t border-gray-700 p-4 flex justify-end gap-3">
                <button
                  onClick={() => setShowAIDialog(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-100 rounded-lg transition-all hover:scale-105"
                >
                  Close
                </button>
                <button
                  onClick={analyzeNodes}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-lg transition-all hover:scale-105 animate-gradient"
                >
                  <Sparkles size={16} />
                  Re-analyze
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Nodes Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {displayData.map((node, index) => {
          // Format values for display using helpers
          const cpuDisplay = formatCPU(node.cpuUsage);
          const memDisplay = formatMemory(node.memoryUsage);

          const cpuCapacityDisplay = node.cpuCapacity ? formatCPU(node.cpuCapacity) : 'N/A';
          const memCapacityDisplay = node.memoryCapacity ? formatMemory(node.memoryCapacity) : 'N/A';
          
          // Calculate percentages using helper functions
          let cpuPercent = 0;
          let memPercent = 0;
          
          if (node.cpuCapacity && node.memoryCapacity) {
            // Use helper functions to calculate accurate percentages
            // For CPU: convert capacity to cores (nanocores / 1 billion)
            const cpuCapacityInCores = parseFloat(node.cpuCapacity.replace(/n$/i, '')) / 1_000_000_000;
            cpuPercent = getCPUPercentage(node.cpuUsage, cpuCapacityInCores);
            
            // For memory: use the helper that handles Ki/Mi/Gi conversions
            memPercent = getMemoryPercentage(node.memoryUsage, node.memoryCapacity);
          } else {
            // Fallback: estimate with assumed 2 cores and 4GB capacity
            cpuPercent = getCPUPercentage(node.cpuUsage, 2);
            memPercent = getMemoryPercentage(node.memoryUsage, '4Gi');
          }
          
          const isHealthy = cpuPercent < 70 && memPercent < 70;
          
          return (
            <Card 
              key={node.name} 
              className="hover:border-blue-500/30 transition-all group scale-in" 
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition-colors">
                      <Server className="text-blue-400 group-hover:scale-110 transition-transform" size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-100">{node.name}</h3>
                      <p className="text-xs text-gray-400">{node.roles} • {node.version}</p>
                    </div>
                  </div>
                  {isHealthy ? (
                    <CheckCircle className="text-green-400 group-hover:scale-110 transition-transform" size={20} />
                  ) : (
                    <AlertCircle className="text-yellow-400 group-hover:scale-110 transition-transform animate-pulse" size={20} />
                  )}
                </div>

                {/* CPU Usage */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Cpu size={14} className="text-blue-400" />
                      <span className="text-xs font-medium text-gray-300">CPU</span>
                    </div>
                    <span className="text-xs text-gray-400">{cpuDisplay} / {cpuCapacityDisplay}</span>
                  </div>
                  <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden relative">
                    <div 
                      className={`h-full transition-all duration-700 ease-out relative ${
                        cpuPercent > 70 ? 'bg-gradient-to-r from-red-500 to-orange-500 animate-gradient' : 'bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-500 animate-gradient'
                      }`}
                      style={{ width: `${Math.min(cpuPercent, 100)}%` }}
                    >
                      <div className="absolute inset-0 shimmer"></div>
                    </div>
                  </div>
                </div>

                {/* Memory Usage */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <MemoryStick size={14} className="text-purple-400" />
                      <span className="text-xs font-medium text-gray-300">Memory</span>
                    </div>
                    <span className="text-xs text-gray-400">{memDisplay} / {memCapacityDisplay}</span>
                  </div>
                  <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden relative">
                    <div 
                      className={`h-full transition-all duration-700 ease-out relative ${
                        memPercent > 70 ? 'bg-gradient-to-r from-red-500 to-orange-500 animate-gradient' : 'bg-gradient-to-r from-purple-500 via-pink-400 to-purple-500 animate-gradient'
                      }`}
                      style={{ width: `${Math.min(memPercent, 100)}%` }}
                    >
                      <div className="absolute inset-0 shimmer"></div>
                    </div>
                  </div>
                </div>

                {/* Pods */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-700/50 group-hover:border-gray-600/50 transition-colors">
                  <div className="flex items-center gap-2">
                    <BoxIcon size={14} className="text-cyan-400" />
                    <span className="text-xs text-gray-400">Pods</span>
                  </div>
                  <span className="text-sm font-bold text-gray-100">
                    {node.pods}{node.podCapacity ? `/${node.podCapacity}` : ''}
                  </span>
                </div>
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-xl pointer-events-none" />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
