import { Dialog, DialogContent, DialogTitle, Button } from './ui';
import { Terminal, AlertTriangle, Play } from 'lucide-react';

interface CommandApprovalDialogProps {
  open: boolean;
  command: string;
  onApprove: () => void;
  onReject: () => void;
}

export default function CommandApprovalDialog({
  open,
  command,
  onApprove,
  onReject,
}: CommandApprovalDialogProps) {
  return (
    <Dialog open={open} onClose={onReject}>
      <DialogContent className="max-w-2xl">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
            <AlertTriangle className="text-yellow-400" size={24} />
          </div>
          <div className="flex-1">
            <DialogTitle>Execute Kubectl Command?</DialogTitle>
            <p className="text-gray-400 mb-4">
              The AI assistant has suggested the following kubectl command. Review it carefully before executing.
            </p>
            
            {/* Command Display */}
            <div className="bg-gray-950/50 border border-gray-700 rounded-lg p-4 mb-6 font-mono text-sm">
              <div className="flex items-start gap-2">
                <Terminal size={16} className="text-green-400 mt-1" />
                <code className="text-blue-400 break-all">{command}</code>
              </div>
            </div>

            {/* Warning Message */}
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 mb-6">
              <p className="text-sm text-orange-300">
                <strong>⚠️ Warning:</strong> This command will be executed on your Kubernetes cluster. 
                Make sure you understand what it does before proceeding.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={onReject}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={onApprove}
                className="flex items-center gap-2"
              >
                <Play size={16} />
                Execute Command
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
