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
} from '@mui/material';
import { SectionLabel } from '../SectionLabel';

const validationSchema = yup.object({
  username: yup
    .string()
    .required('Username is required'),
  password: yup
    .string()
    .required('Password is required')
});

interface LoginFormProps {
  onLoginSuccess: () => void;
}

export default function LoginForm({ onLoginSuccess }: LoginFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(false);
  const { login } = useAuth();

  const formik = useFormik({
    initialValues: {
      username: '',
      password: ''
    },
    validationSchema,
    onSubmit: async (values, { setSubmitting }) => {
      try {
        setError(null);
        console.log('Attempting login...');
        const response = await auth.login(values);
        console.log('Login response:', response);
        await login(response.token, response.user.role, rememberMe);
        console.log('Auth context updated');
        onLoginSuccess();
        console.log('Navigation callback called');
      } catch (err: any) {
        console.error('Login error:', err);
        setError(err.response?.data?.message || 'Failed to login');
      } finally {
        setSubmitting(false);
      }
    }
  });

  return (
    <Box 
      component="form" 
      onSubmit={formik.handleSubmit}
      sx={{ 
        position: 'relative',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 2
      }}
    >
      <SectionLabel text="@LoginFormFields" color="success.main" position="top-left" />
      
      {error && (
        <Alert severity="error">
          {error}
        </Alert>
      )}

      <TextField
        fullWidth
        id="username"
        name="username"
        label="Email"
        autoComplete="email"
        autoFocus
        value={formik.values.username}
        onChange={formik.handleChange}
        error={formik.touched.username && Boolean(formik.errors.username)}
        helperText={formik.touched.username && formik.errors.username}
        disabled={formik.isSubmitting}
        size="medium"
        sx={{ mb: 1 }}
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
        sx={{ mb: 1 }}
      />

      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        mb: 2
      }}>
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
      </Box>

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
  );
} 