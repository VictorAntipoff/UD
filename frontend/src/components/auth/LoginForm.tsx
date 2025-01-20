import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button, TextField, Box, Typography, Container, Paper, Fade } from '@mui/material';
import { styled } from '@mui/material/styles';
import { useDevelopment } from '../../contexts/DevelopmentContext';

const PageContainer = styled(Box)(({ theme }) => ({
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
  padding: theme.spacing(3)
}));

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4, 4, 5),
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  backgroundColor: 'rgba(255, 255, 255, 0.95)',
  maxWidth: '400px',
  width: '100%',
  minHeight: '520px',
  borderRadius: '12px',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
  backdropFilter: 'blur(10px)',
  transition: 'all 0.3s ease-in-out',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: '0 12px 48px rgba(0, 0, 0, 0.12)'
  }
}));

const Logo = styled('img')({
  width: '180px',
  marginBottom: '2rem',
  height: 'auto',
  transition: 'transform 0.3s ease-in-out',
  '&:hover': {
    transform: 'scale(1.05)'
  }
});

const DevTag = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: theme.spacing(2),
  right: theme.spacing(2),
  padding: theme.spacing(0.5, 1.5),
  borderRadius: '20px',
  backgroundColor: theme.palette.warning.main,
  color: theme.palette.warning.contrastText,
  fontSize: '0.75rem',
  fontWeight: 'bold',
  opacity: 0.9,
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
}));

const StyledTextField = styled(TextField)(() => ({
  '& .MuiOutlinedInput-root': {
    '&.Mui-focused fieldset': {
      borderColor: '#CC0000',
    },
  },
}));

const LoginForm = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, isLoading } = useAuth();
  const { showLabels } = useDevelopment();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await login(username, password);
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Failed to login. Please try again.');
    }
  };

  return (
    <PageContainer>
      <Container maxWidth="xs" sx={{ position: 'relative' }}>
        <Fade in timeout={800}>
          <StyledPaper elevation={0}>
            {showLabels && (
              <DevTag>Development Mode</DevTag>
            )}
            <Logo src="/logo.png" alt="UDesign Logo" />
            
            <Typography 
              variant="h5" 
              gutterBottom 
              sx={{ 
                fontWeight: 600,
                color: '#1a1a1a',
                mb: 0.5
              }}
            >
              Welcome back!
            </Typography>
            
            <Typography 
              variant="body2" 
              sx={{ 
                color: 'text.secondary',
                mb: 4,
                textAlign: 'center'
              }}
            >
              Sign in to continue to your dashboard
            </Typography>
            
            {error && (
              <Fade in timeout={300}>
                <Typography 
                  color="error" 
                  sx={{ 
                    py: 1,
                    px: 2,
                    textAlign: 'center',
                    backgroundColor: 'rgba(211, 47, 47, 0.1)',
                    color: 'error.main',
                    borderRadius: '8px',
                    width: '100%',
                    fontSize: '0.875rem',
                    mb: 2
                  }}
                >
                  {error}
                </Typography>
              </Fade>
            )}

            <Box 
              component="form" 
              onSubmit={handleSubmit} 
              sx={{ 
                width: '100%',
                mt: 2
              }}
            >
              <StyledTextField
                required
                fullWidth
                id="username"
                label="Username"
                name="username"
                autoComplete="username"
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
                size="small"
                sx={{ mb: 2 }}
              />
              <StyledTextField
                required
                fullWidth
                name="password"
                label="Password"
                type="password"
                id="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                size="small"
                sx={{ mb: 3 }}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ 
                  py: 1.2,
                  backgroundColor: '#CC0000',
                  borderRadius: '8px',
                  textTransform: 'none',
                  fontSize: '1rem',
                  fontWeight: 500,
                  boxShadow: '0 4px 12px rgba(204, 0, 0, 0.2)',
                  '&:hover': {
                    backgroundColor: '#990000',
                    boxShadow: '0 6px 16px rgba(204, 0, 0, 0.3)'
                  }
                }}
                disabled={isLoading}
              >
                {isLoading ? 'Signing in...' : 'Sign in'}
              </Button>
            </Box>
          </StyledPaper>
        </Fade>
      </Container>
    </PageContainer>
  );
};

export default LoginForm; 