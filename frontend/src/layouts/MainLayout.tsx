import { useState, useEffect } from 'react';
import { 
  Box, 
  AppBar, 
  Toolbar, 
  IconButton, 
  useTheme, 
  useMediaQuery,
  Avatar,
  Badge,
  Menu,
  MenuItem,
  Tooltip
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import NotificationsIcon from '@mui/icons-material/Notifications';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from './Sidebar';

export default function MainLayout() {
  console.log('MainLayout rendering');  // Debug log
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notificationAnchor, setNotificationAnchor] = useState<null | HTMLElement>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const drawerWidth = 240;
  const { logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [isMobile]);

  const handleProfileClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleNotificationClick = (event: React.MouseEvent<HTMLElement>) => {
    setNotificationAnchor(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
    setNotificationAnchor(null);
  };

  const handleLogout = () => {
    handleClose();
    logout();
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* TOP BAR SECTION */}
      <Box 
        sx={{ 
          position: 'fixed', 
          top: 2,
          left: 2,
          p: 0.5,
          fontSize: '10px',
          bgcolor: 'rgba(255,0,0,0.1)',
          zIndex: 9999,
          borderRadius: 1,
          pointerEvents: 'none'
        }}
      >
        TOP
      </Box>

      <AppBar 
        position="fixed" 
        sx={{ 
          zIndex: (theme) => theme.zIndex.drawer + 1,
          width: '100%',
          bgcolor: 'background.paper',
          borderBottom: 1,
          borderColor: 'divider'
        }}
      >
        <Toolbar>
          {/* SIDEBAR TOGGLE BUTTON */}
          <Box 
            sx={{ 
              position: 'absolute', 
              top: 2,
              left: 40,
              p: 0.5,
              fontSize: '10px',
              bgcolor: 'rgba(0,255,0,0.1)',
              zIndex: 9999,
              borderRadius: 1,
              pointerEvents: 'none'
            }}
          >
            BTN
          </Box>

          <IconButton
            color="secondary"
            edge="start"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            sx={{ mr: 2 }}
          >
            {sidebarOpen ? <MenuOpenIcon /> : <MenuIcon />}
          </IconButton>
          
          <Box 
            component="img"
            src="/logo.png"
            sx={{ 
              height: 40,
              mr: 'auto',
              objectFit: 'contain',
              ml: 1
            }}
            alt="UDesign Logo"
          />

          {/* Notifications */}
          <Tooltip title="Notifications">
            <IconButton 
              color="secondary"
              onClick={handleNotificationClick}
              sx={{ ml: 2 }}
            >
              <Badge badgeContent={3} color="primary">
                <NotificationsIcon />
              </Badge>
            </IconButton>
          </Tooltip>

          {/* User Profile */}
          <Tooltip title="Account settings">
            <IconButton
              onClick={handleProfileClick}
              sx={{ ml: 2 }}
              color="secondary"
            >
              <Avatar 
                sx={{ 
                  width: 32, 
                  height: 32,
                  bgcolor: 'primary.main'
                }}
              >
                <AccountCircleIcon />
              </Avatar>
            </IconButton>
          </Tooltip>

          {/* Profile Menu */}
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleClose}
            onClick={handleClose}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <MenuItem onClick={() => navigate('/profile')}>
              Profile
            </MenuItem>
            <MenuItem onClick={() => navigate('/settings')}>
              Settings
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              Logout
            </MenuItem>
          </Menu>

          {/* Notifications Menu */}
          <Menu
            anchorEl={notificationAnchor}
            open={Boolean(notificationAnchor)}
            onClose={handleClose}
            onClick={handleClose}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <MenuItem>New order received</MenuItem>
            <MenuItem>System update available</MenuItem>
            <MenuItem>Your report is ready</MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* LEFT SIDEBAR */}
      <Box 
        sx={{ 
          position: 'fixed', 
          top: 66,
          left: 2,
          p: 0.5,
          fontSize: '10px',
          bgcolor: 'rgba(0,0,255,0.1)',
          zIndex: 9999,
          borderRadius: 1,
          pointerEvents: 'none'
        }}
      >
        NAV
      </Box>

      <Box
        component="nav"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          position: 'fixed',
          height: '100%',
          zIndex: (theme) => theme.zIndex.drawer,
          left: sidebarOpen ? 0 : -drawerWidth,
          transition: theme.transitions.create('left', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          })
        }}
      >
        <Sidebar 
          open={sidebarOpen} 
          onClose={() => setSidebarOpen(false)}
        />
      </Box>

      {/* MAIN CONTENT AREA */}
      <Box 
        sx={{ 
          position: 'fixed', 
          top: 66,
          right: 2,
          p: 0.5,
          fontSize: '10px',
          bgcolor: 'rgba(255,255,0,0.1)',
          zIndex: 9999,
          borderRadius: 1,
          pointerEvents: 'none'
        }}
      >
        MAIN
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 2,
          pt: 10,
          width: '100%',
          paddingLeft: sidebarOpen ? `${drawerWidth + 16}px` : '16px',
          transition: theme.transitions.create('padding', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
          bgcolor: 'background.default',
          position: 'relative',
          zIndex: 1
        }}
      >
        <Outlet />
      </Box>

      {/* Debug Indicators */}
      <Box 
        sx={{ 
          position: 'fixed', 
          bottom: 2,
          right: 2,
          p: 0.5,
          fontSize: '10px',
          bgcolor: 'rgba(0,0,0,0.1)',
          display: 'flex',
          flexDirection: 'column',
          gap: 0.5,
          borderRadius: 1,
          pointerEvents: 'none'
        }}
      >
        <div>SB: {sidebarOpen ? '✓' : '×'}</div>
        <div>M: {isMobile ? '✓' : '×'}</div>
        <div>W: {drawerWidth}</div>
      </Box>
    </Box>
  );
} 