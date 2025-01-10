import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  Checkbox,
  FormControlLabel,
  Stack
} from '@mui/material';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

// === Login Page Component ===
// File: src/pages/LoginPage.tsx
// Description: Handles user authentication and login form

export default function LoginPage() {
  // === State Management ===
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    rememberMe: false
  });

  // === Form Submission Handler ===
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      console.log('Attempting login with:', formData.username);

      const response = await axios.post('http://localhost:3020/api/auth/login', {
        username: formData.username,
        password: formData.password
      });

      console.log('Login response:', response.data);

      if (response.data.token && response.data.user) {
        console.log('Login successful, calling login function');
        login(
          response.data.token,
          response.data.user.role,
          formData.rememberMe
        );
        
        console.log('Login function called, navigating to home');
        navigate('/', { replace: true });
      } else {
        console.error('Invalid response format:', response.data);
        setError('Unexpected response from server');
      }
    } catch (err: any) {
      console.error('Login error:', err.response || err);
      if (err.response?.status === 400) {
        setError('Invalid username or password. Please try again.');
      } else if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('An error occurred while trying to log in. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // === Form Input Handler ===
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'rememberMe' ? checked : value
    }));
  };

  // === Login Page UI ===
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#f5f5f5',
        background: 'linear-gradient(135deg, #CC0000 0%, #990000 100%)'
      }}
    >
      <Card sx={{ 
        maxWidth: 450, 
        width: '100%', 
        mx: 2,
        boxShadow: '0 8px 20px rgba(0,0,0,0.12)',
        borderRadius: 2
      }}>
        <CardContent sx={{ p: 4 }}>
          <Stack spacing={3} alignItems="center">
            <Box
              component="img"
              src="/logo.png"
              alt="UDesign Logo"
              sx={{
                height: 80,
                objectFit: 'contain',
                mb: 2
              }}
            />
            
            <Typography 
              variant="h5" 
              component="h1" 
              gutterBottom 
              fontWeight="bold"
              color="#CC0000"
              textAlign="center"
            >
              Welcome Back
            </Typography>
            
            <Typography 
              variant="body2" 
              color="text.secondary" 
              textAlign="center"
              sx={{ mb: 2 }}
            >
              Please sign in to your account to continue
            </Typography>

            {error && (
              <Alert 
                severity="error" 
                sx={{ 
                  width: '100%',
                  mb: 2
                }}
              >
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit} style={{ width: '100%' }}>
              <Stack spacing={2.5} width="100%">
                <TextField
                  fullWidth
                  label="Username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  variant="outlined"
                  required
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '&:hover fieldset': {
                        borderColor: '#CC0000',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#CC0000',
                      }
                    },
                    '& .MuiInputLabel-root.Mui-focused': {
                      color: '#CC0000'
                    }
                  }}
                />
                
                <TextField
                  fullWidth
                  label="Password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  variant="outlined"
                  required
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '&:hover fieldset': {
                        borderColor: '#CC0000',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#CC0000',
                      }
                    },
                    '& .MuiInputLabel-root.Mui-focused': {
                      color: '#CC0000'
                    }
                  }}
                />

                <FormControlLabel
                  control={
                    <Checkbox
                      name="rememberMe"
                      checked={formData.rememberMe}
                      onChange={handleChange}
                      sx={{
                        color: '#CC0000',
                        '&.Mui-checked': {
                          color: '#CC0000',
                        },
                      }}
                    />
                  }
                  label="Remember me"
                />

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={isLoading}
                  sx={{
                    mt: 2,
                    py: 1.5,
                    bgcolor: '#CC0000',
                    '&:hover': {
                      bgcolor: '#990000',
                    },
                    textTransform: 'none',
                    fontSize: '1rem',
                    fontWeight: 500
                  }}
                >
                  {isLoading ? 'Signing in...' : 'Sign In'}
                </Button>
              </Stack>
            </form>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
} 