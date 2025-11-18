import { useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Alert } from '@mui/material';
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

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Connect to Kubernetes Cluster</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Kubeconfig YAML"
          type="text"
          fullWidth
          multiline
          rows={10}
          value={kubeconfig}
          onChange={(e) => setKubeconfig(e.target.value)}
        />
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleConnect}>Connect</Button>
      </DialogActions>
    </Dialog>
  );
}
