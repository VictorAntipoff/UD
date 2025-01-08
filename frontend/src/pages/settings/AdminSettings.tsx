import { Container, Typography, Paper, Box } from '@mui/material';

export default function AdminSettings() {
  return (
    <Container maxWidth="lg">
      <Typography variant="h4" gutterBottom>
        Admin Settings
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Box>
          <Typography variant="h6" gutterBottom>
            System Settings
          </Typography>
          {/* Add admin settings content here */}
        </Box>
      </Paper>
    </Container>
  );
} 