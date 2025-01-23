import { FC, useState } from 'react';
import { 
  AppBar, 
  Toolbar, 
  IconButton, 
  Typography, 
  Badge,
  Avatar,
  Menu,
  MenuItem,
  Tooltip,
  Chip,
  Box
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface TopBarProps {
  onMenuClick: () => void;
}

const TopBar: FC<TopBarProps> = ({ onMenuClick }) => {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notificationAnchor, setNotificationAnchor] = useState<null | HTMLElement>(null);

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

  const isDevelopment = import.meta.env.DEV;
  const currentFile = import.meta.url;

  return (
    <AppBar 
      position="fixed" 
      sx={{ 
        zIndex: (theme) => theme.zIndex.drawer + 1,
        bgcolor: 'background.paper',
        color: 'text.primary'
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

        <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
          UDesign
        </Typography>

        <Tooltip title="Notifications">
          <IconButton color="inherit" onClick={handleNotificationClick}>
            <Badge badgeContent={3} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>
        </Tooltip>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Tooltip title="Account settings">
            <IconButton
              onClick={handleProfileClick}
              size="small"
              sx={{ ml: 2 }}
              aria-controls={Boolean(anchorEl) ? 'account-menu' : undefined}
              aria-haspopup="true"
              aria-expanded={Boolean(anchorEl) ? 'true' : undefined}
            >
              <Avatar sx={{ width: 32, height: 32, bgcolor: '#2c3e50' }}>
                {user?.email?.[0].toUpperCase() || 'U'}
              </Avatar>
            </IconButton>
          </Tooltip>
        </Box>

        <Menu
          anchorEl={anchorEl}
          id="account-menu"
          open={Boolean(anchorEl)}
          onClose={handleClose}
          onClick={handleClose}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          <MenuItem onClick={() => navigate('/profile')}>Profile</MenuItem>
          <MenuItem onClick={() => navigate('/settings')}>Settings</MenuItem>
          <MenuItem onClick={handleLogout}>Logout</MenuItem>
        </Menu>

        <Menu
          anchorEl={notificationAnchor}
          open={Boolean(notificationAnchor)}
          onClose={handleClose}
          onClick={handleClose}
        >
          <MenuItem>New order received</MenuItem>
          <MenuItem>System update available</MenuItem>
          <MenuItem>Your report is ready</MenuItem>
        </Menu>

        {isDevelopment && (
          <Tooltip 
            title={`File: ${currentFile.split('/src/')[1]}`}
            arrow
          >
            <Chip
              label="Development"
              color="warning"
              size="small"
              sx={{
                ml: 2,
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
      </Toolbar>
    </AppBar>
  );
};

export default TopBar; 