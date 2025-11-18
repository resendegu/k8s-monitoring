import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography, Box } from '@mui/material';

const helmCommand = `helm repo add metrics-server https://kubernetes-sigs.github.io/metrics-server/
helm upgrade --install metrics-server metrics-server/metrics-server --namespace kube-system`;

const kubectlCommand = `kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml`;

export default function MetricsServerDialog({ open, onClose }: { open: boolean, onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Metrics Server Not Found</DialogTitle>
      <DialogContent>
        <Typography gutterBottom>
          The Kubernetes metrics-server is required to display CPU and memory usage, but it was not detected on your cluster.
        </Typography>
        <Typography>
          Please install it using one of the following commands:
        </Typography>
        <Box sx={{ my: 2, p: 2, border: '1px solid #ccc', borderRadius: 1, bgcolor: '#f5f5f5' }}>
          <Typography variant="h6" gutterBottom>Using Helm (Recommended)</Typography>
          <pre><code>{helmCommand}</code></pre>
        </Box>
        <Box sx={{ my: 2, p: 2, border: '1px solid #ccc', borderRadius: 1, bgcolor: '#f5f5f5' }}>
          <Typography variant="h6" gutterBottom>Using kubectl</Typography>
          <pre><code>{kubectlCommand}</code></pre>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
