import React from 'react';
import { useApiStatus } from '../hooks/useApi';
import { Chip } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';

export const ApiStatus: React.FC = () => {
  const isOnline = useApiStatus();

  return (
    <Chip
      icon={isOnline ? <CheckCircleIcon /> : <ErrorIcon />}
      label={isOnline ? 'API Online' : 'API Offline'}
      color={isOnline ? 'success' : 'error'}
      variant="outlined"
      size="small"
    />
  );
}; 