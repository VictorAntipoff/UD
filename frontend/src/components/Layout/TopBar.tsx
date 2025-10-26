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
  useTheme,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemAvatar,
  Chip,
  Button
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import NotificationsIcon from '@mui/icons-material/Notifications';
import ChatIcon from '@mui/icons-material/Chat';
import PersonIcon from '@mui/icons-material/Person';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import AssignmentIcon from '@mui/icons-material/Assignment';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import ContentCutIcon from '@mui/icons-material/ContentCut';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import api from '../../lib/api';

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

  // Notifications and messages state
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notificationCount, setNotificationCount] = useState(0);
  const [chatCount] = useState(0); // Messages feature placeholder

  // Fetch notifications
  useEffect(() => {
    fetchNotifications();
    // Poll for new notifications every 60 seconds
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      // Fetch factory notifications
      const receiptsRes = await api.get('/management/wood-receipts');

      const receipts = receiptsRes.data || [];
      const pendingReceipts = receipts.filter((r: any) =>
        r.status === 'CREATED' || r.status === 'PENDING'
      );
      const receivedReceipts = receipts.filter((r: any) =>
        r.status === 'RECEIVED' && !r.receiptConfirmedAt
      );
      const slicingReceipts = receipts.filter((r: any) =>
        r.status === 'SLICING' || r.status === 'IN_PROCESS'
      );

      const notifs: any[] = [];

      // Add approval notifications (wood receipts awaiting confirmation)
      receivedReceipts.slice(0, 3).forEach((receipt: any) => {
        notifs.push({
          id: `approval-${receipt.id}`,
          type: 'approval',
          title: 'Awaiting Confirmation',
          message: `${receipt.lotNumber} - ${receipt.supplier} received`,
          timestamp: receipt.updatedAt,
          icon: <AssignmentIcon fontSize="small" />,
          color: '#f59e0b',
          action: () => navigate('/dashboard/management/wood-receipt')
        });
      });

      // Add pending receipt notifications
      pendingReceipts.slice(0, 3).forEach((receipt: any) => {
        notifs.push({
          id: `receipt-${receipt.id}`,
          type: 'receipt',
          title: 'Pending Delivery',
          message: `${receipt.lotNumber} awaiting delivery`,
          timestamp: receipt.createdAt,
          icon: <LocalShippingIcon fontSize="small" />,
          color: '#3b82f6',
          action: () => navigate('/dashboard/management/wood-receipt')
        });
      });

      // Add slicing notifications
      slicingReceipts.slice(0, 2).forEach((receipt: any) => {
        notifs.push({
          id: `slicing-${receipt.id}`,
          type: 'slicing',
          title: 'Slicing in Progress',
          message: `${receipt.lotNumber} is being processed`,
          timestamp: receipt.updatedAt,
          icon: <ContentCutIcon fontSize="small" />,
          color: '#8b5cf6',
          action: () => navigate('/factory/wood-slicer')
        });
      });

      // Fetch transfer notifications
      try {
        const transferNotifs = await api.get('/notifications');
        const transferData = transferNotifs.data || [];

        transferData.forEach((notif: any) => {
          let icon, color;
          switch(notif.type) {
            case 'TRANSFER_CREATED':
              icon = <LocalShippingIcon fontSize="small" />;
              color = '#3b82f6';
              break;
            case 'TRANSFER_APPROVED':
              icon = <CheckCircleIcon fontSize="small" />;
              color = '#10b981';
              break;
            case 'TRANSFER_REJECTED':
              icon = <CancelIcon fontSize="small" />;
              color = '#ef4444';
              break;
            case 'TRANSFER_COMPLETED':
              icon = <CheckCircleIcon fontSize="small" />;
              color = '#10b981';
              break;
            case 'TRANSFER_IN_TRANSIT':
              icon = <LocalShippingIcon fontSize="small" />;
              color = '#3b82f6';
              break;
            case 'TRANSFER_PENDING':
              icon = <AssignmentIcon fontSize="small" />;
              color = '#f59e0b';
              break;
            case 'TRANSFER_NOTIFICATION':
              icon = <AssignmentIcon fontSize="small" />;
              color = '#64748b';
              break;
            default:
              icon = <AssignmentIcon fontSize="small" />;
              color = '#64748b';
          }

          notifs.push({
            id: notif.id,
            type: notif.type,
            title: notif.title,
            message: notif.message,
            timestamp: notif.createdAt,
            icon,
            color,
            action: () => {
              if (notif.linkUrl) {
                navigate(notif.linkUrl);
              } else {
                navigate('/dashboard/factory/wood-transfer');
              }
            }
          });
        });
      } catch (transferError) {
        console.error('Error fetching transfer notifications:', transferError);
      }

      // Sort by timestamp (most recent first)
      notifs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setNotifications(notifs.slice(0, 8)); // Keep only latest 8
      setNotificationCount(notifs.length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

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
                    backgroundColor: '#dc2626',
                    color: 'white'
                  }
                }}
              >
                <NotificationsIcon sx={{ color: '#dc2626' }} />
              </Badge>
            </IconButton>
          </Tooltip>

          {/* Chat */}
          <Tooltip title="Messages">
            <IconButton
              onClick={handleChatMenu}
              sx={{
                '&:hover': {
                  backgroundColor: theme.palette.action.hover
                }
              }}
            >
              {chatCount > 0 ? (
                <Badge
                  badgeContent={chatCount}
                  color="error"
                  sx={{
                    '& .MuiBadge-badge': {
                      backgroundColor: '#dc2626',
                      color: 'white'
                    }
                  }}
                >
                  <ChatIcon sx={{ color: '#dc2626' }} />
                </Badge>
              ) : (
                <ChatIcon sx={{ color: '#dc2626' }} />
              )}
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

        {/* Notifications Menu */}
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
              width: 380,
              maxHeight: 480
            }
          }}
        >
          <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: '0.95rem' }}>
              Notifications
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              You have {notificationCount} notification{notificationCount !== 1 ? 's' : ''}
            </Typography>
          </Box>

          {notifications.length === 0 ? (
            <Box sx={{ px: 3, py: 4, textAlign: 'center' }}>
              <NotificationsIcon sx={{ fontSize: 48, color: '#cbd5e1', mb: 1 }} />
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                No notifications
              </Typography>
            </Box>
          ) : (
            <List sx={{ py: 0, maxHeight: 360, overflow: 'auto' }}>
              {notifications.map((notification) => (
                <ListItemButton
                  key={notification.id}
                  onClick={() => {
                    handleCloseNotifications();
                    if (notification.action) {
                      notification.action();
                    }
                  }}
                  sx={{
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    '&:hover': {
                      backgroundColor: 'action.hover'
                    }
                  }}
                >
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: notification.color, width: 40, height: 40 }}>
                      {notification.icon}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={notification.title}
                    secondary={
                      <>
                        {notification.message}
                        <br />
                        <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>
                          {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
                        </span>
                      </>
                    }
                    primaryTypographyProps={{
                      variant: 'body2',
                      sx: { fontWeight: 600, fontSize: '0.875rem' }
                    }}
                    secondaryTypographyProps={{
                      variant: 'body2',
                      sx: { fontSize: '0.8rem', color: 'text.secondary' },
                      component: 'span'
                    }}
                  />
                </ListItemButton>
              ))}
            </List>
          )}

          {/* View All Button */}
          <Box sx={{ p: 1.5, borderTop: '1px solid', borderColor: 'divider', textAlign: 'center' }}>
            <Button
              fullWidth
              size="small"
              onClick={() => {
                handleCloseNotifications();
                navigate('/dashboard/notifications');
              }}
              sx={{
                color: '#dc2626',
                '&:hover': {
                  backgroundColor: 'rgba(220, 38, 38, 0.04)'
                }
              }}
            >
              View All Notifications
            </Button>
          </Box>
        </Menu>

        {/* Messages Menu */}
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
              width: 380
            }
          }}
        >
          <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: '0.95rem' }}>
              Messages
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              No new messages
            </Typography>
          </Box>

          <Box sx={{ px: 3, py: 4, textAlign: 'center' }}>
            <ChatIcon sx={{ fontSize: 48, color: '#cbd5e1', mb: 1 }} />
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
              No messages yet
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.75rem' }}>
              Internal messaging feature coming soon
            </Typography>
          </Box>
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