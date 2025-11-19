import { useState, useEffect } from 'react';
import { 
  Home, 
  Server, 
  Layers, 
  FolderTree, 
  Sparkles, 
  Menu,
  X
} from 'lucide-react';
import { Button } from './components/ui';
import Overview from './components/Overview';
import Nodes from './components/Nodes';
import Workloads from './components/Workloads';
import Namespaces from './components/Namespaces';
import AIAssistant from './components/AIAssistant';
import ConnectDialog from './components/ConnectDialog';
import MetricsServerDialog from './components/MetricsServerDialog';
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
        fixed top-0 left-0 h-full w-64 bg-gray-900/95 backdrop-blur-sm border-r border-gray-800
        z-50 transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static
      `}>
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg" />
            <span className="font-bold text-lg text-gray-100">K8s Monitor</span>
          </div>
          <button onClick={onClose} className="lg:hidden text-gray-400 hover:text-gray-100">
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.text}
              onClick={() => {
                setActiveView(item.text);
                onClose();
              }}
              className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-lg
                transition-all duration-200 text-left
                ${activeView === item.text 
                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
                  : 'text-gray-400 hover:text-gray-100 hover:bg-gray-800/50'
                }
              `}
            >
              {item.icon}
              <span className="font-medium">{item.text}</span>
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
  const [isConnected, setIsConnected] = useState(false);
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
    checkStatus();
  }, []);

  const handleConnect = (metricsAvailable: boolean) => {
    setIsConnected(true);
    if (!metricsAvailable) {
      setMetricsDialogOpen(true);
    }
  };

  const renderContent = () => {
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
  };

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden">
      <Sidebar 
        activeView={activeView} 
        setActiveView={setActiveView}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-gray-900/50 backdrop-blur-sm border-b border-gray-800 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-400 hover:text-gray-100"
            >
              <Menu size={24} />
            </button>
            <h1 className="text-xl font-bold text-gray-100">
              {activeView}
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
            <Button 
              variant={isConnected ? 'secondary' : 'primary'}
              onClick={() => setConnectDialogOpen(true)}
              size="sm"
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
    </div>
  );
}

export default App;
