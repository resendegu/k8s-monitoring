import { Box, Card, CardContent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, CircularProgress, Alert } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

type Node = {
  name: string;
  roles: string;
  version: string;
  cpuUsage: string;
  memoryUsage: string;
  pods: number;
};

// Mock data based on the provided cluster profile
const mockData: Node[] = [
  { name: 'node-1', roles: 'worker', version: 'v1.34.1', cpuUsage: '12%', memoryUsage: '61%', pods: 8 },
  { name: 'node-2', roles: 'worker', version: 'v1.34.1', cpuUsage: '8%', memoryUsage: '55%', pods: 10 },
  { name: 'node-3', roles: 'worker', version: 'v1.34.1', cpuUsage: '5%', memoryUsage: '48%', pods: 5 },
  { name: 'node-4', roles: 'worker', version: 'v1.34.1', cpuUsage: '2%', memoryUsage: '39%', pods: 2 },
];

const fetchNodesData = async (): Promise<Node[]> => {
  const { data } = await axios.get('/api/nodes');
  return data;
};

export default function Nodes({ isConnected }: { isConnected: boolean }) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['nodesData'],
    queryFn: fetchNodesData,
    enabled: isConnected,
    refetchInterval: 10000,
    initialData: isConnected ? undefined : mockData,
  });

  if (isLoading && isConnected) {
    return <CircularProgress />;
  }

  if (isError && isConnected) {
    return <Alert severity="error">Error fetching nodes data: {error.message}</Alert>;
  }

  const displayData = isConnected ? data : mockData;

  if (!displayData) {
    return <Typography>No data available.</Typography>;
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Nodes</Typography>
      <Card>
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Roles</TableCell>
                  <TableCell>Version</TableCell>
                  <TableCell>CPU Usage</TableCell>
                  <TableCell>Memory Usage</TableCell>
                  <TableCell>Pods</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {displayData.map((node) => (
                  <TableRow key={node.name}>
                    <TableCell>{node.name}</TableCell>
                    <TableCell>{node.roles}</TableCell>
                    <TableCell>{node.version}</TableCell>
                    <TableCell>{node.cpuUsage}</TableCell>
                    <TableCell>{node.memoryUsage}</TableCell>
                    <TableCell>{node.pods}</TableCell>
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
