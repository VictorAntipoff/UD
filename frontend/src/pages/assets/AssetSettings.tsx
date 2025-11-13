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
  Chip
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Category as CategoryIcon,
  Settings as SettingsIcon,
  LocationOn as LocationIcon,
  ArrowForward as ArrowIcon,
  Business as SupplierIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import React, { useState, useEffect } from 'react';
import api from '../../lib/api';

const AssetSettings = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<any[]>([]);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    code: '',
    description: '',
    parentId: ''
  });
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    code: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    website: '',
    notes: '',
    isActive: true
  });
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetchCategories();
    fetchSuppliers();
    fetchStats();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/assets/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/assets/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleOpenDialog = (category?: any, parentCategory?: any) => {
    if (category) {
      setEditingCategory(category);
      setCategoryForm({
        name: category.name,
        code: category.code || '',
        description: category.description || '',
        parentId: category.parentId || ''
      });
    } else {
      setEditingCategory(null);
      setCategoryForm({
        name: '',
        code: '',
        description: '',
        parentId: parentCategory?.id || ''
      });
    }
    setCategoryDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setCategoryDialogOpen(false);
    setEditingCategory(null);
    setCategoryForm({ name: '', code: '', description: '', parentId: '' });
  };

  const handleSaveCategory = async () => {
    try {
      if (editingCategory) {
        await api.patch(`/assets/categories/${editingCategory.id}`, categoryForm);
      } else {
        await api.post('/assets/categories', categoryForm);
      }
      handleCloseDialog();
      fetchCategories();
      fetchStats();
    } catch (error) {
      console.error('Error saving category:', error);
      alert('Failed to save category');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;

    try {
      await api.delete(`/assets/categories/${id}`);
      fetchCategories();
      fetchStats();
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Cannot delete category with existing assets');
    }
  };

  // Supplier handlers
  const fetchSuppliers = async () => {
    try {
      const response = await api.get('/assets/suppliers');
      setSuppliers(response.data);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  };

  const handleOpenSupplierDialog = (supplier?: any) => {
    if (supplier) {
      setEditingSupplier(supplier);
      setSupplierForm({
        name: supplier.name,
        code: supplier.code || '',
        contactPerson: supplier.contactPerson || '',
        email: supplier.email || '',
        phone: supplier.phone || '',
        address: supplier.address || '',
        website: supplier.website || '',
        notes: supplier.notes || '',
        isActive: supplier.isActive !== false
      });
    } else {
      setEditingSupplier(null);
      setSupplierForm({
        name: '',
        code: '',
        contactPerson: '',
        email: '',
        phone: '',
        address: '',
        website: '',
        notes: '',
        isActive: true
      });
    }
    setSupplierDialogOpen(true);
  };

  const handleCloseSupplierDialog = () => {
    setSupplierDialogOpen(false);
    setEditingSupplier(null);
    setSupplierForm({
      name: '',
      code: '',
      contactPerson: '',
      email: '',
      phone: '',
      address: '',
      website: '',
      notes: '',
      isActive: true
    });
  };

  const handleSaveSupplier = async () => {
    try {
      if (editingSupplier) {
        await api.patch(`/assets/suppliers/${editingSupplier.id}`, supplierForm);
      } else {
        await api.post('/assets/suppliers', supplierForm);
      }
      handleCloseSupplierDialog();
      fetchSuppliers();
      fetchStats();
    } catch (error) {
      console.error('Error saving supplier:', error);
      alert('Failed to save supplier');
    }
  };

  const handleDeleteSupplier = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this supplier?')) return;

    try {
      await api.delete(`/assets/suppliers/${id}`);
      fetchSuppliers();
      fetchStats();
    } catch (error) {
      console.error('Error deleting supplier:', error);
      alert('Cannot delete supplier with existing assets');
    }
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

  return (
    <Box sx={{ p: 3, backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <SettingsIcon sx={{ color: '#dc2626' }} />
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b' }}>
            Asset Settings
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.875rem' }}>
          Manage asset categories and system configurations
        </Typography>
      </Box>

      {/* Quick Actions */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card
            elevation={0}
            sx={{
              border: '1px solid #e2e8f0',
              cursor: 'pointer',
              transition: 'all 0.2s',
              '&:hover': {
                borderColor: '#dc2626',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
              }
            }}
            onClick={() => navigate('/dashboard/assets/locations')}
          >
            <CardContent sx={{ p: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{
                  width: 48,
                  height: 48,
                  borderRadius: '12px',
                  backgroundColor: '#fef2f2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <LocationIcon sx={{ color: '#dc2626', fontSize: 24 }} />
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b', fontSize: '1rem' }}>
                    Asset Locations
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.75rem' }}>
                    Manage warehouses, offices, and project sites
                  </Typography>
                </Box>
              </Box>
              <ArrowIcon sx={{ color: '#94a3b8' }} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Stats Cards */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={0} sx={{ border: '1px solid #e2e8f0' }}>
              <CardContent sx={{ p: 2 }}>
                <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.75rem', mb: 0.5 }}>
                  Total Assets
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b' }}>
                  {stats.totalAssets}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={0} sx={{ border: '1px solid #e2e8f0' }}>
              <CardContent sx={{ p: 2 }}>
                <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.75rem', mb: 0.5 }}>
                  Categories
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#3b82f6' }}>
                  {stats.categories}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={0} sx={{ border: '1px solid #e2e8f0' }}>
              <CardContent sx={{ p: 2 }}>
                <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.75rem', mb: 0.5 }}>
                  Active Assets
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#10b981' }}>
                  {stats.activeAssets}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={0} sx={{ border: '1px solid #e2e8f0' }}>
              <CardContent sx={{ p: 2 }}>
                <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.75rem', mb: 0.5 }}>
                  Total Value
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#dc2626' }}>
                  {new Intl.NumberFormat('en-TZ', {
                    style: 'currency',
                    currency: 'TZS',
                    minimumFractionDigits: 0
                  }).format(stats.totalValue)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Categories Section */}
      <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2 }}>
        <Box sx={{ p: 2, borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CategoryIcon sx={{ color: '#dc2626' }} />
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b', fontSize: '1rem' }}>
              Asset Categories
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
            Add Category
          </Button>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f8fafc' }}>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Code</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Description</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Assets</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', textAlign: 'center' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {categories.filter(cat => !cat.parentId).map((category) => (
                <React.Fragment key={category.id}>
                  {/* Parent Category Row */}
                  <TableRow hover sx={{ backgroundColor: '#fafafa' }}>
                    <TableCell sx={{ fontSize: '0.875rem', fontWeight: 600 }}>
                      {category.name}
                      {category._count?.subcategories > 0 && (
                        <Chip
                          label={`${category._count.subcategories} sub`}
                          size="small"
                          sx={{ ml: 1, fontSize: '0.65rem', height: '18px' }}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={category.code || 'N/A'}
                        size="small"
                        sx={{
                          backgroundColor: '#fef2f2',
                          color: '#dc2626',
                          fontSize: '0.75rem',
                          fontWeight: 700
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.875rem', color: '#64748b' }}>
                      {category.description || '-'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={category._count?.assets || 0}
                        size="small"
                        sx={{
                          backgroundColor: '#f1f5f9',
                          color: '#475569',
                          fontSize: '0.75rem',
                          fontWeight: 600
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(null, category)}
                        sx={{ color: '#10b981' }}
                        title="Add Subcategory"
                      >
                        <AddIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(category)}
                        sx={{ color: '#f59e0b' }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteCategory(category.id)}
                        sx={{ color: '#ef4444' }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>

                  {/* Subcategory Rows */}
                  {categories.filter(sub => sub.parentId === category.id).map((subcategory) => (
                    <TableRow key={subcategory.id} hover>
                      <TableCell sx={{ fontSize: '0.875rem', fontWeight: 500, pl: 6 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: '#94a3b8' }} />
                          {subcategory.name}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={subcategory.code || 'N/A'}
                          size="small"
                          sx={{
                            backgroundColor: '#eff6ff',
                            color: '#1e40af',
                            fontSize: '0.75rem',
                            fontWeight: 600
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.875rem', color: '#64748b' }}>
                        {subcategory.description || '-'}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={subcategory._count?.assets || 0}
                          size="small"
                          sx={{
                            backgroundColor: '#f1f5f9',
                            color: '#475569',
                            fontSize: '0.75rem',
                            fontWeight: 600
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(subcategory)}
                          sx={{ color: '#f59e0b' }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteCategory(subcategory.id)}
                          sx={{ color: '#ef4444' }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </React.Fragment>
              ))}
              {categories.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} sx={{ textAlign: 'center', py: 4 }}>
                    <Typography sx={{ color: '#94a3b8', fontSize: '0.875rem' }}>
                      No categories found. Add your first category to get started.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Suppliers Section */}
      <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2, overflow: 'hidden', mb: 3 }}>
        <Box sx={{ p: 2, borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SupplierIcon sx={{ color: '#dc2626' }} />
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b', fontSize: '1rem' }}>
              Suppliers
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenSupplierDialog()}
            sx={{
              backgroundColor: '#dc2626',
              '&:hover': { backgroundColor: '#b91c1c' },
              textTransform: 'none',
              fontSize: '0.875rem'
            }}
          >
            Add Supplier
          </Button>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f8fafc' }}>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Code</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Contact Person</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Email</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Phone</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Assets</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', textAlign: 'center' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', textAlign: 'center' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {suppliers.map((supplier) => (
                <TableRow key={supplier.id} hover>
                  <TableCell sx={{ fontSize: '0.875rem', fontWeight: 600 }}>
                    {supplier.name}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={supplier.code || 'N/A'}
                      size="small"
                      sx={{
                        backgroundColor: '#fef2f2',
                        color: '#dc2626',
                        fontSize: '0.75rem',
                        fontWeight: 700
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.875rem', color: '#64748b' }}>
                    {supplier.contactPerson || '-'}
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.875rem', color: '#64748b' }}>
                    {supplier.email || '-'}
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.875rem', color: '#64748b' }}>
                    {supplier.phone || '-'}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={supplier._count?.assets || 0}
                      size="small"
                      sx={{
                        backgroundColor: '#f1f5f9',
                        color: '#475569',
                        fontSize: '0.75rem',
                        fontWeight: 600
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ textAlign: 'center' }}>
                    <Chip
                      label={supplier.isActive ? 'Active' : 'Inactive'}
                      size="small"
                      sx={{
                        backgroundColor: supplier.isActive ? '#dcfce7' : '#f1f5f9',
                        color: supplier.isActive ? '#15803d' : '#64748b',
                        fontSize: '0.75rem',
                        fontWeight: 600
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ textAlign: 'center' }}>
                    <IconButton
                      size="small"
                      onClick={() => handleOpenSupplierDialog(supplier)}
                      sx={{ color: '#f59e0b' }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteSupplier(supplier.id)}
                      sx={{ color: '#ef4444' }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {suppliers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} sx={{ textAlign: 'center', py: 4 }}>
                    <Typography sx={{ color: '#94a3b8', fontSize: '0.875rem' }}>
                      No suppliers found. Add your first supplier to get started.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Category Dialog */}
      <Dialog open={categoryDialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600, color: '#1e293b' }}>
          {editingCategory ? 'Edit Category' : 'Add New Category'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              required
              fullWidth
              label="Category Name"
              value={categoryForm.name}
              onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Hand Tools, Machinery"
              sx={fieldSx}
            />
            <FormControl fullWidth sx={fieldSx}>
              <InputLabel>Parent Category (Optional)</InputLabel>
              <Select
                value={categoryForm.parentId}
                onChange={(e) => setCategoryForm(prev => ({ ...prev, parentId: e.target.value }))}
                label="Parent Category (Optional)"
              >
                <MenuItem value="">
                  <em>None (Root Category)</em>
                </MenuItem>
                {categories.filter(cat => !cat.parentId).map((cat) => (
                  <MenuItem key={cat.id} value={cat.id}>
                    {cat.name} ({cat.code})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              required
              fullWidth
              label="Category Code"
              value={categoryForm.code}
              onChange={(e) => setCategoryForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
              placeholder="e.g., HT, MAC"
              helperText="Short code (2-4 characters) to identify this category"
              inputProps={{ maxLength: 10 }}
              sx={fieldSx}
            />
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Description"
              value={categoryForm.description}
              onChange={(e) => setCategoryForm(prev => ({ ...prev, description: e.target.value }))}
              sx={fieldSx}
            />
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
            onClick={handleSaveCategory}
            variant="contained"
            disabled={!categoryForm.name || !categoryForm.code}
            sx={{
              backgroundColor: '#dc2626',
              '&:hover': { backgroundColor: '#b91c1c' },
              textTransform: 'none'
            }}
          >
            {editingCategory ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Supplier Dialog */}
      <Dialog open={supplierDialogOpen} onClose={handleCloseSupplierDialog} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 600, color: '#1e293b' }}>
          {editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={8}>
                <TextField
                  required
                  fullWidth
                  label="Supplier Name"
                  value={supplierForm.name}
                  onChange={(e) => setSupplierForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., ABC Supplies Ltd"
                  sx={fieldSx}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Supplier Code"
                  value={supplierForm.code}
                  onChange={(e) => setSupplierForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  placeholder="e.g., ABC"
                  helperText="Short code (optional)"
                  inputProps={{ maxLength: 10 }}
                  sx={fieldSx}
                />
              </Grid>
            </Grid>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Contact Person"
                  value={supplierForm.contactPerson}
                  onChange={(e) => setSupplierForm(prev => ({ ...prev, contactPerson: e.target.value }))}
                  placeholder="John Doe"
                  sx={fieldSx}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={supplierForm.email}
                  onChange={(e) => setSupplierForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="contact@supplier.com"
                  sx={fieldSx}
                />
              </Grid>
            </Grid>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Phone"
                  value={supplierForm.phone}
                  onChange={(e) => setSupplierForm(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+255 XXX XXX XXX"
                  sx={fieldSx}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Website"
                  value={supplierForm.website}
                  onChange={(e) => setSupplierForm(prev => ({ ...prev, website: e.target.value }))}
                  placeholder="https://www.supplier.com"
                  sx={fieldSx}
                />
              </Grid>
            </Grid>

            <TextField
              fullWidth
              label="Address"
              value={supplierForm.address}
              onChange={(e) => setSupplierForm(prev => ({ ...prev, address: e.target.value }))}
              placeholder="Street, City, Country"
              sx={fieldSx}
            />

            <TextField
              fullWidth
              multiline
              rows={3}
              label="Notes"
              value={supplierForm.notes}
              onChange={(e) => setSupplierForm(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional information about the supplier"
              sx={fieldSx}
            />

            <FormControl fullWidth sx={fieldSx}>
              <InputLabel>Status</InputLabel>
              <Select
                value={supplierForm.isActive}
                onChange={(e) => setSupplierForm(prev => ({ ...prev, isActive: e.target.value as boolean }))}
                label="Status"
              >
                <MenuItem value={true as any}>Active</MenuItem>
                <MenuItem value={false as any}>Inactive</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={handleCloseSupplierDialog}
            sx={{
              color: '#64748b',
              textTransform: 'none'
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSaveSupplier}
            variant="contained"
            disabled={!supplierForm.name}
            sx={{
              backgroundColor: '#dc2626',
              '&:hover': { backgroundColor: '#b91c1c' },
              textTransform: 'none'
            }}
          >
            {editingSupplier ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AssetSettings;
