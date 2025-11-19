import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardTitle } from './ui';
import { 
  Activity, 
  Server, 
  Box as BoxIcon, 
  Layers, 
  TrendingUp,
  Cpu,
  MemoryStick,
  HardDrive,
  Network,
  AlertTriangle,
  CheckCircle,
  Sparkles,
  X
} from 'lucide-react';
import axios from 'axios';

interface OverviewData {
  nodes: { 
    total: number; 
    ready: number;
    cpu: { used: number; total: number; requests: number; limits: number };
    memory: { used: number; total: number; requests: number; limits: number };
  };
  pods: { 
    total: number; 
    running: number;
    pending: number;
    failed: number;
    capacity: number;
  };
  namespaces: { total: number };
  deployments?: { total: number; available: number };
  events?: { warnings: number; errors: number };
  storage?: { used: number; total: number };
  network?: { ingress: number; egress: number };
}

// Mock data with detailed metrics
const mockData: OverviewData = {
  nodes: { 
    total: 4, 
    ready: 4,
    cpu: { used: 45, total: 100, requests: 30, limits: 80 },
    memory: { used: 62, total: 100, requests: 48, limits: 85 }
  },
  pods: { 
    total: 25, 
    running: 25,
    pending: 0,
    failed: 0,
    capacity: 110
  },
  namespaces: { total: 6 },
  deployments: { total: 15, available: 15 },
  events: { warnings: 2, errors: 0 },
  storage: { used: 156, total: 500 },
  network: { ingress: 2.4, egress: 1.8 }
};

// Generate mock time series data
const generateTimeSeriesData = () => {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  return hours.map(hour => ({
    hour,
    cpu: 30 + Math.random() * 30 + Math.sin(hour / 3) * 10,
    memory: 50 + Math.random() * 20 + Math.cos(hour / 4) * 15,
    pods: 20 + Math.floor(Math.random() * 10)
  }));
};

const fetchOverviewData = async () => {
  const { data } = await axios.get('/api/overview');
  return data as OverviewData;
};

// Generate mock AI insights based on cluster metrics
function generateMockAIInsights(
  data: OverviewData, 
  cpuPercent: number, 
  memPercent: number, 
  storagePercent: number
): string {
  const insights = [];
  
  // Overall health assessment
  if (data.nodes.ready === data.nodes.total && data.pods.failed === 0) {
    insights.push('✅ **Overall Health: Excellent**\nYour cluster is running smoothly with all nodes ready and no pod failures.');
  } else if (data.pods.failed > 0) {
    insights.push(`⚠️ **Overall Health: Attention Required**\nYou have ${data.pods.failed} failed pod(s) that need investigation.`);
  }
  
  // CPU analysis
  if (cpuPercent < 50) {
    insights.push(`🔵 **CPU Utilization: Healthy (${cpuPercent}%)**\nCPU usage is at a comfortable level. Good headroom for traffic spikes.`);
  } else if (cpuPercent < 80) {
    insights.push(`🟡 **CPU Utilization: Moderate (${cpuPercent}%)**\nCPU usage is moderate. Consider monitoring for sustained high usage patterns.`);
  } else {
    insights.push(`🔴 **CPU Utilization: High (${cpuPercent}%)**\nCPU usage is high. Consider horizontal pod autoscaling or adding nodes.`);
  }
  
  // Memory analysis
  if (memPercent < 60) {
    insights.push(`🔵 **Memory Utilization: Healthy (${memPercent}%)**\nMemory usage is well within limits.`);
  } else if (memPercent < 85) {
    insights.push(`🟡 **Memory Utilization: Watch (${memPercent}%)**\nMemory is moderately high. Monitor for memory leaks in applications.`);
  } else {
    insights.push(`🔴 **Memory Utilization: Critical (${memPercent}%)**\nMemory usage is very high. Consider increasing node capacity or optimizing workloads.`);
  }
  
  // Pod capacity
  const podPercent = Math.round((data.pods.total / data.pods.capacity) * 100);
  if (podPercent < 70) {
    insights.push(`📦 **Pod Capacity: Good (${podPercent}%)**\nYou have sufficient pod capacity for scaling.`);
  } else if (podPercent < 90) {
    insights.push(`📦 **Pod Capacity: Limited (${podPercent}%)**\nConsider adding nodes if you plan to scale workloads.`);
  }
  
  // Storage analysis
  if (data.storage && storagePercent > 70) {
    insights.push(`💾 **Storage: Attention (${storagePercent}%)**\nStorage usage is elevated. Plan for capacity expansion.`);
  }
  
  // Recommendations
  insights.push('\n**💡 Recommendations:**');
  
  if (cpuPercent > 70 || memPercent > 70) {
    insights.push('• Consider implementing Horizontal Pod Autoscaler (HPA) for automatic scaling');
    insights.push('• Review resource requests and limits for workloads');
  }
  
  if (data.pods.pending > 0) {
    insights.push(`• Investigate ${data.pods.pending} pending pod(s) - may indicate resource constraints`);
  }
  
  if (data.events && data.events.warnings > 0) {
    insights.push(`• Review ${data.events.warnings} cluster warning(s) for potential issues`);
  }
  
  insights.push('• Regularly update Kubernetes version and container images for security');
  insights.push('• Monitor trends over time to predict capacity needs');
  
  return insights.join('\n\n');
}

export default function Overview({ isConnected }: { isConnected: boolean }) {
  const [timeSeriesData] = useState(generateTimeSeriesData());
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiInsights, setAiInsights] = useState<string>('');
  
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['overviewData'],
    queryFn: fetchOverviewData,
    enabled: isConnected,
    refetchInterval: 10000,
    initialData: isConnected ? undefined : mockData,
  });

  const analyzeMetrics = async () => {
    // Allow AI analysis in demo mode too
    setShowAIDialog(true);
    setAiAnalyzing(true);
    setAiInsights('Analyzing your cluster metrics with AI...');
    
    try {
      // Use the current display data to create a context for AI
      // This will be used when connecting to real AI APIs
      /* const metricsContext = `
Current Cluster Metrics:
- Nodes: ${displayData.nodes.ready}/${displayData.nodes.total} ready
- Pods: ${displayData.pods.running}/${displayData.pods.total} running (${displayData.pods.pending} pending, ${displayData.pods.failed} failed)
- CPU Usage: ${cpuUsagePercent}% (${displayData.nodes?.cpu?.used}/${displayData.nodes?.cpu?.total} cores)
- Memory Usage: ${memUsagePercent}% (${displayData.nodes?.memory?.used}/${displayData.nodes?.memory?.total} GB)
- Namespaces: ${displayData.namespaces.total}
- Deployments: ${displayData.deployments?.available || 0} available
- Storage: ${displayData.storage ? `${storagePercent}% used (${displayData.storage.used}/${displayData.storage.total} GB)` : 'N/A'}
- Events: ${displayData.events ? `${displayData.events.warnings} warnings, ${displayData.events.errors} errors` : 'N/A'}

Please analyze these metrics and provide:
1. Overall cluster health assessment
2. Potential issues or concerns
3. Resource optimization recommendations
4. Capacity planning suggestions
      `.trim(); */
      
      // For now, generate mock insights since we need API keys for real AI
      setTimeout(() => {
        const mockInsights = generateMockAIInsights(displayData, cpuUsagePercent, memUsagePercent, storagePercent);
        setAiInsights(mockInsights);
        setAiAnalyzing(false);
      }, 2000);
      
      // TODO: Uncomment this when you have AI API keys configured
      // const response = await axios.post('/api/ai/analyze', {
      //   apiKey: 'YOUR_API_KEY',
      //   provider: 'gemini', // or 'openai'
      //   question: metricsContext
      // });
      // setAiInsights(response.data.analysis);
      // setAiAnalyzing(false);
    } catch (error) {
      console.error('AI Analysis error:', error);
      setAiInsights('Failed to analyze metrics. Please try again later.');
      setAiAnalyzing(false);
    }
  };

  const displayData = useMemo(() => {
    const rawData = isConnected ? data : mockData;
    
    // Ensure data has the expected structure with nested CPU/memory metrics
    if (rawData && rawData.nodes) {
      // If nodes.cpu is a simple number (old format), convert to new format
      if (typeof rawData.nodes.cpu === 'number' || !rawData.nodes.cpu?.used) {
        return {
          ...rawData,
          nodes: {
            ...rawData.nodes,
            cpu: {
              used: typeof rawData.nodes.cpu === 'number' ? rawData.nodes.cpu : 45,
              total: 100,
              requests: 30,
              limits: 80,
            },
            memory: {
              used: typeof rawData.nodes.memory === 'number' ? rawData.nodes.memory : 62,
              total: 100,
              requests: 48,
              limits: 85,
            },
          },
          pods: {
            ...rawData.pods,
            capacity: rawData.pods?.capacity || 110,
          },
        };
      }
    }
    
    return rawData || mockData;
  }, [isConnected, data]);

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
        Error fetching overview data: {(error as Error).message}
      </div>
    );
  }

  if (!displayData) {
    return <div className="text-gray-400">No data available.</div>;
  }

  // Safe access to nested properties with fallbacks
  const cpuUsagePercent = displayData.nodes?.cpu?.used && displayData.nodes?.cpu?.total 
    ? Math.round((displayData.nodes.cpu.used / displayData.nodes.cpu.total) * 100) 
    : 0;
  const memUsagePercent = displayData.nodes?.memory?.used && displayData.nodes?.memory?.total
    ? Math.round((displayData.nodes.memory.used / displayData.nodes.memory.total) * 100)
    : 0;
  const podUsagePercent = displayData.pods?.total && displayData.pods?.capacity
    ? Math.round((displayData.pods.total / displayData.pods.capacity) * 100)
    : 0;
  const storagePercent = displayData.storage?.used && displayData.storage?.total
    ? Math.round((displayData.storage.used / displayData.storage.total) * 100) 
    : 0;

  return (
    <div className="space-y-4">
      {/* Compact Header with AI Button */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Activity size={18} className="text-blue-400" />
            <h2 className="text-2xl font-bold text-gray-100">Dashboard</h2>
          </div>
          <p className="text-gray-400 text-sm mt-0.5">
            {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </p>
        </div>
        
        {/* AI Analysis Button */}
        <button
          onClick={analyzeMetrics}
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
                <h3 className="text-xl font-bold text-gray-100">AI Cluster Analysis</h3>
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
                  <p className="text-gray-400">Analyzing cluster metrics...</p>
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
                  onClick={analyzeMetrics}
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

      {/* Main Grid - More Compact */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        {/* Left Column - Main Metrics (3 columns) */}
        <div className="xl:col-span-3 space-y-4">
          {/* Top Stats Row - Compact */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card className="hover:border-blue-500/30 transition-all">
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <Server className="text-blue-400" size={18} />
                  <span className="text-xs text-green-400 font-medium">
                    {displayData.nodes.ready}/{displayData.nodes.total}
                  </span>
                </div>
                <p className="text-gray-400 text-xs">Nodes</p>
                <p className="text-xl font-bold text-gray-100">
                  {displayData.nodes.ready}
                </p>
              </CardContent>
            </Card>

            <Card className="hover:border-purple-500/30 transition-all">
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <BoxIcon className="text-purple-400" size={18} />
                  <span className="text-xs text-green-400 font-medium">
                    {displayData.pods.running}/{displayData.pods.total}
                  </span>
                </div>
                <p className="text-gray-400 text-xs">Pods</p>
                <p className="text-xl font-bold text-gray-100">
                  {displayData.pods.running}
                </p>
              </CardContent>
            </Card>

            <Card className="hover:border-cyan-500/30 transition-all">
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <Layers className="text-cyan-400" size={18} />
                  <CheckCircle className="text-green-400" size={14} />
                </div>
                <p className="text-gray-400 text-xs">Namespaces</p>
                <p className="text-xl font-bold text-gray-100">
                  {displayData.namespaces.total}
                </p>
              </CardContent>
            </Card>

            <Card className="hover:border-green-500/30 transition-all">
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <Activity className="text-green-400" size={18} />
                  <span className="text-xs text-green-400 font-medium">100%</span>
                </div>
                <p className="text-gray-400 text-xs">Deployments</p>
                <p className="text-xl font-bold text-gray-100">
                  {displayData.deployments?.available || 0}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Resource Usage Charts - Simplified */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <CardTitle className="text-base">Resource Utilization</CardTitle>
                <span className="text-xs text-gray-500">Real-time</span>
              </div>
              
              {/* CPU Usage - Simplified */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Cpu size={16} className="text-blue-400" />
                    <span className="text-sm font-medium text-gray-300">CPU</span>
                  </div>
                  <span className="text-sm text-gray-400">{cpuUsagePercent}%</span>
                </div>
                
                <div className="h-2.5 bg-gray-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all"
                    style={{ width: `${cpuUsagePercent}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                  <span>{displayData.nodes?.cpu?.used || 0} / {displayData.nodes?.cpu?.total || 0} cores</span>
                </div>
              </div>

              {/* Memory Usage - Simplified */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <MemoryStick size={16} className="text-purple-400" />
                    <span className="text-sm font-medium text-gray-300">Memory</span>
                  </div>
                  <span className="text-sm text-gray-400">{memUsagePercent}%</span>
                </div>
                
                <div className="h-2.5 bg-gray-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-400 transition-all"
                    style={{ width: `${memUsagePercent}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                  <span>{displayData.nodes?.memory?.used || 0} / {displayData.nodes?.memory?.total || 0} GB</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pod Capacity & Trends - Side by Side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Pod Capacity - Compact */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <CardTitle className="text-sm">Pod Capacity</CardTitle>
                  <BoxIcon className="text-purple-400" size={16} />
                </div>
                
                <div className="flex items-center justify-center py-4">
                  <div className="relative">
                    <svg width="120" height="120" className="transform -rotate-90">
                      <circle
                        cx="60"
                        cy="60"
                        r="50"
                        stroke="currentColor"
                        strokeWidth="10"
                        fill="none"
                        className="text-gray-700"
                      />
                      <circle
                        cx="60"
                        cy="60"
                        r="50"
                        stroke="url(#podGradient)"
                        strokeWidth="10"
                        fill="none"
                        strokeDasharray={`${2 * Math.PI * 50}`}
                        strokeDashoffset={`${2 * Math.PI * 50 * (1 - podUsagePercent / 100)}`}
                        className="transition-all duration-500"
                        strokeLinecap="round"
                      />
                      <defs>
                        <linearGradient id="podGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#8b5cf6" />
                          <stop offset="100%" stopColor="#ec4899" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-bold text-gray-100">{displayData.pods.total}</span>
                      <span className="text-xs text-gray-400">of {displayData.pods.capacity}</span>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-700/50">
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Running</p>
                    <p className="text-sm font-bold text-green-400">{displayData.pods.running}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Pending</p>
                    <p className="text-sm font-bold text-yellow-400">{displayData.pods.pending}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Failed</p>
                    <p className="text-sm font-bold text-red-400">{displayData.pods.failed}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Resource Trends - Compact */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <CardTitle className="text-sm">24h Trends</CardTitle>
                  <TrendingUp className="text-cyan-400" size={16} />
                </div>
                
                <div className="h-32 flex items-end justify-between gap-1">
                  {timeSeriesData.slice(-12).map((point, idx) => {
                    const maxHeight = 100;
                    const cpuHeight = (point.cpu / maxHeight) * 100;
                    const memHeight = (point.memory / maxHeight) * 100;
                    
                    return (
                      <div key={idx} className="flex-1 flex flex-col gap-0.5 items-center">
                        <div 
                          className="w-full bg-gradient-to-t from-blue-500 to-cyan-400 rounded-t transition-all hover:opacity-80"
                          style={{ height: `${cpuHeight}%` }}
                          title={`CPU: ${point.cpu.toFixed(1)}%`}
                        />
                        <div 
                          className="w-full bg-gradient-to-t from-purple-500 to-pink-400 rounded-t transition-all hover:opacity-80"
                          style={{ height: `${memHeight}%` }}
                          title={`Memory: ${point.memory.toFixed(1)}%`}
                        />
                      </div>
                    );
                  })}
                </div>
                
                <div className="flex items-center justify-center gap-4 mt-3 pt-3 border-t border-gray-700/50">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 bg-gradient-to-r from-blue-500 to-cyan-400 rounded"></div>
                    <span className="text-xs text-gray-400">CPU</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 bg-gradient-to-r from-purple-500 to-pink-400 rounded"></div>
                    <span className="text-xs text-gray-400">Memory</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Column - Compact Additional Info */}
        <div className="space-y-4">
          {/* Cluster Health - Compact */}
          <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="text-green-400" size={18} />
                <CardTitle className="text-sm">Cluster Health</CardTitle>
              </div>
              <p className="text-2xl font-bold text-green-400 mb-1">Healthy</p>
              <p className="text-xs text-gray-400">
                {displayData.nodes.ready} nodes, {displayData.pods.running} pods
              </p>
            </CardContent>
          </Card>

          {/* Storage - Compact */}
          {displayData.storage && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <HardDrive className="text-orange-400" size={16} />
                    <CardTitle className="text-sm">Storage</CardTitle>
                  </div>
                  <span className="text-xs text-gray-500">{storagePercent}%</span>
                </div>
                
                <div className="space-y-2">
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-orange-500 to-red-400"
                      style={{ width: `${storagePercent}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>{displayData.storage.used} GB used</span>
                    <span>{displayData.storage.total} GB</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Network - Compact */}
          {displayData.network && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Network className="text-cyan-400" size={16} />
                  <CardTitle className="text-sm">Network</CardTitle>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 bg-gray-800/30 rounded">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-xs text-gray-400">Ingress</span>
                    </div>
                    <span className="text-sm font-bold text-gray-100">
                      {displayData.network.ingress} <span className="text-xs text-gray-500">MB/s</span>
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between p-2 bg-gray-800/30 rounded">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></div>
                      <span className="text-xs text-gray-400">Egress</span>
                    </div>
                    <span className="text-sm font-bold text-gray-100">
                      {displayData.network.egress} <span className="text-xs text-gray-500">MB/s</span>
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Events/Alerts - Compact */}
          {displayData.events && (
            <Card>
              <CardContent className="p-4">
                <CardTitle className="text-sm mb-3">Events</CardTitle>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 bg-yellow-500/10 border border-yellow-500/20 rounded">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="text-yellow-400" size={14} />
                      <span className="text-xs text-gray-300">Warnings</span>
                    </div>
                    <span className="text-sm font-bold text-yellow-400">{displayData.events.warnings}</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-2 bg-red-500/10 border border-red-500/20 rounded">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="text-red-400" size={14} />
                      <span className="text-xs text-gray-300">Errors</span>
                    </div>
                    <span className="text-sm font-bold text-red-400">{displayData.events.errors}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
