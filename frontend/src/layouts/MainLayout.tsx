// === Main Layout Component ===
// File: src/layouts/MainLayout.tsx
// Description: Main application layout wrapper with navigation and sidebar

import { Box } from '@mui/material';
import Navbar from '../components/Navbar';
import Sidebar from './Sidebar';
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { SectionLabel } from '../components/SectionLabel';

export default function MainLayout() {
  // === State Management ===
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // === Authentication Check ===
  useEffect(() => {
    if (!isAuthenticated && location.pathname !== '/login') {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  if (!isAuthenticated) {
    return null;
  }

  // === Layout UI ===
  return (
    <Box sx={{ display: 'flex' }}>
      {/* Top Navigation Bar */}
      <Box sx={{ 
        width: '100%', 
        position: 'fixed', 
        top: 0, 
        left: 0,
        right: 0,
        zIndex: 1200,
        bgcolor: 'background.paper',
        boxShadow: 1,
        height: 64,
        display: 'flex',
        alignItems: 'center'
      }}>
        <SectionLabel text="Navbar.tsx" color="primary.main" position="top-left" />
        <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      </Box>

      {/* Sidebar */}
      <Box sx={{ 
        position: 'fixed',
        left: 0,
        top: 64,
        bottom: 0,
        width: sidebarOpen ? 240 : 0,
        bgcolor: 'background.paper',
        transition: 'width 0.3s ease',
        overflow: 'hidden',
        zIndex: 1100,
        boxShadow: 1
      }}>
        <Box sx={{ position: 'relative', height: '100%' }}>
          <SectionLabel text="Sidebar.tsx" color="secondary.main" position="top-right" />
          <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        </Box>
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          mt: 8,
          ml: sidebarOpen ? '240px' : '64px',
          transition: 'margin-left 0.3s ease',
          minHeight: '100vh',
          bgcolor: 'background.default',
          position: 'relative'
        }}
      >
        <SectionLabel text="Main Content" color="success.main" position="top-right" />
        <Outlet />
      </Box>
    </Box>
  );
} 