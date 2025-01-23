import { useState, useEffect } from 'react';
import { Typography, Box } from '@mui/material';

interface HealthResponse {
  status: string;
  timestamp: string;
  currentTime: string;
  uptime: {
    days: number;
    hours: number;
    minutes: number;
    total_ms: number;
    formatted: string;
  };
  env: string;
  database: string;
}

export default function UptimeDisplay() {
  const [uptime, setUptime] = useState<string>('Checking...');
  const [lastCheck, setLastCheck] = useState<Date>(new Date());
  const [status, setStatus] = useState<string>('unknown');

  useEffect(() => {
    const checkUptime = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/health`);
        if (!response.ok) {
          throw new Error('Health check failed');
        }
        
        const data: HealthResponse = await response.json();
        
        if (data.uptime) {
          setUptime(data.uptime.formatted || '0m');
          setStatus(data.status);
          setLastCheck(new Date());
        }
      } catch (error) {
        console.error('Error checking uptime:', error);
        setUptime('Error');
        setStatus('error');
      }
    };

    checkUptime();
    const interval = setInterval(checkUptime, 60000);

    return () => clearInterval(interval);
  }, []);

  return (
    <Box>
      <Typography variant="body2" color={status === 'healthy' ? 'success.main' : 'error.main'}>
        Status: {status}
      </Typography>
      <Typography variant="body2">
        Uptime: {uptime}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        Last checked: {lastCheck.toLocaleTimeString()}
      </Typography>
    </Box>
  );
} 