import { Container, Typography, Box } from '@mui/material';

export default function UserSettings() {
  return (
    <Container>
      <Box sx={{ py: 3 }}>
        <Typography 
          variant="h4" 
          component="h1" 
          gutterBottom
          sx={{ 
            fontFamily: 'inherit',
            fontWeight: 500
          }}
        >
          User Settings
        </Typography>
      </Box>
    </Container>
  );
} 