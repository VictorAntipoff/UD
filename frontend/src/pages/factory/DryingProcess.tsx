import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  CircularProgress,
  Alert
} from '@mui/material';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../hooks/useAuth';

interface DryingProcess {
  id: string;
  wood_type_id: string;
  initial_moisture: number;
  target_moisture: number;
  temperature: number;
  duration: number;
  status: 'pending' | 'in_progress' | 'completed';
  notes?: string;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export default function DryingProcess() {
  const { user } = useAuth();
  const [processes, setProcesses] = useState<DryingProcess[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchProcesses();
    }
  }, [user]);

  const fetchProcesses = async () => {
    try {
      console.log('Fetching drying processes...', user?.id);
      setLoading(true);
      const { data, error } = await supabase
        .from('drying_processes')
        .select(`
          id,
          wood_type_id,
          initial_moisture,
          target_moisture,
          temperature,
          duration,
          status,
          notes,
          created_at,
          updated_at,
          user_id,
          wood_type:wood_types (
            id,
            name,
            grade
          )
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      console.log('Fetched processes:', data);
      setProcesses(data || []);
    } catch (err) {
      console.error('Error in fetchProcesses:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch processes');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <Container maxWidth="lg">
        <Alert severity="warning">Please log in to view drying processes.</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Wood Drying Process
        </Typography>
        
        {loading ? (
          <CircularProgress />
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : processes.length === 0 ? (
          <Alert severity="info">No drying processes found. Create one to get started.</Alert>
        ) : (
          <Grid container spacing={3}>
            {processes.map((process) => (
              <Grid item xs={12} md={6} key={process.id}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6">
                    Process #{process.id.slice(0, 8)}
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    <Typography>Initial Moisture: {process.initial_moisture}%</Typography>
                    <Typography>Target Moisture: {process.target_moisture}%</Typography>
                    <Typography>Temperature: {process.temperature}°C</Typography>
                    <Typography>Duration: {process.duration} hours</Typography>
                    <Typography>Status: {process.status}</Typography>
                    {process.notes && <Typography>Notes: {process.notes}</Typography>}
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    </Container>
  );
} 