import { useState, useEffect, type FC } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  InputAdornment,
  Chip,
  Avatar,
  Divider,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Checkbox,
  Stack,
  Alert,
  CircularProgress,
  Container
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import SendIcon from '@mui/icons-material/Send';
import DeleteIcon from '@mui/icons-material/Delete';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import PersonIcon from '@mui/icons-material/Person';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CancelIcon from '@mui/icons-material/Cancel';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  linkUrl: string | null;
  isRead: boolean;
  createdAt: string;
  readAt: string | null;
}

interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  user_metadata?: {
    full_name?: string;
  };
}

const NotificationCentre: FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());
  const [openSendDialog, setOpenSendDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Send message form
  const [messageForm, setMessageForm] = useState({
    recipientId: '',
    title: '',
    message: ''
  });

  useEffect(() => {
    fetchNotifications();
    fetchUsers();
  }, []);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await api.get('/notifications');
      setNotifications(response.data || []);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data || []);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  const handleMarkAsRead = async (notificationIds: string[]) => {
    try {
      await Promise.all(
        notificationIds.map(id => api.patch(`/notifications/${id}/read`))
      );
      setSuccess('Marked as read');
      fetchNotifications();
      setSelectedNotifications(new Set());
    } catch (err) {
      setError('Failed to mark as read');
    }
  };

  const handleDelete = async (notificationIds: string[]) => {
    if (!window.confirm(`Delete ${notificationIds.length} notification(s)?`)) {
      return;
    }

    try {
      await Promise.all(
        notificationIds.map(id => api.delete(`/notifications/${id}`))
      );
      setSuccess('Notifications deleted');
      fetchNotifications();
      setSelectedNotifications(new Set());
    } catch (err) {
      setError('Failed to delete notifications');
    }
  };

  const handleOpenSendDialog = () => {
    setMessageForm({
      recipientId: '',
      title: '',
      message: ''
    });
    setOpenSendDialog(true);
  };

  const handleCloseSendDialog = () => {
    setOpenSendDialog(false);
  };

  const handleSendMessage = async () => {
    if (!messageForm.recipientId || !messageForm.title || !messageForm.message) {
      setError('Please fill in all fields');
      return;
    }

    try {
      await api.post('/notifications/send', {
        userId: messageForm.recipientId,
        title: messageForm.title,
        message: messageForm.message
      });
      setSuccess('Message sent successfully');
      handleCloseSendDialog();
      fetchNotifications();
    } catch (err) {
      setError('Failed to send message');
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read
    if (!notification.isRead) {
      api.patch(`/notifications/${notification.id}/read`).then(() => {
        fetchNotifications();
      });
    }

    // Navigate if there's a link
    if (notification.linkUrl) {
      navigate(notification.linkUrl);
    }
  };

  const handleSelectAll = () => {
    if (selectedNotifications.size === filteredNotifications.length) {
      setSelectedNotifications(new Set());
    } else {
      setSelectedNotifications(new Set(filteredNotifications.map(n => n.id)));
    }
  };

  const handleSelectNotification = (id: string) => {
    const newSelected = new Set(selectedNotifications);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedNotifications(newSelected);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'TRANSFER_CREATED':
      case 'TRANSFER_IN_TRANSIT':
        return <LocalShippingIcon fontSize="small" />;
      case 'TRANSFER_COMPLETED':
      case 'TRANSFER_APPROVED':
        return <CheckCircleIcon fontSize="small" />;
      case 'TRANSFER_REJECTED':
        return <CancelIcon fontSize="small" />;
      case 'TRANSFER_PENDING':
        return <AssignmentIcon fontSize="small" />;
      default:
        return <NotificationsIcon fontSize="small" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'TRANSFER_CREATED':
      case 'TRANSFER_IN_TRANSIT':
        return '#3b82f6';
      case 'TRANSFER_COMPLETED':
      case 'TRANSFER_APPROVED':
        return '#10b981';
      case 'TRANSFER_REJECTED':
        return '#ef4444';
      case 'TRANSFER_PENDING':
        return '#f59e0b';
      default:
        return '#64748b';
    }
  };

  // Filter notifications based on tab and search
  const filteredNotifications = notifications
    .filter(notification => {
      // Tab filter
      if (tabValue === 1 && notification.isRead) return false; // Unread tab
      if (tabValue === 2 && !notification.isRead) return false; // Read tab

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          notification.title.toLowerCase().includes(query) ||
          notification.message.toLowerCase().includes(query)
        );
      }

      return true;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b', mb: 0.5 }}>
              Notification Centre
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage your notifications and send messages
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<SendIcon />}
            onClick={handleOpenSendDialog}
            sx={{
              backgroundColor: '#dc2626',
              '&:hover': { backgroundColor: '#b91c1c' }
            }}
          >
            Send Message
          </Button>
        </Box>

        {/* Alerts */}
        {error && (
          <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2 }}>
          {/* Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={(_, val) => setTabValue(val)}>
              <Tab
                label={
                  <Box display="flex" alignItems="center" gap={1}>
                    All
                    <Chip label={notifications.length} size="small" />
                  </Box>
                }
              />
              <Tab
                label={
                  <Box display="flex" alignItems="center" gap={1}>
                    Unread
                    <Chip label={unreadCount} size="small" color="error" />
                  </Box>
                }
              />
              <Tab label="Read" />
            </Tabs>
          </Box>

          {/* Search and Actions */}
          <Box sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'center', borderBottom: '1px solid #e2e8f0' }}>
            <TextField
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              size="small"
              sx={{ flex: 1 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                )
              }}
            />
            {selectedNotifications.size > 0 && (
              <>
                <Button
                  size="small"
                  startIcon={<MarkEmailReadIcon />}
                  onClick={() => handleMarkAsRead(Array.from(selectedNotifications))}
                  variant="outlined"
                >
                  Mark Read
                </Button>
                <Button
                  size="small"
                  startIcon={<DeleteIcon />}
                  onClick={() => handleDelete(Array.from(selectedNotifications))}
                  variant="outlined"
                  color="error"
                >
                  Delete ({selectedNotifications.size})
                </Button>
              </>
            )}
            <Checkbox
              checked={selectedNotifications.size === filteredNotifications.length && filteredNotifications.length > 0}
              indeterminate={selectedNotifications.size > 0 && selectedNotifications.size < filteredNotifications.length}
              onChange={handleSelectAll}
            />
          </Box>

          {/* Notifications List */}
          {loading ? (
            <Box display="flex" justifyContent="center" alignItems="center" py={8}>
              <CircularProgress />
            </Box>
          ) : filteredNotifications.length === 0 ? (
            <Box display="flex" flexDirection="column" alignItems="center" py={8}>
              <NotificationsIcon sx={{ fontSize: 64, color: '#cbd5e1', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                No notifications
              </Typography>
            </Box>
          ) : (
            <List sx={{ p: 0 }}>
              {filteredNotifications.map((notification, index) => (
                <ListItem
                  key={notification.id}
                  sx={{
                    borderBottom: index !== filteredNotifications.length - 1 ? '1px solid #e2e8f0' : 'none',
                    backgroundColor: notification.isRead ? 'transparent' : '#fef2f2',
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: notification.isRead ? '#f8fafc' : '#fee2e2'
                    }
                  }}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <Checkbox
                    checked={selectedNotifications.has(notification.id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleSelectNotification(notification.id);
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <ListItemAvatar>
                    <Avatar
                      sx={{
                        bgcolor: getNotificationColor(notification.type),
                        width: 48,
                        height: 48
                      }}
                    >
                      {getNotificationIcon(notification.type)}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <>
                        {notification.title}
                        {!notification.isRead && (
                          <Chip label="New" size="small" color="error" sx={{ height: 20, ml: 1 }} />
                        )}
                      </>
                    }
                    secondary={
                      <>
                        {notification.message}
                        <br />
                        <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                          {format(new Date(notification.createdAt), 'PPp')}
                        </span>
                      </>
                    }
                    primaryTypographyProps={{
                      variant: 'body1',
                      sx: {
                        fontWeight: notification.isRead ? 400 : 600,
                        color: notification.isRead ? 'text.primary' : '#1e293b'
                      }
                    }}
                    secondaryTypographyProps={{
                      variant: 'body2',
                      sx: { color: 'text.secondary', mt: 0.5 },
                      component: 'span'
                    }}
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete([notification.id]);
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
        </Paper>

        {/* Send Message Dialog */}
        <Dialog open={openSendDialog} onClose={handleCloseSendDialog} maxWidth="sm" fullWidth>
          <DialogTitle>
            <Box display="flex" alignItems="center" gap={1}>
              <SendIcon color="primary" />
              <Typography variant="h6" fontWeight="bold">
                Send Direct Message
              </Typography>
            </Box>
          </DialogTitle>
          <DialogContent>
            <Stack spacing={3} sx={{ mt: 2 }}>
              <TextField
                select
                label="Recipient"
                value={messageForm.recipientId}
                onChange={(e) => setMessageForm({ ...messageForm, recipientId: e.target.value })}
                required
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon />
                    </InputAdornment>
                  )
                }}
              >
                <MenuItem value="">
                  <em>Select a user</em>
                </MenuItem>
                {users.map((u) => (
                  <MenuItem key={u.id} value={u.id}>
                    {u.firstName && u.lastName
                      ? `${u.firstName} ${u.lastName}`
                      : u.user_metadata?.full_name || u.email}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label="Title"
                value={messageForm.title}
                onChange={(e) => setMessageForm({ ...messageForm, title: e.target.value })}
                required
                fullWidth
                placeholder="Enter message title"
              />

              <TextField
                label="Message"
                value={messageForm.message}
                onChange={(e) => setMessageForm({ ...messageForm, message: e.target.value })}
                required
                fullWidth
                multiline
                rows={4}
                placeholder="Enter your message"
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={handleCloseSendDialog} size="large">
              Cancel
            </Button>
            <Button
              onClick={handleSendMessage}
              variant="contained"
              size="large"
              startIcon={<SendIcon />}
              sx={{
                backgroundColor: '#dc2626',
                '&:hover': { backgroundColor: '#b91c1c' }
              }}
            >
              Send Message
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default NotificationCentre;
