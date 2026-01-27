import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  TextField,
  MenuItem,
  Box,
  Typography,
  IconButton,
  CircularProgress
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import { format } from 'date-fns';
import api from '../../lib/api';

interface StockMovement {
  id: string;
  createdAt: string;
  warehouseId: string;
  woodTypeId: string;
  thickness: string;
  movementType: string;
  quantityChange: number;
  fromStatus: string | null;
  toStatus: string | null;
  referenceNumber: string | null;
  details: string | null;
  Warehouse: { name: string; code: string };
  WoodType: { name: string };
}

interface Warehouse {
  id: string;
  code: string;
  name: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  woodTypeId: string;
  woodTypeName: string;
  thickness: string;
}

export function StockMovementDialog({ open, onClose, woodTypeId, woodTypeName, thickness }: Props) {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState(30);
  const [warehouseFilter, setWarehouseFilter] = useState('all');
  const [movementTypeFilter, setMovementTypeFilter] = useState('all');
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  useEffect(() => {
    if (open) {
      fetchWarehouses();
      fetchMovements();
    }
  }, [open, woodTypeId, thickness, days, warehouseFilter, movementTypeFilter]);

  const fetchWarehouses = async () => {
    try {
      const response = await api.get('/management/warehouses');
      setWarehouses(response.data.filter((w: any) => w.stockControlEnabled));
    } catch (error) {
      console.error('Failed to fetch warehouses:', error);
    }
  };

  const fetchMovements = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        days: days.toString(),
        thickness: thickness
      });

      if (warehouseFilter !== 'all') {
        params.append('warehouseId', warehouseFilter);
      }

      if (movementTypeFilter !== 'all') {
        params.append('movementType', movementTypeFilter);
      }

      const response = await api.get(`/management/stock/movements/${woodTypeId}?${params}`);
      setMovements(response.data);
    } catch (error) {
      console.error('Failed to fetch movements:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMovementTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      RECEIPT_SYNC: 'Receipt',
      TRANSFER_OUT: 'Transfer Out',
      TRANSFER_IN: 'Transfer In',
      DRYING_START: 'Drying Started',
      DRYING_END: 'Drying Completed',
      MANUAL_ADJUSTMENT: 'Adjustment'
    };
    return labels[type] || type;
  };

  const getMovementColor = (type: string) => {
    const colors: Record<string, 'success' | 'info' | 'warning' | 'default' | 'primary' | 'secondary'> = {
      RECEIPT_SYNC: 'success',
      TRANSFER_IN: 'info',
      TRANSFER_OUT: 'warning',
      DRYING_START: 'default',
      DRYING_END: 'primary',
      MANUAL_ADJUSTMENT: 'secondary'
    };
    return colors[type] || 'default';
  };

  const getStatusLabel = (status: string | null) => {
    if (!status) return '-';
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
            Stock Movement History - {woodTypeName} ({thickness})
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {/* Filters */}
        <Box display="flex" gap={2} mb={3}>
          <TextField
            select
            label="Time Period"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            size="small"
            sx={{ minWidth: 150 }}
          >
            <MenuItem value={30}>Last 30 days</MenuItem>
            <MenuItem value={90}>Last 90 days</MenuItem>
            <MenuItem value={180}>Last 180 days</MenuItem>
          </TextField>

          <TextField
            select
            label="Warehouse"
            value={warehouseFilter}
            onChange={(e) => setWarehouseFilter(e.target.value)}
            size="small"
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="all">All Warehouses</MenuItem>
            {warehouses.map((w) => (
              <MenuItem key={w.id} value={w.id}>
                {w.name} ({w.code})
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Movement Type"
            value={movementTypeFilter}
            onChange={(e) => setMovementTypeFilter(e.target.value)}
            size="small"
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="all">All Types</MenuItem>
            <MenuItem value="RECEIPT_SYNC">Receipts</MenuItem>
            <MenuItem value="TRANSFER_OUT">Transfers Out</MenuItem>
            <MenuItem value="TRANSFER_IN">Transfers In</MenuItem>
            <MenuItem value="DRYING_START">Drying Started</MenuItem>
            <MenuItem value="DRYING_END">Drying Completed</MenuItem>
            <MenuItem value="MANUAL_ADJUSTMENT">Adjustments</MenuItem>
          </TextField>
        </Box>

        {/* Movement Table */}
        {loading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer component={Paper} sx={{ maxHeight: 500 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, backgroundColor: '#f8fafc' }}>Date & Time</TableCell>
                  <TableCell sx={{ fontWeight: 700, backgroundColor: '#f8fafc' }}>Warehouse</TableCell>
                  <TableCell sx={{ fontWeight: 700, backgroundColor: '#f8fafc' }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 700, backgroundColor: '#f8fafc' }}>Thickness</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, backgroundColor: '#f8fafc' }}>Quantity</TableCell>
                  <TableCell sx={{ fontWeight: 700, backgroundColor: '#f8fafc' }}>Status Change</TableCell>
                  <TableCell sx={{ fontWeight: 700, backgroundColor: '#f8fafc' }}>Reference</TableCell>
                  <TableCell sx={{ fontWeight: 700, backgroundColor: '#f8fafc' }}>Details</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {movements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">
                        No movements found for the selected filters
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  movements.map((movement) => (
                    <TableRow key={movement.id} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                          {format(new Date(movement.createdAt), 'MMM dd, yyyy')}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                          {format(new Date(movement.createdAt), 'HH:mm:ss')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontSize: '0.875rem', fontWeight: 500 }}>
                          {movement.Warehouse?.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                          {movement.Warehouse?.code}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getMovementTypeLabel(movement.movementType)}
                          size="small"
                          color={getMovementColor(movement.movementType)}
                          sx={{ fontSize: '0.75rem', height: 24 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                          {movement.thickness}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 700,
                            fontSize: '0.875rem',
                            color: movement.quantityChange > 0 ? '#16a34a' : '#dc2626'
                          }}
                        >
                          {movement.quantityChange > 0 ? '+' : ''}{movement.quantityChange}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {movement.fromStatus && movement.toStatus ? (
                          <Box display="flex" alignItems="center" gap={0.5}>
                            <Chip
                              label={getStatusLabel(movement.fromStatus)}
                              size="small"
                              sx={{ fontSize: '0.7rem', height: 20 }}
                            />
                            <Typography variant="caption">→</Typography>
                            <Chip
                              label={getStatusLabel(movement.toStatus)}
                              size="small"
                              sx={{ fontSize: '0.7rem', height: 20 }}
                            />
                          </Box>
                        ) : movement.toStatus ? (
                          <Chip
                            label={getStatusLabel(movement.toStatus)}
                            size="small"
                            sx={{ fontSize: '0.7rem', height: 20 }}
                          />
                        ) : (
                          <Typography variant="caption" color="text.secondary">-</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                          {movement.referenceNumber || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                          {movement.details || '-'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
