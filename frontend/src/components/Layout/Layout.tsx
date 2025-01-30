import { Box } from '@mui/material';
import { useState } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

const DRAWER_WIDTH = 240;
const TRANSITION_DURATION = 250;

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
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
          position: 'fixed',
          right: 0,
          top: 0,
          bottom: 0,
          width: `calc(100% - ${DRAWER_WIDTH}px)`,
          mt: '64px',
          p: 3,
          overflowY: 'auto',
          transition: theme => theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: TRANSITION_DURATION,
          }),
          ...(sidebarOpen ? {
            width: `calc(100% - ${DRAWER_WIDTH}px)`
          } : {
            width: '100%'
          })
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default Layout; 