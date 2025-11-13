import {
  Box,
  Typography,
  Paper,
  Button,
  Chip,
  Grid,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Divider,
  CircularProgress,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Assignment as AssignmentIcon,
  Build as MaintenanceIcon,
  Description as DocumentIcon,
  TrendingDown as DepreciationIcon,
  Add as AddIcon,
  CheckCircle as ActiveIcon,
  Warning as BrokenIcon,
  Archive as DisposedIcon,
  ContentCopy as DuplicateIcon,
  Download as DownloadIcon,
  Visibility as ViewIcon,
  ChevronLeft as PrevIcon,
  ChevronRight as NextIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon
} from '@mui/icons-material';
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../lib/api';
import { format } from 'date-fns';
import { AssetQRCode } from '../../components/AssetQRCode';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const AssetDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [asset, setAsset] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [maintenanceDialogOpen, setMaintenanceDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentTitle, setDocumentTitle] = useState('');
  const [documentType, setDocumentType] = useState('MANUAL');
  const [uploading, setUploading] = useState(false);
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);

  useEffect(() => {
    if (id) fetchAsset();
  }, [id]);

  const fetchAsset = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/assets/${id}`);
      setAsset(response.data);
    } catch (error) {
      console.error('Error fetching asset:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this asset?')) return;

    try {
      await api.delete(`/assets/${id}`);
      navigate('/dashboard/assets');
    } catch (error) {
      console.error('Error deleting asset:', error);
    }
  };

  const handleDuplicate = () => {
    // Navigate to create page with duplicated data (excluding serial number and location)
    const duplicateData = {
      name: asset.name,
      description: asset.description,
      categoryId: asset.categoryId,
      brand: asset.brand,
      modelNumber: asset.modelNumber,
      // Do NOT copy serial number - it should be unique
      // Do NOT copy locationId - user should select location for new asset
      imageUrl: asset.imageUrl,
      productUrl: asset.productUrl,
      technicalManualUrl: asset.technicalManualUrl,
      status: 'ACTIVE',
      purchasePrice: asset.purchasePrice,
      supplierId: asset.supplierId,
      invoiceDocument: asset.invoiceDocument,
      warrantyDurationValue: asset.warrantyDurationValue,
      warrantyDurationUnit: asset.warrantyDurationUnit,
      warrantyTerms: asset.warrantyTerms,
      warrantyProvider: asset.warrantyProvider,
      lifespanValue: asset.lifespanValue,
      lifespanUnit: asset.lifespanUnit
    };

    // Store in sessionStorage to be picked up by the form
    sessionStorage.setItem('duplicateAssetData', JSON.stringify(duplicateData));
    navigate('/dashboard/assets/new');
  };

  const handleAssign = async (data: any) => {
    try {
      await api.post(`/assets/${id}/assign`, data);
      fetchAsset();
      setAssignDialogOpen(false);
    } catch (error) {
      console.error('Error assigning asset:', error);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Auto-fill title with filename (without extension)
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
      setDocumentTitle(nameWithoutExt);
    }
  };

  const handleUploadDocument = async () => {
    if (!selectedFile || !documentTitle) {
      alert('Please select a file and enter a title');
      return;
    }

    try {
      setUploading(true);

      // Upload file through backend (which has Cloudinary credentials)
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('documentType', documentType);
      formData.append('title', documentTitle);

      console.log('Uploading document:', documentTitle);

      const response = await api.post(`/assets/${id}/upload-document`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      console.log('Upload response:', response.data);

      // Reset form and close dialog
      setSelectedFile(null);
      setDocumentTitle('');
      setDocumentType('MANUAL');
      setUploadDialogOpen(false);

      // Refresh asset data
      fetchAsset();

      alert('Document uploaded successfully!');
    } catch (error: any) {
      console.error('Error uploading document:', error);
      alert(`Failed to upload document: ${error.response?.data?.error || error.message || 'Unknown error'}`);
    } finally {
      setUploading(false);
    }
  };

  const handleReturn = async () => {
    try {
      await api.post(`/assets/${id}/return`);
      fetchAsset();
    } catch (error) {
      console.error('Error returning asset:', error);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0
    }).format(value);
  };

  const getStatusColor = (status: string) => {
    const colors: any = {
      'ACTIVE': '#10b981',
      'IN_MAINTENANCE': '#f59e0b',
      'BROKEN': '#ef4444',
      'DISPOSED': '#64748b',
      'RETIRED': '#94a3b8'
    };
    return colors[status] || '#64748b';
  };

  const getStatusIcon = (status: string) => {
    const icons: any = {
      'ACTIVE': <ActiveIcon fontSize="small" />,
      'IN_MAINTENANCE': <MaintenanceIcon fontSize="small" />,
      'BROKEN': <BrokenIcon fontSize="small" />,
      'DISPOSED': <DisposedIcon fontSize="small" />
    };
    return icons[status] || null;
  };

  const handleViewDocument = (doc: any) => {
    setSelectedDocument(doc);
    setPageNumber(1);
    setPdfViewerOpen(true);
  };

  const handleDownloadDocument = (doc: any) => {
    // Open document URL in new tab to trigger download
    window.open(doc.fileUrl, '_blank');
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1);
  };

  const goToPrevPage = () => {
    setPageNumber((prev) => Math.max(prev - 1, 1));
  };

  const goToNextPage = () => {
    setPageNumber((prev) => Math.min(prev + 1, numPages));
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress sx={{ color: '#dc2626' }} />
      </Box>
    );
  }

  if (!asset) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Asset not found</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      {/* Header */}
      <Paper elevation={0} sx={{
        border: '1px solid #e2e8f0',
        borderRadius: 2,
        p: 3,
        mb: 3,
        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)'
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, flex: 1 }}>
            <IconButton
              onClick={() => navigate('/dashboard/assets')}
              sx={{
                color: '#64748b',
                '&:hover': {
                  backgroundColor: '#fef2f2',
                  color: '#dc2626'
                }
              }}
            >
              <BackIcon />
            </IconButton>
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1, flexWrap: 'wrap' }}>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#0f172a', fontSize: { xs: '1.25rem', md: '1.5rem' } }}>
                  {asset.name}
                </Typography>
                <Chip
                  label={asset.assetTag}
                  sx={{
                    background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '0.8125rem',
                    height: '28px',
                    borderRadius: '6px',
                    boxShadow: '0 2px 8px rgba(220, 38, 38, 0.2)'
                  }}
                />
                <Chip
                  icon={getStatusIcon(asset.status)}
                  label={asset.status.replace('_', ' ')}
                  size="small"
                  sx={{
                    backgroundColor: getStatusColor(asset.status),
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    height: '26px',
                    borderRadius: '6px'
                  }}
                />
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <Typography variant="body2" sx={{ color: '#475569', fontSize: '0.875rem', fontWeight: 500 }}>
                  {asset.category?.name}
                </Typography>
                <Box sx={{ width: '3px', height: '3px', borderRadius: '50%', backgroundColor: '#cbd5e1' }} />
                <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.8125rem' }}>
                  {asset.brand && `${asset.brand} ${asset.modelNumber || ''}`}
                </Typography>
                <Box sx={{ width: '3px', height: '3px', borderRadius: '50%', backgroundColor: '#cbd5e1' }} />
                <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.8125rem' }}>
                  Added {format(new Date(asset.createdAt), 'MMM dd, yyyy')}
                </Typography>
              </Box>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1.5, flexShrink: 0 }}>
            <Button
              variant="contained"
              startIcon={<EditIcon />}
              onClick={() => navigate(`/dashboard/assets/${id}/edit`)}
              sx={{
                background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                color: '#fff',
                textTransform: 'none',
                fontWeight: 600,
                boxShadow: '0 4px 12px rgba(220, 38, 38, 0.25)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #b91c1c 0%, #991b1b 100%)',
                  boxShadow: '0 6px 16px rgba(220, 38, 38, 0.35)'
                }
              }}
            >
              Edit Asset
            </Button>
            <Button
              variant="outlined"
              startIcon={<DuplicateIcon />}
              onClick={handleDuplicate}
              sx={{
                borderColor: '#dc2626',
                color: '#dc2626',
                textTransform: 'none',
                fontWeight: 600,
                '&:hover': {
                  borderColor: '#b91c1c',
                  backgroundColor: '#fef2f2'
                }
              }}
            >
              Duplicate
            </Button>
            <IconButton
              onClick={handleDelete}
              sx={{
                border: '1px solid #fee2e2',
                color: '#ef4444',
                '&:hover': {
                  borderColor: '#ef4444',
                  backgroundColor: '#fef2f2'
                }
              }}
            >
              <DeleteIcon />
            </IconButton>
          </Box>
        </Box>
      </Paper>

      {/* Product Image and QR Code */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {asset.imageUrl && (
          <Grid item xs={12} md={8}>
            <Paper elevation={0} sx={{ p: 2, border: '1px solid #e2e8f0', height: '100%' }}>
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <Box
                  component="img"
                  src={asset.imageUrl}
                  alt={asset.name}
                  sx={{
                    maxWidth: '100%',
                    maxHeight: '400px',
                    objectFit: 'contain',
                    borderRadius: 2,
                    border: '1px solid #e2e8f0',
                    backgroundColor: '#f8fafc',
                    p: 2
                  }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </Box>
            </Paper>
          </Grid>
        )}
        <Grid item xs={12} md={asset.imageUrl ? 4 : 12}>
          <AssetQRCode assetTag={asset.assetTag} assetId={asset.id} size={250} />
        </Grid>
      </Grid>

      {/* Status and Quick Info */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2, height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="body2" sx={{ color: '#64748b', mb: 1.5, fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Status
              </Typography>
              <Chip
                icon={getStatusIcon(asset.status)}
                label={asset.status.replace('_', ' ')}
                sx={{
                  backgroundColor: getStatusColor(asset.status),
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '0.75rem'
                }}
              />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2, height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="body2" sx={{ color: '#64748b', mb: 1.5, fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Purchase Price
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b', fontSize: '1.5rem' }}>
                {formatCurrency(asset.purchasePrice)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2, height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="body2" sx={{ color: '#64748b', mb: 1.5, fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Location
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b', fontSize: '1rem' }}>
                {asset.location?.name || 'Not assigned'}
              </Typography>
              {asset.location?.code && (
                <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.75rem' }}>
                  {asset.location.code}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2, height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="body2" sx={{ color: '#64748b', mb: 1.5, fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Lifespan
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#10b981', fontSize: '1rem' }}>
                {asset.lifespanValue ? `${asset.lifespanValue} ${asset.lifespanUnit?.toLowerCase()}` : 'Not set'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper elevation={0} sx={{
        border: '1px solid #e2e8f0',
        borderRadius: 2,
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
      }}>
        <Box sx={{
          background: 'linear-gradient(to bottom, #ffffff 0%, #f8fafc 100%)',
          borderBottom: '2px solid #e2e8f0'
        }}>
          <Tabs
            value={tabValue}
            onChange={(e, newValue) => setTabValue(newValue)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              px: 2,
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.9rem',
                color: '#64748b',
                minHeight: '64px',
                px: 3,
                transition: 'all 0.2s ease',
                '&:hover': {
                  color: '#dc2626',
                  backgroundColor: 'rgba(220, 38, 38, 0.05)'
                }
              },
              '& .Mui-selected': {
                color: '#dc2626',
                fontWeight: 700
              },
              '& .MuiTabs-indicator': {
                backgroundColor: '#dc2626',
                height: '3px',
                borderRadius: '3px 3px 0 0'
              },
              '& .MuiTabs-scrollButtons': {
                color: '#64748b',
                '&.Mui-disabled': {
                  opacity: 0.3
                }
              }
            }}
          >
            <Tab label="Overview" />
            <Tab label="Purchase & Warranty" />
            <Tab label="Maintenance" icon={<MaintenanceIcon fontSize="small" />} iconPosition="start" />
            <Tab label="Documents" icon={<DocumentIcon fontSize="small" />} iconPosition="start" />
            <Tab label="Assignment History" icon={<AssignmentIcon fontSize="small" />} iconPosition="start" />
          </Tabs>
        </Box>

        {/* Overview Tab */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3} sx={{ px: 3 }}>
            <Grid item xs={12} md={6}>
              <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2, p: 2.5, mb: 3, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)' }}>
                <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  mb: 3,
                  pb: 2,
                  borderBottom: '2px solid #f1f5f9'
                }}>
                  <Box sx={{
                    width: '4px',
                    height: '24px',
                    background: 'linear-gradient(to bottom, #dc2626, #b91c1c)',
                    borderRadius: '2px'
                  }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0f172a', fontSize: '1rem', letterSpacing: '-0.025em' }}>
                    Basic Information
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <InfoRow label="Category" value={asset.category.name} />
                  <InfoRow label="Brand" value={asset.brand || 'N/A'} />
                  <InfoRow label="Model Number" value={asset.modelNumber || 'N/A'} />
                  <InfoRow label="Serial Number" value={asset.serialNumber || 'N/A'} />
                  <InfoRow label="Location" value={asset.location?.name || 'N/A'} />
                  <InfoRow label="Description" value={asset.description || 'N/A'} />
                  {asset.productUrl && (
                    <Box sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      py: 1,
                      px: 2,
                      borderRadius: 1,
                      '&:hover': { backgroundColor: '#f8fafc' }
                    }}>
                      <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.875rem', fontWeight: 500 }}>
                        Product Link
                      </Typography>
                      <Button
                        size="small"
                        href={asset.productUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{
                          textTransform: 'none',
                          fontSize: '0.875rem',
                          color: '#dc2626',
                          fontWeight: 600,
                          '&:hover': { backgroundColor: '#fef2f2' }
                        }}
                      >
                        View Product Page →
                      </Button>
                    </Box>
                  )}
                  {asset.technicalManualUrl && (
                    <Box sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      py: 1,
                      px: 2,
                      borderRadius: 1,
                      '&:hover': { backgroundColor: '#f8fafc' }
                    }}>
                      <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.875rem', fontWeight: 500 }}>
                        Technical Manual
                      </Typography>
                      <Button
                        size="small"
                        href={asset.technicalManualUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{
                          textTransform: 'none',
                          fontSize: '0.875rem',
                          color: '#dc2626',
                          fontWeight: 600,
                          '&:hover': { backgroundColor: '#fef2f2' }
                        }}
                      >
                        Download Manual →
                      </Button>
                    </Box>
                  )}
                </Box>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2, p: 2.5, mb: 3, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)' }}>
                <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  mb: 3,
                  pb: 2,
                  borderBottom: '2px solid #f1f5f9'
                }}>
                  <Box sx={{
                    width: '4px',
                    height: '24px',
                    background: 'linear-gradient(to bottom, #dc2626, #b91c1c)',
                    borderRadius: '2px'
                  }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0f172a', fontSize: '1rem', letterSpacing: '-0.025em' }}>
                    Purchase Information
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mb: 2 }}>
                  <InfoRow label="Purchase Date" value={format(new Date(asset.purchaseDate), 'MMM dd, yyyy')} />
                  <InfoRow label="Purchase Price" value={formatCurrency(asset.purchasePrice)} />
                  <InfoRow label="Supplier" value={asset.supplierRelation?.name || asset.supplier || 'N/A'} />
                  <InfoRow label="Invoice Number" value={asset.invoiceNumber || 'N/A'} />
                  {asset.invoiceDocument && (
                    <Box sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      py: 1,
                      px: 2,
                      borderRadius: 1,
                      '&:hover': { backgroundColor: '#f8fafc' }
                    }}>
                      <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.875rem', fontWeight: 500 }}>
                        Invoice Document
                      </Typography>
                      <Button
                        size="small"
                        href={asset.invoiceDocument}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{
                          textTransform: 'none',
                          fontSize: '0.875rem',
                          color: '#dc2626',
                          fontWeight: 600,
                          '&:hover': { backgroundColor: '#fef2f2' }
                        }}
                      >
                        Download PDF →
                      </Button>
                    </Box>
                  )}
                </Box>
              </Paper>
              <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2, p: 2.5, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)' }}>
                <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  mb: 3,
                  pb: 2,
                  borderBottom: '2px solid #f1f5f9'
                }}>
                  <Box sx={{
                    width: '4px',
                    height: '24px',
                    background: 'linear-gradient(to bottom, #dc2626, #b91c1c)',
                    borderRadius: '2px'
                  }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0f172a', fontSize: '1rem', letterSpacing: '-0.025em' }}>
                    Warranty
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <InfoRow
                    label="Warranty Start"
                    value={asset.warrantyStartDate ? format(new Date(asset.warrantyStartDate), 'MMM dd, yyyy') : 'N/A'}
                  />
                  <InfoRow
                    label="Warranty End"
                    value={asset.warrantyEndDate ? format(new Date(asset.warrantyEndDate), 'MMM dd, yyyy') : 'N/A'}
                  />
                  <InfoRow
                    label="Duration"
                    value={asset.warrantyDurationValue ? `${asset.warrantyDurationValue} ${asset.warrantyDurationUnit?.toLowerCase()}` : 'N/A'}
                  />
                  <InfoRow label="Warranty Terms" value={asset.warrantyTerms || 'N/A'} />
                </Box>
              </Paper>
            </Grid>
            <Grid item xs={12}>
              <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2, p: 2.5, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, pb: 2, borderBottom: '2px solid #f1f5f9' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{
                      width: '4px',
                      height: '24px',
                      background: 'linear-gradient(to bottom, #dc2626, #b91c1c)',
                      borderRadius: '2px'
                    }} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0f172a', fontSize: '1rem', letterSpacing: '-0.025em' }}>
                      Current Assignment
                    </Typography>
                  </Box>
                  {asset.assignedToUserId || asset.assignedToTeam || asset.assignedToProject ? (
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={handleReturn}
                      sx={{
                        borderColor: '#dc2626',
                        color: '#dc2626',
                        textTransform: 'none',
                        fontSize: '0.875rem',
                        '&:hover': { borderColor: '#b91c1c', backgroundColor: '#fef2f2' }
                      }}
                    >
                      Return Asset
                    </Button>
                  ) : null}
                </Box>
                {asset.assignedToUserId || asset.assignedToTeam || asset.assignedToProject ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    {asset.assignedToUserId && <InfoRow label="Assigned to User" value={asset.assignedToUserId} />}
                    {asset.assignedToTeam && <InfoRow label="Assigned to Team" value={asset.assignedToTeam} />}
                    {asset.assignedToProject && <InfoRow label="Assigned to Project" value={asset.assignedToProject} />}
                    <InfoRow
                      label="Assignment Date"
                      value={asset.assignmentDate ? format(new Date(asset.assignmentDate), 'MMM dd, yyyy') : 'N/A'}
                    />
                  </Box>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 3, backgroundColor: '#f8fafc', borderRadius: 2 }}>
                    <Typography variant="body2" sx={{ color: '#64748b', mb: 2, fontSize: '0.875rem' }}>
                      This asset is not currently assigned
                    </Typography>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<AssignmentIcon />}
                      onClick={() => setAssignDialogOpen(true)}
                      sx={{
                        backgroundColor: '#dc2626',
                        '&:hover': { backgroundColor: '#b91c1c' },
                        textTransform: 'none',
                        fontSize: '0.875rem'
                      }}
                    >
                      Assign Asset
                    </Button>
                  </Box>
                )}
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Purchase & Warranty Tab */}
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ px: 3 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2, p: 2.5 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, color: '#1e293b', fontSize: '1rem' }}>
                    Purchase Information
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <InfoRow label="Purchase Date" value={asset.purchaseDate ? format(new Date(asset.purchaseDate), 'MMM dd, yyyy') : 'N/A'} />
                    <InfoRow label="Purchase Price" value={formatCurrency(asset.purchasePrice)} />
                    <InfoRow label="Supplier" value={asset.supplierRelation?.name || asset.supplier || 'N/A'} />
                    <InfoRow label="Invoice Number" value={asset.invoiceNumber || 'N/A'} />
                    <InfoRow label="Expected Lifespan" value={asset.lifespanValue ? `${asset.lifespanValue} ${asset.lifespanUnit?.toLowerCase()}` : 'Not set'} />
                  </Box>
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2, p: 2.5 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, color: '#1e293b', fontSize: '1rem' }}>
                    Warranty Information
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <InfoRow label="Warranty Provider" value={asset.warrantyProvider || 'N/A'} />
                    <InfoRow
                      label="Duration"
                      value={asset.warrantyDurationValue ? `${asset.warrantyDurationValue} ${asset.warrantyDurationUnit?.toLowerCase()}` : 'N/A'}
                    />
                    <InfoRow
                      label="Warranty Start"
                      value={asset.warrantyStartDate ? format(new Date(asset.warrantyStartDate), 'MMM dd, yyyy') : 'N/A'}
                    />
                    <InfoRow
                      label="Warranty End"
                      value={asset.warrantyEndDate ? format(new Date(asset.warrantyEndDate), 'MMM dd, yyyy') : 'N/A'}
                    />
                    <InfoRow label="Warranty Terms" value={asset.warrantyTerms || 'N/A'} />
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          </Box>
        </TabPanel>

        {/* Maintenance Tab */}
        <TabPanel value={tabValue} index={2}>
          <Box sx={{ px: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                Maintenance Records
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setMaintenanceDialogOpen(true)}
                size="small"
                sx={{ backgroundColor: '#dc2626', '&:hover': { backgroundColor: '#b91c1c' } }}
              >
                Add Maintenance
              </Button>
            </Box>

            {asset.maintenanceRecords && asset.maintenanceRecords.length > 0 ? (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#f8fafc' }}>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Type</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Date</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Description</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Performed By</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Cost</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {asset.maintenanceRecords.map((record: any) => (
                      <TableRow key={record.id} hover>
                        <TableCell>
                          <Chip
                            label={record.maintenanceType}
                            size="small"
                            sx={{ fontSize: '0.75rem' }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.875rem' }}>
                          {record.scheduledDate ? format(new Date(record.scheduledDate), 'MMM dd, yyyy') : 'N/A'}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.875rem' }}>{record.description}</TableCell>
                        <TableCell sx={{ fontSize: '0.875rem' }}>{record.performedBy || 'N/A'}</TableCell>
                        <TableCell sx={{ fontSize: '0.875rem' }}>
                          {record.cost ? formatCurrency(record.cost) : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={record.status}
                            size="small"
                            sx={{
                              backgroundColor: record.status === 'COMPLETED' ? '#10b981' : '#f59e0b',
                              color: '#fff',
                              fontSize: '0.75rem'
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <MaintenanceIcon sx={{ fontSize: 48, color: '#cbd5e1', mb: 2 }} />
                <Typography variant="body2" sx={{ color: '#64748b' }}>
                  No maintenance records yet
                </Typography>
              </Box>
            )}
          </Box>
        </TabPanel>

        {/* Documents Tab */}
        <TabPanel value={tabValue} index={3}>
          <Box sx={{ px: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                Documents & Files
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                size="small"
                onClick={() => setUploadDialogOpen(true)}
                sx={{ backgroundColor: '#dc2626', '&:hover': { backgroundColor: '#b91c1c' } }}
              >
                Upload Document
              </Button>
            </Box>

            {asset.documents && asset.documents.length > 0 ? (
              <Grid container spacing={2}>
                {asset.documents.map((doc: any) => (
                  <Grid item xs={12} sm={6} md={4} key={doc.id}>
                    <Card
                      elevation={0}
                      sx={{
                        border: '1px solid #e2e8f0',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        '&:hover': {
                          borderColor: '#dc2626',
                          transform: 'translateY(-2px)',
                          boxShadow: '0 4px 12px rgba(220, 38, 38, 0.1)'
                        }
                      }}
                      onClick={() => handleViewDocument(doc)}
                    >
                      <CardContent>
                        <DocumentIcon sx={{ fontSize: 40, color: '#dc2626', mb: 1 }} />
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                          {doc.title}
                        </Typography>
                        <Chip label={doc.documentType} size="small" sx={{ mb: 1, fontSize: '0.7rem' }} />
                        <Typography variant="caption" sx={{ display: 'block', color: '#64748b' }}>
                          {doc.fileName}
                        </Typography>
                        <Typography variant="caption" sx={{ display: 'block', color: '#94a3b8', mb: 1.5 }}>
                          Uploaded: {format(new Date(doc.uploadedAt), 'MMM dd, yyyy')}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<ViewIcon sx={{ fontSize: '1rem' }} />}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewDocument(doc);
                            }}
                            sx={{
                              flex: 1,
                              textTransform: 'none',
                              borderColor: '#dc2626',
                              color: '#dc2626',
                              fontSize: '0.75rem',
                              '&:hover': { borderColor: '#b91c1c', backgroundColor: '#fef2f2' }
                            }}
                          >
                            View
                          </Button>
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={<DownloadIcon sx={{ fontSize: '1rem' }} />}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadDocument(doc);
                            }}
                            sx={{
                              flex: 1,
                              textTransform: 'none',
                              backgroundColor: '#dc2626',
                              fontSize: '0.75rem',
                              '&:hover': { backgroundColor: '#b91c1c' }
                            }}
                          >
                            Download
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <DocumentIcon sx={{ fontSize: 48, color: '#cbd5e1', mb: 2 }} />
                <Typography variant="body2" sx={{ color: '#64748b' }}>
                  No documents uploaded yet
                </Typography>
              </Box>
            )}
          </Box>
        </TabPanel>

        {/* Assignment History Tab */}
        <TabPanel value={tabValue} index={4}>
          <Box sx={{ px: 3 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: '#1e293b' }}>
              Assignment History
            </Typography>

            {asset.assignmentHistory && asset.assignmentHistory.length > 0 ? (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#f8fafc' }}>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Assigned To</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Assignment Date</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Return Date</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Assigned By</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Notes</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {asset.assignmentHistory.map((history: any) => (
                      <TableRow key={history.id} hover>
                        <TableCell sx={{ fontSize: '0.875rem' }}>
                          {history.assignedToUserId && `User: ${history.assignedToUserId}`}
                          {history.assignedToTeam && `Team: ${history.assignedToTeam}`}
                          {history.assignedToProject && `Project: ${history.assignedToProject}`}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.875rem' }}>
                          {format(new Date(history.assignmentDate), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.875rem' }}>
                          {history.returnDate ? format(new Date(history.returnDate), 'MMM dd, yyyy') : 'Active'}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.875rem' }}>{history.assignedBy || 'N/A'}</TableCell>
                        <TableCell sx={{ fontSize: '0.875rem' }}>{history.notes || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <AssignmentIcon sx={{ fontSize: 48, color: '#cbd5e1', mb: 2 }} />
                <Typography variant="body2" sx={{ color: '#64748b' }}>
                  No assignment history
                </Typography>
              </Box>
            )}
          </Box>
        </TabPanel>
      </Paper>

      {/* PDF Viewer Dialog */}
      <Dialog
        open={pdfViewerOpen}
        onClose={() => setPdfViewerOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            height: '90vh',
            borderRadius: 2,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)'
          }
        }}
      >
        <DialogTitle sx={{
          borderBottom: '1px solid #e2e8f0',
          pb: 2,
          fontWeight: 600,
          color: '#1e293b',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {selectedDocument?.title}
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748b' }}>
              {selectedDocument?.fileName}
            </Typography>
          </Box>
          <Button
            variant="contained"
            size="small"
            onClick={() => handleDownloadDocument(selectedDocument)}
            sx={{
              backgroundColor: '#dc2626',
              textTransform: 'none',
              '&:hover': { backgroundColor: '#b91c1c' }
            }}
          >
            Download
          </Button>
        </DialogTitle>
        <DialogContent sx={{ p: 0, height: '100%', overflow: 'auto', backgroundColor: '#525659', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {selectedDocument && (
            <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', py: 2 }}>
              <Document
                file={selectedDocument.fileUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                loading={
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
                    <CircularProgress sx={{ color: '#dc2626' }} />
                  </Box>
                }
                error={
                  <Box sx={{ p: 4, textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: 2, m: 2 }}>
                    <Typography variant="body1" sx={{ mb: 2, color: '#64748b' }}>
                      Unable to load PDF
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<DownloadIcon />}
                      onClick={() => handleDownloadDocument(selectedDocument)}
                      sx={{
                        backgroundColor: '#dc2626',
                        '&:hover': { backgroundColor: '#b91c1c' }
                      }}
                    >
                      Download PDF Instead
                    </Button>
                  </Box>
                }
              >
                <Page
                  pageNumber={pageNumber}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                  width={Math.min(window.innerWidth * 0.8, 800)}
                />
              </Document>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{
          borderTop: '1px solid #e2e8f0',
          px: 3,
          py: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Button
            onClick={() => setPdfViewerOpen(false)}
            sx={{ color: '#64748b' }}
          >
            Close
          </Button>
          {numPages > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <IconButton
                onClick={goToPrevPage}
                disabled={pageNumber <= 1}
                size="small"
                sx={{
                  color: '#dc2626',
                  '&:disabled': { color: '#cbd5e1' }
                }}
              >
                <PrevIcon />
              </IconButton>
              <Typography variant="body2" sx={{ color: '#64748b', minWidth: '100px', textAlign: 'center' }}>
                Page {pageNumber} of {numPages}
              </Typography>
              <IconButton
                onClick={goToNextPage}
                disabled={pageNumber >= numPages}
                size="small"
                sx={{
                  color: '#dc2626',
                  '&:disabled': { color: '#cbd5e1' }
                }}
              >
                <NextIcon />
              </IconButton>
            </Box>
          )}
        </DialogActions>
      </Dialog>

      {/* Upload Document Dialog */}
      <Dialog
        open={uploadDialogOpen}
        onClose={() => !uploading && setUploadDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)'
          }
        }}
      >
        <DialogTitle sx={{
          borderBottom: '1px solid #e2e8f0',
          pb: 2,
          fontWeight: 600,
          color: '#1e293b'
        }}>
          Upload Document
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <input
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.png,.jpg,.jpeg"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
              id="document-file-input"
            />
            <label htmlFor="document-file-input">
              <Button
                variant="outlined"
                component="span"
                fullWidth
                startIcon={<AddIcon />}
                sx={{
                  borderColor: selectedFile ? '#10b981' : '#cbd5e1',
                  color: selectedFile ? '#10b981' : '#64748b',
                  borderWidth: 2,
                  py: 1.5,
                  textTransform: 'none',
                  fontSize: '0.9rem',
                  '&:hover': {
                    borderColor: '#10b981',
                    borderWidth: 2,
                    backgroundColor: '#f0fdf4'
                  }
                }}
              >
                {selectedFile ? selectedFile.name : 'Choose File'}
              </Button>
            </label>

            <TextField
              fullWidth
              label="Document Title"
              value={documentTitle}
              onChange={(e) => setDocumentTitle(e.target.value)}
              required
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': {
                  '&:hover fieldset': {
                    borderColor: '#3b82f6',
                  },
                }
              }}
            />

            <TextField
              fullWidth
              select
              label="Document Type"
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': {
                  '&:hover fieldset': {
                    borderColor: '#3b82f6',
                  },
                }
              }}
            >
              <MenuItem value="MANUAL">Manual</MenuItem>
              <MenuItem value="WARRANTY">Warranty</MenuItem>
              <MenuItem value="INVOICE">Invoice</MenuItem>
              <MenuItem value="RECEIPT">Receipt</MenuItem>
              <MenuItem value="CERTIFICATE">Certificate</MenuItem>
              <MenuItem value="OTHER">Other</MenuItem>
            </TextField>

            {uploading && (
              <Box sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                p: 2,
                backgroundColor: '#f8fafc',
                borderRadius: 1,
                border: '1px solid #e2e8f0'
              }}>
                <CircularProgress size={20} />
                <Typography variant="body2" color="text.secondary">
                  Uploading document to cloud storage...
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{
          borderTop: '1px solid #e2e8f0',
          px: 3,
          py: 2
        }}>
          <Button
            onClick={() => setUploadDialogOpen(false)}
            disabled={uploading}
            sx={{ color: '#64748b' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUploadDocument}
            variant="contained"
            disabled={!selectedFile || !documentTitle || uploading}
            sx={{
              backgroundColor: '#dc2626',
              textTransform: 'none',
              px: 3,
              '&:hover': { backgroundColor: '#b91c1c' },
              '&:disabled': {
                backgroundColor: '#cbd5e1',
                color: '#94a3b8'
              }
            }}
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </Button>
        </DialogActions>
      </Dialog>

      <AssignmentDialog
        open={assignDialogOpen}
        onClose={() => setAssignDialogOpen(false)}
        onSubmit={handleAssign}
      />
    </Box>
  );
};

// Helper component for info rows
const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <Box sx={{
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    py: 1,
    px: 2,
    borderRadius: 1,
    '&:hover': {
      backgroundColor: '#f8fafc'
    }
  }}>
    <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.875rem', fontWeight: 500 }}>
      {label}
    </Typography>
    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.875rem', textAlign: 'right', color: '#1e293b' }}>
      {value}
    </Typography>
  </Box>
);

// Assignment Dialog Component
const AssignmentDialog = ({ open, onClose, onSubmit }: any) => {
  const [formData, setFormData] = useState({
    assignedToUserId: '',
    assignedToTeam: '',
    assignedToProject: '',
    assignedBy: '',
    notes: ''
  });

  const handleSubmit = () => {
    onSubmit(formData);
    setFormData({ assignedToUserId: '', assignedToTeam: '', assignedToProject: '', assignedBy: '', notes: '' });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Assign Asset</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
          <TextField
            fullWidth
            label="Assigned to User ID (optional)"
            value={formData.assignedToUserId}
            onChange={(e) => setFormData({ ...formData, assignedToUserId: e.target.value })}
          />
          <TextField
            fullWidth
            label="Assigned to Team (optional)"
            value={formData.assignedToTeam}
            onChange={(e) => setFormData({ ...formData, assignedToTeam: e.target.value })}
          />
          <TextField
            fullWidth
            label="Assigned to Project (optional)"
            value={formData.assignedToProject}
            onChange={(e) => setFormData({ ...formData, assignedToProject: e.target.value })}
          />
          <TextField
            fullWidth
            label="Assigned By"
            value={formData.assignedBy}
            onChange={(e) => setFormData({ ...formData, assignedBy: e.target.value })}
          />
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" sx={{ backgroundColor: '#dc2626' }}>
          Assign
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AssetDetail;
