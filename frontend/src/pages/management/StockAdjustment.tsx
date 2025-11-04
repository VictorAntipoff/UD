import {
  Container,
  Typography,
  Paper,
  Box,
  Grid,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  MenuItem,
  Card,
  CardContent,
  Divider,
  Chip,
  Alert,
  CircularProgress,
  Stack
} from '@mui/material';
import { useState, useEffect } from 'react';
import { styled } from '@mui/material/styles';
import InventoryIcon from '@mui/icons-material/Inventory';
import TuneIcon from '@mui/icons-material/Tune';
import HistoryIcon from '@mui/icons-material/History';
import api from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';

const StyledContainer = styled(Container)(({ theme }) => ({
  minHeight: '100vh',
  paddingTop: theme.spacing(4),
  paddingBottom: theme.spacing(4),
  backgroundColor: '#f8fafc',
}));

const textFieldSx = {
  '& .MuiOutlinedInput-root': {
    '& fieldset': {
      borderColor: 'rgba(0, 0, 0, 0.12)',
    },
    '&:hover fieldset': {
      borderColor: '#dc2626',
    },
    '&.Mui-focused fieldset': {
      borderColor: '#dc2626',
    },
  },
  '& .MuiInputLabel-root': {
    '&.Mui-focused': {
      color: '#dc2626',
    },
  },
};

interface Warehouse {
  id: string;
  code: string;
  name: string;
  stockControlEnabled: boolean;
}

interface WoodType {
  id: string;
  name: string;
  grade: string;
}

interface Stock {
  id: string;
  warehouseId: string;
  woodTypeId: string;
  thickness: string;
  statusNotDried: number;
  statusUnderDrying: number;
  statusDried: number;
  statusDamaged: number;
  woodType: WoodType;
}

interface StockAdjustment {
  id: string;
  warehouseId: string;
  woodTypeId: string;
  thickness: string;
  woodStatus: string;
  quantityBefore: number;
  quantityAfter: number;
  quantityChange: number;
  reason: string;
  notes?: string;
  adjustedAt: string;
  woodType: WoodType;
  warehouse: Warehouse;
  adjustedBy: {
    email: string;
    firstName?: string;
    lastName?: string;
  };
}

const WOOD_STATUSES = [
  { value: 'NOT_DRIED', label: 'Not Dried' },
  { value: 'UNDER_DRYING', label: 'Under Drying' },
  { value: 'DRIED', label: 'Dried' },
  { value: 'DAMAGED', label: 'Damaged' }
];

const ADJUSTMENT_REASONS = [
  { value: 'DAMAGED', label: 'Damaged' },
  { value: 'LOST', label: 'Lost' },
  { value: 'FOUND_EXTRA', label: 'Found Extra' },
  { value: 'COUNTING_ERROR', label: 'Counting Error' },
  { value: 'OTHER', label: 'Other' }
];

const THICKNESS_OPTIONS = [
  { value: '1"', label: '1 inch' },
  { value: '2"', label: '2 inch' },
  { value: 'Custom', label: 'Custom' }
];

export default function StockAdjustment() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [woodTypes, setWoodTypes] = useState<WoodType[]>([]);
  const [currentStock, setCurrentStock] = useState<Stock | null>(null);
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);
  const [loading, setLoading] = useState(true);
  const [adjusting, setAdjusting] = useState(false);

  const [formData, setFormData] = useState({
    warehouseId: '',
    woodTypeId: '',
    thickness: '',
    woodStatus: '',
    quantityAfter: '',
    reason: '',
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [warehousesRes, woodTypesRes, adjustmentsRes] = await Promise.all([
        api.get('/management/warehouses'),
        api.get('/factory/wood-types'),
        api.get('/management/stock/adjustments')
      ]);

      const stockControlWarehouses = (warehousesRes.data || []).filter(
        (w: Warehouse) => w.stockControlEnabled && w.status === 'ACTIVE'
      );

      setWarehouses(stockControlWarehouses);
      setWoodTypes(woodTypesRes.data || []);
      setAdjustments(adjustmentsRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentStock = async () => {
    if (!formData.warehouseId || !formData.woodTypeId || !formData.thickness) {
      setCurrentStock(null);
      return;
    }

    try {
      const response = await api.get(`/management/warehouses/${formData.warehouseId}/stock`);
      const stocks = response.data || [];
      const stock = stocks.find(
        (s: Stock) => s.woodTypeId === formData.woodTypeId && s.thickness === formData.thickness
      );
      setCurrentStock(stock || null);
    } catch (error) {
      console.error('Error fetching current stock:', error);
      setCurrentStock(null);
    }
  };

  useEffect(() => {
    fetchCurrentStock();
  }, [formData.warehouseId, formData.woodTypeId, formData.thickness]);

  const getCurrentQuantity = (): number => {
    if (!currentStock || !formData.woodStatus) return 0;

    const statusMap: { [key: string]: keyof Stock } = {
      'NOT_DRIED': 'statusNotDried',
      'UNDER_DRYING': 'statusUnderDrying',
      'DRIED': 'statusDried',
      'DAMAGED': 'statusDamaged'
    };

    const field = statusMap[formData.woodStatus];
    return currentStock[field] as number || 0;
  };

  const getQuantityChange = (): number => {
    if (!formData.quantityAfter) return 0;
    return parseInt(formData.quantityAfter) - getCurrentQuantity();
  };

  const handleAdjust = async () => {
    if (adjusting) return;

    if (!formData.warehouseId || !formData.woodTypeId || !formData.thickness ||
        !formData.woodStatus || formData.quantityAfter === '' || !formData.reason) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setAdjusting(true);

      await api.post('/management/stock/adjust', {
        warehouseId: formData.warehouseId,
        woodTypeId: formData.woodTypeId,
        thickness: formData.thickness,
        woodStatus: formData.woodStatus,
        quantityAfter: parseInt(formData.quantityAfter),
        reason: formData.reason,
        notes: formData.notes || undefined
      });

      // Reset form
      setFormData({
        warehouseId: formData.warehouseId, // Keep warehouse selected
        woodTypeId: '',
        thickness: '',
        woodStatus: '',
        quantityAfter: '',
        reason: '',
        notes: ''
      });

      setCurrentStock(null);

      // Refresh data
      await fetchData();
      alert('Stock adjusted successfully!');
    } catch (error: any) {
      console.error('Error adjusting stock:', error);
      alert(error.response?.data?.error || 'Failed to adjust stock');
    } finally {
      setAdjusting(false);
    }
  };

  const getReasonLabel = (reason: string) => {
    const item = ADJUSTMENT_REASONS.find(r => r.value === reason);
    return item?.label || reason;
  };

  const getStatusLabel = (status: string) => {
    const item = WOOD_STATUSES.find(s => s.value === status);
    return item?.label || status;
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      'NOT_DRIED': '#fbbf24',
      'UNDER_DRYING': '#3b82f6',
      'DRIED': '#10b981',
      'DAMAGED': '#dc2626'
    };
    return colors[status] || '#64748b';
  };

  if (loading) {
    return (
      <StyledContainer maxWidth="xl">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <CircularProgress sx={{ color: '#dc2626' }} />
        </Box>
      </StyledContainer>
    );
  }

  if (!isAdmin) {
    return (
      <StyledContainer maxWidth="xl">
        <Alert severity="error">
          You don't have permission to access stock adjustments. Only admins can adjust stock.
        </Alert>
      </StyledContainer>
    );
  }

  const currentQuantity = getCurrentQuantity();
  const quantityChange = getQuantityChange();

  return (
    <StyledContainer maxWidth="xl">
      {/* Header */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
          borderRadius: 2,
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <TuneIcon sx={{ fontSize: 28, color: 'white' }} />
          </Box>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: 'white', mb: 0.5 }}>
              Stock Adjustment
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
              Adjust stock quantities for physical count corrections
            </Typography>
          </Box>
        </Box>
      </Paper>

      <Grid container spacing={3}>
        {/* Adjustment Form */}
        <Grid item xs={12} lg={6}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid #e2e8f0' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
              <InventoryIcon sx={{ color: '#dc2626', fontSize: 24 }} />
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
                New Adjustment
              </Typography>
            </Box>

            <Stack spacing={2.5}>
              <TextField
                select
                fullWidth
                label="Warehouse"
                value={formData.warehouseId}
                onChange={(e) => setFormData({ ...formData, warehouseId: e.target.value })}
                size="small"
                sx={textFieldSx}
                required
              >
                {warehouses.map((warehouse) => (
                  <MenuItem key={warehouse.id} value={warehouse.id}>
                    {warehouse.name} ({warehouse.code})
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                fullWidth
                label="Wood Type"
                value={formData.woodTypeId}
                onChange={(e) => setFormData({ ...formData, woodTypeId: e.target.value })}
                size="small"
                sx={textFieldSx}
                disabled={!formData.warehouseId}
                required
              >
                {woodTypes.map((type) => (
                  <MenuItem key={type.id} value={type.id}>
                    {type.name} ({type.grade})
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                fullWidth
                label="Thickness"
                value={formData.thickness}
                onChange={(e) => setFormData({ ...formData, thickness: e.target.value })}
                size="small"
                sx={textFieldSx}
                disabled={!formData.woodTypeId}
                required
              >
                {THICKNESS_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                fullWidth
                label="Wood Status"
                value={formData.woodStatus}
                onChange={(e) => setFormData({ ...formData, woodStatus: e.target.value })}
                size="small"
                sx={textFieldSx}
                disabled={!formData.thickness}
                required
              >
                {WOOD_STATUSES.map((status) => (
                  <MenuItem key={status.value} value={status.value}>
                    {status.label}
                  </MenuItem>
                ))}
              </TextField>

              {formData.woodStatus && (
                <Card elevation={0} sx={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1' }}>
                  <CardContent sx={{ p: 2 }}>
                    <Typography variant="body2" sx={{ color: '#64748b', mb: 1 }}>
                      Current Stock Level
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b' }}>
                      {currentQuantity} pieces
                    </Typography>
                  </CardContent>
                </Card>
              )}

              <TextField
                fullWidth
                type="number"
                label="New Quantity After Adjustment"
                value={formData.quantityAfter}
                onChange={(e) => setFormData({ ...formData, quantityAfter: e.target.value })}
                size="small"
                sx={textFieldSx}
                disabled={!formData.woodStatus}
                required
                inputProps={{ min: 0 }}
              />

              {formData.quantityAfter && (
                <Alert
                  severity={quantityChange >= 0 ? 'success' : 'warning'}
                  sx={{ borderRadius: 1 }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Change: {quantityChange >= 0 ? '+' : ''}{quantityChange} pieces
                  </Typography>
                </Alert>
              )}

              <TextField
                select
                fullWidth
                label="Reason for Adjustment"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                size="small"
                sx={textFieldSx}
                required
              >
                {ADJUSTMENT_REASONS.map((reason) => (
                  <MenuItem key={reason.value} value={reason.value}>
                    {reason.label}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                fullWidth
                multiline
                rows={3}
                label="Notes (Optional)"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                size="small"
                sx={textFieldSx}
                placeholder="Additional details about this adjustment..."
              />

              <Button
                variant="contained"
                onClick={handleAdjust}
                disabled={adjusting || !formData.warehouseId || !formData.woodTypeId ||
                         !formData.thickness || !formData.woodStatus ||
                         formData.quantityAfter === '' || !formData.reason}
                startIcon={adjusting ? <CircularProgress size={20} sx={{ color: 'white' }} /> : <TuneIcon />}
                sx={{
                  backgroundColor: '#dc2626',
                  textTransform: 'none',
                  fontWeight: 600,
                  py: 1.5,
                  '&:hover': {
                    backgroundColor: '#b91c1c',
                  },
                  '&:disabled': {
                    backgroundColor: '#f87171',
                    color: 'white',
                    opacity: 0.7
                  }
                }}
              >
                {adjusting ? 'Adjusting Stock...' : 'Adjust Stock'}
              </Button>
            </Stack>
          </Paper>
        </Grid>

        {/* Adjustment History */}
        <Grid item xs={12} lg={6}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid #e2e8f0' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
              <HistoryIcon sx={{ color: '#dc2626', fontSize: 24 }} />
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
                Recent Adjustments
              </Typography>
            </Box>

            <TableContainer sx={{ maxHeight: 600 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, backgroundColor: '#f8fafc' }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 700, backgroundColor: '#f8fafc' }}>Wood</TableCell>
                    <TableCell sx={{ fontWeight: 700, backgroundColor: '#f8fafc' }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700, backgroundColor: '#f8fafc' }}>Change</TableCell>
                    <TableCell sx={{ fontWeight: 700, backgroundColor: '#f8fafc' }}>Reason</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {adjustments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                        <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                          No adjustments yet
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    adjustments.map((adjustment) => (
                      <TableRow key={adjustment.id} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                            {new Date(adjustment.adjustedAt).toLocaleDateString()}
                          </Typography>
                          <Typography variant="caption" sx={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                            {new Date(adjustment.adjustedAt).toLocaleTimeString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
                            {adjustment.woodType.name}
                          </Typography>
                          <Typography variant="caption" sx={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                            {adjustment.thickness}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={getStatusLabel(adjustment.woodStatus)}
                            size="small"
                            sx={{
                              backgroundColor: getStatusColor(adjustment.woodStatus),
                              color: 'white',
                              fontSize: '0.65rem',
                              height: 20
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            sx={{
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              color: adjustment.quantityChange >= 0 ? '#10b981' : '#dc2626'
                            }}
                          >
                            {adjustment.quantityChange >= 0 ? '+' : ''}{adjustment.quantityChange}
                          </Typography>
                          <Typography variant="caption" sx={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                            {adjustment.quantityBefore} → {adjustment.quantityAfter}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                            {getReasonLabel(adjustment.reason)}
                          </Typography>
                          {adjustment.notes && (
                            <Typography variant="caption" sx={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                              {adjustment.notes}
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
    </StyledContainer>
  );
}
