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

type Node = {
  name: string;
  roles: string;
  version: string;
  cpuUsage: string;
  memoryUsage: string;
  pods: number;
};

// Mock data based on the provided cluster profile
const mockData: Node[] = [
  { name: 'node-1', roles: 'worker', version: 'v1.34.1', cpuUsage: '12%', memoryUsage: '61%', pods: 8 },
  { name: 'node-2', roles: 'worker', version: 'v1.34.1', cpuUsage: '8%', memoryUsage: '55%', pods: 10 },
  { name: 'node-3', roles: 'worker', version: 'v1.34.1', cpuUsage: '5%', memoryUsage: '48%', pods: 5 },
  { name: 'node-4', roles: 'worker', version: 'v1.34.1', cpuUsage: '2%', memoryUsage: '39%', pods: 2 },
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
  
  const avgCpu = nodes.reduce((sum, n) => sum + parseInt(n.cpuUsage), 0) / nodes.length;
  const avgMem = nodes.reduce((sum, n) => sum + parseInt(n.memoryUsage), 0) / nodes.length;
  
  insights.push(`\n**🔵 Average CPU Usage: ${avgCpu.toFixed(1)}%**`);
  if (avgCpu < 30) {
    insights.push('CPU utilization is low across all nodes. Consider optimizing resource allocation.');
  } else if (avgCpu < 70) {
    insights.push('CPU utilization is healthy across nodes.');
  } else {
    insights.push('CPU utilization is high. Consider adding more nodes or optimizing workloads.');
  }
  
  insights.push(`\n**🟣 Average Memory Usage: ${avgMem.toFixed(1)}%**`);
  if (avgMem < 50) {
    insights.push('Memory utilization is healthy across nodes.');
  } else if (avgMem < 80) {
    insights.push('Memory usage is moderate. Monitor for memory-intensive workloads.');
  } else {
    insights.push('Memory usage is high. Consider adding more nodes or optimizing memory usage.');
  }
  
  const highLoadNodes = nodes.filter(n => parseInt(n.cpuUsage) > 70 || parseInt(n.memoryUsage) > 70);
  if (highLoadNodes.length > 0) {
    insights.push(`\n**⚠️ High Load Nodes:**`);
    highLoadNodes.forEach(node => {
      insights.push(`• ${node.name}: CPU ${node.cpuUsage}, Memory ${node.memoryUsage}`);
    });
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Server size={18} className="text-blue-400" />
          <h2 className="text-2xl font-bold text-gray-100">Cluster Nodes</h2>
        </div>
        
        <button
          onClick={analyzeNodes}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-lg font-medium transition-all shadow-lg hover:shadow-xl"
        >
          <Sparkles size={18} />
          <span>AI Analysis</span>
        </button>
      </div>

      {/* AI Analysis Dialog */}
      {showAIDialog && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => !aiAnalyzing && setShowAIDialog(false)}
        >
          <div 
            className="bg-gray-900 border border-gray-700 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-gray-900 border-b border-gray-700 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg">
                  <Sparkles className="text-white" size={20} />
                </div>
                <h3 className="text-xl font-bold text-gray-100">AI Node Analysis</h3>
              </div>
              {!aiAnalyzing && (
                <button
                  onClick={() => setShowAIDialog(false)}
                  className="text-gray-400 hover:text-gray-100 transition-colors"
                >
                  <X size={20} />
                </button>
              )}
            </div>
            
            <div className="p-6">
              {aiAnalyzing ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
                  <p className="text-gray-400">Analyzing node metrics...</p>
                </div>
              ) : (
                <div className="prose prose-invert max-w-none">
                  <div className="whitespace-pre-wrap text-gray-300 text-sm leading-relaxed">
                    {aiInsights}
                  </div>
                </div>
              )}
            </div>
            
            {!aiAnalyzing && (
              <div className="sticky bottom-0 bg-gray-900 border-t border-gray-700 p-4 flex justify-end gap-3">
                <button
                  onClick={() => setShowAIDialog(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-100 rounded-lg transition-all"
                >
                  Close
                </button>
                <button
                  onClick={analyzeNodes}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-lg transition-all"
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
        {displayData.map((node) => {
          const cpuPercent = parseInt(node.cpuUsage);
          const memPercent = parseInt(node.memoryUsage);
          const isHealthy = cpuPercent < 70 && memPercent < 70;
          
          return (
            <Card key={node.name} className="hover:border-blue-500/30 transition-all">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                      <Server className="text-blue-400" size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-100">{node.name}</h3>
                      <p className="text-xs text-gray-400">{node.roles} • {node.version}</p>
                    </div>
                  </div>
                  {isHealthy ? (
                    <CheckCircle className="text-green-400" size={20} />
                  ) : (
                    <AlertCircle className="text-yellow-400" size={20} />
                  )}
                </div>

                {/* CPU Usage */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Cpu size={14} className="text-blue-400" />
                      <span className="text-xs font-medium text-gray-300">CPU</span>
                    </div>
                    <span className="text-xs text-gray-400">{node.cpuUsage}</span>
                  </div>
                  <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all ${
                        cpuPercent > 70 ? 'bg-red-500' : 'bg-gradient-to-r from-blue-500 to-cyan-400'
                      }`}
                      style={{ width: node.cpuUsage }}
                    />
                  </div>
                </div>

                {/* Memory Usage */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <MemoryStick size={14} className="text-purple-400" />
                      <span className="text-xs font-medium text-gray-300">Memory</span>
                    </div>
                    <span className="text-xs text-gray-400">{node.memoryUsage}</span>
                  </div>
                  <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all ${
                        memPercent > 70 ? 'bg-red-500' : 'bg-gradient-to-r from-purple-500 to-pink-400'
                      }`}
                      style={{ width: node.memoryUsage }}
                    />
                  </div>
                </div>

                {/* Pods */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-700/50">
                  <div className="flex items-center gap-2">
                    <BoxIcon size={14} className="text-cyan-400" />
                    <span className="text-xs text-gray-400">Pods</span>
                  </div>
                  <span className="text-sm font-bold text-gray-100">{node.pods}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
