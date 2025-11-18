import { useState } from 'react';
import { Box, Card, CardContent, Tab, Tabs, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, Chip, CircularProgress, Alert } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

type Deployment = {
  namespace: string;
  name: string;
  ready: string;
  image: string;
  age: string;
  status: string;
};

type StatefulSet = {
  namespace: string;
  name: string;
  ready: string;
  image: string;
  age: string;
  status: string;
};

type WorkloadsData = {
  deployments: Deployment[];
  statefulsets: StatefulSet[];
};

const mockData: WorkloadsData = {
  deployments: [
    { namespace: 'centralebd-prd', name: 'api', ready: '2/2', image: 'ghcr.io/codedevcraft/central-ebd-backend:v0.0.7', age: '3d', status: 'Healthy' },
    { namespace: 'centralebd-hml', name: 'api', ready: '1/1', image: 'ghcr.io/codedevcraft/central-ebd-backend:sha-5c98c78', age: '1d', status: 'Healthy' },
    { namespace: 'ingress-nginx', name: 'controller', ready: '1/1', image: 'nginx-ingress:v1.9.0', age: '10d', status: 'HA Risk' },
  ],
  statefulsets: [
    { namespace: 'centralebd-hml', name: 'mysql', ready: '1/1', image: 'mysql:8.0', age: '1d', status: 'Data Risk' },
    { namespace: 'shared', name: 'postgres', ready: '1/1', image: 'postgres:17-alpine', age: '8d', status: 'Data Risk' },
  ],
};

const fetchWorkloadsData = async (): Promise<WorkloadsData> => {
  const { data } = await axios.get('/api/workloads');
  return data;
};

const StatusChip = ({ status }: { status: string }) => {
  let color: 'success' | 'warning' | 'error' = 'success';
  if (status.includes('Risk') || status.includes('Unhealthy')) {
    color = 'warning';
  }
  return <Chip label={status} color={color} size="small" />;
};

export default function Workloads({ isConnected }: { isConnected: boolean }) {
  const [tab, setTab] = useState(0);
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['workloadsData'],
    queryFn: fetchWorkloadsData,
    enabled: isConnected,
    refetchInterval: 10000,
    initialData: isConnected ? undefined : mockData,
  });

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setTab(newValue);
  };

  if (isLoading && isConnected) {
    return <CircularProgress />;
  }

  if (isError && isConnected) {
    return <Alert severity="error">Error fetching workloads data: {error.message}</Alert>;
  }

  const displayData = isConnected ? data : mockData;

  if (!displayData) {
    return <Typography>No data available.</Typography>;
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Workloads</Typography>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tab} onChange={handleChange}>
          <Tab label="Deployments" />
          <Tab label="StatefulSets" />
        </Tabs>
      </Box>
      <Card>
        <CardContent>
          {tab === 0 && (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Namespace</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Ready</TableCell>
                    <TableCell>Image</TableCell>
                    <TableCell>Age</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {displayData.deployments.map((d) => (
                    <TableRow key={`${d.namespace}-${d.name}`}>
                      <TableCell>{d.namespace}</TableCell>
                      <TableCell>{d.name}</TableCell>
                      <TableCell>{d.ready}</TableCell>
                      <TableCell>{d.image}</TableCell>
                      <TableCell>{d.age}</TableCell>
                      <TableCell><StatusChip status={d.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          {tab === 1 && (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Namespace</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Ready</TableCell>
                    <TableCell>Image</TableCell>
                    <TableCell>Age</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {displayData.statefulsets.map((s) => (
                    <TableRow key={`${s.namespace}-${s.name}`}>
                      <TableCell>{s.namespace}</TableCell>
                      <TableCell>{s.name}</TableCell>
                      <TableCell>{s.ready}</TableCell>
                      <TableCell>{s.image}</TableCell>
                      <TableCell>{s.age}</TableCell>
                      <TableCell><StatusChip status={s.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
