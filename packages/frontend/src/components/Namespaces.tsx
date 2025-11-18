import { Box, Card, CardContent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, CircularProgress, Alert } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

type Namespace = {
  name: string;
  status: string;
  pods: string;
  deployments: string;
  statefulsets: string;
  cpu: string;
  memory: string;
};

const mockData: Namespace[] = [
  { name: 'default', status: 'Active', pods: '3', deployments: '1', statefulsets: '0', cpu: '10m', memory: '50Mi' },
  { name: 'kube-system', status: 'Active', pods: '10', deployments: '3', statefulsets: '0', cpu: '150m', memory: '800Mi' },
  { name: 'ingress-nginx', status: 'Active', pods: '1', deployments: '1', statefulsets: '0', cpu: '50m', memory: '200Mi' },
];

const fetchNamespacesData = async (): Promise<Namespace[]> => {
  const { data } = await axios.get('/api/namespaces');
  return data;
};

export default function Namespaces({ isConnected }: { isConnected: boolean }) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['namespacesData'],
    queryFn: fetchNamespacesData,
    enabled: isConnected,
    refetchInterval: 10000,
    initialData: isConnected ? undefined : mockData,
  });

  if (isLoading && isConnected) {
    return <CircularProgress />;
  }

  if (isError && isConnected) {
    return <Alert severity="error">Error fetching namespaces data: {error.message}</Alert>;
  }

  const displayData = isConnected ? data : mockData;

  if (!displayData) {
    return <Typography>No data available.</Typography>;
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Namespaces</Typography>
      <Card>
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Pods</TableCell>
                  <TableCell>Deployments</TableCell>
                  <TableCell>StatefulSets</TableCell>
                  <TableCell>CPU Usage</TableCell>
                  <TableCell>Memory Usage</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {displayData.map((ns) => (
                  <TableRow key={ns.name}>
                    <TableCell>{ns.name}</TableCell>
                    <TableCell>{ns.status}</TableCell>
                    <TableCell>{ns.pods}</TableCell>
                    <TableCell>{ns.deployments}</TableCell>
                    <TableCell>{ns.statefulsets}</TableCell>
                    <TableCell>{ns.cpu}</TableCell>
                    <TableCell>{ns.memory}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
}
