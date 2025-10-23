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
  MenuItem,
  Stack,
  Tooltip,
  Divider,
  InputAdornment,
  Grid,
  Collapse
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import VisibilityIcon from '@mui/icons-material/Visibility';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import CategoryIcon from '@mui/icons-material/Category';
import StraightenIcon from '@mui/icons-material/Straighten';
import NumbersIcon from '@mui/icons-material/Numbers';
import PersonIcon from '@mui/icons-material/Person';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import NotesIcon from '@mui/icons-material/Notes';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import SearchIcon from '@mui/icons-material/Search';
import api from '../../lib/api';
import { format } from 'date-fns';
import { PDFDownloadLink, BlobProvider } from '@react-pdf/renderer';
import { WoodTransferReport } from '../../components/reports/WoodTransferReport';
import { useAuth } from '../../hooks/useAuth';
import EditIcon from '@mui/icons-material/Edit';

interface Warehouse {
  id: string;
  code: string;
  name: string;
  stockControlEnabled: boolean;
}

interface WoodType {
  id: string;
  name: string;
}

interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  user_metadata?: {
    full_name?: string;
  };
}

interface TransferItem {
  id: string;
  woodType: WoodType;
  thickness: string;
  quantity: number;
  woodStatus: 'NOT_DRIED' | 'UNDER_DRYING' | 'DRIED' | 'DAMAGED';
  remarks: string | null;
}

interface Transfer {
  id: string;
  transferNumber: string;
  fromWarehouse: Warehouse;
  toWarehouse: Warehouse;
  items: TransferItem[];
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'IN_TRANSIT' | 'COMPLETED';
  transferDate: string;
  notes: string | null;
  createdBy: User;
  approvedBy: User | null;
  createdAt: string;
  approvedAt: string | null;
  completedAt: string | null;
}

const woodStatuses = [
  { value: 'NOT_DRIED', label: 'Not Dried' },
  { value: 'UNDER_DRYING', label: 'Under Drying' },
  { value: 'DRIED', label: 'Dried' },
  { value: 'DAMAGED', label: 'Damaged' }
];

const thicknessOptions = ['1"', '2"', 'Custom'];

const WoodTransfer: FC = () => {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [woodTypes, setWoodTypes] = useState<WoodType[]>([]);
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog states
  const [openDialog, setOpenDialog] = useState(false);
  const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);
  const [formData, setFormData] = useState({
    fromWarehouseId: '',
    toWarehouseId: '',
    transferDate: new Date().toISOString().split('T')[0], // Default to today
    notes: ''
  });
  const [editFormData, setEditFormData] = useState({
    transferDate: '',
    notes: ''
  });

  // Line items state
  const [lineItems, setLineItems] = useState([
    {
      woodTypeId: '',
      thickness: '1"',
      quantity: '',
      woodStatus: 'NOT_DRIED' as const,
      remarks: ''
    }
  ]);

  useEffect(() => {
    fetchTransfers();
    fetchWarehouses();
    fetchWoodTypes();
  }, []);

  const fetchTransfers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/transfers');
      setTransfers(response.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch transfers');
    } finally {
      setLoading(false);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const response = await api.get('/management/warehouses');
      setWarehouses(response.data);
    } catch (err) {
      console.error('Failed to fetch warehouses:', err);
    }
  };

  const fetchWoodTypes = async () => {
    try {
      const response = await api.get('/factory/wood-types');
      setWoodTypes(response.data);
    } catch (err) {
      console.error('Failed to fetch wood types:', err);
    }
  };

  const handleOpenDialog = () => {
    // Only reset form fields, but keep transferDate from the current state
    // This preserves the user-selected date
    setFormData({
      ...formData, // Keep existing formData (especially transferDate)
      fromWarehouseId: '',
      toWarehouseId: '',
      notes: ''
    });
    setLineItems([
      {
        woodTypeId: '',
        thickness: '1"',
        quantity: '',
        woodStatus: 'NOT_DRIED',
        remarks: ''
      }
    ]);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleOpenDetails = (transfer: Transfer) => {
    setSelectedTransfer(transfer);
    setOpenDetailsDialog(true);
  };

  const handleCloseDetails = () => {
    setOpenDetailsDialog(false);
    setSelectedTransfer(null);
  };

  const handleAddLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        woodTypeId: '',
        thickness: '1"',
        quantity: '',
        woodStatus: 'NOT_DRIED',
        remarks: ''
      }
    ]);
  };

  const handleRemoveLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  const handleLineItemChange = (index: number, field: string, value: any) => {
    const updatedItems = [...lineItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setLineItems(updatedItems);
  };

  const handleSubmit = async () => {
    try {
      const payload = {
        ...formData,
        items: lineItems.map(item => ({
          ...item,
          quantity: parseInt(item.quantity)
        }))
      };
      await api.post('/transfers', payload);
      setSuccess('Transfer created successfully');
      handleCloseDialog();
      fetchTransfers();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create transfer');
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await api.post(`/transfers/${id}/approve`);
      setSuccess('Transfer approved successfully');
      fetchTransfers();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to approve transfer');
    }
  };

  const handleReject = async (id: string) => {
    const reason = window.prompt('Enter rejection reason:');
    if (!reason) return;

    try {
      await api.post(`/transfers/${id}/reject`, { rejectionReason: reason });
      setSuccess('Transfer rejected');
      fetchTransfers();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to reject transfer');
    }
  };

  const handleComplete = async (id: string) => {
    if (!window.confirm('Mark this transfer as completed (goods received)?')) {
      return;
    }

    try {
      await api.post(`/transfers/${id}/complete`);
      setSuccess('Transfer completed successfully');
      fetchTransfers();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to complete transfer');
    }
  };

  const handleOpenEdit = (transfer: Transfer) => {
    setSelectedTransfer(transfer);
    setEditFormData({
      transferDate: transfer.transferDate.split('T')[0],
      notes: transfer.notes || ''
    });
    setOpenEditDialog(true);
  };

  const handleCloseEdit = () => {
    setOpenEditDialog(false);
    setSelectedTransfer(null);
  };

  const handleSubmitEdit = async () => {
    if (!selectedTransfer) return;

    try {
      await api.put(`/transfers/${selectedTransfer.id}/admin-edit`, editFormData);
      setSuccess('Transfer updated successfully');
      handleCloseEdit();
      fetchTransfers();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update transfer');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'warning';
      case 'APPROVED': return 'info';
      case 'IN_TRANSIT': return 'primary';
      case 'COMPLETED': return 'success';
      case 'REJECTED': return 'error';
      default: return 'default';
    }
  };

  const getWoodStatusLabel = (status: string) => {
    return woodStatuses.find(s => s.value === status)?.label || status;
  };

  const toggleCardExpanded = (transferId: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(transferId)) {
        newSet.delete(transferId);
      } else {
        newSet.add(transferId);
      }
      return newSet;
    });
  };

  const getUserDisplay = (user: User | null) => {
    if (!user) return '-';
    const name = [user.firstName, user.lastName].filter(Boolean).join(' ');
    return name || user.email;
  };

  // Calculate counts for each tab
  const pendingCount = transfers.filter(t => t.status === 'PENDING').length;
  const inTransitCount = transfers.filter(t => t.status === 'APPROVED' || t.status === 'IN_TRANSIT').length;
  const completedCount = transfers.filter(t => t.status === 'COMPLETED').length;

  const filteredTransfers = transfers.filter(transfer => {
    // Filter by tab
    let matchesTab = false;
    if (tabValue === 0) matchesTab = transfer.status === 'PENDING';
    else if (tabValue === 1) matchesTab = transfer.status === 'APPROVED' || transfer.status === 'IN_TRANSIT';
    else if (tabValue === 2) matchesTab = transfer.status === 'COMPLETED';
    else matchesTab = true;

    if (!matchesTab) return false;

    // Filter by search query
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();
    return (
      transfer.transferNumber.toLowerCase().includes(query) ||
      transfer.fromWarehouse.code.toLowerCase().includes(query) ||
      transfer.fromWarehouse.name.toLowerCase().includes(query) ||
      transfer.toWarehouse.code.toLowerCase().includes(query) ||
      transfer.toWarehouse.name.toLowerCase().includes(query) ||
      transfer.items.some(item => item.woodType.name.toLowerCase().includes(query)) ||
      (transfer.notes && transfer.notes.toLowerCase().includes(query))
    );
  });

  if (loading && transfers.length === 0) {
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
            <LocalShippingIcon sx={{ fontSize: 40, color: 'primary.main' }} />
            <Typography variant="h4" component="h1" fontWeight="bold">
              Wood Transfers
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenDialog}
          >
            New Transfer
          </Button>
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

        {/* Search and Filter */}
        <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <Chip
              label={`Pending Approval (${pendingCount})`}
              onClick={() => setTabValue(0)}
              color={tabValue === 0 ? 'primary' : 'default'}
              variant={tabValue === 0 ? 'filled' : 'outlined'}
              sx={{
                fontWeight: tabValue === 0 ? 'bold' : 'normal',
                px: 1,
                cursor: 'pointer'
              }}
            />
            <Chip
              label={`In Transit (${inTransitCount})`}
              onClick={() => setTabValue(1)}
              color={tabValue === 1 ? 'warning' : 'default'}
              variant={tabValue === 1 ? 'filled' : 'outlined'}
              sx={{
                fontWeight: tabValue === 1 ? 'bold' : 'normal',
                px: 1,
                cursor: 'pointer'
              }}
            />
            <Chip
              label="Completed"
              onClick={() => setTabValue(2)}
              color={tabValue === 2 ? 'success' : 'default'}
              variant={tabValue === 2 ? 'filled' : 'outlined'}
              sx={{
                fontWeight: tabValue === 2 ? 'bold' : 'normal',
                px: 1,
                cursor: 'pointer'
              }}
            />
            <Chip
              label="All Transfers"
              onClick={() => setTabValue(3)}
              color={tabValue === 3 ? 'secondary' : 'default'}
              variant={tabValue === 3 ? 'filled' : 'outlined'}
              sx={{
                fontWeight: tabValue === 3 ? 'bold' : 'normal',
                px: 1,
                cursor: 'pointer'
              }}
            />
          </Box>

          <TextField
            placeholder="Search transfers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
            sx={{
              width: 300,
              backgroundColor: '#fff',
              '& .MuiOutlinedInput-root': {
                fontSize: '0.875rem'
              }
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: '#64748b' }} />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        {/* Transfers Cards */}
        {filteredTransfers.length === 0 ? (
          <Paper sx={{ p: 6, textAlign: 'center' }}>
            <Typography color="text.secondary" variant="h6">
              No transfers found in this category.
            </Typography>
          </Paper>
        ) : (
          <Stack spacing={2}>
            {filteredTransfers.map((transfer) => {
              const isExpanded = expandedCards.has(transfer.id);
              return (
                <Paper
                  key={transfer.id}
                  elevation={0}
                  sx={{
                    border: '1px solid #e2e8f0',
                    borderRadius: 2,
                    mb: 2,
                    transition: 'all 0.2s',
                    overflow: 'hidden',
                    '&:before': {
                      display: 'none'
                    }
                  }}
                >
                  {/* Collapsed Header */}
                  <Box
                    sx={{
                      p: 2,
                      backgroundColor: '#f8fafc',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor: '#f1f5f9'
                      }
                    }}
                    onClick={() => toggleCardExpanded(transfer.id)}
                  >
                    <Box display="flex" alignItems="center" gap={2} flex={1}>
                      <LocalShippingIcon sx={{ fontSize: 24, color: '#dc2626' }} />
                      <Box flex={1}>
                        <Typography variant="subtitle1" fontWeight="bold" sx={{ fontSize: '0.875rem' }}>
                          {transfer.transferNumber}
                        </Typography>
                        <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                            {transfer.fromWarehouse.code} → {transfer.toWarehouse.code}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                            •
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                            {transfer.items?.length || 0} items ({transfer.items?.reduce((sum, item) => sum + item.quantity, 0) || 0} pcs)
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                            •
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                            {format(new Date(transfer.transferDate), 'MMM dd, yyyy')}
                          </Typography>
                        </Box>
                      </Box>
                      <Chip
                        label={transfer.status.replace('_', ' ')}
                        size="small"
                        color={getStatusColor(transfer.status)}
                        sx={{ fontWeight: 700, fontSize: '0.75rem' }}
                      />
                      <IconButton size="small" sx={{ ml: 1 }}>
                        {isExpanded ? <ExpandLessIcon sx={{ color: '#dc2626' }} /> : <ExpandMoreIcon sx={{ color: '#dc2626' }} />}
                      </IconButton>
                    </Box>
                  </Box>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <>
                      <Divider />
                      <Box sx={{ p: 3 }}>
                        <Stack spacing={3}>
                          {/* Warehouse Info */}
                          <Box display="flex" gap={4}>
                    <Box flex={1}>
                      <Typography variant="caption" color="text.secondary" fontWeight="medium">
                        FROM
                      </Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {transfer.fromWarehouse.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {transfer.fromWarehouse.code}
                      </Typography>
                    </Box>
                    <Box display="flex" alignItems="center" sx={{ color: 'text.secondary' }}>
                      <ArrowForwardIcon />
                    </Box>
                    <Box flex={1}>
                      <Typography variant="caption" color="text.secondary" fontWeight="medium">
                        TO
                      </Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {transfer.toWarehouse.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {transfer.toWarehouse.code}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Items Summary */}
                  <Box
                    sx={{
                      bgcolor: '#f8fafc',
                      p: 2,
                      borderRadius: 1,
                      border: '1px solid #e2e8f0'
                    }}
                  >
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary" fontWeight="medium">
                          TOTAL ITEMS
                        </Typography>
                        <Typography variant="h6" fontWeight="bold" color="primary">
                          {transfer.items?.length || 0}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary" fontWeight="medium">
                          TOTAL QUANTITY
                        </Typography>
                        <Typography variant="h6" fontWeight="bold" color="primary">
                          {transfer.items?.reduce((sum, item) => sum + item.quantity, 0) || 0} pcs
                        </Typography>
                      </Grid>
                    </Grid>
                  </Box>

                  {/* Items Preview */}
                  {transfer.items && transfer.items.length > 0 && (
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight="medium" sx={{ mb: 1, display: 'block' }}>
                        ITEMS
                      </Typography>
                      <Stack spacing={1}>
                        {transfer.items.slice(0, 3).map((item, idx) => (
                          <Box
                            key={item.id}
                            display="flex"
                            justifyContent="space-between"
                            alignItems="center"
                            sx={{
                              py: 1,
                              px: 1.5,
                              bgcolor: 'background.paper',
                              borderRadius: 1,
                              border: '1px solid #e2e8f0'
                            }}
                          >
                            <Box display="flex" gap={2} alignItems="center">
                              <Typography variant="caption" color="text.secondary" fontWeight="bold">
                                #{idx + 1}
                              </Typography>
                              <Typography variant="body2" fontWeight="medium">
                                {item.woodType.name}
                              </Typography>
                              <Chip
                                label={item.thickness}
                                size="small"
                                variant="outlined"
                                sx={{ height: 20, fontSize: '0.7rem' }}
                              />
                              <Chip
                                label={getWoodStatusLabel(item.woodStatus)}
                                size="small"
                                sx={{ height: 20, fontSize: '0.7rem' }}
                              />
                            </Box>
                            <Typography variant="body2" fontWeight="bold">
                              {item.quantity} pcs
                            </Typography>
                          </Box>
                        ))}
                        {transfer.items.length > 3 && (
                          <Typography variant="caption" color="primary" sx={{ pl: 1.5, fontStyle: 'italic' }}>
                            +{transfer.items.length - 3} more item{transfer.items.length - 3 !== 1 ? 's' : ''}
                          </Typography>
                        )}
                      </Stack>
                    </Box>
                  )}

                  {/* Actions */}
                  <Box display="flex" gap={1} justifyContent="flex-end">
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<VisibilityIcon />}
                      onClick={() => handleOpenDetails(transfer)}
                      sx={{
                        color: '#dc2626',
                        borderColor: '#dc2626',
                        fontSize: '0.75rem',
                        textTransform: 'none',
                        '&:hover': {
                          borderColor: '#b91c1c',
                          backgroundColor: 'rgba(220, 38, 38, 0.04)',
                        }
                      }}
                    >
                      View Details
                    </Button>
                    {transfer.status === 'PENDING' && (
                      <>
                        <Button
                          variant="contained"
                          size="small"
                          color="success"
                          startIcon={<CheckIcon />}
                          onClick={() => handleApprove(transfer.id)}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          color="error"
                          startIcon={<CloseIcon />}
                          onClick={() => handleReject(transfer.id)}
                        >
                          Reject
                        </Button>
                      </>
                    )}
                    {(transfer.status === 'APPROVED' || transfer.status === 'IN_TRANSIT') && (
                      <Button
                        variant="contained"
                        size="small"
                        color="primary"
                        onClick={() => handleComplete(transfer.id)}
                      >
                        Mark Received
                      </Button>
                    )}
                    {/* Admin-only: Edit button for completed transfers */}
                    {user?.role === 'ADMIN' && transfer.status === 'COMPLETED' && (
                      <Button
                        variant="outlined"
                        size="small"
                        color="warning"
                        startIcon={<EditIcon />}
                        onClick={() => handleOpenEdit(transfer)}
                      >
                        Edit
                      </Button>
                    )}
                          </Box>
                        </Stack>
                      </Box>
                    </>
                  )}
                </Paper>
              );
            })}
          </Stack>
        )}

        {/* Create Transfer Dialog */}
        <Dialog
          open={openDialog}
          onClose={handleCloseDialog}
          maxWidth="md"
          fullWidth
          disableEnforceFocus
          disableAutoFocus
        >
          <DialogTitle>
            <Box display="flex" alignItems="center" gap={1}>
              <LocalShippingIcon color="primary" />
              <Typography variant="h6" fontWeight="bold">
                Create New Transfer
              </Typography>
            </Box>
          </DialogTitle>
          <DialogContent>
            <Stack spacing={3} sx={{ mt: 2 }}>
              {/* Warehouse Section */}
              <Box>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <WarehouseIcon fontSize="small" />
                  Warehouse Route
                </Typography>
                <Stack spacing={2}>
                  <TextField
                    select
                    label="From Warehouse"
                    value={formData.fromWarehouseId}
                    onChange={(e) => setFormData({ ...formData, fromWarehouseId: e.target.value })}
                    required
                    fullWidth
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <WarehouseIcon color="action" />
                        </InputAdornment>
                      ),
                    }}
                  >
                    {warehouses.map((w) => (
                      <MenuItem key={w.id} value={w.id}>
                        {w.name} ({w.code})
                      </MenuItem>
                    ))}
                  </TextField>

                  <TextField
                    select
                    label="To Warehouse"
                    value={formData.toWarehouseId}
                    onChange={(e) => setFormData({ ...formData, toWarehouseId: e.target.value })}
                    required
                    fullWidth
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <WarehouseIcon color="action" />
                        </InputAdornment>
                      ),
                    }}
                  >
                    {warehouses
                      .filter(w => w.id !== formData.fromWarehouseId)
                      .map((w) => (
                        <MenuItem key={w.id} value={w.id}>
                          {w.name} ({w.code})
                        </MenuItem>
                      ))}
                  </TextField>

                  <TextField
                    label="Transfer Date"
                    type="date"
                    value={formData.transferDate}
                    onChange={(e) => setFormData({ ...formData, transferDate: e.target.value })}
                    required
                    fullWidth
                    InputLabelProps={{
                      shrink: true,
                    }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <CalendarTodayIcon color="action" />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Stack>
              </Box>

              <Divider />

              {/* Line Items Section */}
              <Box>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CategoryIcon fontSize="small" />
                    Transfer Items
                  </Typography>
                  <Button
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={handleAddLineItem}
                    variant="outlined"
                  >
                    Add Item
                  </Button>
                </Box>

                <Stack spacing={2}>
                  {lineItems.map((item, index) => (
                    <Paper
                      key={index}
                      elevation={0}
                      sx={{
                        p: 2,
                        border: '1px solid #e2e8f0',
                        borderRadius: 2,
                        bgcolor: '#f8fafc'
                      }}
                    >
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="body2" fontWeight="medium">
                          Item {index + 1}
                        </Typography>
                        {lineItems.length > 1 && (
                          <IconButton
                            size="small"
                            onClick={() => handleRemoveLineItem(index)}
                            color="error"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        )}
                      </Box>

                      <Stack spacing={2}>
                        <TextField
                          select
                          label="Wood Type"
                          value={item.woodTypeId}
                          onChange={(e) => handleLineItemChange(index, 'woodTypeId', e.target.value)}
                          required
                          fullWidth
                          size="small"
                        >
                          {woodTypes.map((wt) => (
                            <MenuItem key={wt.id} value={wt.id}>
                              {wt.name}
                            </MenuItem>
                          ))}
                        </TextField>

                        <Box display="flex" gap={2}>
                          <TextField
                            select
                            label="Thickness"
                            value={item.thickness}
                            onChange={(e) => handleLineItemChange(index, 'thickness', e.target.value)}
                            required
                            fullWidth
                            size="small"
                          >
                            {thicknessOptions.map((t) => (
                              <MenuItem key={t} value={t}>
                                {t}
                              </MenuItem>
                            ))}
                          </TextField>

                          <TextField
                            label="Quantity"
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleLineItemChange(index, 'quantity', e.target.value)}
                            required
                            fullWidth
                            size="small"
                            inputProps={{ min: 1 }}
                          />
                        </Box>

                        <TextField
                          select
                          label="Wood Status"
                          value={item.woodStatus}
                          onChange={(e) => handleLineItemChange(index, 'woodStatus', e.target.value)}
                          required
                          fullWidth
                          size="small"
                        >
                          {woodStatuses.map((s) => (
                            <MenuItem key={s.value} value={s.value}>
                              {s.label}
                            </MenuItem>
                          ))}
                        </TextField>

                        <TextField
                          label="Remarks (Optional)"
                          value={item.remarks}
                          onChange={(e) => handleLineItemChange(index, 'remarks', e.target.value)}
                          fullWidth
                          size="small"
                          multiline
                          rows={2}
                          placeholder="Add remarks for this item..."
                        />
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              </Box>

              <Divider />

              {/* General Notes Section */}
              <TextField
                label="General Notes (Optional)"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                fullWidth
                multiline
                rows={3}
                placeholder="Add any general notes about this transfer..."
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={handleCloseDialog} size="large">
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              variant="contained"
              size="large"
              startIcon={<AddIcon />}
              disabled={
                !formData.fromWarehouseId ||
                !formData.toWarehouseId ||
                lineItems.some(item => !item.woodTypeId || !item.quantity)
              }
            >
              Create Transfer
            </Button>
          </DialogActions>
        </Dialog>

        {/* Transfer Details Dialog */}
        <Dialog
          open={openDetailsDialog}
          onClose={handleCloseDetails}
          maxWidth="sm"
          fullWidth
          disableEnforceFocus
          disableAutoFocus
        >
          <DialogTitle sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
            Transfer Details
          </DialogTitle>
          <DialogContent>
            {selectedTransfer && (
              <Stack spacing={2} sx={{ mt: 1 }}>
                {/* Transfer Number & Status */}
                <Paper elevation={0} sx={{ p: 1.5, bgcolor: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 2 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                        Transfer Number
                      </Typography>
                      <Typography variant="body1" sx={{ color: '#2c3e50', fontWeight: 500, fontSize: '0.85rem' }}>
                        {selectedTransfer.transferNumber}
                      </Typography>
                    </Box>
                    <Chip
                      label={selectedTransfer.status.replace('_', ' ')}
                      color={getStatusColor(selectedTransfer.status)}
                      size="small"
                    />
                  </Box>
                </Paper>

                {/* Route */}
                <Paper elevation={0} sx={{ p: 1.5, bgcolor: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 2 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem', mb: 0.5 }}>
                    Route
                  </Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="body1" sx={{ color: '#2c3e50', fontWeight: 500, fontSize: '0.85rem' }}>
                      {selectedTransfer.fromWarehouse.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      ({selectedTransfer.fromWarehouse.code})
                    </Typography>
                    <ArrowForwardIcon fontSize="small" color="action" />
                    <Typography variant="body1" sx={{ color: '#2c3e50', fontWeight: 500, fontSize: '0.85rem' }}>
                      {selectedTransfer.toWarehouse.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      ({selectedTransfer.toWarehouse.code})
                    </Typography>
                  </Box>
                </Paper>

                {/* Transfer Items */}
                <Paper elevation={0} sx={{ p: 1.5, bgcolor: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 2 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem', mb: 1 }}>
                    Transfer Items
                  </Typography>
                  <Stack spacing={1}>
                    {selectedTransfer.items.map((item, index) => (
                      <Paper
                        key={item.id}
                        elevation={0}
                        sx={{
                          p: 1.5,
                          bgcolor: '#fff',
                          border: '1px solid #e2e8f0',
                          borderRadius: 1
                        }}
                      >
                        <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                          Item {index + 1}
                        </Typography>
                        <Box display="flex" justifyContent="space-between" alignItems="start" mb={0.5}>
                          <Typography variant="body2" sx={{ color: '#2c3e50', fontWeight: 500 }}>
                            {item.woodType.name}
                          </Typography>
                          <Chip
                            label={getWoodStatusLabel(item.woodStatus)}
                            size="small"
                            sx={{ height: '20px', fontSize: '0.7rem' }}
                          />
                        </Box>
                        <Box display="flex" gap={2} mb={0.5}>
                          <Typography variant="caption" color="text.secondary">
                            Thickness: <strong>{item.thickness}</strong>
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Qty: <strong>{item.quantity} pcs</strong>
                          </Typography>
                        </Box>
                        {item.remarks && (
                          <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', display: 'block', mt: 0.5 }}>
                            {item.remarks}
                          </Typography>
                        )}
                      </Paper>
                    ))}
                  </Stack>
                </Paper>

                {/* Timeline */}
                <Paper elevation={0} sx={{ p: 1.5, bgcolor: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 2 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem', mb: 1 }}>
                    Timeline
                  </Typography>
                  <Stack spacing={1.5}>
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                        Created By
                      </Typography>
                      <Typography variant="body1" sx={{ color: '#2c3e50', fontWeight: 500, fontSize: '0.85rem' }}>
                        {getUserDisplay(selectedTransfer.createdBy)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {format(new Date(selectedTransfer.createdAt), 'MMM dd, yyyy HH:mm')}
                      </Typography>
                    </Box>

                    {selectedTransfer.approvedBy && (
                      <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                          {selectedTransfer.status === 'REJECTED' ? 'Rejected By' : 'Approved By'}
                        </Typography>
                        <Typography variant="body1" sx={{ color: '#2c3e50', fontWeight: 500, fontSize: '0.85rem' }}>
                          {getUserDisplay(selectedTransfer.approvedBy)}
                        </Typography>
                        {selectedTransfer.approvedAt && (
                          <Typography variant="caption" color="text.secondary">
                            {format(new Date(selectedTransfer.approvedAt), 'MMM dd, yyyy HH:mm')}
                          </Typography>
                        )}
                      </Box>
                    )}

                    {selectedTransfer.completedAt && (
                      <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                          Completed
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {format(new Date(selectedTransfer.completedAt), 'MMM dd, yyyy HH:mm')}
                        </Typography>
                      </Box>
                    )}
                  </Stack>
                </Paper>

                {/* Notes */}
                {selectedTransfer.notes && (
                  <Paper elevation={0} sx={{ p: 1.5, bgcolor: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem', mb: 0.5 }}>
                      Notes
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                      {selectedTransfer.notes}
                    </Typography>
                  </Paper>
                )}
              </Stack>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2, gap: 2 }}>
            {selectedTransfer && (
              <BlobProvider
                document={
                  <WoodTransferReport
                    transfer={selectedTransfer}
                    timestamp={new Date().toISOString()}
                    user={{
                      email: user?.email || '',
                      name: user?.user_metadata?.full_name || ''
                    }}
                  />
                }
              >
                {({ loading: pdfLoading }) => (
                  <PDFDownloadLink
                    document={
                      <WoodTransferReport
                        transfer={selectedTransfer}
                        timestamp={new Date().toISOString()}
                        user={{
                          email: user?.email || '',
                          name: user?.user_metadata?.full_name || ''
                        }}
                      />
                    }
                    fileName={`transfer-${selectedTransfer.transferNumber}.pdf`}
                    style={{ textDecoration: 'none' }}
                  >
                    <Button
                      variant="outlined"
                      startIcon={<PictureAsPdfIcon />}
                      disabled={pdfLoading}
                    >
                      {pdfLoading ? 'Generating...' : 'Download PDF'}
                    </Button>
                  </PDFDownloadLink>
                )}
              </BlobProvider>
            )}
            <Button onClick={handleCloseDetails} variant="contained">
              Close
            </Button>
          </DialogActions>
        </Dialog>

        {/* Admin Edit Transfer Dialog */}
        <Dialog
          open={openEditDialog}
          onClose={handleCloseEdit}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            <Box display="flex" alignItems="center" gap={1}>
              <EditIcon color="warning" />
              <Typography variant="h6" fontWeight="bold">
                Edit Transfer (Admin)
              </Typography>
            </Box>
          </DialogTitle>
          <DialogContent>
            {selectedTransfer && (
              <Stack spacing={3} sx={{ mt: 2 }}>
                <Alert severity="warning">
                  You are editing a completed transfer. All changes will be logged in the transfer history.
                </Alert>

                <Paper elevation={0} sx={{ p: 1.5, bgcolor: '#f1f5f9', border: '1px solid #e2e8f0' }}>
                  <Typography variant="caption" color="text.secondary">
                    Transfer Number
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {selectedTransfer.transferNumber}
                  </Typography>
                </Paper>

                <TextField
                  label="Transfer Date"
                  type="date"
                  value={editFormData.transferDate}
                  onChange={(e) => setEditFormData({ ...editFormData, transferDate: e.target.value })}
                  fullWidth
                  InputLabelProps={{
                    shrink: true,
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <CalendarTodayIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                />

                <TextField
                  label="Notes"
                  value={editFormData.notes}
                  onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                  fullWidth
                  multiline
                  rows={4}
                  placeholder="Add or update notes..."
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <NotesIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                />

                <Alert severity="info">
                  <strong>Note:</strong> Warehouse and item details cannot be changed after completion. Contact system administrator if stock adjustments are needed.
                </Alert>
              </Stack>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={handleCloseEdit} size="large">
              Cancel
            </Button>
            <Button
              onClick={handleSubmitEdit}
              variant="contained"
              color="warning"
              size="large"
              startIcon={<EditIcon />}
            >
              Save Changes
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default WoodTransfer;
