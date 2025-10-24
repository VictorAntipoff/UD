import { Box, Typography, Container, TextField, Button, Link as MuiLink, useMediaQuery, styled, keyframes } from '@mui/material';
import { useState, useEffect } from 'react';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useSnackbar } from 'notistack';
import axios from 'axios';

// Create a simple axios instance for public API calls
const getApiUrl = () => {
  const baseUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || 'http://localhost:3010';
  // Add /api if not already present
  return baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`;
};

const publicApi = axios.create({
  baseURL: getApiUrl(),
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

// Ken Burns effect - slow pan and zoom for carousel images
const kenBurnsEffect = keyframes`
  0% {
    transform: scale(1) translateX(0);
  }
  50% {
    transform: scale(1.1) translateX(-5%);
  }
  100% {
    transform: scale(1) translateX(0);
  }
`;

// Alternative: pan from left to right
const panLeftToRight = keyframes`
  0% {
    transform: scale(1.15) translateX(-5%);
  }
  100% {
    transform: scale(1.15) translateX(5%);
  }
`;

// Alternative: zoom in slowly
const zoomIn = keyframes`
  0% {
    transform: scale(1);
  }
  100% {
    transform: scale(1.15);
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
  display: 'flex',
  alignItems: 'center',
  padding: '24px 16px',
  '@media (min-width: 768px)': {
    padding: '32px 16px',
  },
  '@media (min-width: 1024px)': {
    padding: '48px 16px',
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
  const { enqueueSnackbar } = useSnackbar();
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

    try {
      await publicApi.post('/crm/newsletter/subscribe', { email });
      setStatus('success');
      setEmail('');
      enqueueSnackbar('Thank you! You have been added to our mailing list.', { variant: 'success' });
      setTimeout(() => setStatus('idle'), 3000);
    } catch (error) {
      console.error('Newsletter subscription error:', error);
      setStatus('error');
      enqueueSnackbar('Failed to subscribe. Please try again.', { variant: 'error' });
      setTimeout(() => setStatus('idle'), 3000);
    }
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
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 3, lg: 0 } }}>
          {/* Logo - Top on mobile */}
          <Box sx={{ display: { xs: 'flex', lg: 'none' }, justifyContent: 'center', mb: 2 }}>
            <img
              src={content.logoUrl.startsWith('http') ? content.logoUrl : `${import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || 'http://localhost:3010'}${content.logoUrl}`}
              alt="UDesign Logo"
              style={{ width: '180px', height: 'auto' }}
            />
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: { xs: 3, sm: 4, lg: 6 }, alignItems: 'center' }}>
            {/* Left Column */}
            <Box sx={{ order: { xs: 2, lg: 1 } }}>
              {/* Logo - Desktop */}
              <Box sx={{ display: { xs: 'none', lg: 'block' }, mb: 4 }}>
                <img
                  src={content.logoUrl.startsWith('http') ? content.logoUrl : `${import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || 'http://localhost:3010'}${content.logoUrl}`}
                  alt="UDesign Logo"
                  style={{ width: '200px', height: 'auto' }}
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
              {status === 'error' && (
                <Typography sx={{ mt: 2, color: '#ef4444', fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                  Failed to subscribe. Please try again.
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
                maxWidth: { xs: '320px', sm: '360px', md: '400px', lg: '100%' },
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
                  <Box
                    component="img"
                    src={image.src.startsWith('http') ? image.src : `${import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || 'http://localhost:3010'}${image.src}`}
                    alt={image.alt}
                    sx={{
                      width: '120%',
                      height: '120%',
                      objectFit: 'cover',
                      objectPosition: 'center',
                      position: 'absolute',
                      top: '-10%',
                      left: '-10%',
                      animation: `${panLeftToRight} 20s ease-in-out infinite alternate`,
                    }}
                  />
                  {/* Image caption overlay - only show if title or description exists */}
                  {(image.title || image.description) && (
                    <Box
                      sx={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        background: 'linear-gradient(to top, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.6) 50%, transparent 100%)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        pb: 4,
                        px: 3,
                      }}
                    >
                      <Box sx={{ textAlign: 'center', maxWidth: '280px' }}>
                        {image.title && (
                          <Typography variant="h6" sx={{ fontWeight: 700, color: '#fff', fontSize: { xs: '1rem', sm: '1.125rem' }, textTransform: 'uppercase', mb: image.description ? 1 : 0 }}>
                            {image.title}
                          </Typography>
                        )}
                        {image.description && (
                          <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                            {image.description}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  )}
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
        </Box>
      </ContentSection>

      {/* Diagonal Divider */}
      <DiagonalDivider>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none">
          <polygon fill={logoRed} points="0,100 100,0 100,100" />
        </svg>
      </DiagonalDivider>

      {/* Footer */}
      <Box sx={{ backgroundColor: logoRed, color: '#fff', py: { xs: 2.5, sm: 3 }, px: 2 }}>
        <Container maxWidth="lg">
          {/* Contact Information - Compact */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 1,
              mb: 2
            }}
          >
            {/* Phone */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PhoneIcon sx={{ fontSize: 16 }} />
              <MuiLink
                href={`tel:${content.phone}`}
                sx={{
                  color: '#fff',
                  textDecoration: 'none',
                  fontSize: { xs: '0.875rem', sm: '1rem' },
                  '&:hover': { textDecoration: 'underline' }
                }}
              >
                {content.phone}
              </MuiLink>
            </Box>

            {/* Email */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <EmailIcon sx={{ fontSize: 16 }} />
              <MuiLink
                href={`mailto:${content.email}`}
                sx={{
                  color: '#fff',
                  textDecoration: 'none',
                  fontSize: { xs: '0.875rem', sm: '1rem' },
                  '&:hover': { textDecoration: 'underline' }
                }}
              >
                {content.email}
              </MuiLink>
            </Box>
          </Box>

          {/* Copyright */}
          <Box sx={{ textAlign: 'center', borderTop: '1px solid rgba(255, 255, 255, 0.15)', pt: 2 }}>
            <Typography variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.8125rem' }, opacity: 0.85 }}>
              &copy; 2025 uDesign. All rights reserved.
            </Typography>
          </Box>
        </Container>
      </Box>
    </MainContainer>
  );
};

export default ComingSoon;
