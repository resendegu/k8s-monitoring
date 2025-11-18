import { useState, useMemo, createContext, useContext, useEffect } from 'react';
import { ThemeProvider, createTheme, useTheme as useMuiTheme } from '@mui/material/styles';
import { CssBaseline, Box, AppBar, Toolbar, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, IconButton, Typography, Button } from '@mui/material';
import { Brightness4 as Brightness4Icon, Brightness7 as Brightness7Icon, Home as HomeIcon, Dns as DnsIcon, Layers as LayersIcon, Folder as FolderIcon, AutoAwesome as AutoAwesomeIcon } from '@mui/icons-material';
import Overview from './components/Overview';
import Nodes from './components/Nodes';
import Workloads from './components/Workloads';
import Namespaces from './components/Namespaces';
import AIAssistant from './components/AIAssistant';
import ConnectDialog from './components/ConnectDialog';
import MetricsServerDialog from './components/MetricsServerDialog';
import axios from 'axios';

const drawerWidth = 240;

type View = 'Overview' | 'Nodes' | 'Workloads' | 'Namespaces' | 'AI Assistant';

const ColorModeContext = createContext({ toggleColorMode: () => {} });

function ThemeToggle() {
  const theme = useMuiTheme();
  const colorMode = useContext(ColorModeContext);
  return (
    <IconButton sx={{ ml: 1 }} onClick={colorMode.toggleColorMode} color="inherit">
      {theme.palette.mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
    </IconButton>
  );
}

function Sidebar({ setActiveView }: { setActiveView: (view: View) => void }) {
  const navItems = [
    { text: 'Overview', icon: <HomeIcon /> },
    { text: 'Nodes', icon: <DnsIcon /> },
    { text: 'Workloads', icon: <LayersIcon /> },
    { text: 'Namespaces', icon: <FolderIcon /> },
    { text: 'AI Assistant', icon: <AutoAwesomeIcon /> },
  ];

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box' },
      }}
    >
      <Toolbar />
      <Box sx={{ overflow: 'auto' }}>
        <List>
          {navItems.map((item) => (
            <ListItem key={item.text} disablePadding>
              <ListItemButton onClick={() => setActiveView(item.text as View)}>
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>
    </Drawer>
  );
}

function App() {
  const [mode, setMode] = useState<'light' | 'dark'>('dark');
  const [activeView, setActiveView] = useState<View>('Overview');
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [metricsDialogOpen, setMetricsDialogOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

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

  const colorMode = useMemo(
    () => ({
      toggleColorMode: () => {
        setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
      },
    }),
    [],
  );

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
        },
      }),
    [mode],
  );

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
        return <Typography paragraph>Select a view from the sidebar.</Typography>;
    }
  };

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{ display: 'flex' }}>
          <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
            <Toolbar>
              <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
                Kubernetes AI Dashboard
              </Typography>
              <Button color="inherit" onClick={() => setConnectDialogOpen(true)}>
                {isConnected ? 'Connected' : 'Connect'}
              </Button>
              <ThemeToggle />
            </Toolbar>
          </AppBar>
          <Sidebar setActiveView={setActiveView} />
          <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
            <Toolbar />
            {renderContent()}
          </Box>
        </Box>
        <ConnectDialog
          open={connectDialogOpen}
          onClose={() => setConnectDialogOpen(false)}
          onConnect={handleConnect}
        />
        <MetricsServerDialog
          open={metricsDialogOpen}
          onClose={() => setMetricsDialogOpen(false)}
        />
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}

export default App;
