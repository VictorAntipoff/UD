import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  TextField,
  IconButton,
  Tooltip,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Card,
  CardContent,
  Switch,
  Chip,
  Stack,
  CircularProgress,
} from '@mui/material';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import EditIcon from '@mui/icons-material/Edit';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LockResetIcon from '@mui/icons-material/LockReset';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import AddIcon from '@mui/icons-material/Add';
import SecurityIcon from '@mui/icons-material/Security';
import { useDevelopment } from '../../contexts/DevelopmentContext';
import api from '../../lib/api';
import { apiPost } from '../../utils/api';
import { alpha, styled } from '@mui/material/styles';

// Types
interface User {
  id: string;
  username?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  status?: string;
  isActive: boolean;
  failedLoginAttempts?: number;
  accountLockedAt?: string | null;
  lastFailedLoginAt?: string | null;
  permissions?: Record<string, {
    access: boolean;
    read: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
    amount: boolean;
  }>;
}

interface Role {
  id: number;
  name: string;
  description: string;
  permissions?: Record<string, {
    access: boolean;
    read: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
    amount: boolean; // Permission to view prices/amounts
  }>;
}

const StyledContainer = styled(Container)(({ theme }) => ({
  minHeight: '100vh',
  paddingTop: theme.spacing(4),
  paddingBottom: theme.spacing(4),
  backgroundColor: '#f8fafc',
}));

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

export default function AdminSettings() {
  const [selectedTab, setSelectedTab] = useState(0);
  const { showLabels, toggleLabels } = useDevelopment();
  const [loading, setLoading] = useState(true);

  // State Management
  const [settings, setSettings] = useState({
    showDevelopmentLabels: showLabels,
    enableUserRegistration: true,
    enableNotifications: true,
    enableMaintenance: false,
    enableAuditLog: true,
    smtpServer: 'smtp.example.com',
    smtpPort: '587',
    smtpUsername: '',
    smtpPassword: '',
    twoFactorAuth: false,
    passwordExpiry: 90,
    maxLoginAttempts: 5,
    electricityPricePerKWh: '0.15'
  });

  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([
    { id: 1, name: 'ADMIN', description: 'Full system access' },
    { id: 2, name: 'MANAGER', description: 'Department management access' },
    { id: 3, name: 'USER', description: 'Basic user access' }
  ]);

  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    password: '',
    role: 'USER'
  });

  const [newRole, setNewRole] = useState({
    name: '',
    description: ''
  });

  const [editUserDialog, setEditUserDialog] = useState<{
    open: boolean;
    user: User | null;
  }>({
    open: false,
    user: null
  });

  const [editRoleDialog, setEditRoleDialog] = useState<{
    open: boolean;
    role: Role | null;
  }>({
    open: false,
    role: null
  });

  const [editedRole, setEditedRole] = useState<{
    name: string;
    description: string;
    permissions: Record<string, {
      access: boolean;
      read: boolean;
      create: boolean;
      edit: boolean;
      delete: boolean;
      amount: boolean;
    }>;
  }>({
    name: '',
    description: '',
    permissions: {}
  });

  // Define all menu items with their default permissions, grouped by category
  const menuSections = [
    {
      category: 'Overview',
      items: [
        { key: 'dashboard', label: 'Dashboard', hasActions: false },
        { key: 'wood-calculator', label: 'Wood Calculator', hasActions: false },
      ]
    },
    {
      category: 'Assets',
      items: [
        { key: 'assets-items', label: 'Items', hasActions: true },
      ]
    },
    {
      category: 'Factory Operations',
      items: [
        { key: 'wood-receipt', label: 'Wood Receipt', hasActions: true },
        { key: 'wood-slicing', label: 'Wood Slicing', hasActions: true },
        { key: 'drying-process', label: 'Drying Process', hasActions: true },
        { key: 'wood-transfer', label: 'Wood Transfer', hasActions: true },
        { key: 'inventory-reports', label: 'Inventory Reports', hasActions: true },
      ]
    },
    {
      category: 'Management',
      items: [
        { key: 'wood-types', label: 'Wood Types', hasActions: true },
        { key: 'warehouses', label: 'Warehouses', hasActions: true },
        { key: 'lot-creation', label: 'LOT Creation', hasActions: true },
        { key: 'approvals', label: 'Approvals', hasActions: true },
        { key: 'drying-settings', label: 'Drying Settings', hasActions: true },
      ]
    },
    {
      category: 'Website',
      items: [
        { key: 'website-pages', label: 'Pages', hasActions: true },
        { key: 'website-files', label: 'Files', hasActions: true },
      ]
    },
    {
      category: 'CRM',
      items: [
        { key: 'crm-clients', label: 'Clients', hasActions: true },
      ]
    },
    {
      category: 'Administration',
      items: [
        { key: 'user-settings', label: 'User Settings', hasActions: true },
        { key: 'admin-settings', label: 'Admin Settings', hasActions: true },
      ]
    }
  ];

  // Flatten menuItems for backward compatibility
  const menuItems = menuSections.flatMap(section => section.items);

  const [editedUser, setEditedUser] = useState<{
    username: string;
    email: string;
    role: string;
    password: string;
    permissions: Record<string, {
      access: boolean;
      read: boolean;
      create: boolean;
      edit: boolean;
      delete: boolean;
      amount: boolean;
    }>;
  }>({
    username: '',
    email: '',
    role: '',
    password: '',
    permissions: {}
  });

  // Event Handlers
  const handleChange = (name: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setSettings({
      ...settings,
      [name]: value
    });

    if (name === 'showDevelopmentLabels') {
      toggleLabels();
      localStorage.setItem('developmentLabels', JSON.stringify(value));
    }
  };

  const handleSaveSettings = async () => {
    localStorage.setItem('adminSettings', JSON.stringify(settings));

    // Save electricity price to backend
    try {
      await api.put('/settings/electricityPricePerKWh', {
        value: settings.electricityPricePerKWh
      });
    } catch (error) {
      console.error('Error saving electricity price:', error);
    }
  };

  // Load saved settings on component mount
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      const savedSettings = localStorage.getItem('adminSettings');
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        setSettings(parsedSettings);

        if (parsedSettings.showDevelopmentLabels !== showLabels) {
          toggleLabels();
          localStorage.setItem('developmentLabels', JSON.stringify(!showLabels));
        }
      }

      // Fetch electricity price setting
      try {
        const response = await api.get('/settings/electricityPricePerKWh');
        if (response.data && response.data.value) {
          setSettings(prev => ({ ...prev, electricityPricePerKWh: response.data.value }));
        }
      } catch (error) {
        console.error('Error fetching electricity price:', error);
        // If setting doesn't exist, it will be created on first save
      }

      // Fetch users
      try {
        const response = await api.get('/users');
        const usersData = response.data.map((user: any) => ({
          id: user.id,
          username: user.firstName || user.email.split('@')[0],
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          status: user.isActive ? 'active' : 'inactive',
          permissions: user.permissions // Include permissions from database
        }));
        setUsers(usersData);
      } catch (error) {
        console.error('Error fetching users:', error);
      }

      // Load saved roles
      const savedRoles = localStorage.getItem('adminRoles');
      if (savedRoles) {
        setRoles(JSON.parse(savedRoles));
      }

      setLoading(false);
    };

    loadData();
  }, []);

  const handleNewUserChange = (name: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setNewUser({
      ...newUser,
      [name]: event.target.value
    });
  };

  const handleCreateUser = async () => {
    try {
      // Save to backend
      const response = await api.post('/users', {
        email: newUser.email,
        password: newUser.password,
        firstName: newUser.username?.split(' ')[0],
        lastName: newUser.username?.split(' ').slice(1).join(' ') || null,
        role: newUser.role,
        isActive: true
      });

      // Refresh users list
      const usersResponse = await api.get('/users');
      const usersData = usersResponse.data.map((user: any) => ({
        id: user.id,
        username: user.firstName || user.email.split('@')[0],
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        status: user.isActive ? 'active' : 'inactive',
        isActive: user.isActive,
        failedLoginAttempts: user.failedLoginAttempts,
        accountLockedAt: user.accountLockedAt,
        lastFailedLoginAt: user.lastFailedLoginAt
      }));
      setUsers(usersData);

      // Clear form
      setNewUser({
        username: '',
        email: '',
        password: '',
        role: 'USER'
      });

      alert('User created successfully!');
    } catch (error: any) {
      console.error('Error creating user:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to create user';
      alert(errorMessage);
    }
  };

  const handleNewRoleChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setNewRole(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const handleAddRole = () => {
    if (!newRole.name) return;

    const newRoleData: Role = {
      id: roles.length + 1,
      name: newRole.name.toUpperCase(),
      description: newRole.description
    };

    const updatedRoles = [...roles, newRoleData];
    setRoles(updatedRoles);
    localStorage.setItem('adminRoles', JSON.stringify(updatedRoles));

    setNewRole({
      name: '',
      description: ''
    });
  };

  const handleDeleteRole = (roleId: number) => {
    const updatedRoles = roles.filter(role => role.id !== roleId);
    setRoles(updatedRoles);
    localStorage.setItem('adminRoles', JSON.stringify(updatedRoles));
  };

  const handleEditRoleClick = (role: Role) => {
    // Initialize permissions from role or create default permissions
    let initialPermissions: Record<string, any> = {};

    if (role.permissions) {
      initialPermissions = role.permissions;
    } else {
      // Create default permissions based on role name
      menuItems.forEach(item => {
        if (role.name === 'ADMIN') {
          initialPermissions[item.key] = {
            access: true,
            read: true,
            create: item.hasActions,
            edit: item.hasActions,
            delete: item.hasActions,
            amount: true // Admin can view all amounts
          };
        } else if (role.name === 'MANAGER') {
          initialPermissions[item.key] = {
            access: item.key !== 'admin-settings',
            read: item.key !== 'admin-settings',
            create: item.hasActions && item.key !== 'admin-settings',
            edit: item.hasActions && item.key !== 'admin-settings',
            delete: item.hasActions && !['admin-settings', 'approvals'].includes(item.key),
            amount: item.key !== 'admin-settings' // Manager can view amounts except admin settings
          };
        } else {
          initialPermissions[item.key] = {
            access: !['admin-settings', 'approvals'].includes(item.key),
            read: !['admin-settings', 'approvals'].includes(item.key),
            create: false,
            edit: false,
            delete: false,
            amount: false // USER cannot view amounts by default
          };
        }
      });
    }

    setEditRoleDialog({ open: true, role });
    setEditedRole({
      name: role.name,
      description: role.description,
      permissions: initialPermissions
    });
  };

  const handleCloseEditRoleDialog = () => {
    setEditRoleDialog({ open: false, role: null });
    setEditedRole({ name: '', description: '', permissions: {} });
  };

  const handleSaveEditedRole = () => {
    if (!editRoleDialog.role) return;

    const updatedRoles = roles.map(role =>
      role.id === editRoleDialog.role?.id
        ? {
            ...role,
            name: editedRole.name,
            description: editedRole.description,
            permissions: editedRole.permissions
          }
        : role
    );

    setRoles(updatedRoles);
    localStorage.setItem('adminRoles', JSON.stringify(updatedRoles));
    handleCloseEditRoleDialog();
  };

  const handleEditedRoleChange = (field: keyof typeof editedRole) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setEditedRole(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const handleRolePermissionChange = (menuKey: string, permissionType: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const checked = event.target.checked;
    setEditedRole(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [menuKey]: {
          ...prev.permissions[menuKey],
          [permissionType]: checked,
          // If unchecking access, uncheck all CRUD permissions including amount
          ...(permissionType === 'access' && !checked ? {
            read: false,
            create: false,
            edit: false,
            delete: false,
            amount: false
          } : {})
        }
      }
    }));
  };

  const handleRoleSectionToggle = (sectionItems: any[], permissionType: string, checked: boolean) => {
    setEditedRole(prev => {
      const updatedPermissions = { ...prev.permissions };

      sectionItems.forEach(item => {
        if (permissionType === 'access') {
          // If toggling access, update all permissions
          updatedPermissions[item.key] = {
            access: checked,
            read: checked,
            create: checked && item.hasActions,
            edit: checked && item.hasActions,
            delete: checked && item.hasActions,
            amount: checked
          };
        } else {
          // For other permissions, only update if access is enabled
          if (updatedPermissions[item.key]?.access) {
            updatedPermissions[item.key] = {
              ...updatedPermissions[item.key],
              [permissionType]: checked
            };
          }
        }
      });

      return {
        ...prev,
        permissions: updatedPermissions
      };
    });
  };

  const handleEditUserClick = (user: User) => {
    console.log('Edit user clicked:', user);

    // Use saved permissions if available, otherwise use defaults based on role
    let initialPermissions: Record<string, any> = {};

    if (user.permissions) {
      // User has saved permissions, use them
      initialPermissions = user.permissions;
    } else {
      // No saved permissions, initialize based on role
      menuItems.forEach(item => {
        if (user.role === 'ADMIN') {
          initialPermissions[item.key] = {
            access: true,
            read: true,
            create: item.hasActions,
            edit: item.hasActions,
            delete: item.hasActions,
            amount: true
          };
        } else if (user.role === 'MANAGER') {
          initialPermissions[item.key] = {
            access: item.key !== 'admin-settings',
            read: item.key !== 'admin-settings',
            create: item.hasActions && item.key !== 'admin-settings',
            edit: item.hasActions && item.key !== 'admin-settings',
            delete: item.hasActions && !['admin-settings', 'approvals'].includes(item.key),
            amount: item.key !== 'admin-settings'
          };
        } else {
          initialPermissions[item.key] = {
            access: !['admin-settings', 'approvals'].includes(item.key),
            read: !['admin-settings', 'approvals'].includes(item.key),
            create: false,
            edit: false,
            delete: false,
            amount: false
          };
        }
      });
    }

    console.log('Initial permissions:', initialPermissions);
    console.log('Sample loaded permission (wood-receipt):', initialPermissions['wood-receipt']);
    console.log('User object from state:', user);
    console.log('User permissions from state:', user.permissions);

    setEditUserDialog({ open: true, user });
    setEditedUser({
      username: user.username,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email,
      role: user.role,
      password: '',
      permissions: initialPermissions
    });

    console.log('Dialog state updated');
  };

  const handleCloseEditDialog = () => {
    setEditUserDialog({ open: false, user: null });
    setEditedUser({ username: '', firstName: '', lastName: '', email: '', role: '', password: '', permissions: {} });
  };

  const handlePermissionChange = (menuKey: string, permissionType: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const checked = event.target.checked;
    setEditedUser(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [menuKey]: {
          ...prev.permissions[menuKey],
          [permissionType]: checked,
          // If unchecking access, uncheck all CRUD permissions including amount
          ...(permissionType === 'access' && !checked ? {
            read: false,
            create: false,
            edit: false,
            delete: false,
            amount: false
          } : {})
        }
      }
    }));
  };

  const handleSectionToggle = (sectionItems: any[], permissionType: string, checked: boolean) => {
    setEditedUser(prev => {
      const updatedPermissions = { ...prev.permissions };

      sectionItems.forEach(item => {
        if (permissionType === 'access') {
          // If toggling access, update all permissions
          updatedPermissions[item.key] = {
            access: checked,
            read: checked,
            create: checked && item.hasActions,
            edit: checked && item.hasActions,
            delete: checked && item.hasActions,
            amount: checked
          };
        } else {
          // For other permissions, only update if access is enabled
          if (updatedPermissions[item.key]?.access) {
            updatedPermissions[item.key] = {
              ...updatedPermissions[item.key],
              [permissionType]: checked
            };
          }
        }
      });

      return {
        ...prev,
        permissions: updatedPermissions
      };
    });
  };

  const handleSaveEditedUser = async () => {
    if (!editUserDialog.user) return;

    console.log('Saving user with permissions:', editedUser.permissions);
    console.log('Sample permission (wood-receipt):', editedUser.permissions['wood-receipt']);

    try {
      // Save to backend
      const payload = {
        email: editedUser.email,
        firstName: editedUser.firstName || null,
        lastName: editedUser.lastName || null,
        role: editedUser.role,
        password: editedUser.password || undefined,
        permissions: editedUser.permissions
      };

      console.log('Sending PUT request to /users/' + editUserDialog.user.id, payload);
      console.log('Payload permissions sample (wood-receipt):', payload.permissions['wood-receipt']);

      const updateResponse = await api.put(`/users/${editUserDialog.user.id}`, payload);

      console.log('Update response:', updateResponse.data);

      // Refresh users list from backend to get updated permissions
      const response = await api.get('/users');
      console.log('Fetched users:', response.data);

      const usersData = response.data.map((user: any) => ({
        id: user.id,
        username: user.firstName || user.email.split('@')[0],
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        status: user.isActive ? 'active' : 'inactive',
        permissions: user.permissions
      }));
      setUsers(usersData);

      console.log('Users updated in state');

      handleCloseEditDialog();
    } catch (error) {
      console.error('Error saving user:', error);
      alert('Failed to save user changes. Please try again.');
    }
  };

  const handleEditedUserChange = (field: keyof typeof editedUser) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setEditedUser(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  // SECURITY: Unlock user account
  const handleUnlockUser = async (userId: string) => {
    try {
      const response = await apiPost(`/api/users/unlock/${userId}`, {});

      if (response.ok) {
        // Refresh users list
        fetchUsers();
        enqueueSnackbar('Account unlocked successfully', { variant: 'success' });
      } else {
        const error = await response.json();
        enqueueSnackbar(error.message || 'Failed to unlock account', { variant: 'error' });
      }
    } catch (error) {
      console.error('Error unlocking account:', error);
      enqueueSnackbar('Failed to unlock account', { variant: 'error' });
    }
  };

  const getStatusColor = (status: string) => {
    return status === 'active'
      ? { bg: '#dcfce7', color: '#166534' }
      : { bg: '#fee2e2', color: '#991b1b' };
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
              <AdminPanelSettingsIcon sx={{ fontSize: 28, color: 'white' }} />
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
                Admin Settings
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontSize: '0.875rem',
                  mt: 0.5,
                }}
              >
                Manage users, system settings, and security configurations
              </Typography>
            </Box>
          </Box>
          <Button
            variant="contained"
            onClick={handleSaveSettings}
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

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress sx={{ color: '#dc2626' }} />
        </Box>
      ) : (
        <Paper
          elevation={0}
          sx={{
            borderRadius: 2,
            overflow: 'hidden',
            border: '1px solid #e2e8f0',
            backgroundColor: 'white',
          }}
        >
          {/* Tabs */}
          <Tabs
            value={selectedTab}
            onChange={(_, value) => setSelectedTab(value)}
            sx={{
              borderBottom: '1px solid #e2e8f0',
              backgroundColor: '#f8fafc',
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.875rem',
                minHeight: 48,
                '&.Mui-selected': {
                  color: '#dc2626',
                },
              },
              '& .MuiTabs-indicator': {
                backgroundColor: '#dc2626',
              },
            }}
          >
            <Tab label="Users" />
            <Tab label="System" />
            <Tab label="Email" />
            <Tab label="Security" />
          </Tabs>

          {/* Tab Content */}
          <Box sx={{ p: 3 }}>
            {/* Users Tab */}
            {selectedTab === 0 && (
              <Stack spacing={3}>
                {/* Users Table */}
                <Paper
                  elevation={0}
                  sx={{
                    border: '1px solid #e2e8f0',
                    borderRadius: 2,
                    overflow: 'hidden',
                  }}
                >
                  <Box
                    sx={{
                      p: 2,
                      backgroundColor: '#f8fafc',
                      borderBottom: '1px solid #e2e8f0',
                    }}
                  >
                    <Typography
                      variant="h6"
                      sx={{
                        fontSize: '0.9375rem',
                        fontWeight: 600,
                        color: '#1e293b',
                      }}
                    >
                      User Management
                    </Typography>
                  </Box>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow sx={{ backgroundColor: '#f8fafc' }}>
                          <TableCell sx={{ fontWeight: 600, color: '#334155', fontSize: '0.875rem' }}>
                            Username
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600, color: '#334155', fontSize: '0.875rem' }}>
                            Email
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600, color: '#334155', fontSize: '0.875rem' }}>
                            Role
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600, color: '#334155', fontSize: '0.875rem' }}>
                            Status
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600, color: '#334155', fontSize: '0.875rem' }}>
                            Actions
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {users.map((user) => {
                          const statusColors = getStatusColor(user.status);
                          return (
                            <TableRow
                              key={user.id}
                              sx={{
                                '&:hover': {
                                  backgroundColor: '#f8fafc',
                                },
                                transition: 'background-color 0.2s ease',
                              }}
                            >
                              <TableCell>
                                <Typography
                                  sx={{
                                    fontWeight: 600,
                                    color: '#1e293b',
                                    fontSize: '0.875rem',
                                  }}
                                >
                                  {user.username}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography sx={{ fontSize: '0.875rem', color: '#64748b' }}>
                                  {user.email}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={user.role}
                                  size="small"
                                  sx={{
                                    backgroundColor: alpha('#dc2626', 0.1),
                                    color: '#dc2626',
                                    fontWeight: 600,
                                    fontSize: '0.75rem',
                                    height: '24px',
                                  }}
                                />
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={user.status.toUpperCase()}
                                  size="small"
                                  sx={{
                                    backgroundColor: statusColors.bg,
                                    color: statusColors.color,
                                    fontWeight: 600,
                                    fontSize: '0.75rem',
                                    height: '24px',
                                  }}
                                />
                              </TableCell>
                              <TableCell align="right">
                                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                                  <Tooltip title="Edit User">
                                    <IconButton
                                      size="small"
                                      onClick={() => handleEditUserClick(user)}
                                      sx={{
                                        color: '#64748b',
                                        '&:hover': {
                                          backgroundColor: alpha('#dc2626', 0.08),
                                          color: '#dc2626',
                                        },
                                      }}
                                    >
                                      <EditIcon sx={{ fontSize: '1.25rem' }} />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title={user.status === 'active' ? 'Deactivate' : 'Activate'}>
                                    <IconButton
                                      size="small"
                                      sx={{
                                        color: '#64748b',
                                        '&:hover': {
                                          backgroundColor: user.status === 'active'
                                            ? alpha('#dc2626', 0.08)
                                            : alpha('#16a34a', 0.08),
                                          color: user.status === 'active' ? '#dc2626' : '#16a34a',
                                        },
                                      }}
                                    >
                                      {user.status === 'active' ? (
                                        <BlockIcon sx={{ fontSize: '1.25rem' }} />
                                      ) : (
                                        <CheckCircleIcon sx={{ fontSize: '1.25rem' }} />
                                      )}
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Reset Password">
                                    <IconButton
                                      size="small"
                                      sx={{
                                        color: '#64748b',
                                        '&:hover': {
                                          backgroundColor: alpha('#f59e0b', 0.08),
                                          color: '#f59e0b',
                                        },
                                      }}
                                    >
                                      <LockResetIcon sx={{ fontSize: '1.25rem' }} />
                                    </IconButton>
                                  </Tooltip>
                                  {user.accountLockedAt && (
                                    <Tooltip title="Unlock Account">
                                      <IconButton
                                        size="small"
                                        onClick={() => handleUnlockUser(user.id)}
                                        sx={{
                                          color: '#64748b',
                                          '&:hover': {
                                            backgroundColor: alpha('#16a34a', 0.08),
                                            color: '#16a34a',
                                          },
                                        }}
                                      >
                                        <LockOpenIcon sx={{ fontSize: '1.25rem' }} />
                                      </IconButton>
                                    </Tooltip>
                                  )}
                                  <Tooltip title="Delete User">
                                    <IconButton
                                      size="small"
                                      sx={{
                                        color: '#64748b',
                                        '&:hover': {
                                          backgroundColor: alpha('#dc2626', 0.08),
                                          color: '#dc2626',
                                        },
                                      }}
                                    >
                                      <DeleteIcon sx={{ fontSize: '1.25rem' }} />
                                    </IconButton>
                                  </Tooltip>
                                </Box>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>

                {/* Create User Section */}
                <Paper
                  elevation={0}
                  sx={{
                    border: '1px solid #e2e8f0',
                    borderRadius: 2,
                    overflow: 'hidden',
                  }}
                >
                  <Box
                    sx={{
                      p: 2,
                      backgroundColor: '#f8fafc',
                      borderBottom: '1px solid #e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                    }}
                  >
                    <PersonAddIcon sx={{ color: '#dc2626', fontSize: 20 }} />
                    <Typography
                      variant="h6"
                      sx={{
                        fontSize: '0.9375rem',
                        fontWeight: 600,
                        color: '#1e293b',
                      }}
                    >
                      Create New User
                    </Typography>
                  </Box>
                  <Box sx={{ p: 3 }}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Username"
                          value={newUser.username}
                          onChange={handleNewUserChange('username')}
                          size="small"
                          sx={textFieldSx}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Email"
                          type="email"
                          value={newUser.email}
                          onChange={handleNewUserChange('email')}
                          size="small"
                          sx={textFieldSx}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Password"
                          type="password"
                          value={newUser.password}
                          onChange={handleNewUserChange('password')}
                          size="small"
                          sx={textFieldSx}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          select
                          fullWidth
                          label="Role"
                          value={newUser.role}
                          onChange={handleNewUserChange('role')}
                          size="small"
                          sx={textFieldSx}
                        >
                          <MenuItem value="ADMIN">Admin</MenuItem>
                          <MenuItem value="MANAGER">Manager</MenuItem>
                          <MenuItem value="USER">User</MenuItem>
                        </TextField>
                      </Grid>
                      <Grid item xs={12}>
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                          <Button
                            variant="contained"
                            startIcon={<PersonAddIcon />}
                            onClick={handleCreateUser}
                            disabled={!newUser.username || !newUser.email || !newUser.password}
                            sx={{
                              backgroundColor: '#dc2626',
                              textTransform: 'none',
                              fontWeight: 600,
                              px: 3,
                              '&:hover': {
                                backgroundColor: '#b91c1c',
                              },
                            }}
                          >
                            Create User
                          </Button>
                        </Box>
                      </Grid>
                    </Grid>
                  </Box>
                </Paper>

                {/* Role Management Section */}
                <Paper
                  elevation={0}
                  sx={{
                    border: '1px solid #e2e8f0',
                    borderRadius: 2,
                    overflow: 'hidden',
                  }}
                >
                  <Box
                    sx={{
                      p: 2,
                      backgroundColor: '#f8fafc',
                      borderBottom: '1px solid #e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                    }}
                  >
                    <SecurityIcon sx={{ color: '#dc2626', fontSize: 20 }} />
                    <Typography
                      variant="h6"
                      sx={{
                        fontSize: '0.9375rem',
                        fontWeight: 600,
                        color: '#1e293b',
                      }}
                    >
                      Role Management
                    </Typography>
                  </Box>

                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ backgroundColor: '#f8fafc' }}>
                          <TableCell sx={{ fontWeight: 600, color: '#334155', fontSize: '0.875rem' }}>
                            Role Name
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600, color: '#334155', fontSize: '0.875rem' }}>
                            Description
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600, color: '#334155', fontSize: '0.875rem' }}>
                            Actions
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {roles.map((role) => (
                          <TableRow
                            key={role.id}
                            sx={{
                              '&:hover': {
                                backgroundColor: '#f8fafc',
                              },
                              transition: 'background-color 0.2s ease',
                            }}
                          >
                            <TableCell>
                              <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>
                                {role.name}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography sx={{ fontSize: '0.875rem', color: '#64748b' }}>
                                {role.description}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                                <Tooltip title="Edit Role">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleEditRoleClick(role)}
                                    sx={{
                                      color: '#64748b',
                                      '&:hover': {
                                        backgroundColor: alpha('#dc2626', 0.08),
                                        color: '#dc2626',
                                      },
                                    }}
                                  >
                                    <EditIcon sx={{ fontSize: '1.25rem' }} />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Delete Role">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleDeleteRole(role.id)}
                                    sx={{
                                      color: '#64748b',
                                      '&:hover': {
                                        backgroundColor: alpha('#dc2626', 0.08),
                                        color: '#dc2626',
                                      },
                                    }}
                                  >
                                    <DeleteIcon sx={{ fontSize: '1.25rem' }} />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  <Box sx={{ p: 3, borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                    <Typography
                      sx={{
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        color: '#334155',
                        mb: 2,
                      }}
                    >
                      Create New Role
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={5}>
                        <TextField
                          fullWidth
                          label="Role Name"
                          value={newRole.name}
                          onChange={handleNewRoleChange('name')}
                          size="small"
                          sx={textFieldSx}
                        />
                      </Grid>
                      <Grid item xs={12} md={5}>
                        <TextField
                          fullWidth
                          label="Description"
                          value={newRole.description}
                          onChange={handleNewRoleChange('description')}
                          size="small"
                          sx={textFieldSx}
                        />
                      </Grid>
                      <Grid item xs={12} md={2}>
                        <Button
                          fullWidth
                          variant="contained"
                          startIcon={<AddIcon />}
                          onClick={handleAddRole}
                          disabled={!newRole.name}
                          sx={{
                            backgroundColor: '#dc2626',
                            textTransform: 'none',
                            fontWeight: 600,
                            height: '40px',
                            '&:hover': {
                              backgroundColor: '#b91c1c',
                            },
                          }}
                        >
                          Add
                        </Button>
                      </Grid>
                    </Grid>
                  </Box>
                </Paper>
              </Stack>
            )}

            {/* System Tab */}
            {selectedTab === 1 && (
              <Grid container spacing={2}>
                {[
                  {
                    name: 'showDevelopmentLabels',
                    label: 'Development Labels',
                    description: 'Show/hide component labels for development'
                  },
                  {
                    name: 'enableUserRegistration',
                    label: 'User Registration',
                    description: 'Allow new users to register'
                  },
                  {
                    name: 'enableNotifications',
                    label: 'System Notifications',
                    description: 'Enable system-wide notifications'
                  },
                  {
                    name: 'enableMaintenance',
                    label: 'Maintenance Mode',
                    description: 'Put system in maintenance mode'
                  },
                  {
                    name: 'enableAuditLog',
                    label: 'Audit Logging',
                    description: 'Track all system activities'
                  }
                ].map((setting) => (
                  <Grid item xs={12} md={6} key={setting.name}>
                    <Card
                      elevation={0}
                      sx={{
                        border: '1px solid #e2e8f0',
                        borderRadius: 2,
                        height: '100%',
                      }}
                    >
                      <CardContent sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <Box sx={{ flex: 1 }}>
                            <Typography
                              sx={{
                                fontSize: '0.9375rem',
                                fontWeight: 600,
                                color: '#1e293b',
                                mb: 0.5,
                              }}
                            >
                              {setting.label}
                            </Typography>
                            <Typography
                              variant="body2"
                              sx={{
                                fontSize: '0.8125rem',
                                color: '#64748b',
                              }}
                            >
                              {setting.description}
                            </Typography>
                          </Box>
                          <Switch
                            checked={settings[setting.name as keyof typeof settings] as boolean}
                            onChange={handleChange(setting.name)}
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
                      </CardContent>
                    </Card>
                  </Grid>
                ))}

                {/* Electricity Price Configuration */}
                <Grid item xs={12}>
                  <Card
                    elevation={0}
                    sx={{
                      border: '1px solid #e2e8f0',
                      borderRadius: 2,
                      mt: 2,
                    }}
                  >
                    <Box
                      sx={{
                        p: 2,
                        backgroundColor: '#f8fafc',
                        borderBottom: '1px solid #e2e8f0',
                      }}
                    >
                      <Typography
                        variant="h6"
                        sx={{
                          fontSize: '0.9375rem',
                          fontWeight: 600,
                          color: '#1e293b',
                        }}
                      >
                        Drying Process Configuration
                      </Typography>
                    </Box>
                    <CardContent sx={{ p: 3 }}>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          <TextField
                            fullWidth
                            label="Electricity Price per kWh ($)"
                            type="number"
                            value={settings.electricityPricePerKWh}
                            onChange={(e) => setSettings({ ...settings, electricityPricePerKWh: e.target.value })}
                            size="small"
                            sx={textFieldSx}
                            inputProps={{ step: 0.01, min: 0 }}
                            helperText="Used to calculate drying process costs"
                          />
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}

            {/* Email Tab */}
            {selectedTab === 2 && (
              <Paper
                elevation={0}
                sx={{
                  border: '1px solid #e2e8f0',
                  borderRadius: 2,
                  overflow: 'hidden',
                }}
              >
                <Box
                  sx={{
                    p: 2,
                    backgroundColor: '#f8fafc',
                    borderBottom: '1px solid #e2e8f0',
                  }}
                >
                  <Typography
                    variant="h6"
                    sx={{
                      fontSize: '0.9375rem',
                      fontWeight: 600,
                      color: '#1e293b',
                    }}
                  >
                    SMTP Configuration
                  </Typography>
                </Box>
                <Box sx={{ p: 3 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={8}>
                      <TextField
                        fullWidth
                        label="SMTP Server"
                        value={settings.smtpServer}
                        onChange={handleChange('smtpServer')}
                        size="small"
                        sx={textFieldSx}
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        label="SMTP Port"
                        value={settings.smtpPort}
                        onChange={handleChange('smtpPort')}
                        size="small"
                        sx={textFieldSx}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Username"
                        value={settings.smtpUsername}
                        onChange={handleChange('smtpUsername')}
                        size="small"
                        sx={textFieldSx}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Password"
                        type="password"
                        value={settings.smtpPassword}
                        onChange={handleChange('smtpPassword')}
                        size="small"
                        sx={textFieldSx}
                      />
                    </Grid>
                  </Grid>
                </Box>
              </Paper>
            )}

            {/* Security Tab */}
            {selectedTab === 3 && (
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Card
                    elevation={0}
                    sx={{
                      border: '1px solid #e2e8f0',
                      borderRadius: 2,
                    }}
                  >
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography
                            sx={{
                              fontSize: '0.9375rem',
                              fontWeight: 600,
                              color: '#1e293b',
                              mb: 0.5,
                            }}
                          >
                            Two-Factor Authentication
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{
                              fontSize: '0.8125rem',
                              color: '#64748b',
                            }}
                          >
                            Require 2FA for all users
                          </Typography>
                        </Box>
                        <Switch
                          checked={settings.twoFactorAuth}
                          onChange={handleChange('twoFactorAuth')}
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
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card
                    elevation={0}
                    sx={{
                      border: '1px solid #e2e8f0',
                      borderRadius: 2,
                    }}
                  >
                    <CardContent sx={{ p: 3 }}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Password Expiry (days)"
                        value={settings.passwordExpiry}
                        onChange={handleChange('passwordExpiry')}
                        size="small"
                        sx={textFieldSx}
                      />
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card
                    elevation={0}
                    sx={{
                      border: '1px solid #e2e8f0',
                      borderRadius: 2,
                    }}
                  >
                    <CardContent sx={{ p: 3 }}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Max Login Attempts"
                        value={settings.maxLoginAttempts}
                        onChange={handleChange('maxLoginAttempts')}
                        size="small"
                        sx={textFieldSx}
                      />
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}
          </Box>
        </Paper>
      )}

      {/* Edit User Dialog */}
      <Dialog
        open={editUserDialog.open}
        onClose={handleCloseEditDialog}
        maxWidth="md"
        fullWidth
        disableEnforceFocus
        PaperProps={{
          sx: {
            borderRadius: 3,
          }
        }}
      >
        <DialogTitle
          sx={{
            fontSize: '1.25rem',
            fontWeight: 700,
            color: '#1e293b',
            borderBottom: '1px solid #e2e8f0',
            pb: 2,
          }}
        >
          Edit User: {editUserDialog.user?.username}
        </DialogTitle>
        <DialogContent sx={{ py: 3, px: 3 }}>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Username"
              value={editedUser.username}
              onChange={handleEditedUserChange('username')}
              size="small"
              sx={textFieldSx}
            />
            <TextField
              fullWidth
              label="First Name"
              value={editedUser.firstName || ''}
              onChange={handleEditedUserChange('firstName')}
              size="small"
              sx={textFieldSx}
            />
            <TextField
              fullWidth
              label="Last Name"
              value={editedUser.lastName || ''}
              onChange={handleEditedUserChange('lastName')}
              size="small"
              sx={textFieldSx}
            />
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={editedUser.email}
              onChange={handleEditedUserChange('email')}
              size="small"
              sx={textFieldSx}
            />
            <TextField
              select
              fullWidth
              label="Role"
              value={editedUser.role}
              onChange={handleEditedUserChange('role')}
              size="small"
              sx={textFieldSx}
            >
              <MenuItem value="ADMIN">Admin</MenuItem>
              <MenuItem value="MANAGER">Manager</MenuItem>
              <MenuItem value="USER">User</MenuItem>
            </TextField>
            <TextField
              fullWidth
              label="New Password"
              type="password"
              value={editedUser.password}
              onChange={handleEditedUserChange('password')}
              placeholder="Leave blank to keep current password"
              helperText="Enter new password only if you want to change it"
              size="small"
              sx={textFieldSx}
            />

            {/* Permissions Section */}
            <Box sx={{ mt: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: 600,
                    color: '#1e293b',
                    fontSize: '0.9375rem'
                  }}
                >
                  Page Access & Permissions
                </Typography>
                <Button
                  size="small"
                  onClick={() => {
                    // Find the selected role and use its permissions as template
                    const selectedRole = roles.find(r => r.name === editedUser.role);

                    if (selectedRole?.permissions) {
                      // Use permissions from the role template
                      setEditedUser(prev => ({ ...prev, permissions: { ...selectedRole.permissions } }));
                    } else {
                      // Fallback to default permissions if role doesn't have permissions defined
                      const rolePermissions: Record<string, any> = {};
                      menuItems.forEach(item => {
                        if (editedUser.role === 'ADMIN') {
                          rolePermissions[item.key] = {
                            access: true,
                            read: true,
                            create: item.hasActions,
                            edit: item.hasActions,
                            delete: item.hasActions,
                            amount: true
                          };
                        } else if (editedUser.role === 'MANAGER') {
                          rolePermissions[item.key] = {
                            access: item.key !== 'admin-settings',
                            read: item.key !== 'admin-settings',
                            create: item.hasActions && item.key !== 'admin-settings',
                            edit: item.hasActions && item.key !== 'admin-settings',
                            delete: item.hasActions && !['admin-settings', 'approvals'].includes(item.key),
                            amount: item.key !== 'admin-settings'
                          };
                        } else {
                          rolePermissions[item.key] = {
                            access: !['admin-settings', 'approvals'].includes(item.key),
                            read: !['admin-settings', 'approvals'].includes(item.key),
                            create: false,
                            edit: false,
                            delete: false,
                            amount: false
                          };
                        }
                      });
                      setEditedUser(prev => ({ ...prev, permissions: rolePermissions }));
                    }
                  }}
                  sx={{
                    textTransform: 'none',
                    fontSize: '0.75rem',
                    color: '#dc2626',
                    borderColor: '#dc2626',
                    px: 2,
                    py: 0.5,
                    '&:hover': {
                      borderColor: '#b91c1c',
                      backgroundColor: alpha('#dc2626', 0.08)
                    }
                  }}
                  variant="outlined"
                >
                  Apply {editedUser.role} Defaults
                </Button>
              </Box>
              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  color: '#64748b',
                  mb: 2,
                  fontSize: '0.75rem',
                  fontStyle: 'italic'
                }}
              >
                Role sets default permissions. Click "Apply Defaults" then customize for this specific user.
              </Typography>
              <Box sx={{ border: '1px solid #e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
                <Box sx={{ display: 'flex', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', p: 1.5 }}>
                  <Box sx={{ flex: 1.5, fontWeight: 600, fontSize: '0.75rem', color: '#64748b' }}>PAGE</Box>
                  <Box sx={{ width: 70, textAlign: 'center', fontWeight: 600, fontSize: '0.75rem', color: '#64748b' }}>ACCESS</Box>
                  <Box sx={{ width: 65, textAlign: 'center', fontWeight: 600, fontSize: '0.75rem', color: '#64748b' }}>READ</Box>
                  <Box sx={{ width: 68, textAlign: 'center', fontWeight: 600, fontSize: '0.75rem', color: '#64748b' }}>CREATE</Box>
                  <Box sx={{ width: 60, textAlign: 'center', fontWeight: 600, fontSize: '0.75rem', color: '#64748b' }}>EDIT</Box>
                  <Box sx={{ width: 68, textAlign: 'center', fontWeight: 600, fontSize: '0.75rem', color: '#64748b' }}>DELETE</Box>
                  <Box sx={{ width: 72, textAlign: 'center', fontWeight: 600, fontSize: '0.75rem', color: '#64748b' }}>AMOUNT</Box>
                </Box>
                <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
                  {menuSections.map((section, sectionIndex) => {
                    // Check if all items in section have access enabled
                    const allHaveAccess = section.items.every(item => editedUser.permissions[item.key]?.access);
                    const someHaveAccess = section.items.some(item => editedUser.permissions[item.key]?.access);

                    return (
                      <Box key={section.category}>
                        {/* Section Header with Toggle */}
                        <Box
                          sx={{
                            backgroundColor: '#f1f5f9',
                            p: 1,
                            pr: 1.5,
                            borderBottom: '1px solid #e2e8f0',
                            position: 'sticky',
                            top: 0,
                            zIndex: 1,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <Typography
                            sx={{
                              fontSize: '0.8125rem',
                              fontWeight: 700,
                              color: '#334155',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em'
                            }}
                          >
                            {section.category}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Typography sx={{ fontSize: '0.7rem', color: '#64748b', mr: 0.5 }}>
                              Toggle All
                            </Typography>
                            <Switch
                              size="small"
                              checked={allHaveAccess}
                              onChange={(e) => handleSectionToggle(section.items, 'access', e.target.checked)}
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
                        </Box>

                      {/* Section Items */}
                      {section.items.map((item, itemIndex) => (
                        <Box
                          key={item.key}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            p: 1.5,
                            borderBottom: (sectionIndex === menuSections.length - 1 && itemIndex === section.items.length - 1)
                              ? 'none'
                              : '1px solid #e2e8f0',
                            '&:hover': { backgroundColor: '#f8fafc' }
                          }}
                        >
                          <Box sx={{ flex: 1.5, fontSize: '0.875rem', color: '#1e293b', fontWeight: 500, pl: 2 }}>
                            {item.label}
                          </Box>
                          <Box sx={{ width: 70, textAlign: 'center' }}>
                            <Switch
                              size="small"
                              checked={editedUser.permissions[item.key]?.access || false}
                              onChange={handlePermissionChange(item.key, 'access')}
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
                          <Box sx={{ width: 65, textAlign: 'center' }}>
                            <Switch
                              size="small"
                              disabled={!editedUser.permissions[item.key]?.access}
                              checked={editedUser.permissions[item.key]?.read || false}
                              onChange={handlePermissionChange(item.key, 'read')}
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
                          {item.hasActions ? (
                            <>
                              <Box sx={{ width: 68, textAlign: 'center' }}>
                                <Switch
                                  size="small"
                                  disabled={!editedUser.permissions[item.key]?.access}
                                  checked={editedUser.permissions[item.key]?.create || false}
                                  onChange={handlePermissionChange(item.key, 'create')}
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
                              <Box sx={{ width: 60, textAlign: 'center' }}>
                                <Switch
                                  size="small"
                                  disabled={!editedUser.permissions[item.key]?.access}
                                  checked={editedUser.permissions[item.key]?.edit || false}
                                  onChange={handlePermissionChange(item.key, 'edit')}
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
                              <Box sx={{ width: 68, textAlign: 'center' }}>
                                <Switch
                                  size="small"
                                  disabled={!editedUser.permissions[item.key]?.access}
                                  checked={editedUser.permissions[item.key]?.delete || false}
                                  onChange={handlePermissionChange(item.key, 'delete')}
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
                            </>
                          ) : (
                            <>
                              <Box sx={{ width: 68, textAlign: 'center' }}>
                                <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8' }}>-</Typography>
                              </Box>
                              <Box sx={{ width: 60, textAlign: 'center' }}>
                                <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8' }}>-</Typography>
                              </Box>
                              <Box sx={{ width: 68, textAlign: 'center' }}>
                                <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8' }}>-</Typography>
                              </Box>
                            </>
                          )}
                          <Box sx={{ width: 72, textAlign: 'center' }}>
                            <Switch
                              size="small"
                              disabled={!editedUser.permissions[item.key]?.access}
                              checked={editedUser.permissions[item.key]?.amount || false}
                              onChange={handlePermissionChange(item.key, 'amount')}
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
                        </Box>
                      ))}
                    </Box>
                  );
                  })}
                </Box>
              </Box>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, pt: 2, borderTop: '1px solid #e2e8f0' }}>
          <Button
            onClick={handleCloseEditDialog}
            sx={{
              color: '#64748b',
              textTransform: 'none',
              fontWeight: 600,
              '&:hover': {
                backgroundColor: '#f1f5f9',
              },
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSaveEditedUser}
            variant="contained"
            sx={{
              backgroundColor: '#dc2626',
              textTransform: 'none',
              fontWeight: 600,
              px: 3,
              '&:hover': {
                backgroundColor: '#b91c1c',
              },
            }}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog
        open={editRoleDialog.open}
        onClose={handleCloseEditRoleDialog}
        maxWidth="md"
        fullWidth
        disableEnforceFocus
        PaperProps={{
          sx: {
            borderRadius: 3,
          }
        }}
      >
        <DialogTitle
          sx={{
            fontSize: '1.25rem',
            fontWeight: 700,
            color: '#1e293b',
            borderBottom: '1px solid #e2e8f0',
            pb: 2,
          }}
        >
          Edit Role: {editRoleDialog.role?.name}
        </DialogTitle>
        <DialogContent sx={{ py: 3, px: 3 }}>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Role Name"
              value={editedRole.name}
              onChange={handleEditedRoleChange('name')}
              size="small"
              sx={textFieldSx}
            />
            <TextField
              fullWidth
              label="Description"
              value={editedRole.description}
              onChange={handleEditedRoleChange('description')}
              size="small"
              sx={textFieldSx}
            />

            {/* Permissions Section */}
            <Box sx={{ mt: 3 }}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 600,
                  color: '#1e293b',
                  fontSize: '0.9375rem',
                  mb: 2
                }}
              >
                Page Access & Permissions Template
              </Typography>

              {/* Permissions Table */}
              <TableContainer
                sx={{
                  border: '1px solid #e2e8f0',
                  borderRadius: 2,
                  maxHeight: 400,
                  overflow: 'auto'
                }}
              >
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.8125rem', bgcolor: '#f8fafc', width: '30%' }}>
                        PAGE
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 600, fontSize: '0.8125rem', bgcolor: '#f8fafc', width: '11%' }}>
                        ACCESS
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 600, fontSize: '0.8125rem', bgcolor: '#f8fafc', width: '11%' }}>
                        READ
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 600, fontSize: '0.8125rem', bgcolor: '#f8fafc', width: '12%' }}>
                        CREATE
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 600, fontSize: '0.8125rem', bgcolor: '#f8fafc', width: '12%' }}>
                        EDIT
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 600, fontSize: '0.8125rem', bgcolor: '#f8fafc', width: '12%' }}>
                        DELETE
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 600, fontSize: '0.8125rem', bgcolor: '#f8fafc', width: '12%' }}>
                        AMOUNT
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {menuSections.map((section) => {
                      // Check if all items in section have access enabled
                      const allHaveAccess = section.items.every(item => editedRole.permissions[item.key]?.access);
                      const someHaveAccess = section.items.some(item => editedRole.permissions[item.key]?.access);

                      return (
                        <React.Fragment key={section.category}>
                          {/* Section Header with Toggle */}
                          <TableRow key={`section-${section.category}`}>
                            <TableCell
                              colSpan={7}
                              sx={{
                                bgcolor: '#f1f5f9',
                                py: 0.75,
                                position: 'sticky',
                                top: 37,
                                zIndex: 1
                              }}
                            >
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography
                                  sx={{
                                    fontSize: '0.8125rem',
                                    fontWeight: 700,
                                    color: '#334155',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em'
                                  }}
                                >
                                  {section.category}
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <Typography sx={{ fontSize: '0.7rem', color: '#64748b', mr: 0.5 }}>
                                    Toggle All
                                  </Typography>
                                  <Switch
                                    size="small"
                                    checked={allHaveAccess}
                                    onChange={(e) => handleRoleSectionToggle(section.items, 'access', e.target.checked)}
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
                              </Box>
                            </TableCell>
                          </TableRow>

                        {/* Section Items */}
                        {section.items.map((item) => (
                          <TableRow key={item.key} sx={{ '&:hover': { bgcolor: '#f8fafc' } }}>
                            <TableCell sx={{ fontSize: '0.8125rem', py: 1, pl: 3 }}>
                              {item.label}
                            </TableCell>
                            <TableCell align="center">
                              <Switch
                                size="small"
                                checked={editedRole.permissions[item.key]?.access || false}
                                onChange={handleRolePermissionChange(item.key, 'access')}
                                sx={{
                                  '& .MuiSwitch-switchBase.Mui-checked': {
                                    color: '#dc2626',
                                  },
                                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                    backgroundColor: '#dc2626',
                                  },
                                }}
                              />
                            </TableCell>
                            <TableCell align="center">
                              <Switch
                                size="small"
                                checked={editedRole.permissions[item.key]?.read || false}
                                onChange={handleRolePermissionChange(item.key, 'read')}
                                disabled={!editedRole.permissions[item.key]?.access}
                                sx={{
                                  '& .MuiSwitch-switchBase.Mui-checked': {
                                    color: '#dc2626',
                                  },
                                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                    backgroundColor: '#dc2626',
                                  },
                                }}
                              />
                            </TableCell>
                            <TableCell align="center">
                              {item.hasActions ? (
                                <Switch
                                  size="small"
                                  checked={editedRole.permissions[item.key]?.create || false}
                                  onChange={handleRolePermissionChange(item.key, 'create')}
                                  disabled={!editedRole.permissions[item.key]?.access}
                                  sx={{
                                    '& .MuiSwitch-switchBase.Mui-checked': {
                                      color: '#dc2626',
                                    },
                                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                      backgroundColor: '#dc2626',
                                    },
                                  }}
                                />
                              ) : (
                                <Typography sx={{ color: '#94a3b8', fontSize: '0.75rem' }}>-</Typography>
                              )}
                            </TableCell>
                            <TableCell align="center">
                              {item.hasActions ? (
                                <Switch
                                  size="small"
                                  checked={editedRole.permissions[item.key]?.edit || false}
                                  onChange={handleRolePermissionChange(item.key, 'edit')}
                                  disabled={!editedRole.permissions[item.key]?.access}
                                  sx={{
                                    '& .MuiSwitch-switchBase.Mui-checked': {
                                      color: '#dc2626',
                                    },
                                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                      backgroundColor: '#dc2626',
                                    },
                                  }}
                                />
                              ) : (
                                <Typography sx={{ color: '#94a3b8', fontSize: '0.75rem' }}>-</Typography>
                              )}
                            </TableCell>
                            <TableCell align="center">
                              {item.hasActions ? (
                                <Switch
                                  size="small"
                                  checked={editedRole.permissions[item.key]?.delete || false}
                                  onChange={handleRolePermissionChange(item.key, 'delete')}
                                  disabled={!editedRole.permissions[item.key]?.access}
                                  sx={{
                                    '& .MuiSwitch-switchBase.Mui-checked': {
                                      color: '#dc2626',
                                    },
                                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                      backgroundColor: '#dc2626',
                                    },
                                  }}
                                />
                              ) : (
                                <Typography sx={{ color: '#94a3b8', fontSize: '0.75rem' }}>-</Typography>
                              )}
                            </TableCell>
                            <TableCell align="center">
                              <Switch
                                size="small"
                                checked={editedRole.permissions[item.key]?.amount || false}
                                onChange={handleRolePermissionChange(item.key, 'amount')}
                                disabled={!editedRole.permissions[item.key]?.access}
                                sx={{
                                  '& .MuiSwitch-switchBase.Mui-checked': {
                                    color: '#dc2626',
                                  },
                                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                    backgroundColor: '#dc2626',
                                  },
                                }}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </React.Fragment>
                    );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button
            onClick={handleCloseEditRoleDialog}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              color: '#64748b',
              '&:hover': {
                backgroundColor: '#f1f5f9',
              },
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSaveEditedRole}
            variant="contained"
            disabled={!editedRole.name}
            sx={{
              backgroundColor: '#dc2626',
              textTransform: 'none',
              fontWeight: 600,
              px: 3,
              '&:hover': {
                backgroundColor: '#b91c1c',
              },
            }}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </StyledContainer>
  );
}
