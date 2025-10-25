import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  MenuItem,
  Grid,
  IconButton,
  CircularProgress,
  Card,
  CardContent
} from '@mui/material';
import { ArrowBack as BackIcon, Save as SaveIcon, Search as SearchIcon, Upload as UploadIcon } from '@mui/icons-material';
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../lib/api';
import ProductSearchDialog from '../../components/ProductSearchDialog';
import AssetTagSelector from '../../components/AssetTagSelector';

const AssetForm = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = id && id !== 'new';
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [tagSelectorOpen, setTagSelectorOpen] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    assetTag: '',
    name: '',
    description: '',
    categoryId: '',
    imageUrl: '',
    brand: '',
    modelNumber: '',
    serialNumber: '',
    location: '',
    status: 'ACTIVE',
    purchaseDate: new Date().toISOString().split('T')[0],
    purchasePrice: '',
    supplier: '',
    invoiceNumber: '',
    warrantyDurationValue: '',
    warrantyDurationUnit: 'YEARS',
    warrantyStartDate: '',
    warrantyEndDate: '',
    warrantyTerms: '',
    warrantyProvider: '',
    lifespanValue: '',
    lifespanUnit: 'YEARS'
  });

  useEffect(() => {
    fetchCategories();
    if (isEdit) {
      fetchAsset();
    } else {
      // Fetch next asset tag for new assets
      fetchNextAssetTag();
    }
  }, [id]);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/assets/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchNextAssetTag = async () => {
    try {
      const response = await api.get('/assets/next-tag');
      setFormData(prev => ({ ...prev, assetTag: response.data.assetTag }));
    } catch (error) {
      console.error('Error fetching next asset tag:', error);
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
        imageUrl: asset.imageUrl || '',
        brand: asset.brand || '',
        modelNumber: asset.modelNumber || '',
        serialNumber: asset.serialNumber || '',
        location: asset.location || '',
        status: asset.status,
        purchaseDate: asset.purchaseDate.split('T')[0],
        purchasePrice: asset.purchasePrice.toString(),
        supplier: asset.supplier || '',
        invoiceNumber: asset.invoiceNumber || '',
        warrantyDurationValue: asset.warrantyDurationValue?.toString() || '',
        warrantyDurationUnit: asset.warrantyDurationUnit || 'YEARS',
        warrantyStartDate: asset.warrantyStartDate ? asset.warrantyStartDate.split('T')[0] : '',
        warrantyEndDate: asset.warrantyEndDate ? asset.warrantyEndDate.split('T')[0] : '',
        warrantyTerms: asset.warrantyTerms || '',
        warrantyProvider: asset.warrantyProvider || '',
        lifespanValue: asset.lifespanValue?.toString() || '',
        lifespanUnit: asset.lifespanUnit || 'YEARS'
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
      // Calculate warranty dates if duration is provided
      let warrantyStartDate = formData.warrantyStartDate;
      let warrantyEndDate = formData.warrantyEndDate;

      if (formData.warrantyDurationValue && formData.purchaseDate) {
        warrantyStartDate = formData.purchaseDate; // Start from purchase date

        const startDate = new Date(formData.purchaseDate);
        const duration = parseInt(formData.warrantyDurationValue);
        const endDate = new Date(startDate);

        if (formData.warrantyDurationUnit === 'YEARS') {
          endDate.setFullYear(endDate.getFullYear() + duration);
        } else {
          endDate.setMonth(endDate.getMonth() + duration);
        }

        warrantyEndDate = endDate.toISOString().split('T')[0];
      }

      const data = {
        ...formData,
        purchasePrice: parseFloat(formData.purchasePrice),
        lifespanValue: formData.lifespanValue ? parseInt(formData.lifespanValue) : null,
        warrantyDurationValue: formData.warrantyDurationValue ? parseInt(formData.warrantyDurationValue) : null,
        warrantyStartDate: warrantyStartDate || null,
        warrantyEndDate: warrantyEndDate || null
      };

      if (isEdit) {
        await api.patch(`/assets/${id}`, data);
      } else {
        await api.post('/assets', data);
      }

      navigate('/dashboard/assets');
    } catch (error) {
      console.error('Error saving asset:', error);
      alert('Failed to save asset. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };

      // Auto-generate asset name when category, brand, or model changes
      if (field === 'categoryId' || field === 'brand' || field === 'modelNumber') {
        const category = field === 'categoryId' ?
          categories.find(c => c.id === value)?.name || '' :
          categories.find(c => c.id === newData.categoryId)?.name || '';

        const brand = field === 'brand' ? value : newData.brand;
        const model = field === 'modelNumber' ? value : newData.modelNumber;

        // Generate name: Category - Brand - Model
        const parts = [category, brand, model].filter(p => p && p.trim());
        if (parts.length > 0) {
          newData.name = parts.join(' - ');
        }
      }

      return newData;
    });
  };

  const handleProductSelect = async (product: any) => {
    const titleParts = product.title.split(' ');
    const brand = titleParts[0] || '';

    setFormData(prev => ({
      ...prev,
      name: product.title,
      description: product.snippet || '',
      brand: brand,
      modelNumber: product.title.replace(brand, '').trim()
    }));

    if (product.image) {
      await handleDownloadProductImage(product.image);
    }
  };

  const handleDownloadProductImage = async (imageUrl: string) => {
    try {
      setUploadingImage(true);
      const category = categories.find(c => c.id === formData.categoryId);
      const categoryName = category?.name || 'Uncategorized';

      const response = await api.post('/assets/upload-image-url', {
        imageUrl,
        categoryName
      });

      if (response.data.success) {
        setFormData(prev => ({
          ...prev,
          imageUrl: response.data.imageUrl
        }));
      }
    } catch (error) {
      console.error('Error downloading product image:', error);
      alert('Failed to download product image. You can manually upload one.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      handleFileUpload(file);
    }
  };

  const handleFileUpload = async (file: File) => {
    try {
      setUploadingImage(true);
      const category = categories.find(c => c.id === formData.categoryId);
      const categoryName = category?.name || 'Uncategorized';

      const formDataToSend = new FormData();
      formDataToSend.append('file', file);
      formDataToSend.append('categoryName', categoryName);

      const response = await api.post('/assets/upload-image', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        setFormData(prev => ({
          ...prev,
          imageUrl: response.data.imageUrl
        }));
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setUploadingImage(false);
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

  if (loading && isEdit) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress sx={{ color: '#dc2626' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate('/dashboard/assets')} sx={{ color: '#64748b' }}>
            <BackIcon />
          </IconButton>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b' }}>
              {isEdit ? 'Edit Asset' : 'Add New Asset'}
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.875rem' }}>
              {isEdit ? 'Update asset information' : 'Fill in the asset details'}
            </Typography>
          </Box>
        </Box>
        {!isEdit && (
          <Button
            variant="outlined"
            startIcon={<SearchIcon />}
            onClick={() => setSearchDialogOpen(true)}
            sx={{
              borderColor: '#dc2626',
              color: '#dc2626',
              textTransform: 'none',
              fontSize: '0.875rem',
              display: { xs: 'none', sm: 'flex' },
              '&:hover': {
                borderColor: '#b91c1c',
                bgcolor: '#fef2f2'
              }
            }}
          >
            Search Product
          </Button>
        )}
      </Box>

      <form onSubmit={handleSubmit}>
        <Grid container spacing={2}>
          {/* Product Image Card */}
          <Grid item xs={12} md={4}>
            <Card elevation={0} sx={{ border: '1px solid #e2e8f0', height: '100%' }}>
              <CardContent sx={{ p: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: '#1e293b' }}>
                  Product Image
                </Typography>
                <Box sx={{ textAlign: 'center' }}>
                  {formData.imageUrl ? (
                    <Box sx={{ mb: 2, p: 2, border: '1px solid #e2e8f0', borderRadius: 2, backgroundColor: '#f8fafc' }}>
                      <img
                        src={formData.imageUrl}
                        alt="Product"
                        style={{
                          maxWidth: '100%',
                          maxHeight: '200px',
                          objectFit: 'contain',
                          borderRadius: '8px'
                        }}
                      />
                    </Box>
                  ) : (
                    <Box sx={{ mb: 2, p: 4, border: '2px dashed #e2e8f0', borderRadius: 2, backgroundColor: '#f8fafc' }}>
                      <UploadIcon sx={{ fontSize: 48, color: '#cbd5e1', mb: 1 }} />
                      <Typography variant="body2" sx={{ color: '#94a3b8', fontSize: '0.8125rem' }}>
                        No image uploaded
                      </Typography>
                    </Box>
                  )}
                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={<UploadIcon />}
                    disabled={uploadingImage}
                    fullWidth
                    size="small"
                    sx={{
                      borderColor: '#dc2626',
                      color: '#dc2626',
                      textTransform: 'none',
                      fontSize: '0.8125rem',
                      '&:hover': {
                        borderColor: '#b91c1c',
                        bgcolor: '#fef2f2'
                      }
                    }}
                  >
                    {uploadingImage ? 'Uploading...' : 'Upload Image'}
                    <input type="file" hidden accept="image/*" onChange={handleFileSelect} />
                  </Button>
                  {uploadingImage && (
                    <Box sx={{ mt: 1 }}>
                      <CircularProgress size={20} sx={{ color: '#dc2626' }} />
                    </Box>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Basic Information Card */}
          <Grid item xs={12} md={8}>
            <Card elevation={0} sx={{ border: '1px solid #e2e8f0' }}>
              <CardContent sx={{ p: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: '#1e293b' }}>
                  Basic Information
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Box>
                      <TextField
                        required
                        fullWidth
                        size="small"
                        label="Asset Tag"
                        value={formData.assetTag}
                        onChange={(e) => handleChange('assetTag', e.target.value.toUpperCase())}
                        placeholder="UD-0000"
                        helperText="Auto-generated format: UD-0000"
                        sx={fieldSx}
                      />
                      <Button
                        size="small"
                        variant="text"
                        onClick={() => setTagSelectorOpen(true)}
                        sx={{
                          mt: 0.5,
                          color: '#dc2626',
                          textTransform: 'none',
                          fontSize: '0.75rem',
                          '&:hover': { backgroundColor: '#fef2f2' }
                        }}
                      >
                        Select from available tags
                      </Button>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      required
                      select
                      fullWidth
                      size="small"
                      label="Category"
                      value={formData.categoryId}
                      onChange={(e) => handleChange('categoryId', e.target.value)}
                      sx={fieldSx}
                    >
                      {categories.map((cat) => (
                        <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      required
                      fullWidth
                      size="small"
                      label="Asset Name"
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      sx={fieldSx}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      size="small"
                      multiline
                      rows={2}
                      label="Description"
                      value={formData.description}
                      onChange={(e) => handleChange('description', e.target.value)}
                      sx={fieldSx}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Brand"
                      value={formData.brand}
                      onChange={(e) => handleChange('brand', e.target.value)}
                      sx={fieldSx}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Model Number"
                      value={formData.modelNumber}
                      onChange={(e) => handleChange('modelNumber', e.target.value)}
                      sx={fieldSx}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Serial Number"
                      value={formData.serialNumber}
                      onChange={(e) => handleChange('serialNumber', e.target.value)}
                      sx={fieldSx}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Location"
                      value={formData.location}
                      onChange={(e) => handleChange('location', e.target.value)}
                      sx={fieldSx}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      select
                      fullWidth
                      size="small"
                      label="Status"
                      value={formData.status}
                      onChange={(e) => handleChange('status', e.target.value)}
                      sx={fieldSx}
                    >
                      <MenuItem value="ACTIVE">Active</MenuItem>
                      <MenuItem value="IN_MAINTENANCE">In Maintenance</MenuItem>
                      <MenuItem value="BROKEN">Broken</MenuItem>
                      <MenuItem value="DISPOSED">Disposed</MenuItem>
                      <MenuItem value="RETIRED">Retired</MenuItem>
                    </TextField>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Purchase Information Card */}
          <Grid item xs={12} md={6}>
            <Card elevation={0} sx={{ border: '1px solid #e2e8f0' }}>
              <CardContent sx={{ p: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: '#1e293b' }}>
                  Purchase Information
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      required
                      fullWidth
                      size="small"
                      type="date"
                      label="Purchase Date"
                      value={formData.purchaseDate}
                      onChange={(e) => handleChange('purchaseDate', e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      sx={fieldSx}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      required
                      fullWidth
                      size="small"
                      type="number"
                      label="Purchase Price (TZS)"
                      value={formData.purchasePrice}
                      onChange={(e) => handleChange('purchasePrice', e.target.value)}
                      inputProps={{ min: 0, step: 0.01 }}
                      sx={fieldSx}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Supplier"
                      value={formData.supplier}
                      onChange={(e) => handleChange('supplier', e.target.value)}
                      sx={fieldSx}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Invoice Number"
                      value={formData.invoiceNumber}
                      onChange={(e) => handleChange('invoiceNumber', e.target.value)}
                      sx={fieldSx}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Warranty & Lifespan Card */}
          <Grid item xs={12} md={6}>
            <Card elevation={0} sx={{ border: '1px solid #e2e8f0' }}>
              <CardContent sx={{ p: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: '#1e293b' }}>
                  Warranty & Lifespan
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Warranty Provider / Supplier"
                      value={formData.warrantyProvider}
                      onChange={(e) => handleChange('warrantyProvider', e.target.value)}
                      placeholder="e.g., Manufacturer, Retailer, Third-party"
                      sx={fieldSx}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      size="small"
                      type="number"
                      label="Warranty Duration"
                      value={formData.warrantyDurationValue}
                      onChange={(e) => handleChange('warrantyDurationValue', e.target.value)}
                      inputProps={{ min: 1 }}
                      helperText="Warranty starts from purchase date"
                      sx={fieldSx}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      select
                      fullWidth
                      size="small"
                      label="Duration Unit"
                      value={formData.warrantyDurationUnit}
                      onChange={(e) => handleChange('warrantyDurationUnit', e.target.value)}
                      sx={fieldSx}
                    >
                      <MenuItem value="YEARS">Years</MenuItem>
                      <MenuItem value="MONTHS">Months</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      size="small"
                      type="number"
                      label="Expected Lifespan"
                      value={formData.lifespanValue}
                      onChange={(e) => handleChange('lifespanValue', e.target.value)}
                      inputProps={{ min: 1 }}
                      sx={fieldSx}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      select
                      fullWidth
                      size="small"
                      label="Unit"
                      value={formData.lifespanUnit}
                      onChange={(e) => handleChange('lifespanUnit', e.target.value)}
                      sx={fieldSx}
                    >
                      <MenuItem value="YEARS">Years</MenuItem>
                      <MenuItem value="MONTHS">Months</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      size="small"
                      multiline
                      rows={2}
                      label="Warranty Terms"
                      value={formData.warrantyTerms}
                      onChange={(e) => handleChange('warrantyTerms', e.target.value)}
                      sx={fieldSx}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Action Buttons */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                onClick={() => navigate('/dashboard/assets')}
                disabled={loading}
                sx={{
                  borderColor: '#e2e8f0',
                  color: '#64748b',
                  textTransform: 'none',
                  '&:hover': { borderColor: '#cbd5e1', backgroundColor: '#f8fafc' }
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                startIcon={loading ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <SaveIcon />}
                disabled={loading}
                sx={{
                  backgroundColor: '#dc2626',
                  '&:hover': { backgroundColor: '#b91c1c' },
                  textTransform: 'none'
                }}
              >
                {loading ? 'Saving...' : isEdit ? 'Update Asset' : 'Create Asset'}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </form>

      <ProductSearchDialog
        open={searchDialogOpen}
        onClose={() => setSearchDialogOpen(false)}
        onSelect={handleProductSelect}
      />

      <AssetTagSelector
        open={tagSelectorOpen}
        onClose={() => setTagSelectorOpen(false)}
        onSelect={(tag) => handleChange('assetTag', tag)}
        currentTag={formData.assetTag}
      />
    </Box>
  );
};

export default AssetForm;
