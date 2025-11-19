import express from 'express';
import session from 'express-session';
import dotenv from 'dotenv';
import * as k8s from '@kubernetes/client-node';
import {
  connectToCluster,
  checkMetricsServer,
  getClusterOverview,
  getNodes,
  getWorkloads,
  getNamespaces,
  analyzeCluster,
  executeCommand,
} from './kubernetesService';

dotenv.config();

if (!process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET is not set in the environment variables.');
}

// Extend the Express session to include a kubeconfig property
declare module 'express-session' {
  interface SessionData {
    kubeconfig: string;
  }
}

const app = express();
const port = process.env.PORT || 3001;

app.use(express.json());

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // In production, set to true if using HTTPS
}));

// Helper function to get KubeConfig from session
const getKubeConfigFromSession = (req: express.Request): k8s.KubeConfig => {
  const kc = new k8s.KubeConfig();
  kc.loadFromString(req.session.kubeconfig!);
  return kc;
};

// TODO: Implement Firebase integration for online kubeconfig storage

app.get('/api/check-status', (req, res) => {
  if (req.session.kubeconfig) {
    res.json({ isConnected: true });
  } else {
    res.json({ isConnected: false });
  }
});

app.post('/api/connect', async (req, res) => {
  const { kubeconfig } = req.body;
  if (!kubeconfig) {
    return res.status(400).json({ error: 'Kubeconfig is required' });
  }

  try {
    const kc = new k8s.KubeConfig();
    kc.loadFromString(kubeconfig);
    const k8sApi = kc.makeApiClient(k8s.CoreV1Api);
    const metricsServerAvailable = await checkMetricsServer(kc);

    // Save only the kubeconfig string in the session
    req.session.kubeconfig = kubeconfig;

    res.json({
      message: 'Successfully connected to Kubernetes cluster.',
      metricsServerAvailable,
    });
  } catch (error: any) {
    console.error('Error connecting to cluster:', error);
    res.status(500).json({ error: 'Failed to connect to Kubernetes cluster', details: error.message });
  }
});

// Middleware to check for a valid session
const checkSession = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!req.session.kubeconfig) {
    return res.status(401).json({ error: 'Not connected to a cluster. Please provide a kubeconfig.' });
  }
  next();
};

app.get('/api/overview', checkSession, async (req, res) => {
  try {
    const kc = getKubeConfigFromSession(req);
    const overview = await getClusterOverview(kc);
    res.json(overview);
  } catch (error: any) {
    console.error('Error fetching cluster overview:', error);
    res.status(500).json({ error: 'Failed to fetch cluster overview', details: error.message });
  }
});

app.get('/api/nodes', checkSession, async (req, res) => {
  try {
    const kc = getKubeConfigFromSession(req);
    const nodes = await getNodes(kc);
    res.json(nodes);
  } catch (error: any) {
    console.error('Error fetching nodes:', error);
    res.status(500).json({ error: 'Failed to fetch nodes', details: error.message });
  }
});

app.get('/api/workloads', checkSession, async (req, res) => {
  try {
    const kc = getKubeConfigFromSession(req);
    const workloads = await getWorkloads(kc);
    res.json(workloads);
  } catch (error: any) {
    console.error('Error fetching workloads:', error);
    res.status(500).json({ error: 'Failed to fetch workloads', details: error.message });
  }
});

app.get('/api/namespaces', checkSession, async (req, res) => {
  try {
    const kc = getKubeConfigFromSession(req);
    const namespaces = await getNamespaces(kc);
    res.json(namespaces);
  } catch (error: any) {
    console.error('Error fetching namespaces:', error);
    res.status(500).json({ error: 'Failed to fetch namespaces', details: error.message });
  }
});

app.post('/api/ai/analyze', checkSession, async (req, res) => {
  const { apiKey, provider, question } = req.body;
  try {
    const kc = getKubeConfigFromSession(req);
    const analysis = await analyzeCluster(kc, apiKey, provider, question);
    res.json({ analysis });
  } catch (error: any) {
    console.error('Error analyzing cluster:', error);
    res.status(500).json({ error: 'Failed to analyze cluster', details: error.message });
  }
});

app.post('/api/execute-command', checkSession, async (req, res) => {
  const { command } = req.body;
  try {
    const kc = getKubeConfigFromSession(req);
    const result = await executeCommand(kc, command);
    res.json({ result });
  } catch (error: any) {
    console.error('Error executing command:', error);
    res.status(500).json({ error: 'Failed to execute command', details: error.message });
  }
});

app.listen(port, () => {
  console.log(`Backend server listening on port ${port}`);
});
