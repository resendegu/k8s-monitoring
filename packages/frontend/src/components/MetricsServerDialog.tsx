import { Dialog, DialogContent, DialogTitle, Button } from './ui';
import { Terminal, CheckCircle2, Copy, ExternalLink } from 'lucide-react';
import { useState } from 'react';

const installCommands = [
  {
    title: 'Install Metrics Server',
    command: 'kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml',
    description: 'Deploy the official Metrics Server to your cluster',
  },
  {
    title: 'Verify Installation',
    command: 'kubectl get deployment metrics-server -n kube-system',
    description: 'Check if Metrics Server is running',
  },
  {
    title: 'Test Metrics Collection',
    command: 'kubectl top nodes',
    description: 'Verify that metrics are being collected',
  },
];

export default function MetricsServerDialog({ open, onClose }: { open: boolean, onClose: () => void }) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogTitle>Install Metrics Server</DialogTitle>
        
        <div className="space-y-6 mt-6">
          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <div className="flex items-start gap-3">
              <Terminal className="text-blue-400 mt-0.5" size={20} />
              <div>
                <h3 className="text-sm font-semibold text-blue-400 mb-1">Metrics Server Required</h3>
                <p className="text-sm text-gray-400">
                  The Metrics Server is required to collect CPU and memory metrics from your cluster. 
                  Follow the steps below to install it.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {installCommands.map((cmd, index) => (
              <div key={index} className="space-y-2">
                <h4 className="text-sm font-semibold text-gray-200">{cmd.title}</h4>
                <p className="text-sm text-gray-400">{cmd.description}</p>
                <div className="relative">
                  <pre className="p-4 bg-gray-900/70 border border-gray-700 rounded-lg text-sm text-gray-100 overflow-x-auto">
                    <code>{cmd.command}</code>
                  </pre>
                  <button
                    onClick={() => copyToClipboard(cmd.command, index)}
                    className="absolute top-2 right-2 p-2 bg-gray-800 hover:bg-gray-700 rounded-md transition-colors"
                    title="Copy to clipboard"
                  >
                    {copiedIndex === index ? (
                      <CheckCircle2 size={16} className="text-green-400" />
                    ) : (
                      <Copy size={16} className="text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 bg-gray-800/30 border border-gray-700/50 rounded-lg space-y-2">
            <h4 className="text-sm font-semibold text-gray-200">Additional Resources</h4>
            <div className="space-y-1">
              <a
                href="https://github.com/kubernetes-sigs/metrics-server"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                <ExternalLink size={14} />
                <span>Metrics Server GitHub Repository</span>
              </a>
              <a
                href="https://kubernetes.io/docs/tasks/debug/debug-cluster/resource-metrics-pipeline/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                <ExternalLink size={14} />
                <span>Kubernetes Metrics Pipeline Documentation</span>
              </a>
            </div>
          </div>

          <div className="flex items-center gap-3 justify-end pt-4 border-t border-gray-700/50">
            <Button variant="primary" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
