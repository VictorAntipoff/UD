import { Box, Typography, Container, TextField, Button, Link as MuiLink, useMediaQuery, styled, keyframes } from '@mui/material';
import { useState, useEffect } from 'react';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import axios from 'axios';

// Create a simple axios instance for public API calls
const publicApi = axios.create({
  baseURL: 'http://localhost:3010/api',
});

const logoRed = '#dc2626';

interface CarouselImage {
  src: string;
  alt: string;
  title?: string;
  description?: string;
}

interface PageContent {
  mainTitle: string;
  highlightedWord: string;
  subtitle: string;
  phone: string;
  email: string;
  carouselImages: CarouselImage[];
  logoUrl: string;
}

// Keyframes for animations
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

const MainContainer = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  minHeight: '100vh',
  backgroundColor: '#ffffff',
  color: '#1f2937',
  margin: 0,
  padding: 0,
});

const ContactBar = styled(Box)({
  backgroundColor: '#f3f4f6',
  padding: '8px 0',
  fontSize: '0.875rem',
  borderBottom: '1px solid #e5e7eb',
});

const ContentSection = styled(Container)({
  flex: 1,
  padding: '24px 16px',
  '@media (min-width: 768px)': {
    padding: '48px 16px',
  },
  '@media (min-width: 1024px)': {
    padding: '64px 16px',
  },
});

const AnimatedTitle = styled(Typography)({
  animation: `${slideInLeft} 0.8s ease-out`,
});

const AnimatedSubtitle = styled(Typography)({
  animation: `${fadeIn} 1s ease-out 0.3s both`,
});

const ImageCarouselContainer = styled(Box)({
  animation: `${slideInRight} 0.8s ease-out 0.2s both`,
});

const DiagonalDivider = styled('div')({
  position: 'relative',
  height: '48px',
  '& svg': {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: '48px',
  },
  '@media (max-width: 640px)': {
    height: '32px',
    '& svg': {
      height: '32px',
    },
  },
});

const ComingSoon = () => {
  const isMobile = useMediaQuery('(max-width:1024px)');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState<PageContent | null>(null);

  // Remove body margin/padding for this page
  useEffect(() => {
    // Store original styles
    const originalMargin = document.body.style.margin;
    const originalPadding = document.body.style.padding;
    const originalOverflow = document.body.style.overflow;

    // Apply styles
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.overflow = 'auto';

    // Cleanup on unmount
    return () => {
      document.body.style.margin = originalMargin;
      document.body.style.padding = originalPadding;
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Load page content from database
  useEffect(() => {
    const fetchContent = async () => {
      try {
        // This endpoint doesn't require authentication as it's public
        const response = await publicApi.get('/website/public/coming-soon');
        if (response.data && response.data.content) {
          setContent(response.data.content);
        } else {
          // Use default content if no data from API
          setContent({
            mainTitle: 'Crafting Visions in Wood',
            highlightedWord: 'Bold',
            subtitle: 'Our website is under construction, but our passion for creating extraordinary wood furniture never stops.',
            phone: '+255 743 777333',
            email: 'info@udesign.co.tz',
            logoUrl: '/logo.png',
            carouselImages: [],
          });
        }
      } catch (error) {
        console.log('Using default content');
        // Use default content on error
        setContent({
          mainTitle: 'Crafting Visions in Wood',
          highlightedWord: 'Bold',
          subtitle: 'Our website is under construction, but our passion for creating extraordinary wood furniture never stops.',
          phone: '+255 743 777333',
          email: 'info@udesign.co.tz',
          logoUrl: '/logo.png',
          carouselImages: [],
        });
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, []);

  // Auto-advance carousel
  useEffect(() => {
    if (!content || !content.carouselImages || content.carouselImages.length === 0) return;

    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % content.carouselImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [content]);

  const handlePrevImage = () => {
    if (!content || !content.carouselImages) return;
    setCurrentImageIndex((prev) => (prev === 0 ? content.carouselImages.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    if (!content || !content.carouselImages) return;
    setCurrentImageIndex((prev) => (prev + 1) % content.carouselImages.length);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');

    // Simulate API call
    setTimeout(() => {
      setStatus('success');
      setEmail('');
      setTimeout(() => setStatus('idle'), 3000);
    }, 1000);
  };

  // Show nothing while loading to prevent flicker
  if (loading || !content) {
    return null;
  }

  return (
    <MainContainer>
      {/* Contact Bar */}
      <ContactBar>
        <Container maxWidth="lg" sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PhoneIcon sx={{ fontSize: 16, color: logoRed }} />
            <MuiLink href={`tel:${content.phone}`} sx={{ color: 'inherit', textDecoration: 'none', '&:hover': { color: logoRed } }}>
              {content.phone}
            </MuiLink>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <EmailIcon sx={{ fontSize: 16, color: logoRed }} />
            <MuiLink href={`mailto:${content.email}`} sx={{ color: 'inherit', textDecoration: 'none', '&:hover': { color: logoRed } }}>
              {content.email}
            </MuiLink>
          </Box>
        </Container>
      </ContactBar>

      {/* Main Content */}
      <ContentSection maxWidth="lg">
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: { xs: 3, sm: 4, lg: 6 }, alignItems: 'center' }}>
          {/* Left Column */}
          <Box sx={{ order: { xs: 2, lg: 1 } }}>
            {/* Logo */}
            <Box sx={{ mb: { xs: 2, sm: 3, lg: 4 } }}>
              <img
                src={content.logoUrl}
                alt="UDesign Logo"
                style={{ width: isMobile ? '150px' : '200px', height: 'auto' }}
              />
            </Box>

            {/* Title */}
            <AnimatedTitle
              variant="h1"
              sx={{
                fontSize: { xs: '1.75rem', sm: '2.25rem', lg: '2.75rem', xl: '3.25rem' },
                fontWeight: 700,
                lineHeight: 1.2,
                mb: { xs: 1.5, sm: 2 },
              }}
            >
              {content.mainTitle} <span style={{ color: logoRed }}>{content.highlightedWord}</span>
            </AnimatedTitle>

            {/* Subtitle */}
            <AnimatedSubtitle
              variant="body1"
              sx={{
                fontSize: { xs: '0.875rem', sm: '1rem', lg: '1.125rem' },
                color: '#6b7280',
                mb: { xs: 2, sm: 3 },
              }}
            >
              {content.subtitle}
            </AnimatedSubtitle>

            {/* Newsletter Form */}
            <Box component="form" onSubmit={handleSubmit} sx={{ maxWidth: '448px' }}>
              <Box sx={{ position: 'relative' }}>
                <TextField
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  fullWidth
                  disabled={status === 'loading' || status === 'success'}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: '#f3f4f6',
                      fontSize: { xs: '0.875rem', sm: '1rem' },
                      '& fieldset': {
                        borderColor: status === 'idle' ? '#e5e7eb' : logoRed,
                        borderWidth: 2,
                      },
                      '&:hover fieldset': {
                        borderColor: logoRed,
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: logoRed,
                      },
                    },
                  }}
                  InputProps={{
                    endAdornment: (
                      <Button
                        type="submit"
                        disabled={status === 'loading' || status === 'success'}
                        sx={{
                          position: 'absolute',
                          right: 8,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          backgroundColor: logoRed,
                          color: '#fff',
                          px: { xs: 2, sm: 3 },
                          fontSize: { xs: '0.875rem', sm: '1rem' },
                          textTransform: 'none',
                          '&:hover': {
                            backgroundColor: '#b91c1c',
                          },
                        }}
                      >
                        {status === 'loading' ? 'Sending...' : 'Notify Me'}
                      </Button>
                    ),
                  }}
                />
              </Box>
              {status === 'success' && (
                <Typography sx={{ mt: 2, color: '#10b981', fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                  Thank you! You've been added to our mailing list.
                </Typography>
              )}
            </Box>
          </Box>

          {/* Right Column - Carousel */}
          <ImageCarouselContainer sx={{ order: { xs: 1, lg: 2 } }}>
            <Box
              sx={{
                position: 'relative',
                width: '100%',
                maxWidth: { xs: '250px', sm: '320px', md: '380px', lg: '100%' },
                aspectRatio: '1',
                borderRadius: '50%',
                overflow: 'hidden',
                border: `3px solid ${logoRed}`,
                mx: 'auto',
              }}
            >
              {/* Carousel Images */}
              {content.carouselImages && content.carouselImages.map((image, index) => (
                <Box
                  key={index}
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    opacity: index === currentImageIndex ? 1 : 0,
                    transition: 'opacity 1s ease-in-out',
                    pointerEvents: index === currentImageIndex ? 'auto' : 'none',
                  }}
                >
                  <img
                    src={image.src}
                    alt={image.alt}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  {/* Image caption overlay */}
                  <Box
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Box
                      sx={{
                        position: 'absolute',
                        inset: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                      }}
                    />
                    <Box sx={{ position: 'relative', zIndex: 1, textAlign: 'center', px: 3, py: 2, maxWidth: '280px' }}>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: '#fff', fontSize: { xs: '1rem', sm: '1.125rem' }, textTransform: 'uppercase', mb: 1 }}>
                        {image.title}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                        {image.description}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              ))}

              {/* Navigation Arrows */}
              <Button
                onClick={handlePrevImage}
                sx={{
                  position: 'absolute',
                  left: 16,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  minWidth: 'auto',
                  width: 32,
                  height: 32,
                  p: 0,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255, 255, 255, 0.8)',
                  zIndex: 20,
                  '&:hover': {
                    backgroundColor: '#fff',
                  },
                }}
              >
                <ChevronLeftIcon sx={{ color: logoRed, fontSize: 20 }} />
              </Button>
              <Button
                onClick={handleNextImage}
                sx={{
                  position: 'absolute',
                  right: 16,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  minWidth: 'auto',
                  width: 32,
                  height: 32,
                  p: 0,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255, 255, 255, 0.8)',
                  zIndex: 20,
                  '&:hover': {
                    backgroundColor: '#fff',
                  },
                }}
              >
                <ChevronRightIcon sx={{ color: logoRed, fontSize: 20 }} />
              </Button>

              {/* Indicators */}
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 16,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  display: 'flex',
                  gap: 1,
                  zIndex: 20,
                }}
              >
                {content.carouselImages && content.carouselImages.map((_, index) => (
                <Box
                  key={index}
                  onClick={() => setCurrentImageIndex(index)}
                  sx={{
                    width: index === currentImageIndex ? 16 : 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: index === currentImageIndex ? '#fff' : 'rgba(255, 255, 255, 0.5)',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                  }}
                />
                ))}
              </Box>
            </Box>

            {/* Coming Soon Badge */}
            <Box
              sx={{
                position: 'absolute',
                bottom: { xs: -12, sm: -20 },
                left: { xs: -12, sm: -20 },
                backgroundColor: '#1f2937',
                color: '#fff',
                p: { xs: 1, sm: 1.5 },
                borderRadius: 1.5,
                boxShadow: '0 8px 20px rgba(0, 0, 0, 0.2)',
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 700, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                Coming Soon
              </Typography>
              <Typography variant="body2" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                Unveiling our craftsmanship
              </Typography>
            </Box>
          </ImageCarouselContainer>
        </Box>
      </ContentSection>

      {/* Diagonal Divider */}
      <DiagonalDivider>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none">
          <polygon fill={logoRed} points="0,100 100,0 100,100" />
        </svg>
      </DiagonalDivider>

      {/* Footer */}
      <Box sx={{ backgroundColor: logoRed, color: '#fff', py: { xs: 2, sm: 2.5 } }}>
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box sx={{ mb: { xs: 1.5, md: 0 } }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5, fontSize: { xs: '1rem', sm: '1.125rem' } }}>
                Contact Us
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <PhoneIcon sx={{ fontSize: 14 }} />
                <MuiLink href={`tel:${content.phone}`} sx={{ color: '#fff', textDecoration: 'none', fontSize: { xs: '0.875rem', sm: '1rem' }, '&:hover': { color: '#fecaca' } }}>
                  {content.phone}
                </MuiLink>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <EmailIcon sx={{ fontSize: 14 }} />
                <MuiLink href={`mailto:${content.email}`} sx={{ color: '#fff', textDecoration: 'none', fontSize: { xs: '0.875rem', sm: '1rem' }, '&:hover': { color: '#fecaca' } }}>
                  {content.email}
                </MuiLink>
              </Box>
            </Box>
            <Typography variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
              Stay connected with us for updates
            </Typography>
          </Box>
          <Box sx={{ borderTop: '1px solid rgba(254, 202, 202, 0.3)', pt: 1.5, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
              &copy; 2025 uDesign. All rights reserved.
            </Typography>
          </Box>
        </Container>
      </Box>
    </MainContainer>
  );
};

export default ComingSoon;
