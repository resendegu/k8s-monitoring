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
import { createAIProviderService, AIProvider } from './aiProviderService';

dotenv.config();

if (!process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET is not set in the environment variables.');
}

// Extend the Express session to include a kubeconfig property and AI provider config
declare module 'express-session' {
  interface SessionData {
    kubeconfig: string;
    aiProvider?: string;
    aiApiKey?: string;
    aiModel?: string;
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

// AI Provider Configuration Endpoints
app.post('/api/ai/configure', (req, res) => {
  const { provider, apiKey, model } = req.body;
  
  if (!provider || !apiKey) {
    return res.status(400).json({ error: 'Provider and API key are required' });
  }

  const validProviders: AIProvider[] = ['openai', 'anthropic', 'gemini'];
  if (!validProviders.includes(provider)) {
    return res.status(400).json({ error: 'Invalid provider. Must be one of: openai, anthropic, gemini' });
  }

  // Store AI configuration in session
  req.session.aiProvider = provider;
  req.session.aiApiKey = apiKey;
  if (model) {
    req.session.aiModel = model;
  }

  res.json({ 
    message: 'AI provider configured successfully',
    provider,
    model: model || 'default'
  });
});

app.get('/api/ai/config', (req, res) => {
  if (req.session.aiProvider && req.session.aiApiKey) {
    res.json({
      configured: true,
      provider: req.session.aiProvider,
      model: req.session.aiModel || 'default',
      // Don't send the API key back for security
    });
  } else {
    res.json({ configured: false });
  }
});

app.delete('/api/ai/config', (req, res) => {
  req.session.aiProvider = undefined;
  req.session.aiApiKey = undefined;
  req.session.aiModel = undefined;
  res.json({ message: 'AI provider configuration cleared' });
});

app.post('/api/ai/test', async (req, res) => {
  const { provider, apiKey, model } = req.body;
  
  if (!provider || !apiKey) {
    return res.status(400).json({ error: 'Provider and API key are required' });
  }

  try {
    const aiService = createAIProviderService({ provider, apiKey, model });
    const isConnected = await aiService.testConnection();
    
    if (isConnected) {
      res.json({ success: true, message: 'AI provider connection successful' });
    } else {
      res.status(400).json({ success: false, error: 'AI provider test failed' });
    }
  } catch (error: any) {
    console.error('Error testing AI provider:', error);
    res.status(500).json({ success: false, error: 'Failed to test AI provider', details: error.message });
  }
});

app.post('/api/ai/chat', async (req, res) => {
  const { messages, provider, apiKey, model } = req.body;
  
  // Use provided credentials or session credentials
  const effectiveProvider = provider || req.session.aiProvider;
  const effectiveApiKey = apiKey || req.session.aiApiKey;
  const effectiveModel = model || req.session.aiModel;

  if (!effectiveProvider || !effectiveApiKey) {
    return res.status(400).json({ error: 'AI provider not configured. Please configure an AI provider first.' });
  }

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Messages array is required' });
  }

  try {
    const aiService = createAIProviderService({ 
      provider: effectiveProvider, 
      apiKey: effectiveApiKey,
      model: effectiveModel
    });
    const response = await aiService.chat(messages);
    res.json({ response });
  } catch (error: any) {
    console.error('Error in AI chat:', error);
    res.status(500).json({ error: 'Failed to get AI response', details: error.message });
  }
});

app.post('/api/ai/analyze', checkSession, async (req, res) => {
  const { question, provider, apiKey, model } = req.body;
  
  // Use provided credentials or session credentials
  const effectiveProvider = provider || req.session.aiProvider;
  const effectiveApiKey = apiKey || req.session.aiApiKey;
  const effectiveModel = model || req.session.aiModel;

  if (!effectiveProvider || !effectiveApiKey) {
    return res.status(400).json({ error: 'AI provider not configured. Please configure an AI provider first.' });
  }

  try {
    const kc = getKubeConfigFromSession(req);
    const clusterData = await getClusterOverview(kc);
    
    const aiService = createAIProviderService({ 
      provider: effectiveProvider, 
      apiKey: effectiveApiKey,
      model: effectiveModel
    });
    
    const analysis = await aiService.analyzeClusterData(clusterData, question);
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
