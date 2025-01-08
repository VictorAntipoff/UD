import { Container, Typography, Paper, Box, Grid, Card, CardContent, IconButton } from '@mui/material';
import ContentCutIcon from '@mui/icons-material/ContentCut';
import CalculateIcon from '@mui/icons-material/Calculate';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import { useNavigate } from 'react-router-dom';

export default function HomePage() {
  console.log('HomePage rendering');
  const navigate = useNavigate();

  const menuCards = [
    {
      title: 'Wood Slicer',
      icon: <ContentCutIcon sx={{ fontSize: 40 }} />,
      description: 'Manage wood slicing operations',
      path: '/factory/wood-slicer'
    },
    {
      title: 'Calculator',
      icon: <CalculateIcon sx={{ fontSize: 40 }} />,
      description: 'Calculate wood measurements',
      path: '/factory/calculator'
    },
    {
      title: 'Drying Process',
      icon: <WaterDropIcon sx={{ fontSize: 40 }} />,
      description: 'Monitor drying operations',
      path: '/factory/drying'
    }
  ];

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Paper 
          elevation={3} 
          sx={{ 
            p: 4, 
            background: 'linear-gradient(45deg, #CC0000 30%, #ff1a1a 90%)',
            color: 'white'
          }}
        >
          <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
            Welcome to UDesign
          </Typography>
          <Typography variant="h6">
            Select a module to get started
          </Typography>
        </Paper>

        <Grid container spacing={3} sx={{ mt: 3 }}>
          {menuCards.map((card) => (
            <Grid item xs={12} sm={6} md={4} key={card.title}>
              <Card 
                sx={{ 
                  height: '100%',
                  cursor: 'pointer',
                  transition: 'transform 0.2s',
                  '&:hover': {
                    transform: 'scale(1.02)',
                    boxShadow: 6
                  }
                }}
                onClick={() => navigate(card.path)}
              >
                <CardContent sx={{ 
                  textAlign: 'center',
                  p: 3,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2
                }}>
                  <IconButton 
                    color="primary"
                    sx={{ 
                      backgroundColor: 'rgba(25, 118, 210, 0.1)',
                      p: 2,
                      '&:hover': {
                        backgroundColor: 'rgba(25, 118, 210, 0.2)'
                      }
                    }}
                  >
                    {card.icon}
                  </IconButton>
                  <Typography variant="h6" component="h2" fontWeight="bold">
                    {card.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {card.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Container>
  );
} 