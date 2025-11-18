import { Box, Card, CardContent, Grid, Typography, CircularProgress, Alert } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

// Mock data based on the provided cluster profile
const mockData = {
  nodes: { total: 4, ready: 4 },
  pods: { total: 25, running: 25 },
  namespaces: { total: 10 },
};

const fetchOverviewData = async () => {
  const { data } = await axios.get('/api/overview');
  return data;
};

const StatCard = ({ title, value }: { title: string; value: string | number }) => (
  <Card>
    <CardContent>
      <Typography variant="h6" component="div">
        {title}
      </Typography>
      <Typography variant="h3" color="text.secondary">
        {value}
      </Typography>
    </CardContent>
  </Card>
);

export default function Overview({ isConnected }: { isConnected: boolean }) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['overviewData'],
    queryFn: fetchOverviewData,
    enabled: isConnected,
    refetchInterval: 10000, // Fetch every 10 seconds
    initialData: isConnected ? undefined : mockData,
  });

  if (isLoading && isConnected) {
    return <CircularProgress />;
  }

  if (isError && isConnected) {
    return <Alert severity="error">Error fetching overview data: {error.message}</Alert>;
  }

  const displayData = isConnected ? data : mockData;

  if (!displayData) {
    return <Typography>No data available.</Typography>;
  }

  return (
    <Box>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Nodes" value={`${displayData.nodes.ready} / ${displayData.nodes.total}`} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Pods" value={`${displayData.pods.running} / ${displayData.pods.total}`} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Namespaces" value={displayData.namespaces.total} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Cluster Status" value="Healthy" />
        </Grid>
      </Grid>
    </Box>
  );
}
