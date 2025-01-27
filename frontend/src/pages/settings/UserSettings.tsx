// === User Settings Page ===
// File: frontend/src/pages/settings/UserSettings.tsx
// Description: User profile and preferences settings

import { 
  Container, 
  Typography, 
  Paper, 
  Grid, 
  TextField, 
  Button, 
  Box,
  Card,
  CardContent,
  Switch,
  Fade,
  useTheme,
  Avatar
} from '@mui/material';
import { useState, useEffect } from 'react';
import { SectionLabel } from '../../components/SectionLabel';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import SecurityIcon from '@mui/icons-material/Security';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { useAuth } from '../../hooks/useAuth';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import { styled } from '@mui/material/styles';

// Styled components for file input
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

export default function UserSettings() {
  const theme = useTheme();
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

  // Load user email when component mounts
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

  // Handle profile picture upload
  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        // Create a preview URL
        const previewUrl = URL.createObjectURL(file);
        setAvatarUrl(previewUrl);
        
        // TODO: Implement actual file upload to your backend/storage
        console.log('File to upload:', file);
      } catch (error) {
        console.error('Error uploading avatar:', error);
      }
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 1.5, mb: 3 }}>
      <SectionLabel text="@UserSettings" color="primary.main" position="top-left" />
      
      {/* Page Header */}
      <Paper 
        elevation={0}
        sx={{ 
          mb: 1.5,
          p: 1.5,
          bgcolor: 'background.paper',
          borderRadius: 1,
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          border: '1px solid',
          borderColor: 'divider'
        }}
      >
        <Typography 
          variant="h5" 
          sx={{ 
            fontSize: '1rem',
            color: theme.palette.primary.main,
            fontWeight: 500,
            fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif'
          }}
        >
          User Settings
        </Typography>
        <Button 
          variant="contained" 
          size="small"
          onClick={handleSubmit}
          sx={{ 
            px: 2,
            py: 0.5,
            fontSize: '0.75rem',
            fontWeight: 500,
            fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
            textTransform: 'none'
          }}
        >
          Save Changes
        </Button>
      </Paper>

      <Fade in={true}>
        <Grid container spacing={2}>
          {/* Profile Picture Section */}
          <Grid item xs={12}>
            <Card sx={{ mb: 2 }}>
              <CardContent sx={{ 
                p: 2,
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: 'center',
                gap: 2
              }}>
                <Box sx={{ 
                  position: 'relative',
                  '&:hover .upload-overlay': {
                    opacity: 1
                  }
                }}>
                  <Avatar
                    src={avatarUrl || user?.avatar_url}
                    sx={{
                      width: 100,
                      height: 100,
                      border: '2px solid',
                      borderColor: 'divider'
                    }}
                  />
                  <Box
                    className="upload-overlay"
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      bgcolor: 'rgba(0, 0, 0, 0.5)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: 0,
                      transition: 'opacity 0.2s',
                      cursor: 'pointer'
                    }}
                  >
                    <Button
                      component="label"
                      sx={{ 
                        minWidth: 'auto',
                        p: 0,
                        color: 'white',
                        '&:hover': { bgcolor: 'transparent' }
                      }}
                    >
                      <PhotoCameraIcon />
                      <VisuallyHiddenInput
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                      />
                    </Button>
                  </Box>
                </Box>
                <Box sx={{ 
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0.5,
                  alignItems: { xs: 'center', sm: 'flex-start' }
                }}>
                  <Typography 
                    variant="subtitle1" 
                    sx={{ 
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif'
                    }}
                  >
                    Profile Picture
                  </Typography>
                  <Typography 
                    variant="body2" 
                    color="text.secondary"
                    sx={{ 
                      fontSize: '0.8125rem',
                      textAlign: { xs: 'center', sm: 'left' }
                    }}
                  >
                    Upload a new profile picture. Recommended size: 200x200px
                  </Typography>
                  <Button
                    component="label"
                    variant="outlined"
                    size="small"
                    startIcon={<PhotoCameraIcon />}
                    sx={{ 
                      mt: 1,
                      fontSize: '0.75rem',
                      textTransform: 'none',
                      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif'
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
              </CardContent>
            </Card>
          </Grid>

          {/* Profile Information */}
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: 2 }}>
                <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AccountCircleIcon color="primary" sx={{ fontSize: '1rem' }} />
                  <Typography 
                    variant="subtitle1" 
                    sx={{ 
                      fontSize: '0.875rem', 
                      fontWeight: 500,
                      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif'
                    }}
                  >
                    Profile Information
                  </Typography>
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label="First Name"
                      name="firstName"
                      value={userSettings.firstName}
                      onChange={handleChange}
                      InputProps={{
                        sx: { 
                          fontSize: '0.875rem',
                          fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif'
                        }
                      }}
                      InputLabelProps={{
                        sx: { 
                          fontSize: '0.875rem',
                          fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif'
                        }
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Last Name"
                      name="lastName"
                      value={userSettings.lastName}
                      onChange={handleChange}
                      InputProps={{
                        sx: { 
                          fontSize: '0.875rem',
                          fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif'
                        }
                      }}
                      InputLabelProps={{
                        sx: { 
                          fontSize: '0.875rem',
                          fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif'
                        }
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Email"
                      name="email"
                      type="email"
                      value={userSettings.email}
                      onChange={handleChange}
                      disabled
                      InputProps={{
                        sx: { 
                          fontSize: '0.875rem',
                          fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif'
                        }
                      }}
                      InputLabelProps={{
                        sx: { 
                          fontSize: '0.875rem',
                          fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif'
                        }
                      }}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Security Settings */}
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: 2 }}>
                <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SecurityIcon color="primary" sx={{ fontSize: '1rem' }} />
                  <Typography 
                    variant="subtitle1" 
                    sx={{ 
                      fontSize: '0.875rem', 
                      fontWeight: 500,
                      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif'
                    }}
                  >
                    Security
                  </Typography>
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Current Password"
                      name="currentPassword"
                      type="password"
                      value={userSettings.currentPassword}
                      onChange={handleChange}
                      InputProps={{
                        sx: { 
                          fontSize: '0.875rem',
                          fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif'
                        }
                      }}
                      InputLabelProps={{
                        sx: { 
                          fontSize: '0.875rem',
                          fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif'
                        }
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      size="small"
                      label="New Password"
                      name="newPassword"
                      type="password"
                      value={userSettings.newPassword}
                      onChange={handleChange}
                      InputProps={{
                        sx: { 
                          fontSize: '0.875rem',
                          fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif'
                        }
                      }}
                      InputLabelProps={{
                        sx: { 
                          fontSize: '0.875rem',
                          fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif'
                        }
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Confirm New Password"
                      name="confirmPassword"
                      type="password"
                      value={userSettings.confirmPassword}
                      onChange={handleChange}
                      InputProps={{
                        sx: { 
                          fontSize: '0.875rem',
                          fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif'
                        }
                      }}
                      InputLabelProps={{
                        sx: { 
                          fontSize: '0.875rem',
                          fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif'
                        }
                      }}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Preferences */}
          <Grid item xs={12}>
            <Card>
              <CardContent sx={{ p: 2 }}>
                <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <NotificationsIcon color="primary" sx={{ fontSize: '1rem' }} />
                  <Typography 
                    variant="subtitle1" 
                    sx={{ 
                      fontSize: '0.875rem', 
                      fontWeight: 500,
                      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif'
                    }}
                  >
                    Preferences
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="body1" sx={{ fontSize: '0.875rem', fontWeight: 500 }}>
                        Email Notifications
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem' }}>
                        Receive email notifications about account activity
                      </Typography>
                    </Box>
                    <Switch
                      name="emailNotifications"
                      checked={userSettings.emailNotifications}
                      onChange={handleChange}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="body1" sx={{ fontSize: '0.875rem', fontWeight: 500 }}>
                        Two-Factor Authentication
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem' }}>
                        Add an extra layer of security to your account
                      </Typography>
                    </Box>
                    <Switch
                      name="twoFactorAuth"
                      checked={userSettings.twoFactorAuth}
                      onChange={handleChange}
                    />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Fade>
    </Container>
  );
} 