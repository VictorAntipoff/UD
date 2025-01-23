import { Box, Typography, Chip, Tooltip, Grid, Paper } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import BuildIcon from '@mui/icons-material/Build';
import GroupIcon from '@mui/icons-material/Group';
import SettingsIcon from '@mui/icons-material/Settings';

export default function Dashboard() {
  const currentFile = import.meta.url;

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Welcome to UDesign
        </Typography>
        {import.meta.env.DEV && (
          <Tooltip 
            title={`File: ${currentFile.split('/src/')[1]}`}
            arrow
          >
            <Chip
              label="Development"
              size="small"
              sx={{
                backgroundColor: '#fbbf24',
                color: '#78350f',
                '& .MuiChip-label': {
                  fontWeight: 600
                },
                cursor: 'help'
              }}
            />
          </Tooltip>
        )}
      </Box>

      <Typography variant="h6" sx={{ mb: 4 }}>
        User Dashboard
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={2}
            sx={{
              p: 3,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 1
            }}
          >
            <HomeIcon color="error" sx={{ fontSize: 40 }} />
            <Typography variant="h3">12</Typography>
            <Typography color="text.secondary">Total Projects</Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={2}
            sx={{
              p: 3,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 1
            }}
          >
            <BuildIcon color="primary" sx={{ fontSize: 40 }} />
            <Typography variant="h3">25</Typography>
            <Typography color="text.secondary">Active Tasks</Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={2}
            sx={{
              p: 3,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 1
            }}
          >
            <GroupIcon color="success" sx={{ fontSize: 40 }} />
            <Typography variant="h3">8</Typography>
            <Typography color="text.secondary">Team Members</Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={2}
            sx={{
              p: 3,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 1
            }}
          >
            <SettingsIcon color="warning" sx={{ fontSize: 40 }} />
            <Typography variant="h3">4</Typography>
            <Typography color="text.secondary">Settings</Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
} 