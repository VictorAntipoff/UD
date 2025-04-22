import { Box } from '@mui/material';
import { useState } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { Outlet } from 'react-router-dom';

const DRAWER_WIDTH = 240;
const TRANSITION_DURATION = 250;

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen);
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
      />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: '100%',
          minHeight: '100vh',
          mt: '64px',
          p: 3,
          pl: sidebarOpen ? `${DRAWER_WIDTH + 24}px` : 3,
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