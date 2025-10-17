import { useState, useEffect, type FC } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Chip,
  CircularProgress,
  Container,
  Switch,
  FormControlLabel,
  Autocomplete,
  Stack
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import ArchiveIcon from '@mui/icons-material/Archive';
import UnarchiveIcon from '@mui/icons-material/Unarchive';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import PeopleIcon from '@mui/icons-material/People';
import api from '../../lib/api';

interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
}

interface WarehouseUser {
  id: string;
  userId: string;
  user: User;
}

interface Warehouse {
  id: string;
  code: string;
  name: string;
  address: string | null;
  contactPerson: string | null;
  stockControlEnabled: boolean;
  requiresApproval: boolean;
  status: 'ACTIVE' | 'ARCHIVED';
  assignedUsers: WarehouseUser[];
  _count: {
    stock: number;
    transfersFrom: number;
    transfersTo: number;
  };
  createdAt: string;
  updatedAt: string;
}

const defaultWarehouse = {
  code: '',
  name: '',
  address: '',
  contactPerson: '',
  stockControlEnabled: false,
  requiresApproval: false,
  assignedUserIds: [] as string[]
};

const WarehouseManagement: FC = () => {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Dialog states
  const [openDialog, setOpenDialog] = useState(false);
  const [openUsersDialog, setOpenUsersDialog] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [formData, setFormData] = useState(defaultWarehouse);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [includeArchived, setIncludeArchived] = useState(false);

  useEffect(() => {
    fetchWarehouses();
    fetchUsers();
  }, [includeArchived]);

  const fetchWarehouses = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/management/warehouses?includeArchived=${includeArchived}`);
      setWarehouses(response.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch warehouses');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  const handleOpenDialog = (warehouse?: Warehouse) => {
    if (warehouse) {
      setEditingWarehouse(warehouse);
      setFormData({
        code: warehouse.code,
        name: warehouse.name,
        address: warehouse.address || '',
        contactPerson: warehouse.contactPerson || '',
        stockControlEnabled: warehouse.stockControlEnabled,
        requiresApproval: warehouse.requiresApproval,
        assignedUserIds: warehouse.assignedUsers.map(wu => wu.userId)
      });
    } else {
      setEditingWarehouse(null);
      setFormData(defaultWarehouse);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingWarehouse(null);
    setFormData(defaultWarehouse);
  };

  const handleOpenUsersDialog = (warehouse: Warehouse) => {
    setSelectedWarehouse(warehouse);
    setSelectedUsers(warehouse.assignedUsers.map(wu => wu.user));
    setOpenUsersDialog(true);
  };

  const handleCloseUsersDialog = () => {
    setOpenUsersDialog(false);
    setSelectedWarehouse(null);
    setSelectedUsers([]);
  };

  const handleSubmit = async () => {
    try {
      if (editingWarehouse) {
        await api.put(`/management/warehouses/${editingWarehouse.id}`, formData);
        setSuccess('Warehouse updated successfully');
      } else {
        await api.post('/management/warehouses', formData);
        setSuccess('Warehouse created successfully');
      }
      handleCloseDialog();
      fetchWarehouses();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save warehouse');
    }
  };

  const handleArchive = async (id: string, isArchived: boolean) => {
    try {
      if (isArchived) {
        await api.patch(`/management/warehouses/${id}/restore`);
        setSuccess('Warehouse restored successfully');
      } else {
        if (!window.confirm('Are you sure you want to archive this warehouse?')) {
          return;
        }
        await api.patch(`/management/warehouses/${id}/archive`);
        setSuccess('Warehouse archived successfully');
      }
      fetchWarehouses();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update warehouse');
    }
  };

  const handleUpdateUsers = async () => {
    if (!selectedWarehouse) return;

    try {
      const userIds = selectedUsers.map(u => u.id);
      await api.put(`/management/warehouses/${selectedWarehouse.id}/assigned-users`, { userIds });
      setSuccess('Assigned users updated successfully');
      handleCloseUsersDialog();
      fetchWarehouses();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update assigned users');
    }
  };

  const getUserDisplay = (user: User) => {
    const name = [user.firstName, user.lastName].filter(Boolean).join(' ');
    return name || user.email;
  };

  if (loading && warehouses.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 4 }}>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box display="flex" alignItems="center" gap={2}>
            <WarehouseIcon sx={{ fontSize: 40, color: 'primary.main' }} />
            <Typography variant="h4" component="h1" fontWeight="bold">
              Warehouse Management
            </Typography>
          </Box>
          <Box display="flex" gap={2} alignItems="center">
            <FormControlLabel
              control={
                <Switch
                  checked={includeArchived}
                  onChange={(e) => setIncludeArchived(e.target.checked)}
                />
              }
              label="Show Archived"
            />
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
            >
              Add Warehouse
            </Button>
          </Box>
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

        {/* Warehouses Table */}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Code</strong></TableCell>
                <TableCell><strong>Name</strong></TableCell>
                <TableCell><strong>Address</strong></TableCell>
                <TableCell><strong>Contact Person</strong></TableCell>
                <TableCell align="center"><strong>Stock Control</strong></TableCell>
                <TableCell align="center"><strong>Requires Approval</strong></TableCell>
                <TableCell align="center"><strong>Assigned Users</strong></TableCell>
                <TableCell align="center"><strong>Stock Items</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
                <TableCell align="center"><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {warehouses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      No warehouses found. Click "Add Warehouse" to create one.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                warehouses.map((warehouse) => (
                  <TableRow key={warehouse.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {warehouse.code}
                      </Typography>
                    </TableCell>
                    <TableCell>{warehouse.name}</TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {warehouse.address || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {warehouse.contactPerson || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={warehouse.stockControlEnabled ? 'Yes' : 'No'}
                        color={warehouse.stockControlEnabled ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={warehouse.requiresApproval ? 'Yes' : 'No'}
                        color={warehouse.requiresApproval ? 'warning' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Button
                        size="small"
                        startIcon={<PeopleIcon />}
                        onClick={() => handleOpenUsersDialog(warehouse)}
                      >
                        {warehouse.assignedUsers.length}
                      </Button>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2">
                        {warehouse._count.stock}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={warehouse.status}
                        color={warehouse.status === 'ACTIVE' ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Box display="flex" gap={1} justifyContent="center">
                        {warehouse.status === 'ACTIVE' && (
                          <IconButton
                            size="small"
                            onClick={() => handleOpenDialog(warehouse)}
                            color="primary"
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        )}
                        <IconButton
                          size="small"
                          onClick={() => handleArchive(warehouse.id, warehouse.status === 'ARCHIVED')}
                          color={warehouse.status === 'ARCHIVED' ? 'success' : 'warning'}
                        >
                          {warehouse.status === 'ARCHIVED' ? (
                            <UnarchiveIcon fontSize="small" />
                          ) : (
                            <ArchiveIcon fontSize="small" />
                          )}
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Add/Edit Warehouse Dialog */}
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <DialogTitle>
            {editingWarehouse ? 'Edit Warehouse' : 'Add New Warehouse'}
          </DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="Warehouse Code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                required
                fullWidth
                helperText="Unique identifier (e.g., WH-001)"
              />
              <TextField
                label="Warehouse Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                fullWidth
              />
              <TextField
                label="Address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                fullWidth
                multiline
                rows={2}
              />
              <TextField
                label="Contact Person"
                value={formData.contactPerson}
                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                fullWidth
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.stockControlEnabled}
                    onChange={(e) => setFormData({ ...formData, stockControlEnabled: e.target.checked })}
                  />
                }
                label="Enable Stock Control"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.requiresApproval}
                    onChange={(e) => setFormData({ ...formData, requiresApproval: e.target.checked })}
                  />
                }
                label="Require Transfer Approval"
              />
              <Autocomplete
                multiple
                options={users}
                value={users.filter(u => formData.assignedUserIds?.includes(u.id))}
                onChange={(_, newValue) => setFormData({ ...formData, assignedUserIds: newValue.map(u => u.id) })}
                getOptionLabel={(user) => getUserDisplay(user)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Assigned Users"
                    placeholder="Select users..."
                    helperText="Users will receive notifications for approvals and low stock alerts"
                  />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((user, index) => (
                    <Chip
                      label={getUserDisplay(user)}
                      {...getTagProps({ index })}
                      size="small"
                    />
                  ))
                }
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              variant="contained"
              disabled={!formData.code || !formData.name}
            >
              {editingWarehouse ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Assign Users Dialog */}
        <Dialog open={openUsersDialog} onClose={handleCloseUsersDialog} maxWidth="sm" fullWidth>
          <DialogTitle>
            Assign Users to {selectedWarehouse?.name}
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Assigned users will receive notifications for pending approvals and low stock alerts from this warehouse.
            </Typography>
            <Autocomplete
              multiple
              options={users}
              value={selectedUsers}
              onChange={(_, newValue) => setSelectedUsers(newValue)}
              getOptionLabel={(user) => getUserDisplay(user)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select Users"
                  placeholder="Search users..."
                />
              )}
              renderTags={(value, getTagProps) =>
                value.map((user, index) => (
                  <Chip
                    label={getUserDisplay(user)}
                    {...getTagProps({ index })}
                    size="small"
                  />
                ))
              }
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseUsersDialog}>Cancel</Button>
            <Button onClick={handleUpdateUsers} variant="contained">
              Update
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default WarehouseManagement;
