import { Box, useMediaQuery, useTheme } from '@mui/material';
import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { Outlet } from 'react-router-dom';

const DRAWER_WIDTH = 240;
const TRANSITION_DURATION = 250;

const Layout = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

  // Auto-close sidebar on mobile when screen size changes
  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleSidebarClose = () => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f8fafc' }}>
      <TopBar
        onSidebarToggle={handleSidebarToggle}
        sidebarOpen={sidebarOpen}
      />
      <Sidebar
        width={DRAWER_WIDTH}
        open={sidebarOpen}
        onClose={handleSidebarClose}
        isMobile={isMobile}
      />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: '100%',
          minHeight: '100vh',
          mt: '64px',
          p: { xs: 2, md: 3 },
          pl: {
            xs: 2,
            md: sidebarOpen ? `${DRAWER_WIDTH + 24}px` : 3
          },
          transition: theme => theme.transitions.create('padding', {
            easing: theme.transitions.easing.sharp,
            duration: TRANSITION_DURATION,
          })
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
};

export default Layout; 