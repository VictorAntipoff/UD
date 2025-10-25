import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  TextField,
  MenuItem,
  InputAdornment,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Category as CategoryIcon,
  CheckCircle as ActiveIcon,
  Build as MaintenanceIcon,
  Warning as BrokenIcon,
  Archive as DisposedIcon,
  QrCodeScanner as QrCodeScannerIcon
} from '@mui/icons-material';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { format } from 'date-fns';
import { QRScanner } from '../../components/QRScanner';

const AssetList = () => {
  const navigate = useNavigate();
  const [assets, setAssets] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [qrScannerOpen, setQrScannerOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, [filterStatus, filterCategory]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filterStatus) params.status = filterStatus;
      if (filterCategory) params.categoryId = filterCategory;

      const [assetsRes, categoriesRes, statsRes] = await Promise.all([
        api.get('/assets', { params }),
        api.get('/assets/categories'),
        api.get('/assets/stats')
      ]);

      setAssets(assetsRes.data);
      setCategories(categoriesRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Error fetching assets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this asset?')) return;

    try {
      await api.delete(`/assets/${id}`);
      fetchData();
    } catch (error) {
      console.error('Error deleting asset:', error);
    }
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
      'DISPOSED': <DisposedIcon fontSize="small" />,
      'RETIRED': <DisposedIcon fontSize="small" />
    };
    return icons[status] || null;
  };

  const filteredAssets = assets.filter(asset =>
    asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    asset.assetTag.toLowerCase().includes(searchTerm.toLowerCase()) ||
    asset.brand?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0
    }).format(value);
  };

  return (
    <Box sx={{ p: 3, backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b', mb: 0.5 }}>
            Asset Management
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b' }}>
            Track and manage company assets with depreciation
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<QrCodeScannerIcon />}
            onClick={() => setQrScannerOpen(true)}
            sx={{
              borderColor: '#dc2626',
              color: '#dc2626',
              '&:hover': {
                borderColor: '#b91c1c',
                backgroundColor: 'rgba(220, 38, 38, 0.04)'
              },
              textTransform: 'none',
              fontWeight: 600
            }}
          >
            Scan QR Code
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/dashboard/assets/new')}
            sx={{
              backgroundColor: '#dc2626',
              '&:hover': { backgroundColor: '#b91c1c' },
              textTransform: 'none',
              fontWeight: 600
            }}
          >
            Add Asset
          </Button>
        </Box>
      </Box>

      {/* Statistics Cards */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card elevation={0} sx={{ border: '1px solid #e2e8f0' }}>
              <CardContent sx={{ p: 2 }}>
                <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.75rem', mb: 0.5 }}>
                  Total Assets
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#dc2626' }}>
                  {stats.totalAssets}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card elevation={0} sx={{ border: '1px solid #e2e8f0' }}>
              <CardContent sx={{ p: 2 }}>
                <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.75rem', mb: 0.5 }}>
                  Active
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#10b981' }}>
                  {stats.activeAssets}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card elevation={0} sx={{ border: '1px solid #e2e8f0' }}>
              <CardContent sx={{ p: 2 }}>
                <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.75rem', mb: 0.5 }}>
                  In Maintenance
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#f59e0b' }}>
                  {stats.inMaintenance}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card elevation={0} sx={{ border: '1px solid #e2e8f0' }}>
              <CardContent sx={{ p: 2 }}>
                <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.75rem', mb: 0.5 }}>
                  Broken
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#ef4444' }}>
                  {stats.brokenAssets}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card elevation={0} sx={{ border: '1px solid #e2e8f0' }}>
              <CardContent sx={{ p: 2 }}>
                <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.75rem', mb: 0.5 }}>
                  Total Value
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#3b82f6', fontSize: '1.25rem' }}>
                  {formatCurrency(stats.totalValue)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filters */}
      <Paper elevation={0} sx={{ p: 2, mb: 3, border: '1px solid #e2e8f0' }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search assets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: '#94a3b8' }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: '#e2e8f0' },
                  '&:hover fieldset': { borderColor: '#dc2626' },
                  '&.Mui-focused fieldset': { borderColor: '#dc2626' }
                }
              }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              select
              size="small"
              label="Status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: '#e2e8f0' },
                  '&:hover fieldset': { borderColor: '#dc2626' },
                  '&.Mui-focused fieldset': { borderColor: '#dc2626' }
                },
                '& .MuiInputLabel-root.Mui-focused': { color: '#dc2626' }
              }}
            >
              <MenuItem value="">All Status</MenuItem>
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
              select
              size="small"
              label="Category"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: '#e2e8f0' },
                  '&:hover fieldset': { borderColor: '#dc2626' },
                  '&.Mui-focused fieldset': { borderColor: '#dc2626' }
                },
                '& .MuiInputLabel-root.Mui-focused': { color: '#dc2626' }
              }}
            >
              <MenuItem value="">All Categories</MenuItem>
              {categories.map((cat) => (
                <MenuItem key={cat.id} value={cat.id}>
                  {cat.name} ({cat._count.assets})
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>
      </Paper>

      {/* Assets Table */}
      <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress sx={{ color: '#dc2626' }} />
          </Box>
        ) : filteredAssets.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <CategoryIcon sx={{ fontSize: 64, color: '#cbd5e1', mb: 2 }} />
            <Typography variant="h6" sx={{ color: '#64748b', mb: 1 }}>
              No assets found
            </Typography>
            <Typography variant="body2" sx={{ color: '#94a3b8', mb: 3 }}>
              Start by adding your first asset
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/dashboard/assets/new')}
              sx={{
                backgroundColor: '#dc2626',
                '&:hover': { backgroundColor: '#b91c1c' }
              }}
            >
              Add Asset
            </Button>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f8fafc' }}>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', width: '60px' }}>Image</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Asset Tag</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Category</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Brand</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Purchase Price</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Purchase Date</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', textAlign: 'center' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredAssets.map((asset) => (
                  <TableRow
                    key={asset.id}
                    hover
                    sx={{
                      cursor: 'pointer',
                      '&:hover': { backgroundColor: '#f8fafc' }
                    }}
                  >
                    <TableCell sx={{ p: 1 }}>
                      {asset.imageUrl ? (
                        <Box
                          component="img"
                          src={asset.imageUrl}
                          alt={asset.name}
                          sx={{
                            width: 50,
                            height: 50,
                            objectFit: 'contain',
                            borderRadius: 1,
                            border: '1px solid #e2e8f0',
                            backgroundColor: '#f8fafc',
                            p: 0.5
                          }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <Box
                          sx={{
                            width: 50,
                            height: 50,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 1,
                            border: '1px solid #e2e8f0',
                            backgroundColor: '#f8fafc'
                          }}
                        >
                          <CategoryIcon sx={{ color: '#cbd5e1', fontSize: 24 }} />
                        </Box>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', color: '#dc2626' }}>
                        {asset.assetTag}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: '0.875rem', fontWeight: 500 }}>
                        {asset.name}
                      </Typography>
                      {asset.description && (
                        <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                          {asset.description.substring(0, 50)}...
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={<CategoryIcon fontSize="small" />}
                        label={asset.category.name}
                        size="small"
                        sx={{
                          backgroundColor: '#f1f5f9',
                          color: '#475569',
                          fontSize: '0.75rem'
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.875rem' }}>{asset.brand || '-'}</TableCell>
                    <TableCell>
                      <Chip
                        icon={getStatusIcon(asset.status)}
                        label={asset.status.replace('_', ' ')}
                        size="small"
                        sx={{
                          backgroundColor: getStatusColor(asset.status),
                          color: '#fff',
                          fontSize: '0.75rem',
                          fontWeight: 600
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.875rem', fontWeight: 500 }}>
                      {formatCurrency(asset.purchasePrice)}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.875rem' }}>
                      {format(new Date(asset.purchaseDate), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Tooltip title="View Details">
                        <IconButton
                          size="small"
                          onClick={() => navigate(`/dashboard/assets/${asset.id}`)}
                          sx={{ color: '#3b82f6' }}
                        >
                          <ViewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          onClick={() => navigate(`/dashboard/assets/${asset.id}/edit`)}
                          sx={{ color: '#f59e0b' }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(asset.id)}
                          sx={{ color: '#ef4444' }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* QR Scanner Dialog */}
      <QRScanner
        open={qrScannerOpen}
        onClose={() => setQrScannerOpen(false)}
        onScan={(data) => {
          // Navigate to the scanned asset detail page
          navigate(`/dashboard/assets/${data.id}`);
        }}
      />
    </Box>
  );
};

export default AssetList;
