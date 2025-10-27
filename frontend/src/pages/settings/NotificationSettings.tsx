import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Switch,
  Chip,
  CircularProgress,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  InputAdornment,
  Divider
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SearchIcon from '@mui/icons-material/Search';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import EmailIcon from '@mui/icons-material/Email';
import { useSnackbar } from 'notistack';
import api from '../../lib/api';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface NotificationPreference {
  eventType: string;
  eventName: string;
  eventDescription: string;
  category: string;
  inApp: boolean;
  email: boolean;
}

interface EventTypesByCategory {
  [category: string]: Array<{
    code: string;
    name: string;
    description: string;
    category: string;
  }>;
}

export const NotificationSettings: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (selectedUser) {
      fetchUserPreferences(selectedUser.id);
    }
  }, [selectedUser]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/management/notification-settings/users');
      setUsers(response.data || []);

      // Auto-select first user if available
      if (response.data && response.data.length > 0) {
        setSelectedUser(response.data[0]);
      }
    } catch (error: any) {
      console.error('Error fetching users:', error);
      enqueueSnackbar(
        error.response?.data?.error || 'Failed to fetch users',
        { variant: 'error' }
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPreferences = async (userId: string) => {
    try {
      const response = await api.get(`/management/notification-settings/user/${userId}`);
      setPreferences(response.data || []);
    } catch (error: any) {
      console.error('Error fetching preferences:', error);
      enqueueSnackbar(
        error.response?.data?.error || 'Failed to fetch preferences',
        { variant: 'error' }
      );
    }
  };

  const handleTogglePreference = (eventType: string, channel: 'inApp' | 'email') => {
    setPreferences(prev =>
      prev.map(pref =>
        pref.eventType === eventType
          ? { ...pref, [channel]: !pref[channel] }
          : pref
      )
    );
  };

  const handleSavePreferences = async () => {
    if (!selectedUser) return;

    try {
      setSaving(true);
      await api.post(`/management/notification-settings/user/${selectedUser.id}`, {
        preferences: preferences.map(p => ({
          eventType: p.eventType,
          inApp: p.inApp,
          email: p.email
        }))
      });

      enqueueSnackbar('Notification preferences saved successfully', { variant: 'success' });
    } catch (error: any) {
      console.error('Error saving preferences:', error);
      enqueueSnackbar(
        error.response?.data?.error || 'Failed to save preferences',
        { variant: 'error' }
      );
    } finally {
      setSaving(false);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'error';
      case 'SUPERVISOR':
      case 'MANAGER':
        return 'warning';
      case 'OPERATOR':
      case 'WAREHOUSE_STAFF':
      case 'WAREHOUSE_MANAGER':
        return 'info';
      default:
        return 'default';
    }
  };

  const getUserDisplayName = (user: User) => {
    if (user.firstName || user.lastName) {
      return `${user.firstName || ''} ${user.lastName || ''}`.trim();
    }
    return user.email;
  };

  const filteredUsers = users.filter(user => {
    const searchLower = searchQuery.toLowerCase();
    return (
      user.email.toLowerCase().includes(searchLower) ||
      user.firstName?.toLowerCase().includes(searchLower) ||
      user.lastName?.toLowerCase().includes(searchLower) ||
      user.role.toLowerCase().includes(searchLower)
    );
  });

  // Group preferences by category
  const preferencesByCategory = preferences.reduce((acc: { [key: string]: NotificationPreference[] }, pref) => {
    if (!acc[pref.category]) {
      acc[pref.category] = [];
    }
    acc[pref.category].push(pref);
    return acc;
  }, {});

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
        Notification Settings
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        Configure notification preferences for each user. Select a user from the list and choose which events they should be notified about.
      </Alert>

      <Grid container spacing={3}>
        {/* Left Panel - User Selection */}
        <Grid item xs={12} md={4} lg={3}>
          <Paper sx={{ height: 'calc(100vh - 320px)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            <List sx={{ flex: 1, overflow: 'auto', p: 0 }}>
              {filteredUsers.map((user) => (
                <ListItemButton
                  key={user.id}
                  selected={selectedUser?.id === user.id}
                  onClick={() => setSelectedUser(user)}
                  sx={{
                    borderLeft: 4,
                    borderColor: selectedUser?.id === user.id ? 'primary.main' : 'transparent',
                    '&:hover': {
                      borderColor: 'primary.light'
                    }
                  }}
                >
                  <ListItemText
                    primary={getUserDisplayName(user)}
                    secondary={
                      <>
                        <Typography variant="caption" color="text.secondary" component="span" sx={{ mr: 1 }}>
                          {user.email}
                        </Typography>
                        <Chip
                          label={user.role}
                          color={getRoleColor(user.role)}
                          size="small"
                          sx={{ height: 18, fontSize: '0.65rem' }}
                        />
                      </>
                    }
                    secondaryTypographyProps={{
                      component: 'div',
                      sx: { display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }
                    }}
                  />
                </ListItemButton>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* Right Panel - Notification Preferences */}
        <Grid item xs={12} md={8} lg={9}>
          {selectedUser ? (
            <Paper sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {getUserDisplayName(selectedUser)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedUser.email} • {selectedUser.role}
                  </Typography>
                </Box>
                <Box>
                  <button
                    onClick={handleSavePreferences}
                    disabled={saving}
                    style={{
                      padding: '8px 24px',
                      backgroundColor: '#1976d2',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: saving ? 'not-allowed' : 'pointer',
                      opacity: saving ? 0.6 : 1,
                      fontSize: '14px',
                      fontWeight: 500
                    }}
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </Box>
              </Box>

              <Divider sx={{ mb: 3 }} />

              <Box sx={{ mb: 2 }}>
                <Table size="small" sx={{ mb: 2 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, width: '50%' }}>Event Type</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 600, width: '25%' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                          <NotificationsActiveIcon sx={{ fontSize: 18 }} />
                          In-App
                        </Box>
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 600, width: '25%' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                          <EmailIcon sx={{ fontSize: 18 }} />
                          Email
                        </Box>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                </Table>
              </Box>

              <Box>
                {Object.entries(preferencesByCategory).map(([category, prefs]) => (
                  <Accordion key={category} defaultExpanded>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {category}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                        ({prefs.length} events)
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails sx={{ p: 0 }}>
                      <Table size="small">
                        <TableBody>
                          {prefs.map((pref) => (
                            <TableRow key={pref.eventType} hover>
                              <TableCell sx={{ width: '50%' }}>
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                  {pref.eventName}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {pref.eventDescription}
                                </Typography>
                              </TableCell>
                              <TableCell align="center" sx={{ width: '25%' }}>
                                <Switch
                                  checked={pref.inApp}
                                  onChange={() => handleTogglePreference(pref.eventType, 'inApp')}
                                  color="primary"
                                />
                              </TableCell>
                              <TableCell align="center" sx={{ width: '25%' }}>
                                <Switch
                                  checked={pref.email}
                                  onChange={() => handleTogglePreference(pref.eventType, 'email')}
                                  color="primary"
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Box>
            </Paper>
          ) : (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                Select a user from the list to configure their notification preferences
              </Typography>
            </Paper>
          )}
        </Grid>
      </Grid>
    </Box>
  );
};
