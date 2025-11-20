import { useState, useEffect } from 'react';
import { 
  Home, 
  Server, 
  Layers, 
  FolderTree, 
  Sparkles, 
  Menu,
  X,
  Settings
} from 'lucide-react';
import { Button } from './components/ui';
import Overview from './components/Overview';
import Nodes from './components/Nodes';
import Workloads from './components/Workloads';
import Namespaces from './components/Namespaces';
import AIAssistant from './components/AIAssistant';
import ConnectDialog from './components/ConnectDialog';
import MetricsServerDialog from './components/MetricsServerDialog';
import AIProviderDialog from './components/AIProviderDialog';
import axios from 'axios';

type View = 'Overview' | 'Nodes' | 'Workloads' | 'Namespaces' | 'AI Assistant';

interface NavItem {
  text: View;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { text: 'Overview', icon: <Home size={20} /> },
  { text: 'Nodes', icon: <Server size={20} /> },
  { text: 'Workloads', icon: <Layers size={20} /> },
  { text: 'Namespaces', icon: <FolderTree size={20} /> },
  { text: 'AI Assistant', icon: <Sparkles size={20} /> },
];

function Sidebar({ 
  activeView, 
  setActiveView, 
  isOpen, 
  onClose 
}: { 
  activeView: View;
  setActiveView: (view: View) => void;
  isOpen: boolean;
  onClose: () => void;
}) {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full w-64 glass border-r border-gray-800
        z-50 transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static
      `}>
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <img 
              src="/k8s-icon.svg" 
              alt="K8s AI Dash" 
              className="w-8 h-8 ai-brain drop-shadow-lg"
            />
            <span className="font-bold text-lg text-gray-100 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              K8s AI Dash
            </span>
          </div>
          <button onClick={onClose} className="lg:hidden text-gray-400 hover:text-gray-100 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {navItems.map((item, index) => (
            <button
              key={item.text}
              onClick={() => {
                setActiveView(item.text);
                onClose();
              }}
              style={{ animationDelay: `${index * 50}ms` }}
              className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-lg
                transition-all duration-300 text-left group stagger-item
                premium-hover relative overflow-hidden
                ${activeView === item.text 
                  ? 'glass-card bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-400 border border-blue-500/30 shadow-lg shadow-blue-500/20' 
                  : 'text-gray-400 hover:text-gray-100 hover:bg-gray-800/50 hover:border-gray-700/50 border border-transparent'
                }
              `}
            >
              <span className={activeView === item.text ? 'ai-thinking' : 'group-hover:scale-110 transition-transform duration-300'}>
                {item.icon}
              </span>
              <span className="font-medium">{item.text}</span>
              {activeView === item.text && (
                <span className="ml-auto w-2 h-2 rounded-full bg-blue-400 status-pulse"></span>
              )}
            </button>
          ))}
        </nav>
      </aside>
    </>
  );
}

function App() {
  const [activeView, setActiveView] = useState<View>('Overview');
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [metricsDialogOpen, setMetricsDialogOpen] = useState(false);
  const [aiProviderDialogOpen, setAiProviderDialogOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [aiConfigured, setAiConfigured] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const { data } = await axios.get('/api/check-status');
        if (data.isConnected) {
          setIsConnected(true);
        }
      } catch (error) {
        console.error('Failed to check connection status:', error);
      }
    };
    
    const checkAIConfig = async () => {
      try {
        const { data } = await axios.get('/api/ai/config');
        setAiConfigured(data.configured);
      } catch (error) {
        console.error('Failed to check AI config:', error);
      }
    };
    
    checkStatus();
    checkAIConfig();
  }, []);

  const checkAIConfig = async () => {
    try {
      const { data } = await axios.get('/api/ai/config');
      setAiConfigured(data.configured);
    } catch (error) {
      console.error('Failed to check AI config:', error);
    }
  };

  const handleConnect = (metricsAvailable: boolean) => {
    setIsConnected(true);
    if (!metricsAvailable) {
      setMetricsDialogOpen(true);
    }
  };

  const renderContent = () => {
    const content = (() => {
      switch (activeView) {
        case 'Overview':
          return <Overview isConnected={isConnected} />;
        case 'Nodes':
          return <Nodes isConnected={isConnected} />;
        case 'Workloads':
          return <Workloads isConnected={isConnected} />;
        case 'Namespaces':
          return <Namespaces isConnected={isConnected} />;
        case 'AI Assistant':
          return <AIAssistant />;
        default:
          return <div className="text-gray-400">Select a view from the sidebar.</div>;
      }
    })();

    return (
      <div key={activeView} className="fade-in">
        {content}
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden relative">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }}></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s', animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-pink-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '5s', animationDelay: '2s' }}></div>
      </div>
      
      <Sidebar 
        activeView={activeView} 
        setActiveView={setActiveView}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden relative z-10">
        {/* Header */}
        <header className="h-16 glass border-b border-gray-800 flex items-center justify-between px-6 slide-in-right">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-400 hover:text-gray-100 transition-colors hover:scale-110"
            >
              <Menu size={24} />
            </button>
            <h1 className="text-xl font-bold text-gray-100 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              {activeView}
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
            <Button 
              variant="secondary"
              onClick={() => setAiProviderDialogOpen(true)}
              className="flex items-center gap-2 hover:scale-105 transition-transform"
            >
              <Settings size={16} />
              <span className="hidden sm:inline">
                AI: {aiConfigured ? '🟢 Configured' : '🔴 Not Set'}
              </span>
              <span className="sm:hidden">AI</span>
            </Button>
            <Button 
              variant={isConnected ? 'secondary' : 'primary'}
              onClick={() => setConnectDialogOpen(true)}
              className={`hover:scale-105 transition-transform ${isConnected ? 'pulse-glow' : ''}`}
            >
              {isConnected ? '🟢 Connected' : '🔴 Connect'}
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-6 scrollbar-thin">
          {renderContent()}
        </main>
      </div>

      <ConnectDialog
        open={connectDialogOpen}
        onClose={() => setConnectDialogOpen(false)}
        onConnect={handleConnect}
      />
      <MetricsServerDialog
        open={metricsDialogOpen}
        onClose={() => setMetricsDialogOpen(false)}
      />
      <AIProviderDialog
        open={aiProviderDialogOpen}
        onClose={() => setAiProviderDialogOpen(false)}
        onConfigured={checkAIConfig}
      />
    </div>
  );
}

export default App;
