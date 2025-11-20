import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from './ui';
import { 
  FolderTree, 
  CheckCircle,
  Cpu,
  MemoryStick,
  Box as BoxIcon,
  Layers,
  Database,
  Sparkles,
  X
} from 'lucide-react';
import axios from 'axios';
import { formatCPU, formatMemory } from '../helpers';

type Namespace = {
  name: string;
  status: string;
  pods: number;
  deployments: number;
  statefulsets: number;
  cpuUsage: string;
  memoryUsage: string;
};

const mockData: Namespace[] = [
  { name: 'default', status: 'Active', pods: 3, deployments: 1, statefulsets: 0, cpuUsage: '10000000n', memoryUsage: '51200Ki' },
  { name: 'kube-system', status: 'Active', pods: 10, deployments: 3, statefulsets: 0, cpuUsage: '150000000n', memoryUsage: '819200Ki' },
  { name: 'ingress-nginx', status: 'Active', pods: 1, deployments: 1, statefulsets: 0, cpuUsage: '50000000n', memoryUsage: '204800Ki' },
];

const fetchNamespacesData = async (): Promise<Namespace[]> => {
  const { data } = await axios.get('/api/namespaces');
  console.log('Fetched namespaces data:', data);
  return data;
};

function generateNamespacesAIInsights(namespaces: Namespace[]): string {
  const insights = [];
  
  insights.push('**📁 Namespace Analysis**\n');
  insights.push(`You have ${namespaces.length} active namespaces in your cluster.`);
  
  const totalPods = namespaces.reduce((sum, ns) => sum + ns.pods, 0);
  const totalDeployments = namespaces.reduce((sum, ns) => sum + ns.deployments, 0);
  
  insights.push(`\n**📊 Resource Distribution:**`);
  insights.push(`• Total Pods: ${totalPods}`);
  insights.push(`• Total Deployments: ${totalDeployments}`);
  
  const busiest = [...namespaces].sort((a, b) => b.pods - a.pods)[0];
  insights.push(`\n**🔥 Busiest Namespace:** ${busiest.name} with ${busiest.pods} pods`);
  
  insights.push('\n**💡 Recommendations:**');
  insights.push('• Use namespaces to logically separate different environments (dev, staging, prod)');
  insights.push('• Implement resource quotas to prevent any namespace from consuming all cluster resources');
  insights.push('• Apply network policies to control traffic between namespaces');
  insights.push('• Consider using namespace-level RBAC for better security');
  
  return insights.join('\n');
}

export default function Namespaces({ isConnected }: { isConnected: boolean }) {
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiInsights, setAiInsights] = useState<string>('');

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['namespacesData'],
    queryFn: fetchNamespacesData,
    enabled: isConnected,
    refetchInterval: 10000,
    initialData: isConnected ? undefined : mockData,
  });

  const displayData = isConnected ? data : mockData;

  const analyzeNamespaces = async () => {
    setShowAIDialog(true);
    setAiAnalyzing(true);
    setAiInsights('Analyzing namespaces with AI...');
    
    setTimeout(() => {
      if (displayData) {
        const insights = generateNamespacesAIInsights(displayData);
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
        Error fetching namespaces data: {(error as Error).message}
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
          <FolderTree size={18} className="text-cyan-400 animate-pulse" />
          <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
            Namespaces
          </h2>
        </div>
        
        <button
          onClick={analyzeNamespaces}
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
                <h3 className="text-xl font-bold text-gray-100">AI Namespace Analysis</h3>
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
                  <p className="text-gray-400 ai-thinking">Analyzing namespaces...</p>
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
                  onClick={analyzeNamespaces}
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

      {/* Namespaces Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {displayData.map((ns, index) => (
          <Card 
            key={ns.name} 
            className="hover:border-cyan-500/30 transition-all group scale-in" 
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-cyan-500/10 rounded-lg group-hover:bg-cyan-500/20 transition-colors">
                    <FolderTree className="text-cyan-400 group-hover:scale-110 transition-transform" size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-100">{ns.name}</h3>
                    <p className="text-xs text-green-400 flex items-center gap-1">
                      <CheckCircle size={12} className="animate-pulse" />
                      {ns.status}
                    </p>
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <BoxIcon size={14} className="text-purple-400" />
                  <div>
                    <p className="text-xs text-gray-400">Pods</p>
                    <p className="text-sm font-bold text-gray-100">{ns.pods}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Layers size={14} className="text-blue-400" />
                  <div>
                    <p className="text-xs text-gray-400">Deployments</p>
                    <p className="text-sm font-bold text-gray-100">{ns.deployments}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Database size={14} className="text-purple-400" />
                  <div>
                    <p className="text-xs text-gray-400">StatefulSets</p>
                    <p className="text-sm font-bold text-gray-100">{ns.statefulsets}</p>
                  </div>
                </div>
              </div>

              {/* Resource Usage */}
              <div className="pt-3 border-t border-gray-700/50 space-y-2 group-hover:border-gray-600/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cpu size={12} className="text-blue-400" />
                    <span className="text-xs text-gray-400">CPU</span>
                  </div>
                  <span className="text-xs font-medium text-gray-100">{formatCPU(ns.cpuUsage)}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MemoryStick size={12} className="text-purple-400" />
                    <span className="text-xs text-gray-400">Memory</span>
                  </div>
                  <span className="text-xs font-medium text-gray-100">{formatMemory(ns.memoryUsage)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
