import { Box, Typography, Grid, Paper, Chip, Tooltip } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import BuildIcon from '@mui/icons-material/Build';
import GroupIcon from '@mui/icons-material/Group';
import SettingsIcon from '@mui/icons-material/Settings';

const Dashboard = () => {
  const dashboardItems = [
    {
      icon: <HomeIcon sx={{ fontSize: 40, color: 'error.main' }} />,
      count: '12',
      label: 'Total Projects',
      color: 'error.main'
    },
    {
      icon: <BuildIcon sx={{ fontSize: 40, color: 'primary.main' }} />,
      count: '25',
      label: 'Active Tasks',
      color: 'primary.main'
    },
    {
      icon: <GroupIcon sx={{ fontSize: 40, color: 'success.main' }} />,
      count: '8',
      label: 'Team Members',
      color: 'success.main'
    },
    {
      icon: <SettingsIcon sx={{ fontSize: 40, color: 'warning.main' }} />,
      count: '4',
      label: 'Settings',
      color: 'warning.main'
    }
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Welcome to UDesign
        </Typography>
        {import.meta.env.DEV && (
          <Tooltip title="Development Mode" arrow>
            <Chip
              label="Development"
              size="small"
              sx={{
                backgroundColor: '#fbbf24',
                color: '#78350f',
                '& .MuiChip-label': {
                  fontWeight: 600
                }
              }}
            />
          </Tooltip>
        )}
      </Box>

      <Typography variant="h6" sx={{ mb: 4, color: 'text.secondary' }}>
        User Dashboard
      </Typography>

      <Grid container spacing={3}>
        {dashboardItems.map((item, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Paper
              elevation={2}
              sx={{
                p: 3,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 1,
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4,
                  cursor: 'pointer'
                }
              }}
            >
              {item.icon}
              <Typography variant="h3" sx={{ color: item.color }}>
                {item.count}
              </Typography>
              <Typography color="text.secondary">
                {item.label}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Recent Activity Section */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h5" gutterBottom>
          Recent Activity
        </Typography>
        <Paper sx={{ p: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Latest Projects
              </Typography>
              {/* Add your recent projects list here */}
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Recent Calculations
              </Typography>
              {/* Add your recent calculations list here */}
            </Grid>
          </Grid>
        </Paper>
      </Box>
    </Box>
  );
};

export default Dashboard; 