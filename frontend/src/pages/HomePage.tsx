import { Container, Typography, Paper, Box, Grid, Card, CardContent } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import HomeIcon from '@mui/icons-material/Home';
import SettingsIcon from '@mui/icons-material/Settings';
import BuildIcon from '@mui/icons-material/Build';
import PeopleIcon from '@mui/icons-material/People';
import { SectionLabel } from '../components/SectionLabel';

// Dashboard item type
interface DashboardItem {
  title: string;
  icon: any;
  color: string;
  value: string;
}

export default function HomePage() {
  const { userRole } = useAuth();

  // Dashboard items data
  const dashboardItems: DashboardItem[] = [
    {
      title: 'Total Projects',
      icon: HomeIcon,
      color: '#CC0000',
      value: '12'
    },
    {
      title: 'Active Tasks',
      icon: BuildIcon,
      color: '#0088cc',
      value: '25'
    },
    {
      title: 'Team Members',
      icon: PeopleIcon,
      color: '#00cc88',
      value: '8'
    },
    {
      title: 'Settings',
      icon: SettingsIcon,
      color: '#cc8800',
      value: '4'
    }
  ];

  return (
    <Container maxWidth="lg" sx={{ position: 'relative' }}>
      {/* Welcome Section */}
      <Box sx={{ position: 'relative', mb: 4 }}>
        <SectionLabel text="Welcome Section" color="info.main" position="top-left" />
        <Paper 
          elevation={3} 
          sx={{ 
            p: 4, 
            background: 'linear-gradient(45deg, #CC0000 30%, #ff1a1a 90%)',
            color: 'white',
            borderRadius: 2,
            mt: 3
          }}
        >
          <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
            Welcome to UDesign
          </Typography>
          <Typography variant="h6">
            {userRole === 'ADMIN' ? 'Administrator Dashboard' : 'User Dashboard'}
          </Typography>
        </Paper>
      </Box>

      {/* Dashboard Section */}
      <Box sx={{ position: 'relative', mb: 4 }}>
        <SectionLabel text="Dashboard Items" color="warning.main" position="top-left" />
        <Grid container spacing={3} sx={{ mt: 3 }}>
          {dashboardItems.map((item, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Card 
                sx={{ 
                  height: '100%',
                  transition: 'transform 0.2s',
                  '&:hover': {
                    transform: 'translateY(-5px)',
                    boxShadow: 3
                  }
                }}
              >
                <CardContent sx={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center',
                  textAlign: 'center'
                }}>
                  <Box 
                    sx={{ 
                      bgcolor: `${item.color}15`,
                      p: 2,
                      borderRadius: '50%',
                      mb: 2
                    }}
                  >
                    <item.icon sx={{ fontSize: 40, color: item.color }} />
                  </Box>
                  <Typography variant="h4" component="div" sx={{ mb: 1, color: item.color }}>
                    {item.value}
                  </Typography>
                  <Typography color="text.secondary">
                    {item.title}
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