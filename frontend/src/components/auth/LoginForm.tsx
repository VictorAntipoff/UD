import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useFormik } from 'formik';
import * as yup from 'yup';
import { auth } from '../../services/api';
import {
  Box,
  TextField,
  Button,
  FormControlLabel,
  Checkbox,
  Alert,
  CircularProgress,
  Paper,
} from '@mui/material';
import { SectionLabel } from '../SectionLabel';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { LoginResponse } from '../../types/auth';

interface LoginFormProps {
  onLoginSuccess?: () => void;
}

const validationSchema = yup.object({
  username: yup
    .string()
    .required('Username is required'),
  password: yup
    .string()
    .required('Password is required')
});

export default function LoginForm({ onLoginSuccess }: LoginFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const formik = useFormik({
    initialValues: {
      username: '',
      password: ''
    },
    validationSchema,
    onSubmit: async (values, { setSubmitting }) => {
      try {
        setError(null);
        console.log('Login attempt with:', { 
          username: values.username,
          passwordLength: values.password.length 
        });

        // First, validate credentials locally
        if (!values.username || !values.password) {
          setError('Username and password are required');
          return;
        }

        // Attempt login
        const response = await axios.post<LoginResponse>(
          `${import.meta.env.VITE_API_URL}/api/auth/login`,
          values
        );

        // Validate response
        if (!response.data || !response.data.token || !response.data.user) {
          console.error('Invalid response:', response);
          setError('Invalid server response');
          return;
        }

        // Attempt to set auth context
        try {
          await login(response.data.token, response.data.user.role, rememberMe);
          console.log('Login successful, navigating...');
          navigate('/');
        } catch (authError: any) {
          console.error('Auth context error:', authError);
          setError('Failed to set authentication');
        }

        if (onLoginSuccess) {
          onLoginSuccess();
        }

      } catch (err: any) {
        console.error('Unexpected error:', err);
        setError('An unexpected error occurred');
      } finally {
        setSubmitting(false);
      }
    }
  });

  return (
    <Paper 
      elevation={3}
      sx={{ 
        position: 'relative',
        p: 4,
        maxWidth: 400,
        width: '100%',
        mx: 'auto',
        mt: 8
      }}
    >
      <SectionLabel text="@LoginForm" color="primary.main" position="top-left" />
      
      <Box 
        component="form" 
        onSubmit={formik.handleSubmit}
        sx={{ 
          display: 'flex',
          flexDirection: 'column',
          gap: 3
        }}
      >
        <SectionLabel text="@LoginFormFields" color="success.main" position="top-right" />
        
        {error && (
          <Alert severity="error">
            {error}
          </Alert>
        )}

        <TextField
          fullWidth
          id="username"
          name="username"
          label="Username"
          autoComplete="username"
          autoFocus
          value={formik.values.username}
          onChange={formik.handleChange}
          error={formik.touched.username && Boolean(formik.errors.username)}
          helperText={formik.touched.username && formik.errors.username}
          disabled={formik.isSubmitting}
          size="medium"
        />

        <TextField
          fullWidth
          id="password"
          name="password"
          label="Password"
          type="password"
          autoComplete="current-password"
          value={formik.values.password}
          onChange={formik.handleChange}
          error={formik.touched.password && Boolean(formik.errors.password)}
          helperText={formik.touched.password && formik.errors.password}
          disabled={formik.isSubmitting}
          size="medium"
        />

        <FormControlLabel
          control={
            <Checkbox
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              color="primary"
              disabled={formik.isSubmitting}
              size="small"
            />
          }
          label="Remember me"
        />

        <Button
          type="submit"
          fullWidth
          variant="contained"
          disabled={formik.isSubmitting}
          sx={{ 
            py: 1.5,
            textTransform: 'none',
            fontSize: '1rem'
          }}
        >
          {formik.isSubmitting ? (
            <CircularProgress size={24} color="inherit" />
          ) : (
            'Sign In'
          )}
        </Button>
      </Box>
    </Paper>
  );
} 