import { Container, Typography, Paper, Grid, TextField, Button, Box } from '@mui/material';
import { useState } from 'react';

export default function UserSettings() {
  const [userSettings, setUserSettings] = useState({
    firstName: '',
    lastName: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserSettings({
      ...userSettings,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
    console.log('User settings updated:', userSettings);
  };

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" gutterBottom>
        User Settings
      </Typography>
      <Paper sx={{ p: 3 }}>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Profile Information
              </Typography>
              <TextField
                fullWidth
                label="First Name"
                name="firstName"
                value={userSettings.firstName}
                onChange={handleChange}
                margin="normal"
              />
              <TextField
                fullWidth
                label="Last Name"
                name="lastName"
                value={userSettings.lastName}
                onChange={handleChange}
                margin="normal"
              />
              <TextField
                fullWidth
                label="Email"
                name="email"
                type="email"
                value={userSettings.email}
                onChange={handleChange}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Change Password
              </Typography>
              <TextField
                fullWidth
                label="Current Password"
                name="currentPassword"
                type="password"
                value={userSettings.currentPassword}
                onChange={handleChange}
                margin="normal"
              />
              <TextField
                fullWidth
                label="New Password"
                name="newPassword"
                type="password"
                value={userSettings.newPassword}
                onChange={handleChange}
                margin="normal"
              />
              <TextField
                fullWidth
                label="Confirm New Password"
                name="confirmPassword"
                type="password"
                value={userSettings.confirmPassword}
                onChange={handleChange}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ mt: 2 }}>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  size="large"
                >
                  Save Changes
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Container>
  );
} 