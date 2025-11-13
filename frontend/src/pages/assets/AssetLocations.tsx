import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardContent,
  Grid,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  LocationOn as LocationIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';

const AssetLocations = () => {
  const navigate = useNavigate();
  const [locations, setLocations] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<any>(null);
  const [locationForm, setLocationForm] = useState({
    name: '',
    code: '',
    type: 'WAREHOUSE',
    address: '',
    description: '',
    contactPerson: '',
    contactPhone: '',
    isActive: true
  });

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      const response = await api.get('/assets/locations');
      setLocations(response.data);
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  const handleOpenDialog = (location?: any) => {
    if (location) {
      setEditingLocation(location);
      setLocationForm({
        name: location.name,
        code: location.code,
        type: location.type,
        address: location.address || '',
        description: location.description || '',
        contactPerson: location.contactPerson || '',
        contactPhone: location.contactPhone || '',
        isActive: location.isActive
      });
    } else {
      setEditingLocation(null);
      setLocationForm({
        name: '',
        code: '',
        type: 'WAREHOUSE',
        address: '',
        description: '',
        contactPerson: '',
        contactPhone: '',
        isActive: true
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingLocation(null);
    setLocationForm({
      name: '',
      code: '',
      type: 'WAREHOUSE',
      address: '',
      description: '',
      contactPerson: '',
      contactPhone: '',
      isActive: true
    });
  };

  const handleSaveLocation = async () => {
    try {
      if (editingLocation) {
        await api.patch(`/assets/locations/${editingLocation.id}`, locationForm);
      } else {
        await api.post('/assets/locations', locationForm);
      }
      handleCloseDialog();
      fetchLocations();
    } catch (error: any) {
      console.error('Error saving location:', error);
      alert(error.response?.data?.error || 'Failed to save location');
    }
  };

  const handleDeleteLocation = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this location?')) return;

    try {
      await api.delete(`/assets/locations/${id}`);
      fetchLocations();
    } catch (error: any) {
      console.error('Error deleting location:', error);
      alert(error.response?.data?.error || 'Failed to delete location');
    }
  };

  const getLocationTypeColor = (type: string) => {
    const colors: any = {
      WAREHOUSE: '#3b82f6',
      OFFICE: '#10b981',
      PROJECT: '#f59e0b',
      SITE: '#8b5cf6',
      WORKSHOP: '#ef4444',
      STORAGE: '#6366f1',
      OTHER: '#64748b'
    };
    return colors[type] || '#64748b';
  };

  const fieldSx = {
    '& .MuiOutlinedInput-root': {
      fontSize: '0.875rem',
      '& fieldset': { borderColor: '#e2e8f0' },
      '&:hover fieldset': { borderColor: '#dc2626' },
      '&.Mui-focused fieldset': { borderColor: '#dc2626' }
    },
    '& .MuiInputLabel-root': {
      fontSize: '0.875rem',
      '&.Mui-focused': { color: '#dc2626' }
    }
  };

  const activeLocations = locations.filter(l => l.isActive);
  const inactiveLocations = locations.filter(l => !l.isActive);
  const totalAssets = locations.reduce((sum, l) => sum + (l._count?.assets || 0), 0);

  return (
    <Box sx={{ p: 3, backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocationIcon sx={{ color: '#dc2626' }} />
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b' }}>
              Asset Locations
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            sx={{
              backgroundColor: '#dc2626',
              '&:hover': { backgroundColor: '#b91c1c' },
              textTransform: 'none',
              fontSize: '0.875rem'
            }}
          >
            Add Location
          </Button>
        </Box>
        <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.875rem' }}>
          Manage physical locations, offices, warehouses, and project sites for asset tracking
        </Typography>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ border: '1px solid #e2e8f0' }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.75rem', mb: 0.5 }}>
                Total Locations
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b' }}>
                {locations.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ border: '1px solid #e2e8f0' }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.75rem', mb: 0.5 }}>
                Active Locations
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#10b981' }}>
                {activeLocations.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ border: '1px solid #e2e8f0' }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.75rem', mb: 0.5 }}>
                Inactive Locations
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#f59e0b' }}>
                {inactiveLocations.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ border: '1px solid #e2e8f0' }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.75rem', mb: 0.5 }}>
                Total Assets
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#dc2626' }}>
                {totalAssets}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Locations Table */}
      <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2 }}>
        <Box sx={{ p: 2, borderBottom: '1px solid #e2e8f0' }}>
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b', fontSize: '1rem' }}>
            All Locations
          </Typography>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f8fafc' }}>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Code</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Address</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Contact</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Assets</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', textAlign: 'center' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {locations.map((location) => (
                <TableRow key={location.id} hover>
                  <TableCell sx={{ fontSize: '0.875rem', fontWeight: 600 }}>
                    {location.name}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={location.code}
                      size="small"
                      sx={{
                        backgroundColor: '#fef2f2',
                        color: '#dc2626',
                        fontSize: '0.75rem',
                        fontWeight: 700
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={location.type}
                      size="small"
                      sx={{
                        backgroundColor: `${getLocationTypeColor(location.type)}15`,
                        color: getLocationTypeColor(location.type),
                        fontSize: '0.75rem',
                        fontWeight: 600
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.875rem', color: '#64748b', maxWidth: 200 }}>
                    {location.address || '-'}
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.875rem', color: '#64748b' }}>
                    {location.contactPerson && (
                      <Box>
                        <Typography sx={{ fontSize: '0.875rem', fontWeight: 500 }}>
                          {location.contactPerson}
                        </Typography>
                        {location.contactPhone && (
                          <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                            {location.contactPhone}
                          </Typography>
                        )}
                      </Box>
                    )}
                    {!location.contactPerson && '-'}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={location._count?.assets || 0}
                      size="small"
                      sx={{
                        backgroundColor: '#f1f5f9',
                        color: '#475569',
                        fontSize: '0.75rem',
                        fontWeight: 600
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={location.isActive ? 'Active' : 'Inactive'}
                      size="small"
                      sx={{
                        backgroundColor: location.isActive ? '#dcfce7' : '#fee2e2',
                        color: location.isActive ? '#16a34a' : '#dc2626',
                        fontSize: '0.75rem',
                        fontWeight: 600
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ textAlign: 'center' }}>
                    <IconButton
                      size="small"
                      onClick={() => navigate(`/assets/locations/${location.id}`)}
                      sx={{ color: '#3b82f6' }}
                      title="View Details"
                    >
                      <ViewIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDialog(location)}
                      sx={{ color: '#f59e0b' }}
                      title="Edit"
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteLocation(location.id)}
                      sx={{ color: '#ef4444' }}
                      title="Delete"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {locations.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} sx={{ textAlign: 'center', py: 4 }}>
                    <Typography sx={{ color: '#94a3b8', fontSize: '0.875rem' }}>
                      No locations found. Add your first location to get started.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Location Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 600, color: '#1e293b' }}>
          {editingLocation ? 'Edit Location' : 'Add New Location'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={8}>
                <TextField
                  required
                  fullWidth
                  label="Location Name"
                  value={locationForm.name}
                  onChange={(e) => setLocationForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Main Warehouse, Office Building A"
                  sx={fieldSx}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  required
                  fullWidth
                  label="Location Code"
                  value={locationForm.code}
                  onChange={(e) => setLocationForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  placeholder="e.g., WH-01"
                  inputProps={{ maxLength: 20 }}
                  sx={fieldSx}
                />
              </Grid>
            </Grid>

            <FormControl fullWidth sx={fieldSx}>
              <InputLabel>Location Type</InputLabel>
              <Select
                value={locationForm.type}
                onChange={(e) => setLocationForm(prev => ({ ...prev, type: e.target.value }))}
                label="Location Type"
              >
                <MenuItem value="WAREHOUSE">Warehouse</MenuItem>
                <MenuItem value="OFFICE">Office</MenuItem>
                <MenuItem value="PROJECT">Project Site</MenuItem>
                <MenuItem value="SITE">Site</MenuItem>
                <MenuItem value="WORKSHOP">Workshop</MenuItem>
                <MenuItem value="STORAGE">Storage</MenuItem>
                <MenuItem value="OTHER">Other</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              multiline
              rows={2}
              label="Address"
              value={locationForm.address}
              onChange={(e) => setLocationForm(prev => ({ ...prev, address: e.target.value }))}
              placeholder="Full address of the location"
              sx={fieldSx}
            />

            <TextField
              fullWidth
              multiline
              rows={3}
              label="Description"
              value={locationForm.description}
              onChange={(e) => setLocationForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Additional details about this location"
              sx={fieldSx}
            />

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Contact Person"
                  value={locationForm.contactPerson}
                  onChange={(e) => setLocationForm(prev => ({ ...prev, contactPerson: e.target.value }))}
                  placeholder="Site manager or contact"
                  sx={fieldSx}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Contact Phone"
                  value={locationForm.contactPhone}
                  onChange={(e) => setLocationForm(prev => ({ ...prev, contactPhone: e.target.value }))}
                  placeholder="+255 xxx xxx xxx"
                  sx={fieldSx}
                />
              </Grid>
            </Grid>

            <FormControl fullWidth sx={fieldSx}>
              <InputLabel>Status</InputLabel>
              <Select
                value={locationForm.isActive ? 'true' : 'false'}
                onChange={(e) => setLocationForm(prev => ({ ...prev, isActive: e.target.value === 'true' }))}
                label="Status"
              >
                <MenuItem value="true">Active</MenuItem>
                <MenuItem value="false">Inactive</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={handleCloseDialog}
            sx={{
              color: '#64748b',
              textTransform: 'none'
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSaveLocation}
            variant="contained"
            disabled={!locationForm.name || !locationForm.code}
            sx={{
              backgroundColor: '#dc2626',
              '&:hover': { backgroundColor: '#b91c1c' },
              textTransform: 'none'
            }}
          >
            {editingLocation ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AssetLocations;
