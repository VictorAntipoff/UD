import { useState, useEffect, type FC } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
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
  Divider,
  InputAdornment,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import PendingIcon from '@mui/icons-material/HourglassEmpty';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
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
import SearchIcon from '@mui/icons-material/Search';
import InfoIcon from '@mui/icons-material/Info';
import InventoryIcon from '@mui/icons-material/Inventory';
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

interface TransferHistory {
  id: string;
  transferId: string;
  transferNumber: string;
  userId: string;
  userName: string;
  userEmail: string;
  action: string;
  details: string | null;
  timestamp: string;
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
  history?: TransferHistory[];
}

const woodStatuses = [
  { value: 'NOT_DRIED', label: 'Not Dried' },
  { value: 'UNDER_DRYING', label: 'Under Drying' },
  { value: 'DRIED', label: 'Dried' },
  { value: 'DAMAGED', label: 'Damaged' }
];

const thicknessOptions = ['1"', '2"', 'Custom'];

const WoodTransfer: FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [woodTypes, setWoodTypes] = useState<WoodType[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [warehouseStock, setWarehouseStock] = useState<any[]>([]);
  const [loadingStock, setLoadingStock] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>([]);

  // Dialog states
  const [openDialog, setOpenDialog] = useState(false);
  const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openCompleteDialog, setOpenCompleteDialog] = useState(false);
  const [openNotifyDialog, setOpenNotifyDialog] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);
  const [selectedNotifyUserId, setSelectedNotifyUserId] = useState('');
  const [formData, setFormData] = useState({
    fromWarehouseId: '',
    toWarehouseId: '',
    transferDate: new Date().toISOString().split('T')[0], // Default to today
    notes: '',
    notifyUserId: ''
  });
  const [editFormData, setEditFormData] = useState({
    transferDate: '',
    notes: ''
  });
  const [editItems, setEditItems] = useState<TransferItem[]>([]);

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
    fetchUsers();
  }, []);

  // Auto-expand sections with data, collapse empty ones (except completed is always collapsed)
  useEffect(() => {
    const newExpanded: string[] = [];

    const pending = transfers.filter(t => t.status === 'PENDING');
    const inTransit = transfers.filter(t => t.status === 'APPROVED' || t.status === 'IN_TRANSIT');

    if (pending.length > 0) newExpanded.push('pending');
    if (inTransit.length > 0) newExpanded.push('inTransit');
    // 'completed' is never auto-expanded

    setExpandedSections(newExpanded);
  }, [transfers]);

  // Handle transfer URL parameter to auto-open details
  useEffect(() => {
    const transferId = searchParams.get('transfer');
    if (transferId && transfers.length > 0) {
      const transfer = transfers.find(t => t.id === transferId);
      if (transfer) {
        handleOpenDetails(transfer);
        // Remove the query parameter after opening
        setSearchParams({});
      }
    }
  }, [searchParams, transfers]);

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

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  const fetchWarehouseStock = async (warehouseId: string) => {
    try {
      setLoadingStock(true);
      const response = await api.get(`/management/warehouses/${warehouseId}/stock`);
      setWarehouseStock(response.data);
    } catch (err) {
      console.error('Failed to fetch warehouse stock:', err);
      setWarehouseStock([]);
    } finally {
      setLoadingStock(false);
    }
  };

  const handleOpenDialog = () => {
    // Only reset form fields, but keep transferDate from the current state
    // This preserves the user-selected date
    setFormData({
      ...formData, // Keep existing formData (especially transferDate)
      fromWarehouseId: '',
      toWarehouseId: '',
      notes: '',
      notifyUserId: ''
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
    setWarehouseStock([]);
    setOpenDialog(true);
  };

  const handleFromWarehouseChange = async (warehouseId: string) => {
    setFormData({ ...formData, fromWarehouseId: warehouseId });

    // Find the selected warehouse to check if it has stock control
    const selectedWarehouse = warehouses.find(w => w.id === warehouseId);
    if (selectedWarehouse?.stockControlEnabled) {
      await fetchWarehouseStock(warehouseId);
    } else {
      setWarehouseStock([]);
    }
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleOpenDetails = async (transfer: Transfer) => {
    try {
      // Fetch full transfer details including history
      const response = await api.get(`/transfers/${transfer.id}`);
      setSelectedTransfer(response.data);
      setOpenDetailsDialog(true);
    } catch (err) {
      console.error('Failed to fetch transfer details:', err);
      // Fallback to the transfer from the list
      setSelectedTransfer(transfer);
      setOpenDetailsDialog(true);
    }
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

  const handleOpenComplete = (transfer: Transfer) => {
    setSelectedTransfer(transfer);
    setSelectedNotifyUserId('');
    setOpenCompleteDialog(true);
  };

  const handleCloseComplete = () => {
    setOpenCompleteDialog(false);
    setSelectedTransfer(null);
    setSelectedNotifyUserId('');
  };

  const handleComplete = async () => {
    if (!selectedTransfer) return;

    try {
      await api.post(`/transfers/${selectedTransfer.id}/complete`, {
        notifyUserId: selectedNotifyUserId || undefined
      });
      setSuccess('Transfer completed successfully');
      handleCloseComplete();
      fetchTransfers();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to complete transfer');
    }
  };

  const handleOpenNotify = (transfer: Transfer) => {
    setSelectedTransfer(transfer);
    setSelectedNotifyUserId('');
    setOpenNotifyDialog(true);
  };

  const handleCloseNotify = () => {
    setOpenNotifyDialog(false);
    setSelectedTransfer(null);
    setSelectedNotifyUserId('');
  };

  const handleSendNotification = async () => {
    if (!selectedTransfer || !selectedNotifyUserId) {
      setError('Please select a user to notify');
      return;
    }

    try {
      await api.post(`/transfers/${selectedTransfer.id}/notify`, {
        userId: selectedNotifyUserId
      });
      setSuccess('Notification sent successfully');
      handleCloseNotify();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send notification');
    }
  };

  const handleOpenEdit = async (transfer: Transfer) => {
    setSelectedTransfer(transfer);
    setEditFormData({
      transferDate: transfer.transferDate.split('T')[0],
      notes: transfer.notes || ''
    });
    setEditItems(transfer.items);

    // If transfer is IN_TRANSIT and source warehouse has stock control, fetch stock for validation
    if (transfer.status === 'IN_TRANSIT' && transfer.fromWarehouse.stockControlEnabled) {
      await fetchWarehouseStock(transfer.fromWarehouse.id);
    }

    setOpenEditDialog(true);
  };

  const handleCloseEdit = () => {
    setOpenEditDialog(false);
    setSelectedTransfer(null);
    setWarehouseStock([]);
  };

  const handleEditItemChange = (index: number, field: string, value: any) => {
    const updatedItems = [...editItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setEditItems(updatedItems);
  };

  const handleSubmitEdit = async () => {
    if (!selectedTransfer) return;

    try {
      // Validate stock availability for IN_TRANSIT transfers if source has stock control
      if (selectedTransfer.status === 'IN_TRANSIT' && selectedTransfer.fromWarehouse.stockControlEnabled) {
        for (const item of editItems) {
          const originalItem = selectedTransfer.items.find(i => i.id === item.id);
          if (!originalItem) continue;

          // Check if quantity increased
          if (item.quantity > originalItem.quantity) {
            const additionalQuantity = item.quantity - originalItem.quantity;
            const availableStock = getAvailableStock(item.woodType.id, item.thickness, item.woodStatus);

            if (availableStock < additionalQuantity) {
              setError(`Insufficient stock for ${item.woodType.name} (${item.thickness}). Available: ${availableStock}, Additional needed: ${additionalQuantity}`);
              return;
            }
          }
        }
      }

      // Use admin-edit endpoint only for completed transfers, regular PUT for non-completed
      const endpoint = selectedTransfer.status === 'COMPLETED'
        ? `/transfers/${selectedTransfer.id}/admin-edit`
        : `/transfers/${selectedTransfer.id}`;

      // Update transfer metadata (date, notes)
      await api.put(endpoint, editFormData);

      // Update each item if it changed
      for (const item of editItems) {
        const originalItem = selectedTransfer.items.find(i => i.id === item.id);
        if (!originalItem) continue;

        // Check if item changed
        if (
          item.woodType.id !== originalItem.woodType.id ||
          item.quantity !== originalItem.quantity ||
          item.thickness !== originalItem.thickness ||
          item.woodStatus !== originalItem.woodStatus ||
          item.remarks !== originalItem.remarks
        ) {
          await api.put(`/transfers/${selectedTransfer.id}/items/${item.id}`, {
            woodTypeId: item.woodType.id,
            quantity: item.quantity,
            thickness: item.thickness,
            woodStatus: item.woodStatus,
            remarks: item.remarks
          });
        }
      }

      setSuccess('Transfer updated successfully');
      handleCloseEdit();
      await fetchTransfers();

      // If details dialog is open, refresh the selected transfer to show updated history
      if (selectedTransfer && openDetailsDialog) {
        try {
          const response = await api.get(`/transfers/${selectedTransfer.id}`);
          setSelectedTransfer(response.data);
        } catch (err) {
          console.error('Failed to refresh transfer details:', err);
        }
      }
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

  const getAvailableStock = (woodTypeId: string, thickness: string, woodStatus: string) => {
    const stockItem = warehouseStock.find(
      s => s.woodTypeId === woodTypeId && s.thickness === thickness
    );
    if (!stockItem) return 0;

    switch (woodStatus) {
      case 'NOT_DRIED':
        return stockItem.statusNotDried || 0;
      case 'UNDER_DRYING':
        return stockItem.statusUnderDrying || 0;
      case 'DRIED':
        return stockItem.statusDried || 0;
      case 'DAMAGED':
        return stockItem.statusDamaged || 0;
      default:
        return 0;
    }
  };

  const getStockItem = (woodTypeId: string, thickness: string) => {
    return warehouseStock.find(
      s => s.woodTypeId === woodTypeId && s.thickness === thickness
    );
  };

  // Toggle section expansion
  const toggleSection = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  // Filter transfers by search
  const filterTransfers = (statusFilter: string[]) => {
    return transfers.filter(transfer => {
      const matchesStatus = statusFilter.includes(transfer.status);
      if (!matchesStatus) return false;

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
  };

  // Calculate counts
  const pendingTransfers = filterTransfers(['PENDING']);
  const inTransitTransfers = filterTransfers(['APPROVED', 'IN_TRANSIT']);
  const completedTransfers = filterTransfers(['COMPLETED']);

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

        {/* Search Box */}
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            mb: 3,
            border: '1px solid #e2e8f0',
            borderRadius: 2,
            backgroundColor: '#fff'
          }}
        >
          <TextField
            placeholder="Search transfers by number, warehouse, wood type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            fullWidth
            size="medium"
            sx={{
              '& .MuiOutlinedInput-root': {
                fontSize: '0.9rem',
                '& fieldset': {
                  borderColor: '#e2e8f0',
                },
                '&:hover fieldset': {
                  borderColor: '#cbd5e1',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#dc2626',
                  borderWidth: '2px',
                },
              }
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: '#94a3b8', fontSize: 22 }} />
                </InputAdornment>
              ),
            }}
          />
        </Paper>

        {/* Collapsible Sections */}
        <Grid container spacing={2}>
          {/* Pending Approval Section */}
          <Grid item xs={12}>
            <Accordion
              expanded={expandedSections.includes('pending')}
              onChange={() => toggleSection('pending')}
              elevation={0}
              sx={{
                border: '1px solid #e2e8f0',
                '&:before': { display: 'none' },
                borderRadius: '12px',
                overflow: 'hidden',
                transition: 'all 0.3s ease',
                backgroundColor: '#f8fafc'
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon sx={{ color: '#475569', fontSize: 28 }} />}
                sx={{
                  backgroundColor: '#f1f5f9',
                  '&:hover': {
                    backgroundColor: '#e2e8f0',
                  },
                  minHeight: 72,
                  '& .MuiAccordionSummary-content': {
                    my: 2
                  }
                }}
              >
                <Box display="flex" alignItems="center" gap={2.5} width="100%">
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: '10px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #cbd5e1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <PendingIcon sx={{ fontSize: 28, color: '#64748b' }} />
                  </Box>
                  <Box flex={1}>
                    <Typography variant="h6" fontWeight="bold" sx={{ color: '#334155', fontSize: '1.1rem', mb: 0.3 }}>
                      Pending Approval
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.85rem' }}>
                      {pendingTransfers.length} {pendingTransfers.length === 1 ? 'transfer' : 'transfers'} awaiting approval
                    </Typography>
                  </Box>
                  <Chip
                    label={pendingTransfers.length}
                    sx={{
                      backgroundColor: '#64748b',
                      color: '#fff',
                      fontWeight: 'bold',
                      fontSize: '0.9rem',
                      height: 32,
                      minWidth: 40,
                      borderRadius: '8px',
                    }}
                  />
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 0 }}>
                {pendingTransfers.length === 0 ? (
                  <Box sx={{ p: 4, textAlign: 'center' }}>
                    <Typography color="text.secondary">No pending transfers</Typography>
                  </Box>
                ) : (
                  <Stack spacing={0} divider={<Divider sx={{ borderColor: '#e2e8f0' }} />}>
                    {pendingTransfers.map((transfer) => (
                <Box
                  key={transfer.id}
                  sx={{
                    p: 2.5,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      backgroundColor: '#f1f5f9',
                      transform: 'translateX(4px)'
                    }
                  }}
                >
                  <Box display="flex" alignItems="center" gap={2.5} flex={1}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 1.5,
                        backgroundColor: '#f1f5f9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <LocalShippingIcon sx={{ fontSize: 22, color: '#64748b' }} />
                    </Box>
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
                      <Stack direction="row" spacing={1}>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<VisibilityIcon />}
                          onClick={() => handleOpenDetails(transfer)}
                          sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                        >
                          Details
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
                        onClick={() => handleOpenComplete(transfer)}
                      >
                        Mark Received
                      </Button>
                    )}
                    {/* Edit button for non-completed transfers - FACTORY_MANAGER, WAREHOUSE_MANAGER, ADMIN */}
                    {['ADMIN', 'FACTORY_MANAGER', 'WAREHOUSE_MANAGER'].includes(user?.role || '') &&
                     transfer.status !== 'COMPLETED' && (
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
                    {/* Admin-only: Edit button for completed transfers */}
                    {user?.role === 'ADMIN' && transfer.status === 'COMPLETED' && (
                      <>
                        <Button
                          variant="outlined"
                          size="small"
                          color="warning"
                          startIcon={<EditIcon />}
                          onClick={() => handleOpenEdit(transfer)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          color="primary"
                          startIcon={<PersonIcon />}
                          onClick={() => handleOpenNotify(transfer)}
                          sx={{
                            textTransform: 'none',
                            fontSize: '0.75rem'
                          }}
                        >
                          Notify
                        </Button>
                      </>
                    )}
                      </Stack>
                    </Box>
                  </Box>
                  ))}
                  </Stack>
                )}
              </AccordionDetails>
            </Accordion>
          </Grid>

          {/* In Transit Section */}
          <Grid item xs={12}>
            <Accordion
              expanded={expandedSections.includes('inTransit')}
              onChange={() => toggleSection('inTransit')}
              elevation={0}
              sx={{
                border: '1px solid #fecaca',
                '&:before': { display: 'none' },
                borderRadius: '12px',
                overflow: 'hidden',
                transition: 'all 0.3s ease',
                backgroundColor: '#fef2f2'
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon sx={{ color: '#991b1b', fontSize: 28 }} />}
                sx={{
                  backgroundColor: '#fee2e2',
                  '&:hover': {
                    backgroundColor: '#fecaca',
                  },
                  minHeight: 72,
                  '& .MuiAccordionSummary-content': {
                    my: 2
                  }
                }}
              >
                <Box display="flex" alignItems="center" gap={2.5} width="100%">
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: '10px',
                      backgroundColor: '#fef2f2',
                      border: '1px solid #fecaca',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <LocalShippingIcon sx={{ fontSize: 28, color: '#dc2626' }} />
                  </Box>
                  <Box flex={1}>
                    <Typography variant="h6" fontWeight="bold" sx={{ color: '#991b1b', fontSize: '1.1rem', mb: 0.3 }}>
                      In Transit
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#b91c1c', fontSize: '0.85rem' }}>
                      {inTransitTransfers.length} {inTransitTransfers.length === 1 ? 'transfer' : 'transfers'} in progress
                    </Typography>
                  </Box>
                  <Chip
                    label={inTransitTransfers.length}
                    sx={{
                      backgroundColor: '#dc2626',
                      color: '#fff',
                      fontWeight: 'bold',
                      fontSize: '0.9rem',
                      height: 32,
                      minWidth: 40,
                      borderRadius: '8px',
                    }}
                  />
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 0 }}>
                {inTransitTransfers.length === 0 ? (
                  <Box sx={{ p: 4, textAlign: 'center' }}>
                    <Typography color="text.secondary">No transfers in transit</Typography>
                  </Box>
                ) : (
                  <Stack spacing={0} divider={<Divider sx={{ borderColor: '#fee2e2' }} />}>
                    {inTransitTransfers.map((transfer) => (
                <Box
                  key={transfer.id}
                  sx={{
                    p: 2.5,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      backgroundColor: '#fee2e2',
                      transform: 'translateX(4px)'
                    }
                  }}
                >
                  <Box display="flex" alignItems="center" gap={2.5} flex={1}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 1.5,
                        backgroundColor: '#fee2e2',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <LocalShippingIcon sx={{ fontSize: 22, color: '#dc2626' }} />
                    </Box>
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
                      <Stack direction="row" spacing={1}>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<VisibilityIcon />}
                          onClick={() => handleOpenDetails(transfer)}
                          sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                        >
                          Details
                        </Button>
                    {(transfer.status === 'APPROVED' || transfer.status === 'IN_TRANSIT') && (
                      <Button
                        variant="contained"
                        size="small"
                        color="primary"
                        onClick={() => handleOpenComplete(transfer)}
                        sx={{ fontSize: '0.75rem' }}
                      >
                        Receive
                      </Button>
                    )}
                    {['ADMIN', 'FACTORY_MANAGER', 'WAREHOUSE_MANAGER'].includes(user?.role || '') && (
                      <Button
                        variant="outlined"
                        size="small"
                        color="warning"
                        startIcon={<EditIcon />}
                        onClick={() => handleOpenEdit(transfer)}
                        sx={{ fontSize: '0.75rem' }}
                      >
                        Edit
                      </Button>
                    )}
                        </Stack>
                      </Box>
                    </Box>
                    ))}
                  </Stack>
                )}
              </AccordionDetails>
            </Accordion>
          </Grid>

          {/* Completed Section */}
          <Grid item xs={12}>
            <Accordion
              expanded={expandedSections.includes('completed')}
              onChange={() => toggleSection('completed')}
              elevation={0}
              sx={{
                border: '1px solid #e2e8f0',
                '&:before': { display: 'none' },
                borderRadius: '12px',
                overflow: 'hidden',
                transition: 'all 0.3s ease',
                backgroundColor: '#f8fafc'
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon sx={{ color: '#475569', fontSize: 28 }} />}
                sx={{
                  backgroundColor: '#f1f5f9',
                  '&:hover': {
                    backgroundColor: '#e2e8f0',
                  },
                  minHeight: 72,
                  '& .MuiAccordionSummary-content': {
                    my: 2
                  }
                }}
              >
                <Box display="flex" alignItems="center" gap={2.5} width="100%">
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: '10px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #cbd5e1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <CheckIcon sx={{ fontSize: 28, color: '#64748b' }} />
                  </Box>
                  <Box flex={1}>
                    <Typography variant="h6" fontWeight="bold" sx={{ color: '#334155', fontSize: '1.1rem', mb: 0.3 }}>
                      Completed
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.85rem' }}>
                      {completedTransfers.length} {completedTransfers.length === 1 ? 'transfer' : 'transfers'} completed
                    </Typography>
                  </Box>
                  <Chip
                    label={completedTransfers.length}
                    sx={{
                      backgroundColor: '#64748b',
                      color: '#fff',
                      fontWeight: 'bold',
                      fontSize: '0.9rem',
                      height: 32,
                      minWidth: 40,
                      borderRadius: '8px',
                    }}
                  />
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 0 }}>
                {completedTransfers.length === 0 ? (
                  <Box sx={{ p: 4, textAlign: 'center' }}>
                    <Typography color="text.secondary">No completed transfers</Typography>
                  </Box>
                ) : (
                  <Stack spacing={0} divider={<Divider sx={{ borderColor: '#e2e8f0' }} />}>
                    {completedTransfers.map((transfer) => (
                <Box
                  key={transfer.id}
                  sx={{
                    p: 2.5,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      backgroundColor: '#f1f5f9',
                      transform: 'translateX(4px)'
                    }
                  }}
                >
                  <Box display="flex" alignItems="center" gap={2.5} flex={1}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 1.5,
                        backgroundColor: '#f1f5f9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <LocalShippingIcon sx={{ fontSize: 22, color: '#64748b' }} />
                    </Box>
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
                      <Stack direction="row" spacing={1}>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<VisibilityIcon />}
                          onClick={() => handleOpenDetails(transfer)}
                          sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                        >
                          Details
                        </Button>
                    {user?.role === 'ADMIN' && (
                      <>
                        <Button
                          variant="outlined"
                          size="small"
                          color="warning"
                          startIcon={<EditIcon />}
                          onClick={() => handleOpenEdit(transfer)}
                          sx={{ fontSize: '0.75rem' }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          color="primary"
                          startIcon={<PersonIcon />}
                          onClick={() => handleOpenNotify(transfer)}
                          sx={{ fontSize: '0.75rem' }}
                        >
                          Notify
                        </Button>
                      </>
                    )}
                        </Stack>
                      </Box>
                    </Box>
                    ))}
                  </Stack>
                )}
              </AccordionDetails>
            </Accordion>
          </Grid>
        </Grid>

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
                    onChange={(e) => handleFromWarehouseChange(e.target.value)}
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
                        {w.name} ({w.code}) {w.stockControlEnabled && '📦'}
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

                  <TextField
                    select
                    label="Notify User (Optional)"
                    value={formData.notifyUserId}
                    onChange={(e) => setFormData({ ...formData, notifyUserId: e.target.value })}
                    fullWidth
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PersonIcon color="action" />
                        </InputAdornment>
                      ),
                    }}
                    helperText="Select a user to notify about this transfer"
                  >
                    <MenuItem value="">
                      <em>None</em>
                    </MenuItem>
                    {users.map((u) => (
                      <MenuItem key={u.id} value={u.id}>
                        {u.firstName && u.lastName
                          ? `${u.firstName} ${u.lastName}`
                          : u.user_metadata?.full_name || u.email}
                      </MenuItem>
                    ))}
                  </TextField>
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
                            helperText={
                              formData.fromWarehouseId &&
                              warehouses.find(w => w.id === formData.fromWarehouseId)?.stockControlEnabled &&
                              item.woodTypeId &&
                              item.thickness &&
                              item.woodStatus
                                ? `Available: ${getAvailableStock(item.woodTypeId, item.thickness, item.woodStatus)} pcs`
                                : ''
                            }
                            error={Boolean(
                              formData.fromWarehouseId &&
                              warehouses.find(w => w.id === formData.fromWarehouseId)?.stockControlEnabled &&
                              item.woodTypeId &&
                              item.thickness &&
                              item.woodStatus &&
                              item.quantity &&
                              parseInt(item.quantity) > getAvailableStock(item.woodTypeId, item.thickness, item.woodStatus)
                            )}
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

                        {/* Stock Availability Display */}
                        {formData.fromWarehouseId &&
                         warehouses.find(w => w.id === formData.fromWarehouseId)?.stockControlEnabled &&
                         item.woodTypeId &&
                         item.thickness && (
                          <Box sx={{ mt: 1 }}>
                            {loadingStock ? (
                              <Box display="flex" alignItems="center" gap={1}>
                                <CircularProgress size={16} />
                                <Typography variant="caption" color="text.secondary">
                                  Loading inventory...
                                </Typography>
                              </Box>
                            ) : (() => {
                              const stockItem = getStockItem(item.woodTypeId, item.thickness);
                              if (!stockItem) {
                                return (
                                  <Alert severity="warning" icon={<InfoIcon fontSize="small" />} sx={{ py: 0.5 }}>
                                    <Typography variant="caption">
                                      No stock available for {woodTypes.find(w => w.id === item.woodTypeId)?.name} - {item.thickness}
                                    </Typography>
                                  </Alert>
                                );
                              }
                              // Calculate total stock
                              const totalStock = (stockItem.statusNotDried || 0) +
                                                 (stockItem.statusUnderDrying || 0) +
                                                 (stockItem.statusDried || 0) +
                                                 (stockItem.statusDamaged || 0);

                              return (
                                <Paper elevation={0} sx={{ p: 1.5, bgcolor: '#f0fdf4', border: '1px solid #86efac' }}>
                                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.5}>
                                    <Box display="flex" alignItems="center" gap={0.5}>
                                      <InventoryIcon sx={{ fontSize: 14, color: '#16a34a' }} />
                                      <Typography variant="caption" fontWeight="bold" color="#16a34a">
                                        Available Stock
                                      </Typography>
                                    </Box>
                                    <Typography variant="caption" fontWeight="bold" color="#16a34a">
                                      Total: {totalStock} pcs
                                    </Typography>
                                  </Box>
                                  <Grid container spacing={1}>
                                    <Grid item xs={6}>
                                      <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        sx={{
                                          fontWeight: item.woodStatus === 'NOT_DRIED' ? 'bold' : 'normal',
                                          bgcolor: item.woodStatus === 'NOT_DRIED' ? '#dcfce7' : 'transparent',
                                          px: 0.5,
                                          py: 0.25,
                                          borderRadius: 0.5,
                                          display: 'inline-block'
                                        }}
                                      >
                                        Not Dried: <strong style={{ color: item.woodStatus === 'NOT_DRIED' ? '#16a34a' : '#059669' }}>{stockItem.statusNotDried || 0} pcs</strong>
                                      </Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                      <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        sx={{
                                          fontWeight: item.woodStatus === 'UNDER_DRYING' ? 'bold' : 'normal',
                                          bgcolor: item.woodStatus === 'UNDER_DRYING' ? '#dcfce7' : 'transparent',
                                          px: 0.5,
                                          py: 0.25,
                                          borderRadius: 0.5,
                                          display: 'inline-block'
                                        }}
                                      >
                                        Under Drying: <strong style={{ color: item.woodStatus === 'UNDER_DRYING' ? '#16a34a' : '#059669' }}>{stockItem.statusUnderDrying || 0} pcs</strong>
                                      </Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                      <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        sx={{
                                          fontWeight: item.woodStatus === 'DRIED' ? 'bold' : 'normal',
                                          bgcolor: item.woodStatus === 'DRIED' ? '#dcfce7' : 'transparent',
                                          px: 0.5,
                                          py: 0.25,
                                          borderRadius: 0.5,
                                          display: 'inline-block'
                                        }}
                                      >
                                        Dried: <strong style={{ color: item.woodStatus === 'DRIED' ? '#16a34a' : '#059669' }}>{stockItem.statusDried || 0} pcs</strong>
                                      </Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                      <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        sx={{
                                          fontWeight: item.woodStatus === 'DAMAGED' ? 'bold' : 'normal',
                                          bgcolor: item.woodStatus === 'DAMAGED' ? '#fee2e2' : 'transparent',
                                          px: 0.5,
                                          py: 0.25,
                                          borderRadius: 0.5,
                                          display: 'inline-block'
                                        }}
                                      >
                                        Damaged: <strong style={{ color: item.woodStatus === 'DAMAGED' ? '#dc2626' : '#dc2626' }}>{stockItem.statusDamaged || 0} pcs</strong>
                                      </Typography>
                                    </Grid>
                                  </Grid>
                                </Paper>
                              );
                            })()}
                          </Box>
                        )}
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
                lineItems.some(item => !item.woodTypeId || !item.quantity) ||
                // Prevent submitting if any item exceeds available stock
                (warehouses.find(w => w.id === formData.fromWarehouseId)?.stockControlEnabled &&
                  lineItems.some(item =>
                    item.woodTypeId &&
                    item.thickness &&
                    item.woodStatus &&
                    item.quantity &&
                    parseInt(item.quantity) > getAvailableStock(item.woodTypeId, item.thickness, item.woodStatus)
                  ))
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

                {/* Timeline / History */}
                <Paper elevation={0} sx={{ p: 1.5, bgcolor: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 2 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem', mb: 1 }}>
                    Transfer History
                  </Typography>
                  <Stack spacing={1}>
                    {selectedTransfer.history && selectedTransfer.history.length > 0 ? (
                      selectedTransfer.history.map((historyItem, index) => (
                        <Box
                          key={historyItem.id}
                          sx={{
                            borderLeft: '2px solid #e2e8f0',
                            pl: 2,
                            pb: index < selectedTransfer.history!.length - 1 ? 1 : 0
                          }}
                        >
                          <Typography variant="body2" sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#2c3e50' }}>
                            {historyItem.action.replace(/_/g, ' ')}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            {historyItem.userName} • {format(new Date(historyItem.timestamp), 'MMM dd, yyyy HH:mm')}
                          </Typography>
                          {historyItem.details && (
                            <Typography
                              variant="caption"
                              sx={{
                                display: 'block',
                                mt: 0.5,
                                color: '#64748b',
                                fontStyle: 'italic',
                                fontSize: '0.7rem'
                              }}
                            >
                              {historyItem.details}
                            </Typography>
                          )}
                        </Box>
                      ))
                    ) : (
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
                    fileName={`${selectedTransfer.transferNumber}.pdf`}
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
                {selectedTransfer?.status === 'COMPLETED' ? 'Edit Transfer (Admin)' : 'Edit Transfer'}
              </Typography>
            </Box>
          </DialogTitle>
          <DialogContent>
            {selectedTransfer && (
              <Stack spacing={3} sx={{ mt: 2 }}>
                {selectedTransfer.status === 'COMPLETED' ? (
                  <Alert severity="warning">
                    You are editing a completed transfer. All changes will be logged in the transfer history.
                  </Alert>
                ) : (
                  <Alert severity="info">
                    You are editing this transfer. All changes will be logged in the transfer history.
                  </Alert>
                )}

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

                {/* Transfer Items - Only show for IN_TRANSIT status */}
                {selectedTransfer.status === 'IN_TRANSIT' && editItems.length > 0 && (
                  <>
                    <Divider />
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CategoryIcon fontSize="small" />
                        Transfer Items
                      </Typography>
                      <Stack spacing={2}>
                        {editItems.map((item, index) => {
                          const originalItem = selectedTransfer.items.find(i => i.id === item.id);
                          return (
                            <Paper
                              key={item.id}
                              elevation={0}
                              sx={{
                                p: 2,
                                border: '1px solid #e2e8f0',
                                borderRadius: 2,
                                bgcolor: '#f8fafc'
                              }}
                            >
                              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                <TextField
                                  select
                                  label="Wood Type"
                                  value={item.woodType.id}
                                  onChange={(e) => {
                                    const selectedWoodType = woodTypes.find(wt => wt.id === e.target.value);
                                    if (selectedWoodType) {
                                      handleEditItemChange(index, 'woodType', selectedWoodType);
                                    }
                                  }}
                                  size="small"
                                  sx={{ minWidth: 200 }}
                                >
                                  {woodTypes.map((wt) => (
                                    <MenuItem key={wt.id} value={wt.id}>
                                      {wt.name}
                                    </MenuItem>
                                  ))}
                                </TextField>
                                <Chip
                                  label={getWoodStatusLabel(item.woodStatus)}
                                  size="small"
                                  sx={{ height: 20, fontSize: '0.7rem' }}
                                />
                              </Box>

                              <Stack spacing={2}>
                                <Box display="flex" gap={2}>
                                  <TextField
                                    label="Thickness"
                                    value={item.thickness}
                                    size="small"
                                    fullWidth
                                    disabled
                                    sx={{ bgcolor: '#f1f5f9' }}
                                  />

                                  <TextField
                                    label="Quantity"
                                    type="number"
                                    value={item.quantity}
                                    onChange={(e) => handleEditItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                                    fullWidth
                                    size="small"
                                    inputProps={{ min: 1 }}
                                    helperText={
                                      selectedTransfer.fromWarehouse.stockControlEnabled && originalItem
                                        ? item.quantity > originalItem.quantity
                                          ? `Available to add: ${getAvailableStock(item.woodType.id, item.thickness, item.woodStatus)} pcs`
                                          : `Original: ${originalItem.quantity} pcs`
                                        : ''
                                    }
                                    error={Boolean(
                                      selectedTransfer.fromWarehouse.stockControlEnabled &&
                                      originalItem &&
                                      item.quantity > originalItem.quantity &&
                                      (item.quantity - originalItem.quantity) > getAvailableStock(item.woodType.id, item.thickness, item.woodStatus)
                                    )}
                                  />
                                </Box>

                                <TextField
                                  label="Remarks (Optional)"
                                  value={item.remarks || ''}
                                  onChange={(e) => handleEditItemChange(index, 'remarks', e.target.value)}
                                  fullWidth
                                  size="small"
                                  multiline
                                  rows={2}
                                  placeholder="Add remarks for this item..."
                                />

                                {/* Stock Availability Display - Only show if quantity is increasing */}
                                {selectedTransfer.fromWarehouse.stockControlEnabled &&
                                 originalItem &&
                                 item.quantity > originalItem.quantity && (
                                  <Box sx={{ mt: 1 }}>
                                    {loadingStock ? (
                                      <Box display="flex" alignItems="center" gap={1}>
                                        <CircularProgress size={16} />
                                        <Typography variant="caption" color="text.secondary">
                                          Loading inventory...
                                        </Typography>
                                      </Box>
                                    ) : (() => {
                                      const stockItem = getStockItem(item.woodType.id, item.thickness);
                                      if (!stockItem) {
                                        return (
                                          <Alert severity="warning" icon={<InfoIcon fontSize="small" />} sx={{ py: 0.5 }}>
                                            <Typography variant="caption">
                                              No stock available for {item.woodType.name} - {item.thickness}
                                            </Typography>
                                          </Alert>
                                        );
                                      }

                                      const additionalNeeded = item.quantity - originalItem.quantity;
                                      const availableForStatus = getAvailableStock(item.woodType.id, item.thickness, item.woodStatus);

                                      return (
                                        <Paper elevation={0} sx={{ p: 1.5, bgcolor: availableForStatus >= additionalNeeded ? '#f0fdf4' : '#fef2f2', border: `1px solid ${availableForStatus >= additionalNeeded ? '#86efac' : '#fca5a5'}` }}>
                                          <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.5}>
                                            <Box display="flex" alignItems="center" gap={0.5}>
                                              <InventoryIcon sx={{ fontSize: 14, color: availableForStatus >= additionalNeeded ? '#16a34a' : '#dc2626' }} />
                                              <Typography variant="caption" fontWeight="bold" color={availableForStatus >= additionalNeeded ? '#16a34a' : '#dc2626'}>
                                                Additional needed: {additionalNeeded} pcs
                                              </Typography>
                                            </Box>
                                            <Typography variant="caption" fontWeight="bold" color={availableForStatus >= additionalNeeded ? '#16a34a' : '#dc2626'}>
                                              Available ({getWoodStatusLabel(item.woodStatus)}): {availableForStatus} pcs
                                            </Typography>
                                          </Box>
                                        </Paper>
                                      );
                                    })()}
                                  </Box>
                                )}
                              </Stack>
                            </Paper>
                          );
                        })}
                      </Stack>
                    </Box>
                  </>
                )}

                {selectedTransfer.status === 'COMPLETED' && (
                  <Alert severity="info">
                    <strong>Note:</strong> Warehouse and item details cannot be changed after completion. Contact system administrator if stock adjustments are needed.
                  </Alert>
                )}
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
              disabled={
                selectedTransfer?.status === 'IN_TRANSIT' &&
                selectedTransfer?.fromWarehouse.stockControlEnabled &&
                editItems.some(item => {
                  const originalItem = selectedTransfer.items.find(i => i.id === item.id);
                  if (!originalItem) return false;

                  // Check if quantity increased and exceeds available stock
                  if (item.quantity > originalItem.quantity) {
                    const additionalQuantity = item.quantity - originalItem.quantity;
                    const availableStock = getAvailableStock(item.woodType.id, item.thickness, item.woodStatus);
                    return additionalQuantity > availableStock;
                  }
                  return false;
                })
              }
            >
              Save Changes
            </Button>
          </DialogActions>
        </Dialog>

        {/* Complete Transfer Dialog */}
        <Dialog
          open={openCompleteDialog}
          onClose={handleCloseComplete}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            <Box display="flex" alignItems="center" gap={1}>
              <CheckIcon color="success" />
              <Typography variant="h6" fontWeight="bold">
                Complete Transfer
              </Typography>
            </Box>
          </DialogTitle>
          <DialogContent>
            <Stack spacing={3} sx={{ mt: 2 }}>
              <Alert severity="info">
                Mark this transfer as completed (goods received at destination)?
              </Alert>

              {selectedTransfer && (
                <Paper elevation={0} sx={{ p: 2, bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <Typography variant="caption" color="text.secondary">
                    Transfer Number
                  </Typography>
                  <Typography variant="body1" fontWeight="medium" sx={{ mb: 1 }}>
                    {selectedTransfer.transferNumber}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    From {selectedTransfer.fromWarehouse.name} → {selectedTransfer.toWarehouse.name}
                  </Typography>
                </Paper>
              )}

              <TextField
                select
                label="Notify User (Optional)"
                value={selectedNotifyUserId}
                onChange={(e) => setSelectedNotifyUserId(e.target.value)}
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon color="action" />
                    </InputAdornment>
                  ),
                }}
                helperText="Select a user to notify about completion"
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {users.map((u) => (
                  <MenuItem key={u.id} value={u.id}>
                    {u.firstName && u.lastName
                      ? `${u.firstName} ${u.lastName}`
                      : u.user_metadata?.full_name || u.email}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={handleCloseComplete} size="large">
              Cancel
            </Button>
            <Button
              onClick={handleComplete}
              variant="contained"
              color="success"
              size="large"
              startIcon={<CheckIcon />}
            >
              Complete Transfer
            </Button>
          </DialogActions>
        </Dialog>

        {/* Send Notification Dialog */}
        <Dialog
          open={openNotifyDialog}
          onClose={handleCloseNotify}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            <Box display="flex" alignItems="center" gap={1}>
              <PersonIcon color="primary" />
              <Typography variant="h6" fontWeight="bold">
                Send Notification
              </Typography>
            </Box>
          </DialogTitle>
          <DialogContent>
            <Stack spacing={3} sx={{ mt: 2 }}>
              {selectedTransfer && (
                <Paper elevation={0} sx={{ p: 2, bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <Typography variant="caption" color="text.secondary">
                    Transfer Number
                  </Typography>
                  <Typography variant="body1" fontWeight="medium" sx={{ mb: 1 }}>
                    {selectedTransfer.transferNumber}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Status: {selectedTransfer.status}
                  </Typography>
                </Paper>
              )}

              <TextField
                select
                label="Select User to Notify"
                value={selectedNotifyUserId}
                onChange={(e) => setSelectedNotifyUserId(e.target.value)}
                fullWidth
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon color="action" />
                    </InputAdornment>
                  ),
                }}
                helperText="Choose a user to send transfer notification"
              >
                <MenuItem value="">
                  <em>Select a user</em>
                </MenuItem>
                {users.map((u) => (
                  <MenuItem key={u.id} value={u.id}>
                    {u.firstName && u.lastName
                      ? `${u.firstName} ${u.lastName}`
                      : u.user_metadata?.full_name || u.email}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={handleCloseNotify} size="large">
              Cancel
            </Button>
            <Button
              onClick={handleSendNotification}
              variant="contained"
              color="primary"
              size="large"
              startIcon={<PersonIcon />}
              disabled={!selectedNotifyUserId}
            >
              Send Notification
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default WoodTransfer;
