import { Box, Typography, Grid, Paper, LinearProgress, CircularProgress } from '@mui/material';
import PaletteIcon from '@mui/icons-material/Palette';
import CalculateIcon from '@mui/icons-material/Calculate';
import GroupIcon from '@mui/icons-material/Group';
import ForestIcon from '@mui/icons-material/Forest';
import { useTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useState, useEffect } from 'react';
import { supabase } from '../../config/supabase';

const Dashboard = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [woodTypesCount, setWoodTypesCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  
  useEffect(() => {
    const fetchWoodTypesCount = async () => {
      try {
        const { count, error } = await supabase
          .from('wood_types')
          .select('*', { count: 'exact', head: true });
        
        if (error) throw error;
        
        setWoodTypesCount(count || 0);
      } catch (error) {
        console.error('Error fetching wood types count:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchWoodTypesCount();
  }, []);
  
  const dashboardItems = [
    {
      icon: <PaletteIcon sx={{ fontSize: 40, color: theme.palette.primary.main }} />,
      count: '12',
      label: 'Active Designs',
      color: theme.palette.primary.main,
      progress: 75,
      path: '/designs'
    },
    {
      icon: <CalculateIcon sx={{ fontSize: 40, color: theme.palette.success.main }} />,
      count: '48',
      label: 'Wood Calculations',
      color: theme.palette.success.main,
      progress: 60,
      path: '/calculations'
    },
    {
      icon: <ForestIcon sx={{ fontSize: 40, color: theme.palette.warning.main }} />,
      count: loading ? <CircularProgress size={24} sx={{ color: theme.palette.warning.main }} /> : woodTypesCount.toString(),
      label: 'Wood Types',
      color: theme.palette.warning.main,
      progress: 40,
      path: '/management/wood-types'
    },
    {
      icon: <GroupIcon sx={{ fontSize: 40, color: theme.palette.info.main }} />,
      count: '5',
      label: 'Team Members',
      color: theme.palette.info.main,
      progress: 90,
      path: '/team'
    }
  ];

  const handleCardClick = (path: string) => {
    navigate(path);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <Typography 
          variant="h4" 
          component="h1" 
          sx={{ 
            fontSize: '1.5rem',
            fontWeight: 600,
            color: theme.palette.primary.main,
            fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif'
          }}
        >
          {user?.firstName ? `${user.firstName}'s Dashboard` : 'Dashboard'}
        </Typography>
      </Box>

      <Typography 
        variant="h6" 
        sx={{ 
          mb: 4, 
          color: theme.palette.text.secondary,
          fontSize: '1rem',
          fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif'
        }}
      >
        Wood Design & Calculations Overview
      </Typography>

      <Grid container spacing={3}>
        {dashboardItems.map((item, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Paper
              elevation={0}
              onClick={() => handleCardClick(item.path)}
              sx={{
                p: 3,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 1,
                transition: 'all 0.2s ease-in-out',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: theme.shadows[2],
                  cursor: 'pointer',
                  borderColor: item.color
                }
              }}
            >
              {item.icon}
              <Typography 
                variant="h3" 
                sx={{ 
                  color: item.color,
                  fontSize: '2rem',
                  fontWeight: 600,
                  fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif'
                }}
              >
                {item.count}
              </Typography>
              <Typography 
                color="text.secondary" 
                sx={{ 
                  mb: 1,
                  fontSize: '0.875rem',
                  fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif'
                }}
              >
                {item.label}
              </Typography>
              <Box sx={{ width: '100%', mt: 1 }}>
                <LinearProgress 
                  variant="determinate" 
                  value={item.progress} 
                  sx={{ 
                    height: 6, 
                    borderRadius: 3,
                    backgroundColor: theme.palette.grey[200],
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: item.color,
                      borderRadius: 3
                    }
                  }} 
                />
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Recent Activity Section */}
      <Box sx={{ mt: 4 }}>
        <Typography 
          variant="h5" 
          gutterBottom
          sx={{ 
            fontSize: '1.125rem',
            fontWeight: 600,
            color: theme.palette.primary.main,
            fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif'
          }}
        >
          Recent Activity
        </Typography>
        <Paper 
          sx={{ 
            p: 3,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            boxShadow: 'none'
          }}
        >
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography 
                variant="h6" 
                gutterBottom
                sx={{ 
                  fontSize: '1rem',
                  fontWeight: 500,
                  color: theme.palette.text.primary,
                  fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif'
                }}
              >
                Latest Designs
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {['Modern Chair Design', 'Kitchen Cabinet', 'Wooden Table'].map((design, index) => (
                  <Paper 
                    key={index} 
                    sx={{ 
                      p: 2, 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 2,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease-in-out',
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      boxShadow: 'none',
                      '&:hover': {
                        transform: 'translateX(4px)',
                        boxShadow: theme.shadows[1],
                        borderColor: theme.palette.primary.main
                      }
                    }}
                    onClick={() => navigate(`/designs/${index + 1}`)}
                  >
                    <PaletteIcon sx={{ color: theme.palette.primary.main }} />
                    <Box>
                      <Typography 
                        variant="subtitle1"
                        sx={{ 
                          fontSize: '0.875rem',
                          fontWeight: 500,
                          fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif'
                        }}
                      >
                        {design}
                      </Typography>
                      <Typography 
                        variant="body2" 
                        color="text.secondary"
                        sx={{ 
                          fontSize: '0.75rem',
                          fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif'
                        }}
                      >
                        Updated 2 hours ago
                      </Typography>
                    </Box>
                  </Paper>
                ))}
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography 
                variant="h6" 
                gutterBottom
                sx={{ 
                  fontSize: '1rem',
                  fontWeight: 500,
                  color: theme.palette.text.primary,
                  fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif'
                }}
              >
                Recent Calculations
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {['Oak Density Analysis', 'Pine Strength Test', 'Mahogany Cost Estimate'].map((calc, index) => (
                  <Paper 
                    key={index} 
                    sx={{ 
                      p: 2, 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 2,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease-in-out',
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      boxShadow: 'none',
                      '&:hover': {
                        transform: 'translateX(4px)',
                        boxShadow: theme.shadows[1],
                        borderColor: theme.palette.success.main
                      }
                    }}
                    onClick={() => navigate(`/calculations/${index + 1}`)}
                  >
                    <CalculateIcon sx={{ color: theme.palette.success.main }} />
                    <Box>
                      <Typography 
                        variant="subtitle1"
                        sx={{ 
                          fontSize: '0.875rem',
                          fontWeight: 500,
                          fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif'
                        }}
                      >
                        {calc}
                      </Typography>
                      <Typography 
                        variant="body2" 
                        color="text.secondary"
                        sx={{ 
                          fontSize: '0.75rem',
                          fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif'
                        }}
                      >
                        Completed 1 day ago
                      </Typography>
                    </Box>
                  </Paper>
                ))}
              </Box>
            </Grid>
          </Grid>
        </Paper>
      </Box>
    </Box>
  );
};

export default Dashboard; 