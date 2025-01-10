import { Box } from '@mui/material';

interface SectionLabelProps {
  text: string;
  color?: string;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

const positionStyles = {
  'top-left': { top: 0, left: 0 },
  'top-right': { top: 0, right: 0 },
  'bottom-left': { bottom: 0, left: 0 },
  'bottom-right': { bottom: 0, right: 0 },
};

export const SectionLabel = ({ 
  text, 
  color = 'primary.main', 
  position = 'top-left' 
}: SectionLabelProps) => {
  return (
    <Box
      sx={{
        position: 'absolute',
        ...positionStyles[position],
        bgcolor: color,
        color: 'white',
        px: 1,
        py: 0.5,
        zIndex: 9999,
        fontSize: '0.7rem',
        borderRadius: '0 0 4px 0',
        fontWeight: 'bold',
        boxShadow: 2,
        pointerEvents: 'none'
      }}
    >
      {text}
    </Box>
  );
}; 