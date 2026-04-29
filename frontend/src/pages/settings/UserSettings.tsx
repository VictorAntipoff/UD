import {
  Container,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  Box,
  Switch,
  Avatar,
  IconButton,
  Divider,
  Stack,
  Alert,
  Snackbar,
  Chip,
  CircularProgress,
  Link,
  Collapse,
} from '@mui/material';
import { useState, useEffect } from 'react';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import SecurityIcon from '@mui/icons-material/Security';
import NotificationsIcon from '@mui/icons-material/Notifications';
import PersonIcon from '@mui/icons-material/Person';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import TelegramIcon from '@mui/icons-material/Telegram';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import SendIcon from '@mui/icons-material/Send';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import SearchIcon from '@mui/icons-material/Search';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import LinkIcon from '@mui/icons-material/Link';
import { useAuth } from '../../hooks/useAuth';
import { styled, alpha } from '@mui/material/styles';
import api from '../../services/api';

const StyledContainer = styled(Container)(({ theme }) => ({
  minHeight: '100vh',
  paddingTop: theme.spacing(4),
  paddingBottom: theme.spacing(4),
  backgroundColor: '#f8fafc',
}));

const VisuallyHiddenInput = styled('input')({
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  bottom: 0,
  left: 0,
  whiteSpace: 'nowrap',
  width: 1,
});

const textFieldSx = {
  '& .MuiOutlinedInput-root': {
    '& fieldset': {
      borderColor: 'rgba(0, 0, 0, 0.12)',
    },
    '&:hover fieldset': {
      borderColor: '#dc2626',
    },
    '&.Mui-focused fieldset': {
      borderColor: '#dc2626',
    },
    fontSize: '0.875rem',
  },
  '& .MuiInputLabel-root': {
    color: 'rgba(0, 0, 0, 0.6)',
    fontSize: '0.875rem',
    '&.Mui-focused': {
      color: '#dc2626',
    },
  },
};

export default function UserSettings() {
  const { user } = useAuth();

  const [userSettings, setUserSettings] = useState({
    firstName: '',
    lastName: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    emailNotifications: true,
    twoFactorAuth: false
  });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState({ open: false, message: '', type: 'success' as 'success' | 'error' });

  // Telegram link state
  const [tg, setTg] = useState<{
    loading: boolean;
    linked: boolean;
    chatId: string | null;
    linkedAt: string | null;
    botUsername: string;
    configured: boolean;
  }>({ loading: true, linked: false, chatId: null, linkedAt: null, botUsername: 'ud_system_bot', configured: true });
  const [tgInputChatId, setTgInputChatId] = useState('');
  const [tgSaving, setTgSaving] = useState(false);
  const [tgTesting, setTgTesting] = useState(false);

  // New "easy link" flow state
  const [tgLinkCode, setTgLinkCode] = useState<{
    code: string;
    expiresAt: string;
    botUsername: string;
  } | null>(null);
  const [tgGenerating, setTgGenerating] = useState(false);
  const [tgFinding, setTgFinding] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Notification preferences (per-event inApp/telegram toggles)
  type PreferenceRow = {
    eventType: string;
    label: string;
    description: string;
    group: string;
    inApp: boolean;
    telegram: boolean;
  };
  const [prefs, setPrefs] = useState<PreferenceRow[]>([]);
  const [prefsLoading, setPrefsLoading] = useState(true);
  const [prefsSaving, setPrefsSaving] = useState<string | null>(null); // eventType being saved
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [notifyOnOwnActions, setNotifyOnOwnActions] = useState(false);
  const [notifyOnOwnSaving, setNotifyOnOwnSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setUserSettings(prev => ({
        ...prev,
        email: user.email || '',
        firstName: user.firstName || '',
        lastName: user.lastName || ''
      }));
    }
  }, [user]);

  // Load Telegram link status on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/api/users/me/telegram');
        if (cancelled) return;
        setTg({
          loading: false,
          linked: Boolean(res.data?.linked),
          chatId: res.data?.chatId ?? null,
          linkedAt: res.data?.linkedAt ?? null,
          botUsername: res.data?.botUsername ?? 'ud_system_bot',
          configured: Boolean(res.data?.configured),
        });
        setTgInputChatId(res.data?.chatId ?? '');
      } catch {
        if (!cancelled) setTg(s => ({ ...s, loading: false }));
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleSaveTelegramLink = async (clear: boolean) => {
    setTgSaving(true);
    try {
      const res = await api.put('/api/users/me/telegram', {
        chatId: clear ? null : tgInputChatId.trim(),
      });
      setTg(s => ({
        ...s,
        linked: Boolean(res.data?.linked),
        chatId: res.data?.chatId ?? null,
        linkedAt: res.data?.linkedAt ?? null,
      }));
      setNotification({
        open: true,
        message: clear ? 'Telegram unlinked.' : 'Telegram chat ID saved. You can now send a test message.',
        type: 'success',
      });
    } catch (err: any) {
      setNotification({
        open: true,
        message: err?.response?.data?.error ?? 'Failed to save Telegram link',
        type: 'error',
      });
    } finally {
      setTgSaving(false);
    }
  };

  const handleSendWelcome = async () => {
    setTgTesting(true);
    try {
      await api.post('/api/users/me/telegram/test');
      setNotification({
        open: true,
        message: 'Welcome message sent. Check your Telegram!',
        type: 'success',
      });
    } catch (err: any) {
      setNotification({
        open: true,
        message: err?.response?.data?.error ?? 'Failed to send test message',
        type: 'error',
      });
    } finally {
      setTgTesting(false);
    }
  };

  const handleStartLink = async () => {
    setTgGenerating(true);
    try {
      const res = await api.post('/api/users/me/telegram/start-link');
      setTgLinkCode({
        code: res.data.code,
        expiresAt: res.data.expiresAt,
        botUsername: res.data.botUsername,
      });
    } catch (err: any) {
      setNotification({
        open: true,
        message: err?.response?.data?.error ?? 'Failed to start linking',
        type: 'error',
      });
    } finally {
      setTgGenerating(false);
    }
  };

  // Poll /me/telegram every 2.5s while a link code is active.
  // The bot links the chat as soon as the user sends the code, so we just
  // watch for the link to appear.
  useEffect(() => {
    if (!tgLinkCode) return;
    let cancelled = false;
    const interval = setInterval(async () => {
      try {
        const res = await api.get('/api/users/me/telegram');
        if (cancelled) return;
        if (res.data?.linked && res.data?.chatId) {
          setTg(s => ({
            ...s,
            linked: true,
            chatId: res.data.chatId,
            linkedAt: res.data.linkedAt ?? null,
          }));
          setTgInputChatId(res.data.chatId);
          setTgLinkCode(null);   // close the code panel
          setNotification({
            open: true,
            message: 'Linked successfully! A welcome message has been sent to your Telegram.',
            type: 'success',
          });
        } else if (tgLinkCode && new Date(tgLinkCode.expiresAt).getTime() < Date.now()) {
          // Code expired without success
          setTgLinkCode(null);
          setNotification({
            open: true,
            message: 'Link code expired. Click "Start linking" to try again.',
            type: 'error',
          });
        }
      } catch {
        // ignore — keep polling
      }
    }, 2500);
    return () => { cancelled = true; clearInterval(interval); };
  }, [tgLinkCode]);

  const handleCopyCode = async () => {
    if (!tgLinkCode?.code) return;
    try {
      await navigator.clipboard.writeText(tgLinkCode.code);
      setNotification({ open: true, message: 'Code copied to clipboard.', type: 'success' });
    } catch {
      // Fallback: nothing dramatic — user can copy manually
    }
  };

  // Load notification preferences on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/api/users/me/notification-preferences');
        if (cancelled) return;
        const events: PreferenceRow[] = res.data?.events ?? [];
        setPrefs(events);
        setNotifyOnOwnActions(Boolean(res.data?.notifyOnOwnActions));
        // Default all groups collapsed for a cleaner first view
        const initial: Record<string, boolean> = {};
        for (const ev of events) {
          if (!(ev.group in initial)) initial[ev.group] = false;
        }
        setExpandedGroups(initial);
      } catch {
        // keep empty; the section will show a generic error
      } finally {
        if (!cancelled) setPrefsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handlePrefToggle = async (
    eventType: string,
    channel: 'inApp' | 'telegram',
    nextValue: boolean
  ) => {
    // Optimistic update
    setPrefs((prev) => prev.map(p => p.eventType === eventType ? { ...p, [channel]: nextValue } : p));
    setPrefsSaving(eventType);
    try {
      await api.put(`/api/users/me/notification-preferences/${eventType}`, { [channel]: nextValue });
    } catch (err: any) {
      // Revert on failure
      setPrefs((prev) => prev.map(p => p.eventType === eventType ? { ...p, [channel]: !nextValue } : p));
      setNotification({
        open: true,
        message: err?.response?.data?.error ?? 'Failed to update preference',
        type: 'error',
      });
    } finally {
      setPrefsSaving(null);
    }
  };

  const handleNotifyOnOwnToggle = async (nextValue: boolean) => {
    setNotifyOnOwnActions(nextValue);
    setNotifyOnOwnSaving(true);
    try {
      await api.put('/api/users/me/notify-on-own-actions', { enabled: nextValue });
    } catch (err: any) {
      setNotifyOnOwnActions(!nextValue);
      setNotification({
        open: true,
        message: err?.response?.data?.error ?? 'Failed to update setting',
        type: 'error',
      });
    } finally {
      setNotifyOnOwnSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setUserSettings({
      ...userSettings,
      [e.target.name]: value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Validate password fields if changing password
      if (userSettings.newPassword) {
        if (!userSettings.currentPassword) {
          setNotification({ open: true, message: 'Please enter your current password', type: 'error' });
          setSaving(false);
          return;
        }
        if (userSettings.newPassword !== userSettings.confirmPassword) {
          setNotification({ open: true, message: 'New passwords do not match', type: 'error' });
          setSaving(false);
          return;
        }
        if (userSettings.newPassword.length < 8) {
          setNotification({ open: true, message: 'Password must be at least 8 characters', type: 'error' });
          setSaving(false);
          return;
        }
      }

      const response = await api.put('/api/users/profile', {
        firstName: userSettings.firstName,
        lastName: userSettings.lastName,
        currentPassword: userSettings.currentPassword || undefined,
        newPassword: userSettings.newPassword || undefined
      });

      setNotification({ open: true, message: 'Profile updated successfully!', type: 'success' });

      // Clear password fields
      setUserSettings(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
    } catch (error: any) {
      console.error('Error updating profile:', error);
      setNotification({
        open: true,
        message: error.response?.data?.error || 'Failed to update profile',
        type: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const previewUrl = URL.createObjectURL(file);
        setAvatarUrl(previewUrl);
        console.log('File to upload:', file);
      } catch (error) {
        console.error('Error uploading avatar:', error);
      }
    }
  };

  return (
    <StyledContainer maxWidth="xl">
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={() => setNotification({ ...notification, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert onClose={() => setNotification({ ...notification, open: false })} severity={notification.type} sx={{ width: '100%' }}>
          {notification.message}
        </Alert>
      </Snackbar>

      {/* Header */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
          borderRadius: 2,
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <PersonIcon sx={{ fontSize: 28, color: 'white' }} />
            </Box>
            <Box>
              <Typography
                variant="h4"
                sx={{
                  color: 'white',
                  fontWeight: 700,
                  fontSize: '1.75rem',
                  letterSpacing: '-0.025em',
                }}
              >
                User Settings
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontSize: '0.875rem',
                  mt: 0.5,
                }}
              >
                Manage your profile, security, and preferences
              </Typography>
            </Box>
          </Box>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={saving}
            sx={{
              backgroundColor: 'white',
              color: '#dc2626',
              fontWeight: 600,
              fontSize: '0.875rem',
              textTransform: 'none',
              px: 3,
              py: 1,
              borderRadius: 2,
              boxShadow: 'none',
              '&:hover': {
                backgroundColor: '#f8fafc',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                transform: 'translateY(-2px)',
              },
              transition: 'all 0.2s ease',
            }}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </Box>
      </Paper>

      <Grid container spacing={3}>
        {/* Profile Picture Section */}
        <Grid item xs={12}>
          <Paper
            elevation={0}
            sx={{
              borderRadius: 2,
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
            }}
          >
            <Box sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexDirection: { xs: 'column', sm: 'row' } }}>
                <Box sx={{ position: 'relative' }}>
                  <Avatar
                    src={avatarUrl || user?.avatar_url}
                    sx={{
                      width: 120,
                      height: 120,
                      border: '4px solid #f8fafc',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    }}
                  >
                    {user?.email?.[0]?.toUpperCase()}
                  </Avatar>
                  <IconButton
                    component="label"
                    sx={{
                      position: 'absolute',
                      bottom: 0,
                      right: 0,
                      backgroundColor: '#dc2626',
                      color: 'white',
                      width: 40,
                      height: 40,
                      '&:hover': {
                        backgroundColor: '#b91c1c',
                      },
                    }}
                  >
                    <PhotoCameraIcon sx={{ fontSize: '1.25rem' }} />
                    <VisuallyHiddenInput
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                    />
                  </IconButton>
                </Box>
                <Box sx={{ flex: 1, textAlign: { xs: 'center', sm: 'left' } }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b', mb: 0.5 }}>
                    Profile Picture
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.875rem', mb: 2 }}>
                    Upload a new profile picture. Recommended size: 200x200px
                  </Typography>
                  <Button
                    component="label"
                    variant="outlined"
                    startIcon={<PhotoCameraIcon />}
                    sx={{
                      borderColor: '#dc2626',
                      color: '#dc2626',
                      textTransform: 'none',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      '&:hover': {
                        borderColor: '#b91c1c',
                        backgroundColor: alpha('#dc2626', 0.04),
                      },
                    }}
                  >
                    Upload New Picture
                    <VisuallyHiddenInput
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                    />
                  </Button>
                </Box>
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Profile Information */}
        <Grid item xs={12} md={6}>
          <Paper
            elevation={0}
            sx={{
              borderRadius: 2,
              border: '1px solid #e2e8f0',
              height: '100%',
            }}
          >
            <Box sx={{ p: 3, borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <AccountCircleIcon sx={{ color: '#dc2626', fontSize: 24 }} />
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b', fontSize: '1rem' }}>
                  Profile Information
                </Typography>
              </Box>
            </Box>
            <Box sx={{ p: 3 }}>
              <Stack spacing={2.5}>
                <TextField
                  fullWidth
                  label="First Name"
                  name="firstName"
                  value={userSettings.firstName}
                  onChange={handleChange}
                  size="small"
                  sx={textFieldSx}
                />
                <TextField
                  fullWidth
                  label="Last Name"
                  name="lastName"
                  value={userSettings.lastName}
                  onChange={handleChange}
                  size="small"
                  sx={textFieldSx}
                />
                <TextField
                  fullWidth
                  label="Email"
                  name="email"
                  type="email"
                  value={userSettings.email}
                  onChange={handleChange}
                  disabled
                  size="small"
                  helperText="Email cannot be changed"
                  sx={textFieldSx}
                />
              </Stack>
            </Box>
          </Paper>
        </Grid>

        {/* Security Settings */}
        <Grid item xs={12} md={6}>
          <Paper
            elevation={0}
            sx={{
              borderRadius: 2,
              border: '1px solid #e2e8f0',
              height: '100%',
            }}
          >
            <Box sx={{ p: 3, borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <SecurityIcon sx={{ color: '#dc2626', fontSize: 24 }} />
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b', fontSize: '1rem' }}>
                  Security
                </Typography>
              </Box>
            </Box>
            <Box sx={{ p: 3 }}>
              <Stack spacing={2.5}>
                <TextField
                  fullWidth
                  label="Current Password"
                  name="currentPassword"
                  type="password"
                  value={userSettings.currentPassword}
                  onChange={handleChange}
                  size="small"
                  sx={textFieldSx}
                />
                <TextField
                  fullWidth
                  label="New Password"
                  name="newPassword"
                  type="password"
                  value={userSettings.newPassword}
                  onChange={handleChange}
                  size="small"
                  sx={textFieldSx}
                />
                <TextField
                  fullWidth
                  label="Confirm New Password"
                  name="confirmPassword"
                  type="password"
                  value={userSettings.confirmPassword}
                  onChange={handleChange}
                  size="small"
                  sx={textFieldSx}
                />
              </Stack>
            </Box>
          </Paper>
        </Grid>

        {/* Preferences */}
        <Grid item xs={12}>
          <Paper
            elevation={0}
            sx={{
              borderRadius: 2,
              border: '1px solid #e2e8f0',
            }}
          >
            <Box sx={{ p: 3, borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <NotificationsIcon sx={{ color: '#dc2626', fontSize: 24 }} />
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b', fontSize: '1rem' }}>
                  Preferences
                </Typography>
              </Box>
            </Box>
            <Box sx={{ p: 3 }}>
              <Stack spacing={3}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="body1" sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b', mb: 0.5 }}>
                      Email Notifications
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: '0.875rem', color: '#64748b' }}>
                      Receive email notifications about account activity
                    </Typography>
                  </Box>
                  <Switch
                    name="emailNotifications"
                    checked={userSettings.emailNotifications}
                    onChange={handleChange}
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': {
                        color: '#dc2626',
                      },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                        backgroundColor: '#dc2626',
                      },
                    }}
                  />
                </Box>
                <Divider />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="body1" sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b', mb: 0.5 }}>
                      Two-Factor Authentication
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: '0.875rem', color: '#64748b' }}>
                      Add an extra layer of security to your account
                    </Typography>
                  </Box>
                  <Switch
                    name="twoFactorAuth"
                    checked={userSettings.twoFactorAuth}
                    onChange={handleChange}
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': {
                        color: '#dc2626',
                      },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                        backgroundColor: '#dc2626',
                      },
                    }}
                  />
                </Box>
              </Stack>
            </Box>
          </Paper>
        </Grid>

        {/* Telegram Notifications */}
        <Grid item xs={12}>
          <Paper
            elevation={0}
            sx={{
              borderRadius: 2,
              border: '1px solid #e2e8f0',
            }}
          >
            <Box sx={{ p: 3, borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <TelegramIcon sx={{ color: '#229ED9', fontSize: 28 }} />
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b', fontSize: '1rem' }}>
                    Telegram Notifications
                  </Typography>
                </Box>
                {tg.loading ? null : tg.linked ? (
                  <Chip
                    icon={<CheckCircleIcon sx={{ fontSize: 16 }} />}
                    label="Linked"
                    size="small"
                    sx={{ backgroundColor: '#dcfce7', color: '#15803d', fontWeight: 600, border: '1px solid #bbf7d0' }}
                  />
                ) : (
                  <Chip label="Not linked" size="small" sx={{ backgroundColor: '#f1f5f9', color: '#64748b', fontWeight: 600 }} />
                )}
              </Box>
            </Box>
            <Box sx={{ p: 3 }}>
              {!tg.configured && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  Telegram integration isn't configured on the server. Ask an admin to set the bot token.
                </Alert>
              )}

              {tg.loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : tg.linked ? (
                // ─── LINKED STATE ────────────────────────────────────────
                <Stack spacing={2.5}>
                  <Box sx={{ p: 2, backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <CheckCircleIcon sx={{ color: '#15803d', fontSize: 20 }} />
                      <Typography variant="body2" sx={{ color: '#15803d', fontWeight: 700 }}>
                        Telegram is linked
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ color: '#166534', ml: 3.5 }}>
                      Chat ID: <strong style={{ fontFamily: 'monospace' }}>{tg.chatId}</strong>
                      {tg.linkedAt && ` — since ${new Date(tg.linkedAt).toLocaleString()}`}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap' }}>
                    <Button
                      variant="outlined"
                      onClick={handleSendWelcome}
                      disabled={tgTesting || !tg.configured}
                      startIcon={tgTesting ? <CircularProgress size={16} /> : <SendIcon />}
                      sx={{
                        textTransform: 'none', fontWeight: 600, px: 2.5,
                        color: '#229ED9', borderColor: '#229ED9',
                        '&:hover': { borderColor: '#1c8bbf', backgroundColor: alpha('#229ED9', 0.04) },
                      }}
                    >
                      Send test message
                    </Button>
                    <Button
                      variant="text"
                      onClick={() => handleSaveTelegramLink(true)}
                      disabled={tgSaving}
                      startIcon={<LinkOffIcon />}
                      sx={{ textTransform: 'none', fontWeight: 600, color: '#64748b', ml: 'auto !important' }}
                    >
                      Unlink
                    </Button>
                  </Stack>
                </Stack>
              ) : (
                // ─── NOT LINKED STATE ────────────────────────────────────
                <Stack spacing={2.5}>
                  {!tgLinkCode ? (
                    // Step 1: pitch the easy flow
                    <>
                      <Box sx={{ p: 2, backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 1 }}>
                        <Typography variant="body2" sx={{ color: '#0c4a6e', fontWeight: 600, mb: 1 }}>
                          Link your Telegram in 3 easy steps:
                        </Typography>
                        <Typography variant="body2" component="ol" sx={{ color: '#0c4a6e', pl: 2.5, m: 0, lineHeight: 1.8 }}>
                          <li>Click <strong>Start linking</strong> below — we'll give you a one-time code.</li>
                          <li>Open Telegram and send the code to <strong>@{tg.botUsername}</strong>.</li>
                          <li>That's it — we'll detect it and link automatically.</li>
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap' }}>
                        <Button
                          variant="contained"
                          onClick={handleStartLink}
                          disabled={tgGenerating || !tg.configured}
                          startIcon={tgGenerating ? <CircularProgress size={16} color="inherit" /> : <LinkIcon />}
                          sx={{
                            textTransform: 'none', fontWeight: 600, px: 3,
                            backgroundColor: '#229ED9',
                            '&:hover': { backgroundColor: '#1c8bbf' },
                          }}
                        >
                          Start linking
                        </Button>
                        <Button
                          variant="text"
                          onClick={() => setShowAdvanced((s) => !s)}
                          endIcon={<ExpandMoreIcon sx={{ transform: showAdvanced ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />}
                          sx={{ textTransform: 'none', color: '#64748b', ml: 'auto !important' }}
                        >
                          Advanced
                        </Button>
                      </Stack>
                    </>
                  ) : (
                    // Step 2: show the code; bot links automatically when user sends it
                    <>
                      <Box sx={{ p: 2.5, backgroundColor: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 1 }}>
                        <Typography variant="body2" sx={{ color: '#92400e', fontWeight: 700, mb: 1.5 }}>
                          Send this code to @{tgLinkCode.botUsername} on Telegram:
                        </Typography>
                        <Box
                          sx={{
                            display: 'flex', alignItems: 'center', gap: 1.5,
                            p: 1.5, backgroundColor: 'white',
                            border: '2px solid #fcd34d', borderRadius: 1,
                          }}
                        >
                          <Typography
                            variant="h5"
                            sx={{
                              fontFamily: 'monospace', fontWeight: 700,
                              letterSpacing: '0.05em', flex: 1,
                              color: '#1e293b', fontSize: '1.5rem',
                            }}
                          >
                            {tgLinkCode.code}
                          </Typography>
                          <IconButton onClick={handleCopyCode} title="Copy code" sx={{ color: '#229ED9' }}>
                            <ContentCopyIcon />
                          </IconButton>
                        </Box>
                        <Typography variant="caption" sx={{ color: '#92400e', display: 'block', mt: 1.5 }}>
                          ⏱️ Code expires in 10 minutes. We'll detect your message and link automatically.
                        </Typography>
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.5, backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 1 }}>
                        <CircularProgress size={16} sx={{ color: '#0369a1' }} />
                        <Typography variant="body2" sx={{ color: '#0c4a6e', fontWeight: 600 }}>
                          Waiting for your message to @{tgLinkCode.botUsername}…
                        </Typography>
                      </Box>

                      <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap' }}>
                        <Button
                          variant="contained"
                          color="primary"
                          href={`https://t.me/${tgLinkCode.botUsername}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          startIcon={<TelegramIcon />}
                          sx={{
                            textTransform: 'none', fontWeight: 600, px: 2.5,
                            backgroundColor: '#229ED9',
                            '&:hover': { backgroundColor: '#1c8bbf' },
                          }}
                        >
                          Open @{tgLinkCode.botUsername}
                        </Button>
                        <Button
                          variant="text"
                          onClick={() => setTgLinkCode(null)}
                          sx={{ textTransform: 'none', color: '#64748b', ml: 'auto !important' }}
                        >
                          Cancel
                        </Button>
                      </Stack>
                    </>
                  )}

                  {/* Advanced (manual chat ID entry) — collapsed by default */}
                  {showAdvanced && !tgLinkCode && (
                    <Box sx={{ p: 2, backgroundColor: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 1 }}>
                      <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 1.5, fontWeight: 600 }}>
                        ADVANCED — paste a chat ID directly
                      </Typography>
                      <Stack spacing={1.5}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Telegram chat ID"
                          placeholder="e.g. 123456789"
                          value={tgInputChatId}
                          onChange={(e) => setTgInputChatId(e.target.value.replace(/[^\d-]/g, ''))}
                          helperText="Numeric only. Use this if someone has already given you the chat ID."
                          disabled={tgSaving || !tg.configured}
                          sx={textFieldSx}
                        />
                        <Button
                          variant="outlined"
                          onClick={() => handleSaveTelegramLink(false)}
                          disabled={!tgInputChatId.trim() || tgSaving || !tg.configured}
                          startIcon={tgSaving ? <CircularProgress size={16} /> : <TelegramIcon />}
                          sx={{
                            textTransform: 'none', fontWeight: 600,
                            color: '#229ED9', borderColor: '#229ED9', alignSelf: 'flex-start',
                            '&:hover': { borderColor: '#1c8bbf', backgroundColor: alpha('#229ED9', 0.04) },
                          }}
                        >
                          Save manually
                        </Button>
                      </Stack>
                    </Box>
                  )}
                </Stack>
              )}
            </Box>
          </Paper>
        </Grid>

        {/* Notification Preferences */}
        <Grid item xs={12}>
          <Paper elevation={0} sx={{ borderRadius: 2, border: '1px solid #e2e8f0' }}>
            <Box sx={{ p: 3, borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <NotificationsIcon sx={{ color: '#dc2626', fontSize: 24 }} />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b', fontSize: '1rem' }}>
                    Notification Preferences
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748b' }}>
                    Choose which events notify you, and through which channel.
                  </Typography>
                </Box>
                {!prefsLoading && prefs.length > 0 && (() => {
                  const allGroups = Array.from(new Set(prefs.map(p => p.group)));
                  const allExpanded = allGroups.every(g => expandedGroups[g]);
                  return (
                    <Button
                      size="small"
                      onClick={() => {
                        const next: Record<string, boolean> = {};
                        for (const g of allGroups) next[g] = !allExpanded;
                        setExpandedGroups(next);
                      }}
                      sx={{ textTransform: 'none', color: '#64748b', fontSize: '0.75rem' }}
                    >
                      {allExpanded ? 'Collapse all' : 'Expand all'}
                    </Button>
                  );
                })()}
              </Box>
            </Box>
            <Box sx={{ p: 3 }}>
              {prefsLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : prefs.length === 0 ? (
                <Alert severity="info">No notification events configured.</Alert>
              ) : (
                <Stack spacing={3}>
                  {/* User-level: include yourself in fan-out */}
                  <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    px: 2, py: 1.5,
                    backgroundColor: notifyOnOwnActions ? '#fef3c7' : '#f8fafc',
                    border: '1px solid',
                    borderColor: notifyOnOwnActions ? '#fde68a' : '#e2e8f0',
                    borderRadius: 1,
                    transition: 'background-color 0.2s, border-color 0.2s',
                  }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" sx={{ color: '#1e293b', fontWeight: 600 }}>
                        Notify me about my own actions
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#64748b' }}>
                        When ON, you get notifications for actions you take yourself (good for solo admins or testing).
                        When OFF, you only hear about what other people do.
                      </Typography>
                    </Box>
                    <Switch
                      checked={notifyOnOwnActions}
                      onChange={(e) => handleNotifyOnOwnToggle(e.target.checked)}
                      disabled={notifyOnOwnSaving}
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': { color: '#f59e0b' },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#f59e0b' },
                      }}
                    />
                  </Box>

                  {/* Group preferences by their group field */}
                  {Array.from(new Set(prefs.map(p => p.group))).map((group) => {
                    const groupPrefs = prefs.filter(p => p.group === group);
                    const isExpanded = expandedGroups[group] ?? false;
                    const appOnCount = groupPrefs.filter(p => p.inApp).length;
                    const tgOnCount = groupPrefs.filter(p => p.telegram && tg.linked).length;
                    return (
                      <Box key={group} sx={{ border: '1px solid #e2e8f0', borderRadius: 1, overflow: 'hidden' }}>
                        {/* Clickable group header */}
                        <Box
                          onClick={() => setExpandedGroups(prev => ({ ...prev, [group]: !isExpanded }))}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                            px: 2, py: 1.5,
                            backgroundColor: '#f8fafc',
                            borderBottom: isExpanded ? '1px solid #e2e8f0' : 'none',
                            cursor: 'pointer',
                            userSelect: 'none',
                            transition: 'background-color 0.15s',
                            '&:hover': { backgroundColor: '#f1f5f9' },
                          }}
                        >
                          <ExpandMoreIcon
                            sx={{
                              color: '#64748b',
                              fontSize: 20,
                              transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                              transition: 'transform 0.2s',
                            }}
                          />
                          <Typography variant="subtitle2" sx={{ color: '#1e293b', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: 0.5, flex: 1 }}>
                            {group}
                          </Typography>
                          <Chip
                            size="small"
                            label={`${groupPrefs.length} event${groupPrefs.length === 1 ? '' : 's'}`}
                            sx={{ height: 20, fontSize: '0.7rem', backgroundColor: '#e2e8f0', color: '#475569' }}
                          />
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: appOnCount > 0 ? '#dc2626' : '#cbd5e1' }} />
                            <Typography variant="caption" sx={{ color: '#64748b', minWidth: 28, fontVariantNumeric: 'tabular-nums' }}>
                              {appOnCount}/{groupPrefs.length}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: tgOnCount > 0 ? '#229ED9' : '#cbd5e1' }} />
                            <Typography variant="caption" sx={{ color: '#64748b', minWidth: 28, fontVariantNumeric: 'tabular-nums' }}>
                              {tgOnCount}/{groupPrefs.length}
                            </Typography>
                          </Box>
                        </Box>
                        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                          <Box>
                            {/* Column header row */}
                            <Box sx={{
                              display: 'grid',
                              gridTemplateColumns: '1fr 80px 80px',
                              gap: 1,
                              px: 2, py: 1,
                              backgroundColor: '#fafbfc',
                              borderBottom: '1px solid #f1f5f9',
                            }}>
                              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>Event</Typography>
                              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, textAlign: 'center' }}>App</Typography>
                              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, textAlign: 'center' }}>Telegram</Typography>
                            </Box>
                            {groupPrefs.map((p, idx) => (
                              <Box
                                key={p.eventType}
                                sx={{
                                  display: 'grid',
                                  gridTemplateColumns: '1fr 80px 80px',
                                  gap: 1,
                                  px: 2, py: 1.5,
                                  alignItems: 'center',
                                  borderTop: idx === 0 ? 'none' : '1px solid #f1f5f9',
                                  opacity: prefsSaving === p.eventType ? 0.6 : 1,
                                  transition: 'opacity 0.15s',
                                }}
                              >
                                <Box>
                                  <Typography variant="body2" sx={{ color: '#1e293b', fontWeight: 500 }}>
                                    {p.label}
                                  </Typography>
                                  <Typography variant="caption" sx={{ color: '#64748b' }}>
                                    {p.description}
                                  </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                                  <Switch
                                    size="small"
                                    checked={p.inApp}
                                    onChange={(e) => handlePrefToggle(p.eventType, 'inApp', e.target.checked)}
                                    disabled={prefsSaving === p.eventType}
                                    sx={{
                                      '& .MuiSwitch-switchBase.Mui-checked': { color: '#dc2626' },
                                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#dc2626' },
                                    }}
                                  />
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                                  <Switch
                                    size="small"
                                    checked={p.telegram && tg.linked}
                                    onChange={(e) => handlePrefToggle(p.eventType, 'telegram', e.target.checked)}
                                    disabled={prefsSaving === p.eventType || !tg.linked}
                                    title={tg.linked ? '' : 'Link Telegram first (above) to enable this channel'}
                                    sx={{
                                      '& .MuiSwitch-switchBase.Mui-checked': { color: '#229ED9' },
                                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#229ED9' },
                                    }}
                                  />
                                </Box>
                              </Box>
                            ))}
                          </Box>
                        </Collapse>
                      </Box>
                    );
                  })}
                  {!tg.linked && (
                    <Alert severity="info" icon={<TelegramIcon sx={{ color: '#229ED9' }} />} sx={{ backgroundColor: '#f0f9ff', border: '1px solid #bae6fd' }}>
                      <Typography variant="caption" sx={{ color: '#0c4a6e' }}>
                        Telegram toggles are disabled because your Telegram is not linked yet. Use the section above to link it first.
                      </Typography>
                    </Alert>
                  )}
                </Stack>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </StyledContainer>
  );
}
