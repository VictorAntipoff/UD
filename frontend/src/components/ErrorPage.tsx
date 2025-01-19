import { Box, Typography, Button } from '@mui/material';

export const ErrorPage = () => {
  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="100vh"
      p={3}
    >
      <Typography variant="h4" component="h1" gutterBottom>
        Something went wrong
      </Typography>
      <Typography color="text.secondary" paragraph>
        Please try again or contact support if the problem persists.
      </Typography>
      <Button
        variant="contained"
        color="primary"
        onClick={() => window.location.reload()}
      >
        Reload Page
      </Button>
    </Box>
  );
}; 