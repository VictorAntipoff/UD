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
import { ArrowBack as BackIcon, Save as SaveIcon, Search as SearchIcon, Upload as UploadIcon, Link as LinkIcon } from '@mui/icons-material';
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../lib/api';
import ProductSearchDialog from '../../components/ProductSearchDialog';
import AssetTagSelector from '../../components/AssetTagSelector';
import DownloadProgress, { DownloadItem } from '../../components/DownloadProgress';

const AssetForm = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = id && id !== 'new';
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [tagSelectorOpen, setTagSelectorOpen] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedParentCategory, setSelectedParentCategory] = useState('');
  const [pdfDocuments, setPdfDocuments] = useState<Array<{url: string; title: string}>>([]);
  const [existingDocuments, setExistingDocuments] = useState<any[]>([]);
  const [downloadProgress, setDownloadProgress] = useState<DownloadItem[]>([]);
  const [showDownloadProgress, setShowDownloadProgress] = useState(false);
  const [formData, setFormData] = useState({
    assetTag: '',
    name: '',
    description: '',
    categoryId: '',
    imageUrl: '',
    productUrl: '',
    technicalManualUrl: '',
    brand: '',
    modelNumber: '',
    serialNumber: '',
    locationId: '',
    status: 'ACTIVE',
    purchaseDate: new Date().toISOString().split('T')[0],
    purchasePrice: '',
    supplierId: '',
    invoiceNumber: '',
    invoiceDocument: '',
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
    const loadData = async () => {
      // First load categories, locations, and suppliers
      const [loadedCategories] = await Promise.all([
        fetchCategories(),
        fetchLocations(),
        fetchSuppliers()
      ]);

      if (isEdit) {
        // Then fetch asset and set parent category
        const asset = await fetchAsset();
        if (asset && asset.categoryId && loadedCategories) {
          // Find the category in the loaded categories
          const selectedCategory = loadedCategories.find((c: any) => c.id === asset.categoryId);
          if (selectedCategory?.parentId) {
            setSelectedParentCategory(selectedCategory.parentId);
          }
        }
      } else {
        // Fetch next asset tag for new assets
        fetchNextAssetTag();

        // Check if we're duplicating an asset
        const duplicateDataStr = sessionStorage.getItem('duplicateAssetData');
        if (duplicateDataStr) {
          try {
            const duplicateData = JSON.parse(duplicateDataStr);
            setFormData(prev => ({
              ...prev,
              ...duplicateData,
              purchaseDate: new Date().toISOString().split('T')[0], // Set to today
              warrantyStartDate: '',
              warrantyEndDate: ''
            }));

            // Set parent category if available
            if (duplicateData.categoryId && loadedCategories) {
              const selectedCategory = loadedCategories.find((c: any) => c.id === duplicateData.categoryId);
              if (selectedCategory?.parentId) {
                setSelectedParentCategory(selectedCategory.parentId);
              }
            }

            // Clear the session storage
            sessionStorage.removeItem('duplicateAssetData');
          } catch (error) {
            console.error('Error parsing duplicate data:', error);
          }
        }
      }
    };
    loadData();
  }, [id]);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/assets/categories');
      setCategories(response.data);
      return response.data; // Return categories for immediate use
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  };

  const fetchLocations = async () => {
    try {
      const response = await api.get('/assets/locations/active');
      setLocations(response.data);
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await api.get('/assets/suppliers/active');
      setSuppliers(response.data);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
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
        productUrl: asset.productUrl || '',
        technicalManualUrl: asset.technicalManualUrl || '',
        brand: asset.brand || '',
        modelNumber: asset.modelNumber || '',
        serialNumber: asset.serialNumber || '',
        locationId: asset.locationId || '',
        status: asset.status,
        purchaseDate: asset.purchaseDate.split('T')[0],
        purchasePrice: asset.purchasePrice.toString(),
        supplierId: asset.supplierId || '',
        invoiceNumber: asset.invoiceNumber || '',
        invoiceDocument: asset.invoiceDocument || '',
        warrantyDurationValue: asset.warrantyDurationValue?.toString() || '',
        warrantyDurationUnit: asset.warrantyDurationUnit || 'YEARS',
        warrantyStartDate: asset.warrantyStartDate ? asset.warrantyStartDate.split('T')[0] : '',
        warrantyEndDate: asset.warrantyEndDate ? asset.warrantyEndDate.split('T')[0] : '',
        warrantyTerms: asset.warrantyTerms || '',
        warrantyProvider: asset.warrantyProvider || '',
        lifespanValue: asset.lifespanValue?.toString() || '',
        lifespanUnit: asset.lifespanUnit || 'YEARS'
      });

      // Store existing documents to prevent re-downloading
      if (asset.documents && asset.documents.length > 0) {
        setExistingDocuments(asset.documents);
        console.log(`Asset has ${asset.documents.length} existing documents`);
      }

      return asset; // Return asset so we can use it after categories are loaded
    } catch (error) {
      console.error('Error fetching asset:', error);
      return null;
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

      // Store URLs temporarily before creating/updating asset
      const tempImageUrl = formData.imageUrl;
      const tempManualUrl = formData.technicalManualUrl;

      // Check if we need to download new images (external URLs)
      const needsImageDownload = tempImageUrl && tempImageUrl.startsWith('http') && !tempImageUrl.includes('cloudinary');
      const needsManualDownload = tempManualUrl && tempManualUrl.startsWith('http') && !tempManualUrl.includes('cloudinary');

      const data = {
        ...formData,
        purchasePrice: parseFloat(formData.purchasePrice),
        lifespanValue: formData.lifespanValue ? parseInt(formData.lifespanValue) : null,
        warrantyDurationValue: formData.warrantyDurationValue ? parseInt(formData.warrantyDurationValue) : null,
        warrantyStartDate: warrantyStartDate || null,
        warrantyEndDate: warrantyEndDate || null,
        // Don't save external URLs - they will be uploaded to Cloudinary
        imageUrl: needsImageDownload ? null : tempImageUrl,
        technicalManualUrl: needsManualDownload ? null : tempManualUrl
      };

      let createdAsset;
      let assetIdentifier; // Store the ID or tag we used for the request

      if (isEdit) {
        const response = await api.patch(`/assets/${id}`, data);
        createdAsset = response.data;
        assetIdentifier = id; // Use the same identifier (could be tag or UUID)
      } else {
        const response = await api.post('/assets', data);
        createdAsset = response.data;
        assetIdentifier = createdAsset.assetTag; // Use asset tag for new assets
      }

      // Download external files to Cloudinary if needed
      if (createdAsset && createdAsset.assetTag && (needsImageDownload || needsManualDownload || pdfDocuments.length > 0)) {
        // Filter out PDFs that already exist (when editing)
        const newPdfDocuments = isEdit && existingDocuments.length > 0
          ? pdfDocuments.filter(pdf => {
              // Check if this PDF URL already exists in documents
              const exists = existingDocuments.some(doc =>
                doc.fileName && pdf.url.includes(doc.fileName)
              );
              if (exists) {
                console.log(`Skipping duplicate PDF: ${pdf.title}`);
              }
              return !exists;
            })
          : pdfDocuments;

        console.log(`Filtered PDFs: ${newPdfDocuments.length} new out of ${pdfDocuments.length} total`);

        // Prepare download items for progress tracking
        const items: DownloadItem[] = [];

        if (needsImageDownload && tempImageUrl) {
          items.push({
            id: 'image',
            name: 'Product Image',
            type: 'image',
            status: 'pending'
          });
        }

        if (newPdfDocuments.length > 0) {
          newPdfDocuments.forEach((pdf, idx) => {
            items.push({
              id: `pdf-${idx}`,
              name: pdf.title,
              type: 'pdf',
              status: 'pending'
            });
          });
        }

        // Only show progress if there are items to download
        if (items.length === 0) {
          console.log('No new files to download');
          return; // Skip download if no new items
        }

        // Show progress notification
        setDownloadProgress(items);
        setShowDownloadProgress(true);

        try {
          // Start downloading - update status to downloading
          setDownloadProgress(prev => prev.map(item => ({ ...item, status: 'downloading' })));

          const downloadPayload = {
            assetTag: createdAsset.assetTag,
            imageUrl: tempImageUrl?.startsWith('http') ? tempImageUrl : null,
            pdfUrl: tempManualUrl?.startsWith('http') ? tempManualUrl : null,
            pdfDocuments: newPdfDocuments.length > 0 ? newPdfDocuments : null
          };

          const downloadResponse = await api.post('/assets/download-asset-files', downloadPayload);

          if (downloadResponse.data.success) {
            // Update progress - mark all as completed
            setDownloadProgress(prev => prev.map(item => ({ ...item, status: 'completed' })));

            // Update asset with downloaded file URLs
            const updateData: any = {};
            if (downloadResponse.data.imageUrl) {
              updateData.imageUrl = downloadResponse.data.imageUrl;
            }
            if (downloadResponse.data.pdfUrl) {
              updateData.technicalManualUrl = downloadResponse.data.pdfUrl;
            }

            if (Object.keys(updateData).length > 0) {
              await api.patch(`/assets/${createdAsset.assetTag}`, updateData);
            }

            // Auto-close progress after 3 seconds
            setTimeout(() => {
              setShowDownloadProgress(false);
            }, 3000);
          }
        } catch (downloadError) {
          console.error('Error downloading asset files:', downloadError);
          // Mark all as error
          setDownloadProgress(prev => prev.map(item => ({
            ...item,
            status: 'error',
            error: 'Failed to download'
          })));
        }
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
        const selectedCategory = field === 'categoryId' ?
          categories.find(c => c.id === value) :
          categories.find(c => c.id === newData.categoryId);

        const brand = field === 'brand' ? value : newData.brand;
        const model = field === 'modelNumber' ? value : newData.modelNumber;

        // Generate name: Brand + Subcategory + Model Number
        const parts = [];

        // Add Brand first
        if (brand && brand.trim()) parts.push(brand);

        // Add Subcategory (not parent category, only the subcategory itself)
        if (selectedCategory) {
          parts.push(selectedCategory.name);
        }

        // Add Model Number
        if (model && model.trim()) parts.push(model);

        if (parts.length > 0) {
          newData.name = parts.join(' - ');
        }
      }

      return newData;
    });
  };

  const handleProductSelect = async (product: any) => {
    console.log('=== Product Selected ===');
    console.log('Product data:', product);

    const titleParts = product.title.split(' ');
    const brand = titleParts[0] || '';
    const modelNumber = product.title.replace(brand, '').trim();

    setFormData(prev => ({
      ...prev,
      // Only update fields if they are currently empty
      name: prev.name || product.title,
      description: prev.description || product.snippet || '',
      brand: prev.brand || brand,
      modelNumber: prev.modelNumber || modelNumber,
      imageUrl: prev.imageUrl || product.image || '',
      technicalManualUrl: prev.technicalManualUrl || product.pdfUrl || '',
      productUrl: prev.productUrl || product.link || ''
    }));

    // Store all PDF documents found
    if (product.pdfDocuments && product.pdfDocuments.length > 0) {
      setPdfDocuments(product.pdfDocuments);
      console.log(`✅ Found ${product.pdfDocuments.length} PDF documents:`, product.pdfDocuments);
    } else {
      console.log('⚠️ No pdfDocuments array in product data');
      setPdfDocuments([]); // Clear any previous PDFs
    }

    // Don't download immediately - wait until asset is saved
    // Show notification if PDF was found
    if (product.pdfUrl) {
      console.log('Product manual/datasheet found:', product.pdfUrl);
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
          {isEdit ? 'Search & Update' : 'Search Product'}
        </Button>
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
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
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
                    variant="contained"
                    startIcon={<SearchIcon />}
                    onClick={() => setSearchDialogOpen(true)}
                    fullWidth
                    size="small"
                    sx={{
                      bgcolor: '#dc2626',
                      color: '#fff',
                      textTransform: 'none',
                      fontSize: '0.8125rem',
                      mb: 1,
                      '&:hover': {
                        bgcolor: '#b91c1c'
                      }
                    }}
                  >
                    Search for Product
                  </Button>
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
                  <Grid item xs={12}>
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
                      value={selectedParentCategory}
                      onChange={(e) => {
                        const parentId = e.target.value;
                        setSelectedParentCategory(parentId);
                        // Clear subcategory when parent changes
                        setFormData(prev => ({ ...prev, categoryId: '' }));
                      }}
                      sx={fieldSx}
                    >
                      {categories.filter(cat => !cat.parentId).map((cat) => (
                        <MenuItem key={cat.id} value={cat.id}>{cat.name} ({cat.code})</MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      required
                      select
                      fullWidth
                      size="small"
                      label="Subcategory"
                      value={formData.categoryId}
                      onChange={(e) => handleChange('categoryId', e.target.value)}
                      disabled={!selectedParentCategory}
                      sx={fieldSx}
                      helperText={!selectedParentCategory ? "Select category first" : ""}
                    >
                      {categories
                        .filter(cat => cat.parentId === selectedParentCategory)
                        .map((cat) => (
                          <MenuItem key={cat.id} value={cat.id}>{cat.name} ({cat.code})</MenuItem>
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
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Product Link"
                      value={formData.productUrl}
                      onChange={(e) => handleChange('productUrl', e.target.value)}
                      placeholder="https://..."
                      helperText="Link to product website or reference"
                      sx={fieldSx}
                      InputProps={{
                        endAdornment: formData.productUrl && (
                          <IconButton
                            size="small"
                            href={formData.productUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{ color: '#dc2626' }}
                          >
                            <LinkIcon fontSize="small" />
                          </IconButton>
                        )
                      }}
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
                      select
                      fullWidth
                      size="small"
                      label="Location"
                      value={formData.locationId}
                      onChange={(e) => handleChange('locationId', e.target.value)}
                      sx={fieldSx}
                      helperText="Select the physical location of this asset"
                    >
                      <MenuItem value="">
                        <em>None</em>
                      </MenuItem>
                      {locations.map((location) => (
                        <MenuItem key={location.id} value={location.id}>
                          {location.name} ({location.code})
                        </MenuItem>
                      ))}
                    </TextField>
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
                      select
                      fullWidth
                      size="small"
                      label="Supplier"
                      value={formData.supplierId}
                      onChange={(e) => handleChange('supplierId', e.target.value)}
                      helperText="Select the supplier or vendor"
                      sx={fieldSx}
                    >
                      <MenuItem value="">
                        <em>None</em>
                      </MenuItem>
                      {suppliers.map((supplier) => (
                        <MenuItem key={supplier.id} value={supplier.id}>
                          {supplier.name} {supplier.code && `(${supplier.code})`}
                        </MenuItem>
                      ))}
                    </TextField>
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
        brand={formData.brand}
        modelNumber={formData.modelNumber}
      />

      <AssetTagSelector
        open={tagSelectorOpen}
        onClose={() => setTagSelectorOpen(false)}
        onSelect={(tag) => handleChange('assetTag', tag)}
        currentTag={formData.assetTag}
      />

      <DownloadProgress
        open={showDownloadProgress}
        items={downloadProgress}
        onClose={() => setShowDownloadProgress(false)}
      />
    </Box>
  );
};

export default AssetForm;
