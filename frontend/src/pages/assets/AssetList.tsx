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
  Tooltip,
  Checkbox,
  ToggleButton,
  ToggleButtonGroup,
  Collapse
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
  QrCodeScanner as QrCodeScannerIcon,
  ContentCopy as DuplicateIcon,
  PictureAsPdf as HandoverIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
  ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { format } from 'date-fns';
import { QRScanner } from '../../components/QRScanner';
import { AssetHandoverDialog } from '../../components/assets/AssetHandoverDialog';

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
  const [handoverAsset, setHandoverAsset] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [multiHandoverOpen, setMultiHandoverOpen] = useState(false);

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

  const handleDuplicate = (asset: any) => {
    // Store duplicate data in sessionStorage (excluding serial number and location)
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

    sessionStorage.setItem('duplicateAssetData', JSON.stringify(duplicateData));
    navigate('/dashboard/assets/new');
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

  // 'table' = one row per asset; 'card' = similar assets grouped into one card.
  // Persisted so a refresh keeps you on the same view.
  const [viewMode, setViewMode] = useState<'table' | 'card'>(
    () => (localStorage.getItem('assetViewMode') as 'table' | 'card') || 'table'
  );
  useEffect(() => {
    localStorage.setItem('assetViewMode', viewMode);
  }, [viewMode]);

  // Group similar assets by name + brand + category for the card view.
  const groupKey = (a: any) =>
    `${(a.name || '').trim().toLowerCase()}|${(a.brand || '').trim().toLowerCase()}|${a.category?.name || a.categoryId || ''}`;

  const groupedAssets = (() => {
    const map = new Map<string, any[]>();
    for (const a of filteredAssets) {
      const k = groupKey(a);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(a);
    }
    return Array.from(map.values())
      .map(items => ({
        key: groupKey(items[0]),
        items,
        rep: items[0], // representative asset for shared display fields
        count: items.length,
        totalValue: items.reduce((s, x) => s + (Number(x.purchasePrice) || 0), 0),
      }))
      .sort((a, b) => b.count - a.count || a.rep.name.localeCompare(b.rep.name));
  })();

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const visibleIds = filteredAssets.map((a) => a.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
  const someVisibleSelected = visibleIds.some((id) => selectedIds.has(id));

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        visibleIds.forEach((id) => next.delete(id));
      } else {
        visibleIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const selectedAssets = assets.filter((a) => selectedIds.has(a.id));

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
          {selectedIds.size > 0 && (
            <Button
              variant="contained"
              startIcon={<HandoverIcon />}
              onClick={() => setMultiHandoverOpen(true)}
              sx={{
                backgroundColor: '#dc2626',
                '&:hover': { backgroundColor: '#b91c1c' },
                textTransform: 'none',
                fontWeight: 600
              }}
            >
              Handover PDF ({selectedIds.size})
            </Button>
          )}
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

      {/* View toggle */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="body2" sx={{ color: '#64748b' }}>
          {viewMode === 'card'
            ? `${groupedAssets.length} group${groupedAssets.length === 1 ? '' : 's'} · ${filteredAssets.length} assets`
            : `${filteredAssets.length} asset${filteredAssets.length === 1 ? '' : 's'}`}
        </Typography>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={viewMode}
          onChange={(_, v) => v && setViewMode(v)}
        >
          <ToggleButton value="table" sx={{ textTransform: 'none', px: 1.5 }}>
            <ViewListIcon sx={{ fontSize: 18, mr: 0.5 }} /> Table
          </ToggleButton>
          <ToggleButton value="card" sx={{ textTransform: 'none', px: 1.5 }}>
            <ViewModuleIcon sx={{ fontSize: 18, mr: 0.5 }} /> Grouped
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Card (grouped) view */}
      {viewMode === 'card' && !loading && filteredAssets.length > 0 && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {groupedAssets.map((group) => (
            <Grid item xs={6} sm={4} md={3} lg={2} key={group.key}>
              <GroupedAssetCard
                group={group}
                navigate={navigate}
                getStatusColor={getStatusColor}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Assets Table */}
      {viewMode === 'table' && (
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
                  <TableCell padding="checkbox" sx={{ width: '48px' }}>
                    <Checkbox
                      size="small"
                      checked={allVisibleSelected}
                      indeterminate={someVisibleSelected && !allVisibleSelected}
                      onChange={toggleSelectAll}
                      sx={{ color: '#cbd5e1', '&.Mui-checked': { color: '#dc2626' }, '&.MuiCheckbox-indeterminate': { color: '#dc2626' } }}
                    />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', width: '60px' }}>Image</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Asset Tag</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Serial Number</TableCell>
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
                    selected={selectedIds.has(asset.id)}
                    sx={{
                      cursor: 'pointer',
                      '&:hover': { backgroundColor: '#f8fafc' },
                      '&.Mui-selected': { backgroundColor: '#fef2f2' },
                      '&.Mui-selected:hover': { backgroundColor: '#fee2e2' }
                    }}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        size="small"
                        checked={selectedIds.has(asset.id)}
                        onChange={() => toggleSelect(asset.id)}
                        sx={{ color: '#cbd5e1', '&.Mui-checked': { color: '#dc2626' } }}
                      />
                    </TableCell>
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
                    <TableCell sx={{ fontSize: '0.875rem' }}>{asset.serialNumber || '-'}</TableCell>
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
                          onClick={() => navigate(`/dashboard/assets/${asset.assetTag}`)}
                          sx={{ color: '#3b82f6' }}
                        >
                          <ViewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          onClick={() => navigate(`/dashboard/assets/${asset.assetTag}/edit`)}
                          sx={{ color: '#f59e0b' }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Duplicate">
                        <IconButton
                          size="small"
                          onClick={() => handleDuplicate(asset)}
                          sx={{ color: '#8b5cf6' }}
                        >
                          <DuplicateIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Handover PDF">
                        <IconButton
                          size="small"
                          onClick={() => setHandoverAsset(asset)}
                          sx={{ color: '#dc2626' }}
                        >
                          <HandoverIcon fontSize="small" />
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
      )}

      {/* QR Scanner Dialog */}
      <QRScanner
        open={qrScannerOpen}
        onClose={() => setQrScannerOpen(false)}
        onScan={(data) => {
          // Navigate to the scanned asset detail page using asset tag
          navigate(`/dashboard/assets/${data.assetTag || data.id}`);
        }}
      />

      <AssetHandoverDialog
        open={Boolean(handoverAsset)}
        onClose={() => setHandoverAsset(null)}
        asset={handoverAsset}
      />

      <AssetHandoverDialog
        open={multiHandoverOpen}
        onClose={() => setMultiHandoverOpen(false)}
        assets={selectedAssets}
      />
    </Box>
  );
};

// A single card representing a group of similar assets (same name + brand +
// category). Shows shared info with a count badge and an expandable list of the
// individual units (tag + serial), each linking to its detail/edit page.
const GroupedAssetCard = ({ group, navigate, getStatusColor }: any) => {
  const [open, setOpen] = useState(false);
  const { rep, items, count, totalValue } = group;

  const fmt = (value: number) =>
    new Intl.NumberFormat('en-TZ', { style: 'currency', currency: 'TZS', minimumFractionDigits: 0 }).format(value || 0);

  // Tag range summary, e.g. "UD-0015 – UD-0017"
  const tags = items.map((i: any) => i.assetTag).sort();
  const tagSummary = count > 1 ? `${tags[0]} – ${tags[tags.length - 1]}` : tags[0];

  return (
    <Card elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', transition: 'box-shadow 0.2s ease', '&:hover': { boxShadow: '0 6px 16px rgba(0,0,0,0.1)' } }}>
      {/* Image banner on top, with the count badge overlaid */}
      <Box sx={{ position: 'relative', width: '100%', height: 130, backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {rep.imageUrl ? (
          <img src={rep.imageUrl} alt={rep.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        ) : (
          <CategoryIcon sx={{ fontSize: 48, color: '#cbd5e1' }} />
        )}
        <Chip
          label={`×${count}`}
          size="small"
          sx={{ position: 'absolute', top: 8, right: 8, backgroundColor: '#dc2626', color: '#fff', fontWeight: 700, height: 24 }}
        />
      </Box>
      <CardContent sx={{ p: 1.5, flex: 1 }}>
        <Typography
          variant="subtitle2"
          title={rep.name}
          sx={{
            fontWeight: 700,
            color: '#1e293b',
            lineHeight: 1.25,
            fontSize: '0.8rem',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            minHeight: '2.1em',
          }}
        >
          {rep.name}
        </Typography>
        <Typography variant="caption" noWrap sx={{ color: '#64748b', display: 'block', fontSize: '0.68rem' }}>
          {[rep.brand, rep.category?.name].filter(Boolean).join(' · ')}
        </Typography>
        <Typography variant="caption" noWrap sx={{ color: '#94a3b8', display: 'block', mt: 0.25, fontSize: '0.66rem' }}>
          {tagSummary}
        </Typography>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, mt: 1.5, pt: 1.5, borderTop: '1px solid #f1f5f9' }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', fontSize: '0.65rem' }}>Each</Typography>
            <Typography noWrap sx={{ fontWeight: 600, color: '#1e293b', fontSize: '0.8rem' }}>{fmt(Number(rep.purchasePrice))}</Typography>
          </Box>
          <Box sx={{ textAlign: 'right', minWidth: 0 }}>
            <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', fontSize: '0.65rem' }}>Total ({count})</Typography>
            <Typography noWrap sx={{ fontWeight: 700, color: '#dc2626', fontSize: '0.8rem' }}>{fmt(totalValue)}</Typography>
          </Box>
        </Box>

        <Button
          size="small"
          fullWidth
          onClick={() => setOpen((o) => !o)}
          endIcon={<ExpandMoreIcon sx={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />}
          sx={{ mt: 1, textTransform: 'none', color: '#475569', justifyContent: 'space-between' }}
        >
          {open ? 'Hide units' : `View ${count} unit${count === 1 ? '' : 's'}`}
        </Button>

        <Collapse in={open}>
          <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {items.map((a: any) => (
              <Box
                key={a.id}
                sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 0.75, borderRadius: 1, border: '1px solid #f1f5f9', '&:hover': { backgroundColor: '#f8fafc' } }}
              >
                <Box sx={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: getStatusColor(a.status), flexShrink: 0 }} />
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#dc2626', display: 'block' }}>{a.assetTag}</Typography>
                  <Typography variant="caption" noWrap sx={{ color: '#64748b', display: 'block' }}>
                    SN: {a.serialNumber || '—'}
                  </Typography>
                </Box>
                <Tooltip title="View">
                  <IconButton size="small" onClick={() => navigate(`/dashboard/assets/${a.assetTag}`)} sx={{ color: '#3b82f6' }}>
                    <ViewIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Edit">
                  <IconButton size="small" onClick={() => navigate(`/dashboard/assets/${a.assetTag}/edit`)} sx={{ color: '#f59e0b' }}>
                    <EditIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              </Box>
            ))}
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  );
};

export default AssetList;
