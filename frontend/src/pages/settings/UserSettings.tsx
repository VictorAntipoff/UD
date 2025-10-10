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
  Stack
} from '@mui/material';
import { useState, useEffect } from 'react';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import SecurityIcon from '@mui/icons-material/Security';
import NotificationsIcon from '@mui/icons-material/Notifications';
import PersonIcon from '@mui/icons-material/Person';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import { useAuth } from '../../hooks/useAuth';
import { styled, alpha } from '@mui/material/styles';

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

  useEffect(() => {
    if (user?.email) {
      setUserSettings(prev => ({
        ...prev,
        email: user.email
      }));
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setUserSettings({
      ...userSettings,
      [e.target.name]: value
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('User settings updated:', userSettings);
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
            Save Changes
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
      </Grid>
    </StyledContainer>
  );
}
