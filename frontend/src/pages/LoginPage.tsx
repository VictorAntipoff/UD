import { Container, Paper, Typography } from '@mui/material';
import LoginForm from '../components/auth/LoginForm';

export default function LoginPage() {
  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography component="h1" variant="h5" align="center" gutterBottom>
          Sign in to UDesign
        </Typography>
        <LoginForm />
      </Paper>
    </Container>
  );
} 