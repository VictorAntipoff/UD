import { Box, Typography, Container, useTheme, useMediaQuery, Stack, Card, CardMedia, CardContent } from '@mui/material';
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

const float = keyframes`
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-20px);
  }
`;

const scaleIn = keyframes`
  from {
    opacity: 0;
    transform: scale(0.8);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
`;

const slideShow = keyframes`
  0% {
    opacity: 0;
    transform: translateX(-100px) scale(0.9);
  }
  10%, 30% {
    opacity: 1;
    transform: translateX(0) scale(1);
  }
  40% {
    opacity: 0;
    transform: translateX(100px) scale(0.9);
  }
  100% {
    opacity: 0;
  }
`;

const StyledContainer = styled(Container)(({ theme }) => ({
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
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
    backgroundImage: `
      linear-gradient(135deg, rgba(220, 38, 38, 0.03) 0%, transparent 50%),
      radial-gradient(circle at 80% 20%, rgba(15, 23, 42, 0.02) 0%, transparent 60%)
    `,
    pointerEvents: 'none'
  }
}));

const ContentBox = styled(Box)(({ theme }) => ({
  position: 'relative',
  zIndex: 1,
  textAlign: 'center',
  animation: `${fadeIn} 1s ease-out`,
  background: '#ffffff',
  borderRadius: theme.spacing(3),
  padding: theme.spacing(8, 6),
  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.02), 0 10px 20px rgba(0, 0, 0, 0.04)',
  maxWidth: '1200px',
  width: '100%',
  border: '1px solid rgba(226, 232, 240, 0.8)',
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(5, 3),
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

const ProductGrid = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: theme.spacing(3),
  marginTop: theme.spacing(4),
  marginBottom: theme.spacing(4),
  [theme.breakpoints.down('lg')]: {
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: theme.spacing(2.5),
  },
  [theme.breakpoints.down('sm')]: {
    gridTemplateColumns: '1fr',
    gap: theme.spacing(2),
  }
}));

const ProductCard = styled(Card)<{ index: number }>(({ theme, index }) => ({
  background: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: theme.spacing(2),
  overflow: 'hidden',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
  '&:hover': {
    transform: 'scale(1.03)',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.12)',
    borderColor: '#cbd5e1',
  }
}));

const ProductIconBox = styled(Box)(({ theme }) => ({
  width: '100%',
  padding: theme.spacing(5, 3),
  background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderBottom: '1px solid #e2e8f0',
  minHeight: '160px',
  position: 'relative',
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(4, 2),
    minHeight: '140px',
  }
}));

const ProductIcon = styled(Box)(({ theme }) => ({
  fontSize: '64px',
  transition: 'transform 0.3s ease',
  [theme.breakpoints.down('sm')]: {
    fontSize: '52px',
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

const InfoBanner = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2.5, 4),
  marginTop: theme.spacing(6),
  borderRadius: theme.spacing(1.5),
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(2, 3),
  }
}));

const ComingSoon = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const products = [
    { name: 'Premium Hardwood', icon: '🌳', description: 'Solid hardwood timber for construction and craftsmanship' },
    { name: 'Custom Furniture', icon: '🪑', description: 'Bespoke furniture pieces crafted to your specifications' },
    { name: 'Fabricated Wood', icon: '🔨', description: 'Engineered wood products for commercial applications' },
    { name: 'Wood Veneer', icon: '📐', description: 'High-quality decorative veneers in various finishes' },
  ];

  return (
    <StyledContainer maxWidth={false} disableGutters>
      <ContentBox>
        <LogoImage src="/logo.png" alt="UDesign Logo" />

        <AnimatedTitle
          variant={isMobile ? 'h3' : 'h2'}
          sx={{
            fontWeight: 700,
            color: '#0f172a',
            marginBottom: 2,
            letterSpacing: '-0.025em'
          }}
        >
          Welcome to UDesign
        </AnimatedTitle>

        <AnimatedSubtitle
          variant={isMobile ? 'h6' : 'h5'}
          sx={{
            color: '#475569',
            marginBottom: 4,
            fontWeight: 500,
            lineHeight: 1.6
          }}
        >
          Premium Hardwood & Custom Furniture Manufacturer
        </AnimatedSubtitle>

        <AnimatedText
          variant="body1"
          sx={{
            color: '#64748b',
            maxWidth: '750px',
            margin: '0 auto',
            lineHeight: 1.8,
            fontSize: isMobile ? '0.95rem' : '1rem',
            marginBottom: 5
          }}
        >
          We specialize in crafting exceptional furniture and supplying premium hardwood products. From solid timber
          and engineered wood to decorative veneers and custom furniture pieces, we bring quality craftsmanship
          and natural beauty to every project.
        </AnimatedText>

        <Typography
          variant="h6"
          sx={{
            color: '#334155',
            fontWeight: 600,
            marginTop: 2,
            marginBottom: 3,
            fontSize: isMobile ? '1rem' : '1.15rem',
            letterSpacing: '-0.01em'
          }}
        >
          Our Products
        </Typography>

        <ProductGrid>
          {products.map((product, index) => (
            <ProductCard key={index} index={index}>
              <ProductIconBox>
                <ProductIcon>{product.icon}</ProductIcon>
              </ProductIconBox>
              <CardContent sx={{ textAlign: 'center', py: 3, px: 2.5 }}>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 600,
                    color: '#1e293b',
                    marginBottom: 1,
                    fontSize: isMobile ? '1rem' : '1.05rem',
                    letterSpacing: '-0.01em'
                  }}
                >
                  {product.name}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: '#64748b',
                    fontSize: isMobile ? '0.875rem' : '0.9rem',
                    lineHeight: 1.7
                  }}
                >
                  {product.description}
                </Typography>
              </CardContent>
            </ProductCard>
          ))}
        </ProductGrid>

        <InfoBanner>
          <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="center">
            <ConstructionIcon sx={{ color: '#64748b', fontSize: 18 }} />
            <Typography
              variant="body2"
              sx={{
                color: '#475569',
                fontWeight: 500,
                fontSize: '0.875rem'
              }}
            >
              Website Coming Soon • Contact Us For Inquiries
            </Typography>
          </Stack>
        </InfoBanner>
      </ContentBox>
    </StyledContainer>
  );
};

export default ComingSoon;
