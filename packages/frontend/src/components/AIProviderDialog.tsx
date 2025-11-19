import { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, Button, Input } from './ui';
import { Sparkles, Check, AlertTriangle, Loader } from 'lucide-react';
import axios from 'axios';

interface AIProviderDialogProps {
  open: boolean;
  onClose: () => void;
  onConfigured?: () => void;
}

type AIProvider = 'openai' | 'anthropic' | 'gemini';

interface ProviderOption {
  id: AIProvider;
  name: string;
  description: string;
  models: string[];
  defaultModel: string;
}

const providerOptions: ProviderOption[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT models (ChatGPT)',
    models: ['gpt-4', 'gpt-3.5-turbo', 'gpt-4-turbo'],
    defaultModel: 'gpt-3.5-turbo',
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    description: 'Claude models',
    models: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
    defaultModel: 'claude-3-sonnet-20240229',
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    description: 'Gemini Pro models',
    models: ['gemini-pro', 'gemini-1.5-pro'],
    defaultModel: 'gemini-pro',
  },
];

export default function AIProviderDialog({ open, onClose, onConfigured }: AIProviderDialogProps) {
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>('openai');
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);

  // Load current configuration when dialog opens
  useEffect(() => {
    if (open) {
      loadCurrentConfig();
    }
  }, [open]);

  const loadCurrentConfig = async () => {
    try {
      const { data } = await axios.get('/api/ai/config');
      if (data.configured) {
        setIsConfigured(true);
        setSelectedProvider(data.provider);
        if (data.model && data.model !== 'default') {
          setSelectedModel(data.model);
        } else {
          const provider = providerOptions.find(p => p.id === data.provider);
          setSelectedModel(provider?.defaultModel || '');
        }
      } else {
        setIsConfigured(false);
        // Set default model for selected provider
        const provider = providerOptions.find(p => p.id === selectedProvider);
        setSelectedModel(provider?.defaultModel || '');
      }
    } catch (error) {
      console.error('Failed to load AI config:', error);
    }
  };

  const handleProviderChange = (provider: AIProvider) => {
    setSelectedProvider(provider);
    setTestResult(null);
    const providerOption = providerOptions.find(p => p.id === provider);
    setSelectedModel(providerOption?.defaultModel || '');
  };

  const handleTest = async () => {
    if (!apiKey) {
      setTestResult({ success: false, message: 'Please enter an API key' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const { data } = await axios.post('/api/ai/test', {
        provider: selectedProvider,
        apiKey,
        model: selectedModel,
      });

      setTestResult({ success: true, message: data.message || 'Connection successful!' });
    } catch (error: any) {
      setTestResult({ 
        success: false, 
        message: error.response?.data?.details || error.message || 'Connection failed'
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    if (!apiKey) {
      setTestResult({ success: false, message: 'Please enter an API key' });
      return;
    }

    setIsSaving(true);

    try {
      await axios.post('/api/ai/configure', {
        provider: selectedProvider,
        apiKey,
        model: selectedModel,
      });

      setIsConfigured(true);
      setTestResult({ success: true, message: 'AI provider configured successfully!' });
      
      if (onConfigured) {
        onConfigured();
      }

      // Close dialog after a short delay
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (error: any) {
      setTestResult({ 
        success: false, 
        message: error.response?.data?.error || error.message || 'Failed to save configuration'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearConfig = async () => {
    try {
      await axios.delete('/api/ai/config');
      setIsConfigured(false);
      setApiKey('');
      setTestResult({ success: true, message: 'Configuration cleared successfully' });
    } catch (error: any) {
      setTestResult({ 
        success: false, 
        message: error.response?.data?.error || error.message || 'Failed to clear configuration'
      });
    }
  };

  const currentProvider = providerOptions.find(p => p.id === selectedProvider);

  if (!open) return null;

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle className="flex items-center gap-3">
        <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg">
          <Sparkles className="text-white" size={20} />
        </div>
        <span>Configure AI Provider</span>
      </DialogTitle>
      
      <DialogContent>
        <div className="space-y-6">
          {isConfigured && (
            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-2 text-sm text-green-400">
              <Check size={16} />
              <span>AI Provider is currently configured</span>
            </div>
          )}

          {/* Provider Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Select AI Provider
            </label>
            <div className="grid grid-cols-1 gap-3">
              {providerOptions.map((provider) => (
                <button
                  key={provider.id}
                  onClick={() => handleProviderChange(provider.id)}
                  className={`
                    p-4 rounded-lg border-2 text-left transition-all
                    ${selectedProvider === provider.id
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-gray-700 bg-gray-800/30 hover:border-gray-600'
                    }
                  `}
                >
                  <div className="font-medium text-gray-100">{provider.name}</div>
                  <div className="text-sm text-gray-400 mt-1">{provider.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* API Key Input */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              API Key
            </label>
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={`Enter your ${currentProvider?.name} API key`}
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">
              Your API key is stored securely in your session and never saved permanently.
            </p>
          </div>

          {/* Model Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Model (Optional)
            </label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:border-blue-500"
            >
              {currentProvider?.models.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Default: {currentProvider?.defaultModel}
            </p>
          </div>

          {/* Test Result */}
          {testResult && (
            <div 
              className={`
                p-3 rounded-lg flex items-center gap-2 text-sm
                ${testResult.success 
                  ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                  : 'bg-red-500/10 border border-red-500/20 text-red-400'
                }
              `}
            >
              {testResult.success ? <Check size={16} /> : <AlertTriangle size={16} />}
              <span>{testResult.message}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-700">
            {isConfigured && (
              <Button
                variant="secondary"
                onClick={handleClearConfig}
                className="flex-1"
              >
                Clear Config
              </Button>
            )}
            <Button
              variant="secondary"
              onClick={handleTest}
              disabled={isTesting || !apiKey}
              className="flex-1"
            >
              {isTesting ? (
                <>
                  <Loader size={16} className="animate-spin" />
                  Testing...
                </>
              ) : (
                'Test Connection'
              )}
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={isSaving || !apiKey}
              className="flex-1"
            >
              {isSaving ? (
                <>
                  <Loader size={16} className="animate-spin" />
                  Saving...
                </>
              ) : (
                'Save & Close'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
