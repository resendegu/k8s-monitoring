import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, Button } from './ui';
import { Upload, FileText, AlertCircle } from 'lucide-react';
import axios, { AxiosError } from 'axios';
import { useQueryClient } from '@tanstack/react-query';

export default function ConnectDialog({ open, onClose, onConnect }: { open: boolean, onClose: () => void, onConnect: (metricsAvailable: boolean) => void }) {
  const [kubeconfig, setKubeconfig] = useState('');
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const handleConnect = async () => {
    try {
      const response = await axios.post('/api/connect', { kubeconfig });
      if (response.data.message) {
        setError(null);
        queryClient.invalidateQueries();
        onConnect(response.data.metricsServerAvailable); // Pass up the flag
        onClose();
      }
    } catch (err: unknown) {
      if (err instanceof AxiosError) {
        setError(err.response?.data?.details || 'Failed to connect');
      } else {
        setError('An unexpected error occurred');
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setKubeconfig(content);
        setError(null);
      };
      reader.onerror = () => {
        setError('Failed to read file');
      };
      reader.readAsText(file);
    }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogTitle>Connect to Kubernetes Cluster</DialogTitle>
        
        <div className="space-y-6 mt-6">
          <p className="text-sm text-gray-400">
            Upload your kubeconfig file or paste the content below to connect to your Kubernetes cluster.
          </p>

          <div className="space-y-4">
            <label
              htmlFor="file-upload"
              className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-800/50 border-2 border-dashed border-gray-700 rounded-lg cursor-pointer hover:border-blue-500/50 hover:bg-gray-800/70 transition-all"
            >
              <Upload size={20} className="text-gray-400" />
              <span className="text-sm text-gray-400">Upload kubeconfig file</span>
              <input
                id="file-upload"
                type="file"
                accept=".yaml,.yml,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            <div className="relative">
              <div className="absolute top-3 left-3 pointer-events-none">
                <FileText size={18} className="text-gray-500" />
              </div>
              <textarea
                value={kubeconfig}
                onChange={(e) => setKubeconfig(e.target.value)}
                placeholder="Or paste your kubeconfig content here..."
                className="w-full h-64 pl-10 pr-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono text-sm resize-none"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 justify-end pt-4 border-t border-gray-700/50">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleConnect}>
              Connect to Cluster
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
