import { Paper, Typography, Box, keyframes, Container } from '@mui/material';
import LoginForm from '../../components/auth/LoginForm';
import { SectionLabel } from '../../components/SectionLabel';
import { DevTools } from '../../components/DevTools';
import { useNavigate } from 'react-router-dom';

// Define the floating animation
const float = keyframes`
  0% { transform: translate(0, 0); }
  50% { transform: translate(-10px, 10px); }
  100% { transform: translate(0, 0); }
`;

const float2 = keyframes`
  0% { transform: translate(0, 0); }
  50% { transform: translate(10px, -10px); }
  100% { transform: translate(0, 0); }
`;

export default function LoginPage() {
  const navigate = useNavigate();

  const handleLoginSuccess = () => {
    console.log('Navigating to homepage...');
    navigate('/');
  };

  return (
    <Box 
      sx={{ 
        position: 'relative',
        minHeight: '100vh',
        background: '#f5f5f5',
        overflow: 'hidden'
      }}
    >
      <SectionLabel text="@LoginPage" color="primary.main" position="top-left" />
      <DevTools />
      
      {/* Animated decorative circles */}
      <Box
        sx={{
          position: 'absolute',
          top: -100,
          right: -100,
          width: 300,
          height: 300,
          borderRadius: '50%',
          background: 'rgba(204, 0, 0, 0.05)',
          animation: `${float} 6s ease-in-out infinite`
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: -150,
          left: -150,
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: 'rgba(204, 0, 0, 0.05)',
          animation: `${float2} 8s ease-in-out infinite`
        }}
      />

      <Container 
        maxWidth={false}
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          zIndex: 1
        }}
      >
        <Box
          sx={{
            width: '100%',
            maxWidth: 400,
            position: 'relative'
          }}
        >
          <SectionLabel text="@LoginForm" color="info.main" position="top-right" />
          
          <Paper 
            elevation={3} 
            sx={{ 
              p: 4,
              width: '100%',
              maxWidth: '400px',
              bgcolor: 'white',
              borderRadius: 2,
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
              '& > *': {
                mb: 3
              },
              '& > *:last-child': {
                mb: 0
              }
            }}
          >
            <Box sx={{ position: 'relative', mb: 4 }}>
              <SectionLabel text="@Logo" color="warning.main" position="top-left" />
              <Box
                component="img"
                src="/logo.png"
                alt="UDesign Logo"
                sx={{
                  width: '150px',
                  height: 'auto',
                  display: 'block',
                  mx: 'auto',
                  mb: 3
                }}
              />
            </Box>

            <Typography 
              variant="h5" 
              component="h1" 
              gutterBottom 
              color="#1a1a1a"
              textAlign="center"
              fontWeight="500"
              sx={{ mb: 1 }}
            >
              Welcome Back
            </Typography>
            
            <Typography 
              variant="body2" 
              color="text.secondary" 
              textAlign="center"
              sx={{ mb: 4 }}
            >
              Please sign in to continue
            </Typography>

            <LoginForm onLoginSuccess={handleLoginSuccess} />
          </Paper>
        </Box>
      </Container>
    </Box>
  );
} 