import { Container, Typography, Paper, Box } from '@mui/material';

export default function UserSettings() {
  return (
    <Container maxWidth="lg">
      <Typography variant="h4" gutterBottom>
        User Settings
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Box>
          <Typography variant="h6" gutterBottom>
            Profile Settings
          </Typography>
          {/* Add user settings content here */}
        </Box>
      </Paper>
    </Container>
  );
} 