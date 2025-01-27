import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,


  CircularProgress
} from '@mui/material';
import { supabase } from '../../config/supabase';

interface DryingProcess {
  id: string;
  woodTypeId: string;
  initialMoisture: number;
  targetMoisture: number;
  temperature: number;
  duration: number;
  status: 'pending' | 'in_progress' | 'completed';
  notes?: string;
}

export default function DryingProcess() {
  const [processes, setProcesses] = useState<DryingProcess[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProcesses();
  }, []);

  const fetchProcesses = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('drying_processes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProcesses(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch processes');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Wood Drying Process
        </Typography>
        
        {loading ? (
          <CircularProgress />
        ) : error ? (
          <Typography color="error">{error}</Typography>
        ) : (
          <Grid container spacing={3}>
            {processes.map((process) => (
              <Grid item xs={12} md={6} key={process.id}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6">
                    Process #{process.id}
                  </Typography>
                  {/* Add your process details here */}
                </Paper>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    </Container>
  );
} 