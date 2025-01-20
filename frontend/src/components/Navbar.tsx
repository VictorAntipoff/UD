import { 
  AppBar, 
  Toolbar, 
  IconButton, 
  Box, 
  Badge, 
  Avatar, 
  Menu, 
  MenuItem, 
  Tooltip
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import NotificationsIcon from '@mui/icons-material/Notifications';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import logo from '../assets/images/logo.png';

interface NavbarProps {
  onMenuClick: () => void;
}

export default function Navbar({ onMenuClick }: NavbarProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notificationAnchor, setNotificationAnchor] = useState<null | HTMLElement>(null);
  const navigate = useNavigate();
  const { logout } = useAuth();

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
    <AppBar 
      position="fixed" 
      sx={{ 
        zIndex: (theme) => theme.zIndex.drawer + 1,
        bgcolor: 'background.paper',
        borderBottom: 1,
        borderColor: 'divider'
      }}
    >
      <Toolbar>
        <IconButton
          color="inherit"
          edge="start"
          onClick={onMenuClick}
          sx={{ mr: 2 }}
        >
          <MenuIcon />
        </IconButton>

        <Box 
          component="img"
          src={logo}
          sx={{ 
            height: 40,
            mr: 'auto',
            objectFit: 'contain'
          }}
          alt="UDesign Logo"
        />

        <Tooltip title="Notifications">
          <IconButton onClick={handleNotificationClick}>
            <Badge badgeContent={3} color="primary">
              <NotificationsIcon />
            </Badge>
          </IconButton>
        </Tooltip>

        <Tooltip title="Account settings">
          <IconButton onClick={handleProfileClick}>
            <Avatar sx={{ width: 32, height: 32 }}>
              <AccountCircleIcon />
            </Avatar>
          </IconButton>
        </Tooltip>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleClose}
          onClick={handleClose}
        >
          <MenuItem onClick={() => navigate('/settings/user')}>
            Settings
          </MenuItem>
          <MenuItem onClick={handleLogout}>
            Logout
          </MenuItem>
        </Menu>

        <Menu
          anchorEl={notificationAnchor}
          open={Boolean(notificationAnchor)}
          onClose={handleClose}
        >
          <MenuItem onClick={handleClose}>Notification 1</MenuItem>
          <MenuItem onClick={handleClose}>Notification 2</MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
} 