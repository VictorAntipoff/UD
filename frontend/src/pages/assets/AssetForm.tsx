import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  MenuItem,
  Grid,
  IconButton,
  Divider,
  CircularProgress
} from '@mui/material';
import { ArrowBack as BackIcon, Save as SaveIcon } from '@mui/icons-material';
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../lib/api';

const AssetForm = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = id && id !== 'new';
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    assetTag: '',
    name: '',
    description: '',
    categoryId: '',
    brand: '',
    modelNumber: '',
    serialNumber: '',
    location: '',
    status: 'ACTIVE',
    purchaseDate: new Date().toISOString().split('T')[0],
    purchasePrice: '',
    supplier: '',
    invoiceNumber: '',
    warrantyStartDate: '',
    warrantyEndDate: '',
    warrantyTerms: '',
    depreciationMethod: 'STRAIGHT_LINE',
    usefulLifeYears: '',
    salvageValue: '0'
  });

  useEffect(() => {
    fetchCategories();
    if (isEdit) fetchAsset();
  }, [id]);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/assets/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchAsset = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/assets/${id}`);
      const asset = response.data;

      setFormData({
        assetTag: asset.assetTag,
        name: asset.name,
        description: asset.description || '',
        categoryId: asset.categoryId,
        brand: asset.brand || '',
        modelNumber: asset.modelNumber || '',
        serialNumber: asset.serialNumber || '',
        location: asset.location || '',
        status: asset.status,
        purchaseDate: asset.purchaseDate.split('T')[0],
        purchasePrice: asset.purchasePrice.toString(),
        supplier: asset.supplier || '',
        invoiceNumber: asset.invoiceNumber || '',
        warrantyStartDate: asset.warrantyStartDate ? asset.warrantyStartDate.split('T')[0] : '',
        warrantyEndDate: asset.warrantyEndDate ? asset.warrantyEndDate.split('T')[0] : '',
        warrantyTerms: asset.warrantyTerms || '',
        depreciationMethod: asset.depreciationMethod,
        usefulLifeYears: asset.usefulLifeYears?.toString() || '',
        salvageValue: asset.salvageValue?.toString() || '0'
      });
    } catch (error) {
      console.error('Error fetching asset:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = {
        ...formData,
        purchasePrice: parseFloat(formData.purchasePrice),
        salvageValue: parseFloat(formData.salvageValue),
        usefulLifeYears: formData.usefulLifeYears ? parseFloat(formData.usefulLifeYears) : null,
        warrantyStartDate: formData.warrantyStartDate || null,
        warrantyEndDate: formData.warrantyEndDate || null
      };

      if (isEdit) {
        await api.patch(`/assets/${id}`, data);
      } else {
        await api.post('/assets', data);
      }

      navigate('/assets');
    } catch (error) {
      console.error('Error saving asset:', error);
      alert('Failed to save asset. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const textFieldSx = {
    '& .MuiOutlinedInput-root': {
      fontSize: '0.875rem',
      '& fieldset': { borderColor: '#e2e8f0' },
      '&:hover fieldset': { borderColor: '#dc2626' },
      '&.Mui-focused fieldset': { borderColor: '#dc2626' }
    },
    '& .MuiInputLabel-root': {
      fontSize: '0.875rem',
      '&.Mui-focused': { color: '#dc2626' }
    },
    '& .MuiFormHelperText-root': { fontSize: '0.75rem' }
  };

  if (loading && isEdit) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress sx={{ color: '#dc2626' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2, backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <IconButton onClick={() => navigate('/assets')} sx={{ color: '#64748b', p: 0.5 }}>
          <BackIcon fontSize="small" />
        </IconButton>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b', fontSize: '1.125rem' }}>
            {isEdit ? 'Edit Asset' : 'Add New Asset'}
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.75rem' }}>
            {isEdit ? 'Update asset information' : 'Fill in the asset details below'}
          </Typography>
        </Box>
      </Box>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Paper elevation={0} sx={{ p: 2, border: '1px solid #e2e8f0', mb: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5, color: '#1e293b', fontSize: '0.9375rem' }}>
            Basic Information
          </Typography>
          <Grid container spacing={1.5}>
            <Grid item xs={12} md={6}>
              <TextField
                required
                fullWidth
                label="Asset Tag"
                value={formData.assetTag}
                onChange={(e) => handleChange('assetTag', e.target.value)}
                helperText="Unique identifier for this asset"
                sx={textFieldSx}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                required
                fullWidth
                label="Asset Name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                sx={textFieldSx}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Description"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                sx={textFieldSx}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                required
                select
                fullWidth
                label="Category"
                value={formData.categoryId}
                onChange={(e) => handleChange('categoryId', e.target.value)}
                sx={textFieldSx}
              >
                {categories.map((cat) => (
                  <MenuItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                select
                fullWidth
                label="Status"
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value)}
                sx={textFieldSx}
              >
                <MenuItem value="ACTIVE">Active</MenuItem>
                <MenuItem value="IN_MAINTENANCE">In Maintenance</MenuItem>
                <MenuItem value="BROKEN">Broken</MenuItem>
                <MenuItem value="DISPOSED">Disposed</MenuItem>
                <MenuItem value="RETIRED">Retired</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Brand"
                value={formData.brand}
                onChange={(e) => handleChange('brand', e.target.value)}
                sx={textFieldSx}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Model Number"
                value={formData.modelNumber}
                onChange={(e) => handleChange('modelNumber', e.target.value)}
                sx={textFieldSx}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Serial Number"
                value={formData.serialNumber}
                onChange={(e) => handleChange('serialNumber', e.target.value)}
                sx={textFieldSx}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Location / Department"
                value={formData.location}
                onChange={(e) => handleChange('location', e.target.value)}
                sx={textFieldSx}
              />
            </Grid>
          </Grid>
        </Paper>

        <Paper elevation={0} sx={{ p: 2, border: '1px solid #e2e8f0', mb: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5, color: '#1e293b', fontSize: '0.9375rem' }}>
            Purchase Information
          </Typography>
          <Grid container spacing={1.5}>
            <Grid item xs={12} md={6}>
              <TextField
                required
                fullWidth
                type="date"
                label="Purchase Date"
                value={formData.purchaseDate}
                onChange={(e) => handleChange('purchaseDate', e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={textFieldSx}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                required
                fullWidth
                type="number"
                label="Purchase Price (TZS)"
                value={formData.purchasePrice}
                onChange={(e) => handleChange('purchasePrice', e.target.value)}
                inputProps={{ min: 0, step: 0.01 }}
                sx={textFieldSx}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Supplier"
                value={formData.supplier}
                onChange={(e) => handleChange('supplier', e.target.value)}
                sx={textFieldSx}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Invoice Number"
                value={formData.invoiceNumber}
                onChange={(e) => handleChange('invoiceNumber', e.target.value)}
                sx={textFieldSx}
              />
            </Grid>
          </Grid>
        </Paper>

        <Paper elevation={0} sx={{ p: 2, border: '1px solid #e2e8f0', mb: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5, color: '#1e293b', fontSize: '0.9375rem' }}>
            Warranty Information
          </Typography>
          <Grid container spacing={1.5}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="date"
                label="Warranty Start Date"
                value={formData.warrantyStartDate}
                onChange={(e) => handleChange('warrantyStartDate', e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={textFieldSx}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="date"
                label="Warranty End Date"
                value={formData.warrantyEndDate}
                onChange={(e) => handleChange('warrantyEndDate', e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={textFieldSx}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Warranty Terms"
                value={formData.warrantyTerms}
                onChange={(e) => handleChange('warrantyTerms', e.target.value)}
                sx={textFieldSx}
              />
            </Grid>
          </Grid>
        </Paper>

        <Paper elevation={0} sx={{ p: 2, border: '1px solid #e2e8f0', mb: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5, color: '#1e293b', fontSize: '0.9375rem' }}>
            Depreciation Settings
          </Typography>
          <Grid container spacing={1.5}>
            <Grid item xs={12} md={4}>
              <TextField
                select
                fullWidth
                label="Depreciation Method"
                value={formData.depreciationMethod}
                onChange={(e) => handleChange('depreciationMethod', e.target.value)}
                sx={textFieldSx}
              >
                <MenuItem value="STRAIGHT_LINE">Straight Line</MenuItem>
                <MenuItem value="DECLINING_BALANCE">Declining Balance</MenuItem>
                <MenuItem value="NONE">None</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="Useful Life (Years)"
                value={formData.usefulLifeYears}
                onChange={(e) => handleChange('usefulLifeYears', e.target.value)}
                inputProps={{ min: 0, step: 0.5 }}
                helperText="Expected lifespan of the asset"
                sx={textFieldSx}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="Salvage Value (TZS)"
                value={formData.salvageValue}
                onChange={(e) => handleChange('salvageValue', e.target.value)}
                inputProps={{ min: 0, step: 0.01 }}
                helperText="Residual value at end of life"
                sx={textFieldSx}
              />
            </Grid>
          </Grid>

          {formData.depreciationMethod === 'STRAIGHT_LINE' && formData.usefulLifeYears && formData.purchasePrice && (
            <Box sx={{ mt: 2, p: 1.5, backgroundColor: '#f8fafc', borderRadius: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 600, mb: 1, color: '#1e293b', fontSize: '0.8125rem', display: 'block' }}>
                Depreciation Preview
              </Typography>
              <Grid container spacing={1.5}>
                <Grid item xs={12} md={4}>
                  <Typography variant="caption" sx={{ color: '#64748b', display: 'block', fontSize: '0.6875rem' }}>
                    Depreciable Amount
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8125rem' }}>
                    {new Intl.NumberFormat('en-TZ', {
                      style: 'currency',
                      currency: 'TZS',
                      minimumFractionDigits: 0
                    }).format(parseFloat(formData.purchasePrice) - parseFloat(formData.salvageValue))}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="caption" sx={{ color: '#64748b', display: 'block', fontSize: '0.6875rem' }}>
                    Depreciation per Month
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#ef4444', fontSize: '0.8125rem' }}>
                    {new Intl.NumberFormat('en-TZ', {
                      style: 'currency',
                      currency: 'TZS',
                      minimumFractionDigits: 0
                    }).format(
                      (parseFloat(formData.purchasePrice) - parseFloat(formData.salvageValue)) /
                        (parseFloat(formData.usefulLifeYears) * 12)
                    )}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="caption" sx={{ color: '#64748b', display: 'block', fontSize: '0.6875rem' }}>
                    Depreciation per Year
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#ef4444', fontSize: '0.8125rem' }}>
                    {new Intl.NumberFormat('en-TZ', {
                      style: 'currency',
                      currency: 'TZS',
                      minimumFractionDigits: 0
                    }).format(
                      (parseFloat(formData.purchasePrice) - parseFloat(formData.salvageValue)) /
                        parseFloat(formData.usefulLifeYears)
                    )}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          )}
        </Paper>

        {/* Submit Buttons */}
        <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'flex-end' }}>
          <Button
            variant="outlined"
            onClick={() => navigate('/assets')}
            disabled={loading}
            size="small"
            sx={{
              borderColor: '#e2e8f0',
              color: '#64748b',
              fontSize: '0.8125rem',
              textTransform: 'none',
              '&:hover': { borderColor: '#cbd5e1', backgroundColor: '#f8fafc' }
            }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            size="small"
            startIcon={loading ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <SaveIcon fontSize="small" />}
            disabled={loading}
            sx={{
              backgroundColor: '#dc2626',
              '&:hover': { backgroundColor: '#b91c1c' },
              minWidth: 100,
              fontSize: '0.8125rem',
              textTransform: 'none'
            }}
          >
            {loading ? 'Saving...' : isEdit ? 'Update Asset' : 'Create Asset'}
          </Button>
        </Box>
      </form>
    </Box>
  );
};

export default AssetForm;
