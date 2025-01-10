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
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  TextField,
  IconButton,
  Tooltip,
  MenuItem
} from '@mui/material';
import { useState, useEffect } from 'react';
import PeopleIcon from '@mui/icons-material/People';
import SettingsIcon from '@mui/icons-material/Settings';
import EmailIcon from '@mui/icons-material/Email';
import SecurityIcon from '@mui/icons-material/Security';
import { useDevelopment } from '../../contexts/DevelopmentContext';
import { SectionLabel } from '../../components/SectionLabel';
import EditIcon from '@mui/icons-material/Edit';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LockResetIcon from '@mui/icons-material/LockReset';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import AddIcon from '@mui/icons-material/Add';

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

interface Role {
  id: number;
  name: string;
  description: string;
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
      sx={{ 
        py: 3,
        '& .MuiCard-root': {
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: 'none',
          height: '100%',
          '&:hover': {
            boxShadow: 1
          }
        }
      }}
    >
      {value === index && children}
    </Box>
  );
}

export default function AdminSettings() {
  const [tabValue, setTabValue] = useState(0);
  const { showLabels, toggleLabels } = useDevelopment();
  
  // === State Management ===
  const [settings, setSettings] = useState({
    // System Settings
    showDevelopmentLabels: showLabels,
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

  const [roles, setRoles] = useState<Role[]>([
    { id: 1, name: 'ADMIN', description: 'Full system access' },
    { id: 2, name: 'MANAGER', description: 'Department management access' },
    { id: 3, name: 'USER', description: 'Basic user access' }
  ]);

  // Add this state for the new user form
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    password: '',
    role: 'USER'
  });

  // === Event Handlers ===
  const handleChange = (name: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setSettings({
      ...settings,
      [name]: value
    });

    // If changing development labels, also update the context
    if (name === 'showDevelopmentLabels') {
      toggleLabels();
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Load saved settings on component mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('adminSettings');
    if (savedSettings) {
      const parsedSettings = JSON.parse(savedSettings);
      setSettings(parsedSettings);
      
      // Update development labels from saved settings
      if (parsedSettings.showDevelopmentLabels !== showLabels) {
        toggleLabels();
      }
    }
  }, []);

  // Add this effect to load saved users
  useEffect(() => {
    const savedUsers = localStorage.getItem('adminUsers');
    if (savedUsers) {
      setUsers(JSON.parse(savedUsers));
    }
  }, []);

  const handleAddRole = () => {
    setRoles((prevRoles: Role[]) => [...prevRoles, {
      id: prevRoles.length + 1,
      name: 'NEW_ROLE',
      description: 'New role description'
    }]);
  };

  const handleEditRole = (roleId: number, updates: Partial<Role>) => {
    setRoles((prevRoles: Role[]) => prevRoles.map((role: Role) => 
      role.id === roleId ? { ...role, ...updates } : role
    ));
  };

  const handleDeleteRole = (roleId: number) => {
    setRoles((prevRoles: Role[]) => prevRoles.filter((role: Role) => role.id !== roleId));
  };

  // Add these handlers
  const handleNewUserChange = (name: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setNewUser({
      ...newUser,
      [name]: event.target.value
    });
  };

  const handleCreateUser = () => {
    const newUserData: User = {
      id: users.length + 1,
      username: newUser.username,
      email: newUser.email,
      role: newUser.role,
      status: 'active'
    };

    const updatedUsers = [...users, newUserData];
    setUsers(updatedUsers);
    localStorage.setItem('adminUsers', JSON.stringify(updatedUsers));

    // Reset form
    setNewUser({
      username: '',
      email: '',
      password: '',
      role: 'USER'
    });
  };

  // === UI Render ===
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <SectionLabel text="@AdminSettings" color="primary.main" position="top-left" />
      
      {/* Page Header */}
      <Paper 
        elevation={0}
        sx={{ 
          mb: 3, 
          p: 2, 
          bgcolor: 'background.paper',
          borderRadius: 2,
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          border: '1px solid',
          borderColor: 'divider'
        }}
      >
        <Typography variant="h4" sx={{ color: '#CC0000', fontWeight: 'bold' }}>
          Admin Settings
        </Typography>
        <Button 
          variant="contained" 
          onClick={() => {
            // Save settings to localStorage
            localStorage.setItem('adminSettings', JSON.stringify(settings));
          }}
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
      </Paper>

      {/* Settings Tabs */}
      <Paper 
        elevation={1} 
        sx={{ 
          position: 'relative',
          borderRadius: 2,
          overflow: 'hidden'
        }}
      >
        <SectionLabel text="@SettingsTabs" color="info.main" position="top-left" />
        
        <Box sx={{ borderBottom: 1, borderColor: 'divider', position: 'relative', bgcolor: 'background.paper' }}>
          <SectionLabel text="@TabList" color="warning.main" position="top-right" />
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange}
            aria-label="settings tabs"
            sx={{ 
              position: 'relative',
              '& .MuiTab-root': {
                minHeight: 64,
                textTransform: 'none',
                fontSize: '1rem'
              }
            }}
          >
            <Tab 
              icon={<PeopleIcon />} 
              label={
                <Box sx={{ position: 'relative' }}>
                  <SectionLabel text="@UsersTab" color="success.light" position="top-right" />
                  Users
                </Box>
              } 
            />
            <Tab 
              icon={<SettingsIcon />} 
              label={
                <Box sx={{ position: 'relative' }}>
                  <SectionLabel text="@SystemTab" color="success.light" position="top-right" />
                  System
                </Box>
              } 
            />
            <Tab 
              icon={<EmailIcon />} 
              label={
                <Box sx={{ position: 'relative' }}>
                  <SectionLabel text="@EmailTab" color="success.light" position="top-right" />
                  Email
                </Box>
              } 
            />
            <Tab 
              icon={<SecurityIcon />} 
              label={
                <Box sx={{ position: 'relative' }}>
                  <SectionLabel text="@SecurityTab" color="success.light" position="top-right" />
                  Security
                </Box>
              } 
            />
          </Tabs>
        </Box>

        {/* Tab Panels */}
        <Box sx={{ p: 3, bgcolor: 'background.default' }}>
          <TabPanel value={tabValue} index={0}>
            <Box sx={{ position: 'relative' }}>
              <SectionLabel text="@UsersPanel" color="error.light" position="top-left" />
              
              {/* Users List Section */}
              <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                  <PeopleIcon color="primary" />
                  User Management
                </Typography>

                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Username</TableCell>
                        <TableCell>Email</TableCell>
                        <TableCell>Role</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>{user.username}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>{user.role}</TableCell>
                          <TableCell>
                            <Box
                              sx={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                px: 1,
                                py: 0.5,
                                borderRadius: 1,
                                bgcolor: user.status === 'active' ? 'success.light' : 'error.light',
                                color: 'white',
                                fontSize: '0.75rem',
                                fontWeight: 'bold'
                              }}
                            >
                              {user.status}
                            </Box>
                          </TableCell>
                          <TableCell align="right">
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                              <Tooltip title="Edit User">
                                <IconButton size="small" color="primary">
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title={user.status === 'active' ? 'Deactivate User' : 'Activate User'}>
                                <IconButton 
                                  size="small" 
                                  color={user.status === 'active' ? 'error' : 'success'}
                                >
                                  {user.status === 'active' ? (
                                    <BlockIcon fontSize="small" />
                                  ) : (
                                    <CheckCircleIcon fontSize="small" />
                                  )}
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Reset Password">
                                <IconButton size="small" color="warning">
                                  <LockResetIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete User">
                                <IconButton size="small" color="error">
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>

              {/* Create User Section */}
              <Box sx={{ position: 'relative' }}>
                <SectionLabel text="@CreateUser" color="success.light" position="top-left" />
                <Paper sx={{ p: 3, mb: 3 }}>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                    <PersonAddIcon color="primary" />
                    Create New User
                  </Typography>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Username"
                        name="username"
                        variant="outlined"
                        value={newUser.username}
                        onChange={handleNewUserChange('username')}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Email"
                        name="email"
                        type="email"
                        variant="outlined"
                        value={newUser.email}
                        onChange={handleNewUserChange('email')}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Password"
                        name="password"
                        type="password"
                        variant="outlined"
                        value={newUser.password}
                        onChange={handleNewUserChange('password')}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        select
                        fullWidth
                        label="Role"
                        name="role"
                        value={newUser.role}
                        onChange={handleNewUserChange('role')}
                        variant="outlined"
                      >
                        <MenuItem value="ADMIN">Admin</MenuItem>
                        <MenuItem value="USER">User</MenuItem>
                        <MenuItem value="MANAGER">Manager</MenuItem>
                      </TextField>
                    </Grid>
                    <Grid item xs={12}>
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                        <Button
                          variant="contained"
                          startIcon={<PersonAddIcon />}
                          onClick={handleCreateUser}
                          sx={{
                            bgcolor: '#CC0000',
                            '&:hover': { bgcolor: '#990000' },
                            px: 4,
                            py: 1,
                            textTransform: 'none',
                            fontWeight: 'bold'
                          }}
                        >
                          Create User
                        </Button>
                      </Box>
                    </Grid>
                  </Grid>
                </Paper>
              </Box>

              {/* Role Management Section */}
              <Box sx={{ position: 'relative' }}>
                <SectionLabel text="@RoleManagement" color="info.light" position="top-left" />
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                    <SecurityIcon color="primary" />
                    Role Management
                  </Typography>

                  {/* Roles Table */}
                  <TableContainer sx={{ mb: 3 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Role Name</TableCell>
                          <TableCell>Description</TableCell>
                          <TableCell align="right">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {roles.map((role) => (
                          <TableRow key={role.id}>
                            <TableCell>{role.name}</TableCell>
                            <TableCell>{role.description}</TableCell>
                            <TableCell align="right">
                              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                                <Tooltip title="Edit Role">
                                  <IconButton 
                                    size="small" 
                                    color="primary" 
                                    onClick={() => handleEditRole(role.id, { 
                                      name: 'EDITED_ROLE',
                                      description: 'Edited description'
                                    })}
                                  >
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Delete Role">
                                  <IconButton 
                                    size="small" 
                                    color="error" 
                                    onClick={() => handleDeleteRole(role.id)}
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  {/* Create New Role Form */}
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                      Create New Role
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Role Name"
                          name="roleName"
                          variant="outlined"
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Description"
                          name="roleDescription"
                          variant="outlined"
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            size="small"
                            onClick={handleAddRole}
                            sx={{
                              bgcolor: '#CC0000',
                              '&:hover': { bgcolor: '#990000' },
                              px: 3,
                              textTransform: 'none',
                              fontWeight: 'bold'
                            }}
                          >
                            Add Role
                          </Button>
                        </Box>
                      </Grid>
                    </Grid>
                  </Box>
                </Paper>
              </Box>
            </Box>
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <Box sx={{ position: 'relative' }}>
              <SectionLabel text="@SystemPanel" color="error.light" position="top-left" />
              <Grid container spacing={3}>
                {/* Development Settings Card */}
                <Grid item xs={12} md={6}>
                  <Card sx={{ height: '100%' }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                            Development Labels
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Show/hide component labels for development purposes
                          </Typography>
                        </Box>
                        <Switch
                          checked={settings.showDevelopmentLabels}
                          onChange={handleChange('showDevelopmentLabels')}
                          color="primary"
                        />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Other System Settings */}
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

          <TabPanel value={tabValue} index={2}>
            <Box sx={{ position: 'relative' }}>
              <SectionLabel text="@EmailPanel" color="error.light" position="top-left" />
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        SMTP Settings
                      </Typography>
                      <Box sx={{ mt: 2 }}>
                        <Grid container spacing={2}>
                          <Grid item xs={12}>
                            <TextField
                              fullWidth
                              label="SMTP Server"
                              value={settings.smtpServer}
                              onChange={handleChange('smtpServer')}
                            />
                          </Grid>
                          <Grid item xs={12}>
                            <TextField
                              fullWidth
                              label="SMTP Port"
                              value={settings.smtpPort}
                              onChange={handleChange('smtpPort')}
                            />
                          </Grid>
                        </Grid>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          </TabPanel>

          <TabPanel value={tabValue} index={3}>
            <Box sx={{ position: 'relative' }}>
              <SectionLabel text="@SecurityPanel" color="error.light" position="top-left" />
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Security Settings
                      </Typography>
                      <Box sx={{ mt: 2 }}>
                        <Grid container spacing={2}>
                          <Grid item xs={12}>
                            <TextField
                              fullWidth
                              type="number"
                              label="Password Expiry (days)"
                              value={settings.passwordExpiry}
                              onChange={handleChange('passwordExpiry')}
                            />
                          </Grid>
                          <Grid item xs={12}>
                            <TextField
                              fullWidth
                              type="number"
                              label="Max Login Attempts"
                              value={settings.maxLoginAttempts}
                              onChange={handleChange('maxLoginAttempts')}
                            />
                          </Grid>
                        </Grid>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          </TabPanel>
        </Box>
      </Paper>
    </Container>
  );
} 