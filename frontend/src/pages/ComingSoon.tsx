import { Box, Typography, Container, useTheme, useMediaQuery } from '@mui/material';
import { styled, keyframes } from '@mui/material/styles';
import ConstructionIcon from '@mui/icons-material/Construction';

const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const slideInLeft = keyframes`
  from {
    opacity: 0;
    transform: translateX(-50px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
`;

const slideInRight = keyframes`
  from {
    opacity: 0;
    transform: translateX(50px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
`;

const pulse = keyframes`
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.08);
  }
`;

const rotate = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

const shimmer = keyframes`
  0% {
    background-position: -1000px 0;
  }
  100% {
    background-position: 1000px 0;
  }
`;

const glow = keyframes`
  0%, 100% {
    box-shadow: 0 8px 20px rgba(220, 38, 38, 0.2), 0 0 30px rgba(220, 38, 38, 0.1);
  }
  50% {
    box-shadow: 0 10px 30px rgba(220, 38, 38, 0.3), 0 0 40px rgba(220, 38, 38, 0.15);
  }
`;

const StyledContainer = styled(Container)(({ theme }) => ({
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#ffffff',
  padding: theme.spacing(3),
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: `
      radial-gradient(circle at 20% 80%, rgba(220, 38, 38, 0.03) 0%, transparent 50%),
      radial-gradient(circle at 80% 20%, rgba(220, 38, 38, 0.03) 0%, transparent 50%),
      radial-gradient(circle at 50% 50%, rgba(254, 226, 226, 0.4) 0%, transparent 60%)
    `,
    pointerEvents: 'none'
  },
  '&::after': {
    content: '""',
    position: 'absolute',
    top: '-50%',
    left: '-50%',
    width: '200%',
    height: '200%',
    background: `
      repeating-linear-gradient(
        45deg,
        transparent,
        transparent 20px,
        rgba(220, 38, 38, 0.01) 20px,
        rgba(220, 38, 38, 0.01) 40px
      )
    `,
    animation: `${rotate} 60s linear infinite`,
    pointerEvents: 'none'
  }
}));

const ContentBox = styled(Box)(({ theme }) => ({
  position: 'relative',
  zIndex: 1,
  textAlign: 'center',
  animation: `${fadeIn} 1s ease-out`,
  background: '#ffffff',
  borderRadius: theme.spacing(4),
  padding: theme.spacing(6, 4),
  boxShadow: '0 4px 20px rgba(220, 38, 38, 0.08), 0 1px 3px rgba(0, 0, 0, 0.05)',
  maxWidth: '800px',
  width: '100%',
  border: '2px solid rgba(220, 38, 38, 0.1)',
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(4, 3),
    borderRadius: theme.spacing(3),
  }
}));

const LogoImage = styled('img')(({ theme }) => ({
  width: '220px',
  height: 'auto',
  marginBottom: theme.spacing(4),
  [theme.breakpoints.down('sm')]: {
    width: '160px',
    marginBottom: theme.spacing(3),
  }
}));

const IconWrapper = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '90px',
  height: '90px',
  borderRadius: '50%',
  background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.1) 0%, rgba(254, 226, 226, 0.3) 100%)',
  border: '3px solid rgba(220, 38, 38, 0.2)',
  animation: `${glow} 2.5s ease-in-out infinite, ${pulse} 2.5s ease-in-out infinite`,
  position: 'absolute',
  top: theme.spacing(6),
  right: theme.spacing(4),
  '&::before': {
    content: '""',
    position: 'absolute',
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.1), rgba(254, 226, 226, 0.2), rgba(220, 38, 38, 0.1))',
    opacity: 0.4,
    filter: 'blur(8px)',
    zIndex: -1,
    animation: `${rotate} 4s linear infinite`
  },
  [theme.breakpoints.down('sm')]: {
    width: '70px',
    height: '70px',
    top: theme.spacing(4),
    right: theme.spacing(3),
  }
}));

const AnimatedTitle = styled(Typography)(({ theme }) => ({
  animation: `${slideInLeft} 0.8s ease-out 0.3s both`
}));

const AnimatedSubtitle = styled(Typography)(({ theme }) => ({
  animation: `${slideInRight} 0.8s ease-out 0.5s both`
}));

const AnimatedText = styled(Typography)(({ theme }) => ({
  animation: `${fadeIn} 1s ease-out 0.7s both`
}));

const ShimmerBox = styled(Box)(({ theme }) => ({
  background: 'linear-gradient(90deg, transparent, rgba(220, 38, 38, 0.05), transparent)',
  backgroundSize: '1000px 100%',
  animation: `${shimmer} 3s infinite`,
  padding: theme.spacing(3),
  marginTop: theme.spacing(4),
  borderTop: '2px solid rgba(220, 38, 38, 0.1)',
  borderRadius: theme.spacing(2),
  backgroundColor: 'rgba(254, 226, 226, 0.2)'
}));

const ComingSoon = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <StyledContainer maxWidth={false} disableGutters>
      <ContentBox>
        <LogoImage src="/logo.png" alt="UDesign Logo" />

        <IconWrapper>
          <ConstructionIcon
            sx={{
              fontSize: isMobile ? 32 : 40,
              color: '#dc2626'
            }}
          />
        </IconWrapper>

        <AnimatedTitle
          variant={isMobile ? 'h3' : 'h2'}
          sx={{
            fontWeight: 800,
            background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: 2,
            letterSpacing: '-0.02em'
          }}
        >
          Coming Soon
        </AnimatedTitle>

        <AnimatedSubtitle
          variant={isMobile ? 'h6' : 'h5'}
          sx={{
            color: '#4a5568',
            marginBottom: 3,
            fontWeight: 500,
            lineHeight: 1.6
          }}
        >
          We're working hard to bring you something amazing
        </AnimatedSubtitle>

        <AnimatedText
          variant="body1"
          sx={{
            color: '#718096',
            maxWidth: '600px',
            margin: '0 auto',
            lineHeight: 1.8,
            fontSize: isMobile ? '0.95rem' : '1.1rem'
          }}
        >
          Our website is currently under construction. We're building a powerful platform
          to manage your operations efficiently. Stay tuned for updates!
        </AnimatedText>

        <ShimmerBox>
          <Typography
            variant="body2"
            sx={{
              color: '#dc2626',
              fontWeight: 600
            }}
          >
            For system access, please contact your administrator
          </Typography>
        </ShimmerBox>
      </ContentBox>
    </StyledContainer>
  );
};

export default ComingSoon;
