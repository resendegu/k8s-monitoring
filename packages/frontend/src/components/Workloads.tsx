import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from './ui';
import { 
  Layers, 
  Database,
  CheckCircle,
  AlertTriangle,
  Clock,
  Package,
  Sparkles,
  X
} from 'lucide-react';
import axios from 'axios';

type Deployment = {
  namespace: string;
  name: string;
  ready: string;
  image: string;
  age: string;
  status: string;
};

type StatefulSet = {
  namespace: string;
  name: string;
  ready: string;
  image: string;
  age: string;
  status: string;
};

type WorkloadsData = {
  deployments: Deployment[];
  statefulsets: StatefulSet[];
};

const mockData: WorkloadsData = {
  deployments: [
    { namespace: 'centralebd-prd', name: 'api', ready: '2/2', image: 'ghcr.io/codedevcraft/central-ebd-backend:v0.0.7', age: '3d', status: 'Healthy' },
    { namespace: 'centralebd-hml', name: 'api', ready: '1/1', image: 'ghcr.io/codedevcraft/central-ebd-backend:sha-5c98c78', age: '1d', status: 'Healthy' },
    { namespace: 'ingress-nginx', name: 'controller', ready: '1/1', image: 'nginx-ingress:v1.9.0', age: '10d', status: 'HA Risk' },
  ],
  statefulsets: [
    { namespace: 'centralebd-hml', name: 'mysql', ready: '1/1', image: 'mysql:8.0', age: '1d', status: 'Data Risk' },
    { namespace: 'shared', name: 'postgres', ready: '1/1', image: 'postgres:17-alpine', age: '8d', status: 'Data Risk' },
  ],
};

const fetchWorkloadsData = async (): Promise<WorkloadsData> => {
  const { data } = await axios.get('/api/workloads');
  return data;
};

function generateWorkloadsAIInsights(data: WorkloadsData, tab: 'deployments' | 'statefulsets'): string {
  const insights = [];
  
  if (tab === 'deployments') {
    insights.push('**📦 Deployment Analysis**\n');
    insights.push(`You have ${data.deployments.length} deployments across your cluster.`);
    
    const healthyCount = data.deployments.filter(d => d.status === 'Healthy').length;
    const riskCount = data.deployments.filter(d => d.status.includes('Risk')).length;
    
    if (healthyCount === data.deployments.length) {
      insights.push(`\n**✅ All Healthy:** All ${healthyCount} deployments are running smoothly.`);
    } else {
      insights.push(`\n**📊 Status:** ${healthyCount} healthy, ${riskCount} with risks`);
    }
    
    if (riskCount > 0) {
      insights.push('\n**⚠️ Deployments Needing Attention:**');
      data.deployments.filter(d => d.status.includes('Risk')).forEach(d => {
        insights.push(`• ${d.namespace}/${d.name}: ${d.status} - Consider scaling to ${parseInt(d.ready.split('/')[1]) + 1} replicas for HA`);
      });
    }
    
    insights.push('\n**💡 Recommendations:**');
    insights.push('• HA Risk deployments should have at least 2 replicas for high availability');
    insights.push('• Consider implementing pod disruption budgets (PDB) for critical deployments');
    insights.push('• Use horizontal pod autoscaling (HPA) for automatic scaling based on metrics');
  } else {
    insights.push('**💾 StatefulSet Analysis**\n');
    insights.push(`You have ${data.statefulsets.length} statefulsets managing stateful workloads.`);
    
    const risks = data.statefulsets.filter(s => s.status.includes('Risk'));
    if (risks.length > 0) {
      insights.push('\n**⚠️ Data Risk Considerations:**');
      risks.forEach(s => {
        insights.push(`• ${s.namespace}/${s.name}: Running with single replica`);
      });
      insights.push('\nSingle-replica StatefulSets are risky for data persistence.');
    }
    
    insights.push('\n**💡 Recommendations:**');
    insights.push('• Implement regular backup strategies for stateful data');
    insights.push('• Consider using persistent volume snapshots for disaster recovery');
    insights.push('• For production databases, use at least 3 replicas for data redundancy');
    insights.push('• Monitor storage capacity and I/O performance');
  }
  
  return insights.join('\n');
}

export default function Workloads({ isConnected }: { isConnected: boolean }) {
  const [tab, setTab] = useState<'deployments' | 'statefulsets'>('deployments');
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiInsights, setAiInsights] = useState<string>('');

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['workloadsData'],
    queryFn: fetchWorkloadsData,
    enabled: isConnected,
    refetchInterval: 10000,
    initialData: isConnected ? undefined : mockData,
  });

  const displayData = isConnected ? data : mockData;

  const analyzeWorkloads = async () => {
    setShowAIDialog(true);
    setAiAnalyzing(true);
    setAiInsights('Analyzing workloads with AI...');
    
    setTimeout(() => {
      if (displayData) {
        const insights = generateWorkloadsAIInsights(displayData, tab);
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
        Error fetching workloads data: {(error as Error).message}
      </div>
    );
  }

  if (!displayData) {
    return <div className="text-gray-400">No data available.</div>;
  }

  const workloads = tab === 'deployments' ? displayData.deployments : displayData.statefulsets;
  const icon = tab === 'deployments' ? Layers : Database;
  const Icon = icon;

  return (
    <div className="space-y-4">
      {/* Header with Tabs and AI Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Layers size={18} className="text-purple-400" />
            <h2 className="text-2xl font-bold text-gray-100">Workloads</h2>
          </div>
          
          {/* Tabs */}
          <div className="flex bg-gray-800/50 rounded-lg p-1">
            <button
              onClick={() => setTab('deployments')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                tab === 'deployments'
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'text-gray-400 hover:text-gray-100'
              }`}
            >
              Deployments
            </button>
            <button
              onClick={() => setTab('statefulsets')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                tab === 'statefulsets'
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                  : 'text-gray-400 hover:text-gray-100'
              }`}
            >
              StatefulSets
            </button>
          </div>
        </div>
        
        <button
          onClick={analyzeWorkloads}
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
                <h3 className="text-xl font-bold text-gray-100">AI Workload Analysis</h3>
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
                  <p className="text-gray-400">Analyzing workloads...</p>
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
                  onClick={analyzeWorkloads}
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

      {/* Workloads Grid */}
      <div className="grid grid-cols-1 gap-4">
        {workloads.map((workload) => {
          const isHealthy = workload.status === 'Healthy';
          const [ready, total] = workload.ready.split('/').map(Number);
          const readyPercent = (ready / total) * 100;
          
          return (
            <Card key={`${workload.namespace}-${workload.name}`} className="hover:border-purple-500/30 transition-all">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`p-2 rounded-lg ${tab === 'deployments' ? 'bg-blue-500/10' : 'bg-purple-500/10'}`}>
                        <Icon className={tab === 'deployments' ? 'text-blue-400' : 'text-purple-400'} size={20} />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-100">{workload.name}</h3>
                        <p className="text-xs text-gray-400">{workload.namespace}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
                      {/* Ready Status */}
                      <div className="flex items-center gap-2">
                        <CheckCircle size={14} className={isHealthy ? 'text-green-400' : 'text-yellow-400'} />
                        <div>
                          <p className="text-xs text-gray-400">Ready</p>
                          <p className="text-sm font-bold text-gray-100">{workload.ready}</p>
                        </div>
                      </div>

                      {/* Age */}
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-cyan-400" />
                        <div>
                          <p className="text-xs text-gray-400">Age</p>
                          <p className="text-sm font-bold text-gray-100">{workload.age}</p>
                        </div>
                      </div>

                      {/* Status */}
                      <div className="flex items-center gap-2">
                        {isHealthy ? (
                          <CheckCircle size={14} className="text-green-400" />
                        ) : (
                          <AlertTriangle size={14} className="text-yellow-400" />
                        )}
                        <div>
                          <p className="text-xs text-gray-400">Status</p>
                          <p className={`text-sm font-bold ${isHealthy ? 'text-green-400' : 'text-yellow-400'}`}>
                            {workload.status}
                          </p>
                        </div>
                      </div>

                      {/* Image */}
                      <div className="flex items-center gap-2 col-span-2 lg:col-span-1">
                        <Package size={14} className="text-gray-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs text-gray-400">Image</p>
                          <p className="text-sm text-gray-100 truncate" title={workload.image}>
                            {workload.image.split(':')[0].split('/').pop()}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Ready Progress Bar */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-400">Replica Readiness</span>
                        <span className="text-xs text-gray-400">{readyPercent.toFixed(0)}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all ${
                            readyPercent === 100 
                              ? 'bg-gradient-to-r from-green-500 to-emerald-400'
                              : 'bg-gradient-to-r from-yellow-500 to-orange-400'
                          }`}
                          style={{ width: `${readyPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
