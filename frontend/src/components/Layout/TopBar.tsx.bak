import { 
  AppBar, 
  Toolbar, 
  Typography, 
  IconButton, 
  Box, 
  Avatar, 
  Menu, 
  MenuItem, 
  Badge,
  Tooltip,
  Divider,
  ListItemIcon,
  useTheme
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import NotificationsIcon from '@mui/icons-material/Notifications';
import ChatIcon from '@mui/icons-material/Chat';
import PersonIcon from '@mui/icons-material/Person';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
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
  const theme = useTheme();

  // Menu anchor states
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const [notificationAnchor, setNotificationAnchor] = useState<null | HTMLElement>(null);
  const [chatAnchor, setChatAnchor] = useState<null | HTMLElement>(null);

  // Notification and chat counts
  const [notificationCount] = useState(3);
  const [chatCount] = useState(2);

  const handleUserMenu = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleNotificationMenu = (event: React.MouseEvent<HTMLElement>) => {
    setNotificationAnchor(event.currentTarget);
  };

  const handleChatMenu = (event: React.MouseEvent<HTMLElement>) => {
    setChatAnchor(event.currentTarget);
  };

  const handleCloseUserMenu = () => {
    setUserMenuAnchor(null);
  };

  const handleCloseNotifications = () => {
    setNotificationAnchor(null);
  };

  const handleCloseChat = () => {
    setChatAnchor(null);
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
        borderBottom: '1px solid',
        borderColor: 'divider'
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between' }}>
        {/* Left section */}
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton 
            onClick={onSidebarToggle} 
            sx={{ 
              color: theme.palette.text.primary 
            }}
          >
            {sidebarOpen ? <MenuOpenIcon /> : <MenuIcon />}
          </IconButton>
          <Box sx={{ display: 'flex', alignItems: 'center', ml: 1 }}>
            <img src="/logo.png" alt="UDesign Logo" style={{ height: '40px' }} />
            <Typography 
              variant="h6" 
              sx={{ 
                ml: 1,
                color: theme.palette.text.primary,
                fontWeight: 500
              }}
            >
              UDesign
            </Typography>
          </Box>
        </Box>

        {/* Right section */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Notifications */}
          <Tooltip title="Notifications">
            <IconButton 
              onClick={handleNotificationMenu}
              sx={{ 
                color: theme.palette.text.primary,
                '&:hover': {
                  backgroundColor: theme.palette.action.hover
                }
              }}
            >
              <Badge 
                badgeContent={notificationCount} 
                color="error"
                sx={{
                  '& .MuiBadge-badge': {
                    backgroundColor: theme.palette.error.main,
                    color: 'white'
                  }
                }}
              >
                <NotificationsIcon />
              </Badge>
            </IconButton>
          </Tooltip>

          {/* Chat */}
          <Tooltip title="Messages">
            <IconButton 
              onClick={handleChatMenu}
              sx={{ 
                color: theme.palette.text.primary,
                '&:hover': {
                  backgroundColor: theme.palette.action.hover
                }
              }}
            >
              <Badge 
                badgeContent={chatCount} 
                color="error"
                sx={{
                  '& .MuiBadge-badge': {
                    backgroundColor: theme.palette.error.main,
                    color: 'white'
                  }
                }}
              >
                <ChatIcon />
              </Badge>
            </IconButton>
          </Tooltip>

          {/* User Menu */}
          <Tooltip title="Account">
            <IconButton 
              onClick={handleUserMenu}
              sx={{
                ml: 1,
                '&:hover': {
                  backgroundColor: theme.palette.action.hover
                }
              }}
            >
              <Avatar 
                src={user?.user_metadata?.avatar_url}
                alt={user?.user_metadata?.full_name || user?.email}
                sx={{ 
                  width: 32, 
                  height: 32,
                  bgcolor: theme.palette.primary.main,
                  color: 'white',
                  fontWeight: 500
                }}
              >
                {(user?.user_metadata?.full_name || user?.email || '?')[0].toUpperCase()}
              </Avatar>
            </IconButton>
          </Tooltip>
        </Box>

        {/* Menus with updated styling */}
        <Menu
          anchorEl={notificationAnchor}
          open={Boolean(notificationAnchor)}
          onClose={handleCloseNotifications}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          PaperProps={{
            elevation: 0,
            sx: {
              mt: 1.5,
              border: '1px solid',
              borderColor: 'divider',
              '& .MuiMenuItem-root': {
                fontSize: '0.875rem',
                color: theme.palette.text.primary
              }
            }
          }}
        >
          <MenuItem onClick={handleCloseNotifications}>
            New order received
          </MenuItem>
          <MenuItem onClick={handleCloseNotifications}>
            System update available
          </MenuItem>
          <Divider />
          <MenuItem onClick={handleCloseNotifications}>
            View all notifications
          </MenuItem>
        </Menu>

        <Menu
          anchorEl={chatAnchor}
          open={Boolean(chatAnchor)}
          onClose={handleCloseChat}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          PaperProps={{
            elevation: 0,
            sx: {
              mt: 1.5,
              border: '1px solid',
              borderColor: 'divider',
              '& .MuiMenuItem-root': {
                fontSize: '0.875rem',
                color: theme.palette.text.primary
              }
            }
          }}
        >
          <MenuItem onClick={handleCloseChat}>
            Message from John
          </MenuItem>
          <MenuItem onClick={handleCloseChat}>
            Message from Sarah
          </MenuItem>
          <Divider />
          <MenuItem onClick={handleCloseChat}>
            Open chat
          </MenuItem>
        </Menu>

        <Menu
          anchorEl={userMenuAnchor}
          open={Boolean(userMenuAnchor)}
          onClose={handleCloseUserMenu}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          PaperProps={{
            elevation: 0,
            sx: {
              mt: 1.5,
              border: '1px solid',
              borderColor: 'divider',
              '& .MuiMenuItem-root': {
                fontSize: '0.875rem',
                color: theme.palette.text.primary,
                '& .MuiListItemIcon-root': {
                  color: theme.palette.text.secondary,
                  minWidth: 36
                }
              }
            }
          }}
        >
          <MenuItem onClick={() => { 
            handleCloseUserMenu(); 
            navigate('/settings/user');
          }}>
            <ListItemIcon>
              <PersonIcon fontSize="small" />
            </ListItemIcon>
            Profile
          </MenuItem>
          <MenuItem onClick={() => { 
            handleCloseUserMenu(); 
            navigate('/settings'); 
          }}>
            <ListItemIcon>
              <SettingsIcon fontSize="small" />
            </ListItemIcon>
            Settings
          </MenuItem>
          <Divider />
          <MenuItem onClick={handleLogout}>
            <ListItemIcon>
              <LogoutIcon fontSize="small" />
            </ListItemIcon>
            Logout
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default TopBar; 