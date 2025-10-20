import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button, TextField, Box, Typography, Container, Paper, Fade, IconButton, InputAdornment, Checkbox, FormControlLabel } from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';

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

const StyledTextField = styled(TextField)(() => ({
  '& .MuiOutlinedInput-root': {
    '&.Mui-focused fieldset': {
      borderColor: '#CC0000',
    },
  },
}));

const LoginPage = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [username, setUsername] = useState(() => {
    return localStorage.getItem('rememberedEmail') || '';
  });
  // SECURITY: Never load password from localStorage
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem('rememberedEmail') !== null;
  });
  const [error, setError] = useState('');
  const [shouldNavigate, setShouldNavigate] = useState(false);
  const { login, isLoading, isAuthenticated, user } = useAuth();

  // Navigate after successful login and user data is available
  useEffect(() => {
    if (shouldNavigate && isAuthenticated && user) {
      navigate('/dashboard', { replace: true });
      setShouldNavigate(false);
    }
  }, [shouldNavigate, isAuthenticated, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await login(username, password);

      // SECURITY: Only save email, NEVER save password in localStorage
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', username);
      } else {
        localStorage.removeItem('rememberedEmail');
      }

      // Always remove any previously stored password (security cleanup)
      localStorage.removeItem('rememberedPassword');

      // Set flag to trigger navigation after user state is updated
      setShouldNavigate(true);
    } catch (err: any) {
      // Extract error message from response
      const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message;

      // Show specific error messages
      if (errorMessage?.toLowerCase().includes('invalid credentials') ||
          errorMessage?.toLowerCase().includes('password')) {
        setError('Invalid email or password. Please try again.');
        enqueueSnackbar('Invalid email or password', { variant: 'error' });
      } else if (errorMessage?.toLowerCase().includes('email') ||
                 errorMessage?.toLowerCase().includes('user not found')) {
        setError('No account found with this email address.');
        enqueueSnackbar('Email not found', { variant: 'error' });
      } else {
        setError(errorMessage || 'Failed to login. Please try again.');
        enqueueSnackbar(errorMessage || 'Login failed', { variant: 'error' });
      }
    }
  };

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  return (
    <PageContainer>
      <Container maxWidth="xs" sx={{ position: 'relative' }}>
        <Fade in timeout={800}>
          <StyledPaper elevation={0}>
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
                type={showPassword ? 'text' : 'password'}
                id="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                size="small"
                sx={{ mb: 2 }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={handleClickShowPassword}
                        edge="end"
                        size="small"
                      >
                        {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    size="small"
                    sx={{
                      color: '#CC0000',
                      '&.Mui-checked': {
                        color: '#CC0000',
                      },
                    }}
                  />
                }
                label={
                  <Typography variant="body2" color="text.secondary">
                    Remember me
                  </Typography>
                }
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

export default LoginPage; 