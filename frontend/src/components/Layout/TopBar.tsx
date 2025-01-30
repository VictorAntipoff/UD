import { AppBar, Toolbar, Typography, IconButton, Box, Avatar, Menu, MenuItem, Badge } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

interface TopBarProps {
  onSidebarToggle: () => void;
  sidebarOpen: boolean;
}

const TopBar = ({ onSidebarToggle, sidebarOpen }: TopBarProps) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notificationCount] = useState(3);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <AppBar
      position="fixed"
      elevation={1}
      sx={{
        backgroundColor: 'background.paper',
        zIndex: (theme) => theme.zIndex.drawer + 1,
      }}
    >
      <Toolbar>
        <IconButton onClick={onSidebarToggle}>
          {sidebarOpen ? <MenuOpenIcon /> : <MenuIcon />}
        </IconButton>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <img src="/logo.png" alt="UDesign Logo" style={{ height: '40px' }} />
          <Typography variant="h6">UDesign</Typography>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default TopBar; 