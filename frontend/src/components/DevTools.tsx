import React from 'react';
import { Box } from '@mui/material';
import { ApiStatus } from './ApiStatus';

export const DevTools: React.FC = () => {
  // Only show in development
  if (import.meta.env.MODE !== 'development') {
    return null;
  }

  return (
    <Box
      sx={{
        position: 'absolute',
        top: 8,
        right: 8,
        zIndex: 1000,
        display: 'flex',
        gap: 1
      }}
    >
      <ApiStatus />
    </Box>
  );
}; 