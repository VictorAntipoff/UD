// === Admin Settings Page ===
// File: src/pages/settings/AdminSettings.tsx
// Description: Admin control panel for system settings

import { 
  Container, 
  Typography, 
  Paper, 
  Grid, 
  Box, 
  Card, 
  CardContent, 
  Switch, 
  FormControlLabel,
  Divider,
  TextField,
  Button,
  Alert,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Tabs,
  Tab,
  useTheme
} from '@mui/material';
import { useState } from 'react';
import { SectionLabel } from '../../components/SectionLabel';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PeopleIcon from '@mui/icons-material/People';
import SettingsIcon from '@mui/icons-material/Settings';
import EmailIcon from '@mui/icons-material/Email';
import SecurityIcon from '@mui/icons-material/Security';

// Types
interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  status: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <Box
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
      sx={{ py: 3 }}
    >
      {value === index && children}
    </Box>
  );
}

export default function AdminSettings() {
  const theme = useTheme();
  const [tabValue, setTabValue] = useState(0);
  
  // === State Management ===
  const [settings, setSettings] = useState({
    // System Settings
    enableUserRegistration: true,
    enableNotifications: true,
    enableMaintenance: false,
    enableAuditLog: true,
    // Email Settings
    smtpServer: 'smtp.example.com',
    smtpPort: '587',
    smtpUsername: '',
    smtpPassword: '',
    // Security Settings
    twoFactorAuth: false,
    passwordExpiry: 90,
    maxLoginAttempts: 5
  });

  // Mock users data
  const [users, setUsers] = useState<User[]>([
    { id: 1, username: 'admin', email: 'admin@udesign.com', role: 'ADMIN', status: 'active' },
    { id: 2, username: 'user1', email: 'user1@udesign.com', role: 'USER', status: 'active' },
  ]);

  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    password: '',
    role: 'USER',
  });

  const [saveStatus, setSaveStatus] = useState<{
    show: boolean;
    type: 'success' | 'error';
    message: string;
  }>({ show: false, type: 'success', message: '' });

  // === Event Handlers ===
  const handleChange = (name: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setSettings({
      ...settings,
      [name]: value
    });
  };

  const handleNewUserChange = (name: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setNewUser({
      ...newUser,
      [name]: event.target.value
    });
  };

  const handleRoleChange = (event: any) => {
    setNewUser({
      ...newUser,
      role: event.target.value
    });
  };

  const handleCreateUser = async () => {
    // TODO: Implement API call to create user
    try {
      setSaveStatus({
        show: true,
        type: 'success',
        message: 'User created successfully'
      });
      // Reset form
      setNewUser({
        username: '',
        email: '',
        password: '',
        role: 'USER',
      });
    } catch (error) {
      setSaveStatus({
        show: true,
        type: 'error',
        message: 'Failed to create user'
      });
    }
  };

  const handleSave = async () => {
    try {
      // TODO: Implement API call to save settings
      setSaveStatus({
        show: true,
        type: 'success',
        message: 'Settings saved successfully'
      });
      setTimeout(() => setSaveStatus({ ...saveStatus, show: false }), 3000);
    } catch (error) {
      setSaveStatus({
        show: true,
        type: 'error',
        message: 'Failed to save settings'
      });
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // === UI Render ===
  return (
    <Container maxWidth="lg" sx={{ position: 'relative', pb: 4 }}>
      {/* Page Header */}
      <Box 
        sx={{ 
          mb: 4, 
          p: 2, 
          bgcolor: 'background.paper',
          borderRadius: 1,
          boxShadow: 1,
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}
      >
        <Typography variant="h4" sx={{ color: '#CC0000', fontWeight: 'bold' }}>
          Admin Settings
        </Typography>
        <Button 
          variant="contained" 
          onClick={handleSave}
          sx={{ 
            bgcolor: '#CC0000', 
            '&:hover': { bgcolor: '#990000' },
            px: 4,
            py: 1,
            textTransform: 'none',
            fontWeight: 'bold'
          }}
        >
          Save Changes
        </Button>
      </Box>

      {saveStatus.show && (
        <Alert 
          severity={saveStatus.type} 
          sx={{ mb: 2 }}
          onClose={() => setSaveStatus({ ...saveStatus, show: false })}
        >
          {saveStatus.message}
        </Alert>
      )}

      {/* Settings Tabs */}
      <Paper sx={{ borderRadius: 1, boxShadow: 1 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              '& .MuiTab-root': {
                minHeight: 64,
                textTransform: 'none',
                fontSize: '1rem',
              },
              '& .Mui-selected': {
                color: '#CC0000 !important',
              },
              '& .MuiTabs-indicator': {
                backgroundColor: '#CC0000',
              },
            }}
          >
            <Tab 
              icon={<PeopleIcon />} 
              iconPosition="start" 
              label="User Management" 
            />
            <Tab 
              icon={<SettingsIcon />} 
              iconPosition="start" 
              label="System Settings" 
            />
            <Tab 
              icon={<EmailIcon />} 
              iconPosition="start" 
              label="Email Settings" 
            />
            <Tab 
              icon={<SecurityIcon />} 
              iconPosition="start" 
              label="Security Settings" 
            />
          </Tabs>
        </Box>

        {/* User Management Tab */}
        <TabPanel value={tabValue} index={0}>
          {/* Your existing User Management content */}
          <Box sx={{ p: 2 }}>
            {/* Add New User Button */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                User Management
              </Typography>
              <Button
                variant="contained"
                startIcon={<PersonAddIcon />}
                sx={{ 
                  bgcolor: '#CC0000', 
                  '&:hover': { bgcolor: '#990000' },
                  textTransform: 'none'
                }}
                onClick={handleCreateUser}
              >
                Add New User
              </Button>
            </Box>

            {/* New User Form */}
            <Grid container spacing={2} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="Username"
                  value={newUser.username}
                  onChange={handleNewUserChange('username')}
                  variant="outlined"
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={newUser.email}
                  onChange={handleNewUserChange('email')}
                  variant="outlined"
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="Password"
                  type="password"
                  value={newUser.password}
                  onChange={handleNewUserChange('password')}
                  variant="outlined"
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Role</InputLabel>
                  <Select
                    value={newUser.role}
                    label="Role"
                    onChange={handleRoleChange}
                  >
                    <MenuItem value="ADMIN">Admin</MenuItem>
                    <MenuItem value="USER">User</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            {/* Users Table */}
            <TableContainer component={Paper} sx={{ boxShadow: 'none' }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                    <TableCell sx={{ fontWeight: 'bold' }}>Username</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Email</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Role</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id} hover>
                      <TableCell>{user.username}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Box
                          sx={{
                            bgcolor: user.role === 'ADMIN' ? '#CC0000' : 'primary.main',
                            color: 'white',
                            px: 1,
                            py: 0.5,
                            borderRadius: 1,
                            display: 'inline-block',
                            fontSize: '0.875rem'
                          }}
                        >
                          {user.role}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box
                          sx={{
                            bgcolor: user.status === 'active' ? 'success.main' : 'error.main',
                            color: 'white',
                            px: 1,
                            py: 0.5,
                            borderRadius: 1,
                            display: 'inline-block',
                            fontSize: '0.875rem'
                          }}
                        >
                          {user.status}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Tooltip title="Edit User">
                          <IconButton size="small" sx={{ color: 'primary.main' }}>
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete User">
                          <IconButton size="small" sx={{ color: 'error.main' }}>
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </TabPanel>

        {/* System Settings Tab */}
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 'bold' }}>
              System Settings
            </Typography>
            <Grid container spacing={3}>
              {[
                { name: 'enableUserRegistration', label: 'Enable User Registration', description: 'Allow new users to register' },
                { name: 'enableNotifications', label: 'Enable Notifications', description: 'System-wide notification settings' },
                { name: 'enableMaintenance', label: 'Maintenance Mode', description: 'Put system in maintenance mode' },
                { name: 'enableAuditLog', label: 'Enable Audit Log', description: 'Track all system activities' }
              ].map((setting) => (
                <Grid item xs={12} md={6} key={setting.name}>
                  <Card sx={{ height: '100%' }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                            {setting.label}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {setting.description}
                          </Typography>
                        </Box>
                        <Switch
                          checked={settings[setting.name as keyof typeof settings] as boolean}
                          onChange={handleChange(setting.name)}
                          color="primary"
                        />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        </TabPanel>

        {/* Email Settings Tab */}
        <TabPanel value={tabValue} index={2}>
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 'bold' }}>
              Email Settings
            </Typography>
            <Paper sx={{ p: 3 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="SMTP Server"
                    value={settings.smtpServer}
                    onChange={handleChange('smtpServer')}
                    variant="outlined"
                    helperText="e.g., smtp.gmail.com"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="SMTP Port"
                    value={settings.smtpPort}
                    onChange={handleChange('smtpPort')}
                    variant="outlined"
                    helperText="e.g., 587 for TLS"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="SMTP Username"
                    value={settings.smtpUsername}
                    onChange={handleChange('smtpUsername')}
                    variant="outlined"
                    helperText="Email address or username"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="password"
                    label="SMTP Password"
                    value={settings.smtpPassword}
                    onChange={handleChange('smtpPassword')}
                    variant="outlined"
                    helperText="Email account password or app password"
                  />
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                    <Button
                      variant="outlined"
                      sx={{ mr: 2 }}
                      onClick={() => {
                        // TODO: Implement test email
                        console.log('Test email');
                      }}
                    >
                      Test Connection
                    </Button>
                    <Button
                      variant="contained"
                      sx={{ 
                        bgcolor: '#CC0000',
                        '&:hover': { bgcolor: '#990000' }
                      }}
                      onClick={handleSave}
                    >
                      Save Email Settings
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          </Box>
        </TabPanel>

        {/* Security Settings Tab */}
        <TabPanel value={tabValue} index={3}>
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 'bold' }}>
              Security Settings
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
                      Two-Factor Authentication
                    </Typography>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.twoFactorAuth}
                          onChange={handleChange('twoFactorAuth')}
                          color="primary"
                        />
                      }
                      label="Enable 2FA for all users"
                    />
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
                      Password Policy
                    </Typography>
                    <TextField
                      fullWidth
                      type="number"
                      label="Password Expiry (days)"
                      value={settings.passwordExpiry}
                      onChange={handleChange('passwordExpiry')}
                      variant="outlined"
                      sx={{ mb: 2 }}
                      helperText="0 = never expires"
                    />
                    <TextField
                      fullWidth
                      type="number"
                      label="Max Login Attempts"
                      value={settings.maxLoginAttempts}
                      onChange={handleChange('maxLoginAttempts')}
                      variant="outlined"
                      helperText="Number of failed attempts before account lock"
                    />
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
                      Session Settings
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          type="number"
                          label="Session Timeout (minutes)"
                          defaultValue={30}
                          variant="outlined"
                          helperText="0 = never timeout"
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <FormControlLabel
                          control={
                            <Switch
                              defaultChecked
                              color="primary"
                            />
                          }
                          label="Force logout on password change"
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        </TabPanel>
      </Paper>
    </Container>
  );
} 