import { Box, Typography, Button } from '@mui/material';
import { useNavigate, useRouteError } from 'react-router-dom';

export const ErrorPage = () => {
  const error = useRouteError();
  const navigate = useNavigate();

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="100vh"
      gap={2}
    >
      <Typography variant="h1">Oops!</Typography>
      <Typography variant="h4">Sorry, an unexpected error has occurred.</Typography>
      <Typography variant="body1" color="text.secondary">
        {(error as Error)?.message || 'Unknown error occurred'}
      </Typography>
      <Button variant="contained" onClick={() => navigate('/')}>
        Go Home
      </Button>
    </Box>
  );
};

export default ErrorPage; 