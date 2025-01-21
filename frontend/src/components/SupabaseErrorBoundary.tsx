import { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Button } from '@mui/material';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class SupabaseErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Supabase error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h6" color="error" gutterBottom>
            Database Connection Error
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Unable to connect to the database. Please try again later.
          </Typography>
          <Button
            variant="contained"
            onClick={() => window.location.reload()}
            color="primary"
          >
            Retry Connection
          </Button>
        </Box>
      );
    }

    return this.props.children;
  }
} 