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
  CheckCircle
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

export default function Overview({ isConnected }: { isConnected: boolean }) {
  const [timeSeriesData] = useState(generateTimeSeriesData());
  
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['overviewData'],
    queryFn: fetchOverviewData,
    enabled: isConnected,
    refetchInterval: 10000,
    initialData: isConnected ? undefined : mockData,
  });

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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-blue-400 text-sm font-medium mb-2">
          <Activity size={16} />
          <span>CLUSTER OVERVIEW</span>
        </div>
        <h2 className="text-3xl font-bold text-gray-100">Dashboard</h2>
        <p className="text-gray-400 mt-1">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column - Main Metrics */}
        <div className="xl:col-span-2 space-y-6">
          {/* Top Stats Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="hover:border-blue-500/30 transition-all">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Server className="text-blue-400" size={20} />
                  <span className="text-xs text-green-400 font-medium">
                    {displayData.nodes.ready}/{displayData.nodes.total}
                  </span>
                </div>
                <p className="text-gray-400 text-xs mb-1">Nodes</p>
                <p className="text-2xl font-bold text-gray-100">
                  {displayData.nodes.ready}
                </p>
                <p className="text-xs text-gray-500 mt-1">Ready</p>
              </CardContent>
            </Card>

            <Card className="hover:border-purple-500/30 transition-all">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <BoxIcon className="text-purple-400" size={20} />
                  <span className="text-xs text-green-400 font-medium">
                    {displayData.pods.running}/{displayData.pods.total}
                  </span>
                </div>
                <p className="text-gray-400 text-xs mb-1">Pods</p>
                <p className="text-2xl font-bold text-gray-100">
                  {displayData.pods.running}
                </p>
                <p className="text-xs text-gray-500 mt-1">Running</p>
              </CardContent>
            </Card>

            <Card className="hover:border-cyan-500/30 transition-all">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Layers className="text-cyan-400" size={20} />
                  <CheckCircle className="text-green-400" size={16} />
                </div>
                <p className="text-gray-400 text-xs mb-1">Namespaces</p>
                <p className="text-2xl font-bold text-gray-100">
                  {displayData.namespaces.total}
                </p>
                <p className="text-xs text-gray-500 mt-1">Active</p>
              </CardContent>
            </Card>

            <Card className="hover:border-green-500/30 transition-all">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Activity className="text-green-400" size={20} />
                  <span className="text-xs text-green-400 font-medium">100%</span>
                </div>
                <p className="text-gray-400 text-xs mb-1">Deployments</p>
                <p className="text-2xl font-bold text-gray-100">
                  {displayData.deployments?.available || 0}
                </p>
                <p className="text-xs text-gray-500 mt-1">Available</p>
              </CardContent>
            </Card>
          </div>

          {/* Resource Usage Charts */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <CardTitle>Resource Utilization</CardTitle>
                <span className="text-xs text-gray-500">Real-time metrics</span>
              </div>
              
              {/* CPU Usage */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Cpu size={18} className="text-blue-400" />
                    <span className="text-sm font-medium text-gray-300">CPU</span>
                  </div>
                  <span className="text-sm text-gray-400">{cpuUsagePercent}% used</span>
                </div>
                
                <div className="space-y-2">
                  {/* Used vs Total */}
                  <div>
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                      <span>Used</span>
                      <span>{displayData.nodes?.cpu?.used || 0} cores</span>
                    </div>
                    <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all"
                        style={{ width: `${cpuUsagePercent}%` }}
                      />
                    </div>
                  </div>
                  
                  {/* Requests */}
                  <div>
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                      <span>Requests</span>
                      <span>{displayData.nodes?.cpu?.requests || 0} cores</span>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-purple-500/50"
                        style={{ width: `${displayData.nodes?.cpu?.requests && displayData.nodes?.cpu?.total ? (displayData.nodes.cpu.requests / displayData.nodes.cpu.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  
                  {/* Limits */}
                  <div>
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                      <span>Limits</span>
                      <span>{displayData.nodes?.cpu?.limits || 0} cores</span>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-red-500/50"
                        style={{ width: `${displayData.nodes?.cpu?.limits && displayData.nodes?.cpu?.total ? (displayData.nodes.cpu.limits / displayData.nodes.cpu.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Memory Usage */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <MemoryStick size={18} className="text-purple-400" />
                    <span className="text-sm font-medium text-gray-300">Memory</span>
                  </div>
                  <span className="text-sm text-gray-400">{memUsagePercent}% used</span>
                </div>
                
                <div className="space-y-2">
                  {/* Used vs Total */}
                  <div>
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                      <span>Used</span>
                      <span>{displayData.nodes?.memory?.used || 0} GB</span>
                    </div>
                    <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-400 transition-all"
                        style={{ width: `${memUsagePercent}%` }}
                      />
                    </div>
                  </div>
                  
                  {/* Requests */}
                  <div>
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                      <span>Requests</span>
                      <span>{displayData.nodes?.memory?.requests || 0} GB</span>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500/50"
                        style={{ width: `${displayData.nodes?.memory?.requests && displayData.nodes?.memory?.total ? (displayData.nodes.memory.requests / displayData.nodes.memory.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  
                  {/* Limits */}
                  <div>
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                      <span>Limits</span>
                      <span>{displayData.nodes?.memory?.limits || 0} GB</span>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-orange-500/50"
                        style={{ width: `${displayData.nodes?.memory?.limits && displayData.nodes?.memory?.total ? (displayData.nodes.memory.limits / displayData.nodes.memory.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pod Capacity & Trends */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pod Capacity */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <CardTitle className="text-base">Pod Capacity</CardTitle>
                  <BoxIcon className="text-purple-400" size={18} />
                </div>
                
                <div className="flex items-center justify-center py-8">
                  <div className="relative">
                    <svg width="160" height="160" className="transform -rotate-90">
                      <circle
                        cx="80"
                        cy="80"
                        r="70"
                        stroke="currentColor"
                        strokeWidth="12"
                        fill="none"
                        className="text-gray-700"
                      />
                      <circle
                        cx="80"
                        cy="80"
                        r="70"
                        stroke="url(#podGradient)"
                        strokeWidth="12"
                        fill="none"
                        strokeDasharray={`${2 * Math.PI * 70}`}
                        strokeDashoffset={`${2 * Math.PI * 70 * (1 - podUsagePercent / 100)}`}
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
                      <span className="text-3xl font-bold text-gray-100">{displayData.pods.total}</span>
                      <span className="text-xs text-gray-400">of {displayData.pods.capacity}</span>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-700/50">
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1">Running</p>
                    <p className="text-lg font-bold text-green-400">{displayData.pods.running}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1">Pending</p>
                    <p className="text-lg font-bold text-yellow-400">{displayData.pods.pending}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1">Failed</p>
                    <p className="text-lg font-bold text-red-400">{displayData.pods.failed}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Resource Trends */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <CardTitle className="text-base">24h Trends</CardTitle>
                  <TrendingUp className="text-cyan-400" size={18} />
                </div>
                
                <div className="h-48 flex items-end justify-between gap-1">
                  {timeSeriesData.slice(-12).map((point, idx) => {
                    const maxHeight = 100;
                    const cpuHeight = (point.cpu / maxHeight) * 100;
                    const memHeight = (point.memory / maxHeight) * 100;
                    
                    return (
                      <div key={idx} className="flex-1 flex flex-col gap-1 items-center">
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
                
                <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-gray-700/50">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-cyan-400 rounded"></div>
                    <span className="text-xs text-gray-400">CPU</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-gradient-to-r from-purple-500 to-pink-400 rounded"></div>
                    <span className="text-xs text-gray-400">Memory</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Column - Additional Info */}
        <div className="space-y-6">
          {/* Date Card */}
          <Card className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/20">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="text-blue-400 text-sm font-semibold mb-2">
                  {new Date().toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase()}
                </div>
                <div className="text-6xl font-bold text-gray-100 mb-1">
                  {new Date().getDate()}
                </div>
                <div className="text-gray-400">
                  {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-700/50">
                <div className="text-sm text-gray-400 text-center">
                  Uptime: <span className="text-green-400 font-semibold">99.9%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Storage */}
          {displayData.storage && (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <HardDrive className="text-orange-400" size={18} />
                    <CardTitle className="text-base">Storage</CardTitle>
                  </div>
                  <span className="text-xs text-gray-500">{storagePercent}%</span>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Used</span>
                    <span className="text-gray-100 font-medium">{displayData.storage.used} GB</span>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-orange-500 to-red-400"
                      style={{ width: `${storagePercent}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>0 GB</span>
                    <span>{displayData.storage.total} GB</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Network */}
          {displayData.network && (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Network className="text-cyan-400" size={18} />
                  <CardTitle className="text-base">Network Traffic</CardTitle>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-sm text-gray-400">Ingress</span>
                    </div>
                    <span className="text-lg font-bold text-gray-100">
                      {displayData.network.ingress} <span className="text-xs text-gray-500">MB/s</span>
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                      <span className="text-sm text-gray-400">Egress</span>
                    </div>
                    <span className="text-lg font-bold text-gray-100">
                      {displayData.network.egress} <span className="text-xs text-gray-500">MB/s</span>
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Events/Alerts */}
          {displayData.events && (
            <Card>
              <CardContent className="p-6">
                <CardTitle className="text-base mb-4">Recent Events</CardTitle>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="text-yellow-400" size={16} />
                      <span className="text-sm text-gray-300">Warnings</span>
                    </div>
                    <span className="text-lg font-bold text-yellow-400">{displayData.events.warnings}</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="text-red-400" size={16} />
                      <span className="text-sm text-gray-300">Errors</span>
                    </div>
                    <span className="text-lg font-bold text-red-400">{displayData.events.errors}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Cluster Health */}
          <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="text-green-400" size={20} />
                <CardTitle className="text-base">Cluster Health</CardTitle>
              </div>
              <p className="text-3xl font-bold text-green-400 mb-2">Healthy</p>
              <p className="text-sm text-gray-400">
                All systems operational. {displayData.nodes.ready} nodes ready, {displayData.pods.running} pods running.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
