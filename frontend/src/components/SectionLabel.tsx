import React from 'react';
import { Box, Typography } from '@mui/material';
import { useDevelopment } from '../contexts/DevelopmentContext';

interface SectionLabelProps {
  text: string;
  color?: string;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

export const SectionLabel: React.FC<SectionLabelProps> = ({ 
  text, 
  color = 'primary.main',
  position = 'top-left' 
}) => {
  const { showLabels } = useDevelopment();

  if (!showLabels) return null;

  const getPosition = () => {
    switch (position) {
      case 'top-right':
        return { top: 4, right: 4 };
      case 'bottom-left':
        return { bottom: 4, left: 4 };
      case 'bottom-right':
        return { bottom: 4, right: 4 };
      default:
        return { top: 4, left: 4 };
    }
  };

  return (
    <Box
      sx={{
        position: 'absolute',
        zIndex: 1,
        ...getPosition(),
      }}
    >
      <Typography
        variant="caption"
        sx={{
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          color,
          px: 1,
          py: 0.5,
          borderRadius: 1,
          fontSize: '0.65rem',
          fontFamily: 'monospace',
          fontWeight: 'bold',
          boxShadow: 1,
          userSelect: 'none',
        }}
      >
        {text}
      </Typography>
    </Box>
  );
}; 