import React, { useState, useEffect, useRef } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  TextField,
  Button,
  Grid,
  MenuItem,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import ContentCutIcon from '@mui/icons-material/ContentCut';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import LockIcon from '@mui/icons-material/Lock';
import { useSnackbar } from 'notistack';
import { useAuth } from '../../hooks/useAuth';
import type { WoodType } from '../../types/calculations';
import api from '../../lib/api';
import type { WoodReceipt as WoodReceiptType } from '../../types/wood-receipt';
import { colors } from '../../theme/colors';
import { styled } from '@mui/material/styles';
import { CircularProgress } from '@mui/material';

interface PostgrestError {
  code: string;
  message: string;
  details: string | null;
  hint: string | null;
}

type ReceiptStatus = 'CREATED' | 'PENDING' | 'RECEIVED' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED';

interface EditingReceipt extends Omit<WoodReceiptType, 'total_volume_m3' | 'total_pieces'> {
  total_volume_m3: string | number;
  total_pieces: string | number;
}

interface LotNumberMap {
  [key: string]: string;
}

interface WoodTypeResponse {
  id: string;
  name: string;
}

interface RawWoodReceipt {
  id: string;
  wood_type_id: string;
  supplier: string;
  receipt_date: string;
  lot_number: string | null;
  status: string;
  created_by: string | null;
  total_volume_m3: number | null;
  total_pieces: number | null;
  total_amount: number;
  created_at: string | null;
  updated_at: string | null;
  wood_type: WoodTypeResponse | WoodTypeResponse[];
  notes?: string;
  purchase_order?: string;
}

const StyledContainer = styled(Container)(({ theme }) => ({
  minHeight: '100vh',
  paddingTop: theme.spacing(4),
  paddingBottom: theme.spacing(4),
  backgroundColor: '#f8fafc',
}));

// Common TextField styles
const textFieldSx = {
  '& .MuiOutlinedInput-root': {
    '& fieldset': {
      borderColor: 'rgba(0, 0, 0, 0.12)',
    },
    '&:hover fieldset': {
      borderColor: '#1976d2',
    },
    fontSize: '0.875rem',
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  '& .MuiInputLabel-root': {
    color: 'rgba(0, 0, 0, 0.6)',
    fontSize: '0.875rem',
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  '& .MuiFormHelperText-root': {
    fontSize: '0.75rem',
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  }
};

const WoodReceipt = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const { enqueueSnackbar } = useSnackbar();
  const [woodTypes, setWoodTypes] = useState<WoodType[]>([]);
  const [receipts, setReceipts] = useState<WoodReceiptType[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newReceipt, setNewReceipt] = useState({
    wood_type_id: '',
    supplier: '',
    purchase_date: new Date().toISOString().split('T')[0],
    purchase_order: '',
    wood_format: 'SLEEPERS',
    total_volume_m3: '',
    total_pieces: '',
    notes: '',
    status: 'PENDING',
    lot_number: '',
  });
  const [editingReceipt, setEditingReceipt] = useState<EditingReceipt | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [receiptToDelete, setReceiptToDelete] = useState<WoodReceiptType | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [traceabilityDialogOpen, setTraceabilityDialogOpen] = useState(false);
  const [traceabilityData, setTraceabilityData] = useState<any>(null);
  const [loadingTraceability, setLoadingTraceability] = useState(false);

  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchWoodTypes();
    fetchReceipts();
  }, []);

  const fetchWoodTypes = async () => {
    try {
      const response = await api.get('/factory/wood-types');
      setWoodTypes(response.data || []);
    } catch (error) {
      console.error('Error fetching wood types:', error);
      enqueueSnackbar('Failed to fetch wood types', { variant: 'error' });
    }
  };

  const fetchReceipts = async () => {
    try {
      const response = await api.get('/management/wood-receipts');
      // Map camelCase backend response to snake_case frontend format
      const mappedReceipts = (response.data || []).map((receipt: any) => ({
        id: receipt.id,
        wood_type_id: receipt.woodTypeId,
        supplier: receipt.supplier,
        receipt_date: receipt.receiptDate ? receipt.receiptDate.split('T')[0] : '',
        purchase_date: receipt.receiptDate ? receipt.receiptDate.split('T')[0] : '',
        lot_number: receipt.lotNumber,
        purchase_order: receipt.purchaseOrder,
        wood_format: receipt.woodFormat || 'SLEEPERS',
        status: receipt.status,
        notes: receipt.notes || '',
        total_volume_m3: receipt.estimatedVolumeM3,
        total_pieces: receipt.estimatedPieces,
        total_amount: receipt.estimatedAmount,
        created_at: receipt.createdAt,
        updated_at: receipt.updatedAt,
        wood_type: receipt.woodType
      }));
      setReceipts(mappedReceipts);
    } catch (error: any) {
      // Silently handle 404 - wood-receipts endpoint not yet implemented
      if (error.response?.status !== 404) {
        console.error('Error fetching receipts:', error);
        enqueueSnackbar(
          `Failed to fetch receipts: ${error.message}`,
          { variant: 'error' }
        );
      }
      setReceipts([]);
    }
  };

  const handleCreateReceipt = async () => {
    try {
      setLoading(true);

      const receiptData = {
        wood_type_id: newReceipt.wood_type_id,
        supplier: newReceipt.supplier,
        receipt_date: newReceipt.purchase_date,
        lot_number: newReceipt.lot_number || null,
        purchase_order: newReceipt.purchase_order,
        status: 'PENDING',
        notes: newReceipt.notes || null,
        total_amount: 0,
        total_volume_m3: newReceipt.total_volume_m3 ? parseFloat(newReceipt.total_volume_m3) : null,
        total_pieces: newReceipt.total_pieces ? parseInt(newReceipt.total_pieces) : null
      };

      await api.post('/management/wood-receipts', receiptData);

      enqueueSnackbar('Receipt created successfully', { variant: 'success' });
      setOpenDialog(false);
      fetchReceipts();
      setNewReceipt({
        wood_type_id: '',
        supplier: '',
        purchase_date: new Date().toISOString().split('T')[0],
        purchase_order: '',
        wood_format: 'SLEEPERS',
        total_volume_m3: '',
        total_pieces: '',
        notes: '',
        status: 'PENDING',
        lot_number: '',
      });
    } catch (error: any) {
      console.error('Error creating receipt:', error);
      enqueueSnackbar(
        `Failed to create receipt: ${error.message}`,
        { variant: 'error' }
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setNewReceipt({
      wood_type_id: '',
      supplier: '',
      purchase_date: new Date().toISOString().split('T')[0],
      purchase_order: '',
      wood_format: 'SLEEPERS',
      total_volume_m3: '',
      total_pieces: '',
      notes: '',
      status: 'PENDING',
      lot_number: '',
    });
  };

  const handleEditClick = (receipt: WoodReceiptType) => {
    setEditingReceipt({
      ...receipt,
      notes: receipt.notes || '',
      total_volume_m3: receipt.total_volume_m3?.toString() || '',
      total_pieces: receipt.total_pieces?.toString() || '',
    });
    setEditDialogOpen(true);
  };

  const handleReopenLot = async (receipt: WoodReceiptType) => {
    if (!isAdmin) {
      enqueueSnackbar('Only admins can reopen completed LOTs', { variant: 'error' });
      return;
    }

    try {
      setLoading(true);

      // Change status back to PENDING so it can be processed again
      await api.patch(`/management/wood-receipts/${receipt.id}`, {
        status: 'PENDING'
      });

      enqueueSnackbar(`LOT ${receipt.lot_number} has been reopened successfully`, { variant: 'success' });
      await fetchReceipts();
    } catch (error: any) {
      console.error('Error reopening LOT:', error);
      enqueueSnackbar(error?.response?.data?.error || 'Failed to reopen LOT', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleLockLot = async (receipt: WoodReceiptType) => {
    if (!isAdmin) {
      enqueueSnackbar('Only admins can lock LOTs', { variant: 'error' });
      return;
    }

    try {
      setLoading(true);

      // Change status to COMPLETED to lock the LOT
      await api.patch(`/management/wood-receipts/${receipt.id}`, {
        status: 'COMPLETED'
      });

      enqueueSnackbar(`LOT ${receipt.lot_number} has been locked successfully`, { variant: 'success' });
      await fetchReceipts();
    } catch (error: any) {
      console.error('Error locking LOT:', error);
      enqueueSnackbar(error?.response?.data?.error || 'Failed to lock LOT', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateReceipt = async () => {
    if (!editingReceipt) return;
    
    try {
      setLoading(true);
      
      const updateData = {
        wood_type_id: editingReceipt.wood_type_id,
        supplier: editingReceipt.supplier,
        receipt_date: editingReceipt.purchase_date,
        purchase_order: editingReceipt.purchase_order,
        lot_number: editingReceipt.lot_number,
        status: editingReceipt.status as ReceiptStatus,
        notes: editingReceipt.notes || null,
        ...(editingReceipt.total_volume_m3 ? { total_volume_m3: parseFloat(editingReceipt.total_volume_m3.toString()) } : {}),
        ...(editingReceipt.total_pieces ? { total_pieces: parseInt(editingReceipt.total_pieces.toString()) } : {})
      };

      console.log('Updating receipt with data:', updateData);

      await api.put(`/management/wood-receipts/${editingReceipt.id}`, updateData);

      await fetchReceipts();
      enqueueSnackbar('Receipt updated successfully', { variant: 'success' });
      setEditDialogOpen(false);
      setEditingReceipt(null);
    } catch (error: any) {
      console.error('Error updating receipt:', error);
      enqueueSnackbar(
        `Failed to update receipt: ${error.message}`, 
        { variant: 'error' }
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setEditingReceipt(null);
    // Return focus to the table container
    const tableContainer = document.querySelector('.MuiTableContainer-root');
    if (tableContainer) {
      (tableContainer as HTMLElement).focus();
    }
  };

  const handleDeleteReceipt = async () => {
    if (!receiptToDelete) return;

    try {
      setIsDeleting(true);

      await api.delete(`/management/wood-receipts/${receiptToDelete.id}`);

      enqueueSnackbar('Receipt deleted successfully', { variant: 'success' });
      await fetchReceipts();
    } catch (error: any) {
      console.error('Error deleting receipt:', error);
      enqueueSnackbar(
        `Failed to delete receipt: ${error.message}`,
        { variant: 'error' }
      );
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setReceiptToDelete(null);
    }
  };

  const handleLotClick = async (lotNumber: string) => {
    if (!lotNumber) {
      enqueueSnackbar('No LOT number available', { variant: 'warning' });
      return;
    }

    try {
      setLoadingTraceability(true);
      setTraceabilityDialogOpen(true);

      const response = await api.get(`/management/lot-traceability/${lotNumber}`);
      setTraceabilityData(response.data);
    } catch (error: any) {
      console.error('Error fetching LOT traceability:', error);
      enqueueSnackbar(
        `Failed to fetch LOT traceability: ${error.message}`,
        { variant: 'error' }
      );
      setTraceabilityDialogOpen(false);
    } finally {
      setLoadingTraceability(false);
    }
  };

  return (
    <StyledContainer maxWidth="lg">
      {/* Header Card */}
      <Paper
        elevation={0}
        sx={{
          backgroundColor: '#fff',
          borderRadius: 2,
          p: 4,
          mb: 3,
          border: '2px solid #fee2e2',
          background: 'linear-gradient(135deg, #fff 0%, #fef2f2 100%)',
        }}
      >
        <Box sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <Box>
            <Typography
              variant="h5"
              sx={{
                color: '#dc2626',
                fontWeight: 700,
                fontSize: '1.5rem',
                mb: 0.5,
                letterSpacing: '-0.025em',
              }}
            >
              LOT Management
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.875rem', fontWeight: 400 }}>
              Create and manage LOT numbers with wood receipt information
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenDialog(true)}
            sx={{
              backgroundColor: '#dc2626',
              color: '#fff',
              textTransform: 'none',
              px: 3,
              py: 1,
              fontSize: '0.875rem',
              fontWeight: 600,
              borderRadius: 2,
              boxShadow: '0 2px 8px rgba(220, 38, 38, 0.2)',
              transition: 'all 0.2s ease',
              '&:hover': {
                backgroundColor: '#b91c1c',
                boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)',
              }
            }}
          >
            Create New LOT
          </Button>
        </Box>
      </Paper>

      {/* Table Card */}
      <Paper
        elevation={0}
        sx={{
          backgroundColor: '#fff',
          borderRadius: 2,
          overflow: 'hidden',
          border: '2px solid #fee2e2',
        }}
      >
        <TableContainer>
          <Table sx={{
            '& .MuiTableCell-root': {
              fontSize: '0.8125rem',
              py: 1.5,
              px: 2,
              borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
            },
            '& .MuiTableCell-head': {
              fontWeight: 600,
              backgroundColor: '#fef2f2',
              color: '#dc2626',
              py: 1.75,
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              borderBottom: '2px solid #dc2626',
            },
            '& .MuiTableBody-root .MuiTableRow-root': {
              transition: 'all 0.2s ease',
              '&:hover': {
                backgroundColor: '#fef2f2',
              }
            }
          }}>
            <TableHead>
              <TableRow>
                <TableCell>LOT Number</TableCell>
                <TableCell>Wood Type</TableCell>
                <TableCell>Supplier</TableCell>
                <TableCell>PO Number</TableCell>
                <TableCell>Est. Volume (CBM)</TableCell>
                <TableCell>Est. Pieces</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {receipts.map((receipt) => (
                <TableRow key={receipt.id}>
                  <TableCell>
                    <Box
                      onClick={() => receipt.lot_number && handleLotClick(receipt.lot_number)}
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        backgroundColor: '#dc2626',
                        color: '#fff',
                        px: 1.5,
                        py: 0.5,
                        borderRadius: 1,
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        letterSpacing: '0.025em',
                        cursor: receipt.lot_number ? 'pointer' : 'default',
                        transition: 'all 0.2s ease',
                        '&:hover': receipt.lot_number ? {
                          backgroundColor: '#b91c1c',
                          boxShadow: '0 2px 4px rgba(220, 38, 38, 0.3)',
                        } : {},
                      }}
                    >
                      {receipt.lot_number || 'N/A'}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ fontWeight: 600, color: '#1e293b', fontSize: '0.8125rem' }}>
                      {receipt.wood_type?.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ color: '#475569', fontSize: '0.8125rem' }}>
                      {receipt.supplier}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ color: '#64748b', fontSize: '0.8125rem', fontWeight: 500 }}>
                      {receipt.purchase_order || 'N/A'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ color: '#1e293b', fontWeight: 600, fontSize: '0.8125rem' }}>
                      {receipt.total_volume_m3 || '0'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ color: '#1e293b', fontWeight: 600, fontSize: '0.8125rem' }}>
                      {receipt.total_pieces || '0'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={receipt.status}
                      size="small"
                      sx={{
                        fontSize: '0.6875rem',
                        fontWeight: 600,
                        height: '24px',
                        px: 1.25,
                        borderRadius: 1,
                        backgroundColor: receipt.status === 'CREATED' ? '#64748b' :
                          receipt.status === 'PENDING' ? '#fbbf24' :
                          receipt.status === 'RECEIVED' ? '#3b82f6' :
                          receipt.status === 'PROCESSING' ? '#8b5cf6' :
                          receipt.status === 'COMPLETED' ? '#10b981' :
                          '#ef4444',
                        color: '#fff',
                        border: 'none',
                      }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => handleEditClick(receipt)}
                      sx={{
                        backgroundColor: '#dc2626',
                        color: '#fff',
                        width: 32,
                        height: 32,
                        '&:hover': {
                          backgroundColor: '#b91c1c',
                        },
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    {isAdmin && receipt.status === 'COMPLETED' && (
                      <IconButton
                        size="small"
                        onClick={() => handleReopenLot(receipt)}
                        sx={{
                          backgroundColor: '#10b981',
                          color: '#fff',
                          ml: 1,
                          width: 32,
                          height: 32,
                          '&:hover': {
                            backgroundColor: '#059669',
                          },
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <LockOpenIcon fontSize="small" />
                      </IconButton>
                    )}
                    {isAdmin && (receipt.status === 'PENDING' || receipt.status === 'PROCESSING') && (
                      <IconButton
                        size="small"
                        onClick={() => handleLockLot(receipt)}
                        sx={{
                          backgroundColor: '#f59e0b',
                          color: '#fff',
                          ml: 1,
                          width: 32,
                          height: 32,
                          '&:hover': {
                            backgroundColor: '#d97706',
                          },
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <LockIcon fontSize="small" />
                      </IconButton>
                    )}
                    {(receipt.status === 'CREATED' || receipt.status === 'PENDING') && (
                      <IconButton
                        size="small"
                        onClick={() => {
                          setReceiptToDelete(receipt);
                          setDeleteDialogOpen(true);
                        }}
                        sx={{
                          backgroundColor: '#64748b',
                          color: '#fff',
                          ml: 1,
                          width: 32,
                          height: 32,
                          '&:hover': {
                            backgroundColor: '#475569',
                          },
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
        keepMounted={false}
        disablePortal={false}
        disableEnforceFocus={true}
        disableAutoFocus={true}
        disableRestoreFocus={true}
        container={() => document.getElementById('modal-root')}
        slotProps={{
          backdrop: {
            sx: { backgroundColor: 'rgba(0, 0, 0, 0.5)' }
          }
        }}
        PaperProps={{
          sx: {
            borderRadius: 2,
            backgroundColor: '#fff',
          }
        }}
        aria-labelledby="receipt-dialog-title"
      >
        <DialogTitle 
          id="receipt-dialog-title"
          sx={{ 
            color: 'rgba(0, 0, 0, 0.87)',
            fontWeight: 600,
            borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
            pb: 2,
            fontSize: '1.25rem', // 20px
            fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
          }}
        >
          Create New LOT (Stage 1)
        </DialogTitle>
        <DialogContent 
          sx={{ mt: 2 }}
          tabIndex={-1}
        >
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                select
                fullWidth
                label="Wood Type"
                value={newReceipt.wood_type_id}
                onChange={(e) => setNewReceipt(prev => ({ ...prev, wood_type_id: e.target.value }))}
                required
                error={!newReceipt.wood_type_id}
                helperText={!newReceipt.wood_type_id ? "Wood Type is required" : ""}
                sx={textFieldSx}
              >
                {woodTypes.map((type) => (
                  <MenuItem key={type.id} value={type.id}>
                    {type.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Supplier"
                value={newReceipt.supplier}
                onChange={(e) => setNewReceipt(prev => ({ ...prev, supplier: e.target.value }))}
                required
                error={!newReceipt.supplier}
                helperText={!newReceipt.supplier ? "Supplier is required" : ""}
                sx={textFieldSx}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                label="Purchase Date"
                value={newReceipt.purchase_date}
                onChange={(e) => setNewReceipt(prev => ({ ...prev, purchase_date: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                required
                error={!newReceipt.purchase_date}
                helperText={!newReceipt.purchase_date ? "Purchase Date is required" : ""}
                sx={textFieldSx}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Purchase Order Number"
                value={newReceipt.purchase_order}
                onChange={(e) => setNewReceipt(prev => ({ ...prev, purchase_order: e.target.value }))}
                required
                error={!newReceipt.purchase_order}
                helperText={!newReceipt.purchase_order ? "Purchase Order Number is required" : ""}
                sx={textFieldSx}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="LOT Number"
                value={newReceipt.lot_number}
                onChange={(e) => setNewReceipt(prev => ({ ...prev, lot_number: e.target.value }))}
                placeholder="Enter LOT Number (e.g., LOT-2025-001)"
                required
                error={!newReceipt.lot_number}
                helperText={!newReceipt.lot_number ? "LOT Number is required for traceability" : ""}
                sx={textFieldSx}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Estimated Volume (CBM)"
                value={newReceipt.total_volume_m3}
                onChange={(e) => setNewReceipt(prev => ({ ...prev, total_volume_m3: e.target.value }))}
                InputProps={{
                  inputProps: { min: 0, step: 0.001 }
                }}
                sx={textFieldSx}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label={newReceipt.wood_format === 'SLEEPERS' ? 'Estimated Number of Sleepers' : 'Estimated Number of Planks'}
                value={newReceipt.total_pieces}
                onChange={(e) => setNewReceipt(prev => ({ ...prev, total_pieces: e.target.value }))}
                InputProps={{
                  inputProps: { min: 0, step: 1 }
                }}
                sx={textFieldSx}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                select
                fullWidth
                label="Wood Type"
                value={newReceipt.wood_format}
                onChange={(e) => setNewReceipt(prev => ({ ...prev, wood_format: e.target.value }))}
                required
                helperText="Sleepers require slicing, Planks skip slicing stage"
                sx={textFieldSx}
              >
                <MenuItem value="SLEEPERS">Sleepers (Requires Slicing)</MenuItem>
                <MenuItem value="PLANKS">Planks (Ready to Use)</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                value={newReceipt.notes}
                onChange={(e) => setNewReceipt(prev => ({ ...prev, notes: e.target.value }))}
                multiline
                rows={3}
                sx={textFieldSx}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ 
          borderTop: '1px solid rgba(0, 0, 0, 0.12)',
          p: 2,
          gap: 1 
        }}>
          <Button 
            onClick={handleCloseDialog}
            sx={{ 
              color: 'rgba(0, 0, 0, 0.6)',
              textTransform: 'none',
              fontSize: '0.875rem',
              fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
              fontWeight: 500,
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateReceipt}
            disabled={loading ||
              !newReceipt.wood_type_id ||
              !newReceipt.supplier ||
              !newReceipt.purchase_date ||
              !newReceipt.purchase_order ||
              !newReceipt.lot_number
            }
            variant="contained"
            sx={{
              backgroundColor: '#dc2626',
              color: '#fff',
              textTransform: 'none',
              fontSize: '0.875rem',
              fontWeight: 500,
              px: 2,
              py: 0.75,
              '&:hover': {
                backgroundColor: '#b91c1c',
              },
              '&:disabled': {
                backgroundColor: 'rgba(0, 0, 0, 0.12)',
                color: 'rgba(0, 0, 0, 0.26)',
              }
            }}
          >
            {loading ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={editDialogOpen}
        onClose={handleCloseEditDialog}
        maxWidth="sm"
        fullWidth
        keepMounted={false}
        disablePortal={false}
        disableEnforceFocus={true}
        disableAutoFocus={true}
        disableRestoreFocus={true}
        container={() => document.getElementById('modal-root')}
        slotProps={{
          backdrop: {
            sx: { backgroundColor: 'rgba(0, 0, 0, 0.5)' }
          }
        }}
        PaperProps={{
          sx: {
            borderRadius: 2,
            backgroundColor: '#fff',
          }
        }}
        aria-labelledby="edit-receipt-dialog-title"
      >
        <DialogTitle id="edit-receipt-dialog-title">Edit Wood Receipt</DialogTitle>
        <DialogContent>
          {editingReceipt && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="LOT Number"
                  value={editingReceipt.lot_number || 'N/A'}
                  InputProps={{
                    readOnly: true,
                  }}
                  sx={{
                    ...textFieldSx,
                    '& .MuiInputBase-input.Mui-readOnly': {
                      color: 'rgba(0, 0, 0, 0.87)',
                      fontWeight: 500,
                    },
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  select
                  fullWidth
                  label="Wood Type"
                  value={editingReceipt.wood_type_id}
                  onChange={(e) => setEditingReceipt(prev => prev ? { ...prev, wood_type_id: e.target.value } : null)}
                  required
                  sx={textFieldSx}
                >
                  {woodTypes.map((type) => (
                    <MenuItem key={type.id} value={type.id}>
                      {type.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Supplier"
                  value={editingReceipt.supplier}
                  onChange={(e) => setEditingReceipt(prev => prev ? { ...prev, supplier: e.target.value } : null)}
                  required
                  sx={textFieldSx}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="Purchase Date"
                  value={editingReceipt.purchase_date}
                  onChange={(e) => setEditingReceipt(prev => prev ? { ...prev, purchase_date: e.target.value } : null)}
                  InputLabelProps={{ shrink: true }}
                  required
                  sx={textFieldSx}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Purchase Order Number"
                  value={editingReceipt.purchase_order}
                  onChange={(e) => setEditingReceipt(prev => prev ? { ...prev, purchase_order: e.target.value } : null)}
                  required
                  sx={textFieldSx}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Estimated Volume (CBM)"
                  value={editingReceipt.total_volume_m3}
                  onChange={(e) => setEditingReceipt(prev => prev ? { ...prev, total_volume_m3: e.target.value } : null)}
                  InputProps={{
                    inputProps: { min: 0, step: 0.001 }
                  }}
                  sx={textFieldSx}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label={editingReceipt.wood_format === 'PLANKS' ? 'Estimated Number of Planks' : 'Estimated Number of Sleepers'}
                  value={editingReceipt.total_pieces}
                  onChange={(e) => setEditingReceipt(prev => prev ? { ...prev, total_pieces: e.target.value } : null)}
                  InputProps={{
                    inputProps: { min: 0, step: 1 }
                  }}
                  sx={textFieldSx}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  select
                  fullWidth
                  label="Wood Type"
                  value={editingReceipt.wood_format || 'SLEEPERS'}
                  onChange={(e) => setEditingReceipt(prev => prev ? { ...prev, wood_format: e.target.value } : null)}
                  required
                  helperText="Sleepers require slicing, Planks skip slicing stage"
                  sx={textFieldSx}
                >
                  <MenuItem value="SLEEPERS">Sleepers (Requires Slicing)</MenuItem>
                  <MenuItem value="PLANKS">Planks (Ready to Use)</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Notes"
                  value={editingReceipt.notes}
                  onChange={(e) => setEditingReceipt(prev => prev ? { ...prev, notes: e.target.value } : null)}
                  multiline
                  rows={3}
                  sx={textFieldSx}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Status"
                  value={editingReceipt.status}
                  InputProps={{
                    readOnly: true,
                  }}
                  helperText="Status is automatically updated based on workflow stage"
                  sx={{
                    ...textFieldSx,
                    '& .MuiInputBase-input.Mui-readOnly': {
                      color: 'rgba(0, 0, 0, 0.87)',
                      fontWeight: 500,
                      backgroundColor: '#f8fafc',
                    },
                  }}
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          <Button
            onClick={handleCloseEditDialog}
            sx={{
              color: 'rgba(0, 0, 0, 0.6)',
              textTransform: 'none',
              fontSize: '0.875rem',
              fontWeight: 500,
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleUpdateReceipt}
            disabled={loading || !editingReceipt?.wood_type_id || !editingReceipt?.supplier || !editingReceipt?.purchase_date || !editingReceipt?.purchase_order}
            sx={{
              backgroundColor: '#dc2626',
              color: '#fff',
              textTransform: 'none',
              fontSize: '0.875rem',
              fontWeight: 500,
              px: 2,
              py: 0.75,
              '&:hover': {
                backgroundColor: '#b91c1c',
              },
              '&:disabled': {
                backgroundColor: 'rgba(0, 0, 0, 0.12)',
                color: 'rgba(0, 0, 0, 0.26)',
              }
            }}
          >
            {loading ? 'Updating...' : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={deleteDialogOpen}
        onClose={() => {
          if (!isDeleting) {
            setDeleteDialogOpen(false);
            setReceiptToDelete(null);
          }
        }}
        maxWidth="sm"
        fullWidth
        disablePortal={false}
        disableEnforceFocus={true}
        disableAutoFocus={true}
        disableRestoreFocus={true}
        container={() => document.getElementById('modal-root')}
        PaperProps={{
          sx: {
            borderRadius: 2,
            backgroundColor: '#fff',
          }
        }}
      >
        <DialogTitle>Delete Receipt</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete LOT {receiptToDelete?.lot_number}? This action cannot be undone.
            Only LOTs in CREATED or PENDING status can be deleted.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          <Button
            onClick={() => {
              setDeleteDialogOpen(false);
              setReceiptToDelete(null);
            }}
            disabled={isDeleting}
            sx={{
              color: 'rgba(0, 0, 0, 0.6)',
              textTransform: 'none',
              fontSize: '0.875rem',
              fontWeight: 500,
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteReceipt}
            variant="contained"
            disabled={isDeleting}
            startIcon={isDeleting ? <CircularProgress size={20} /> : <DeleteIcon />}
            sx={{
              backgroundColor: '#dc2626',
              color: '#fff',
              textTransform: 'none',
              fontSize: '0.875rem',
              fontWeight: 500,
              px: 2,
              py: 0.75,
              '&:hover': {
                backgroundColor: '#b91c1c',
              },
              '&:disabled': {
                backgroundColor: 'rgba(0, 0, 0, 0.12)',
                color: 'rgba(0, 0, 0, 0.26)',
              }
            }}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* LOT Management Dialog */}
      <Dialog
        open={traceabilityDialogOpen}
        onClose={() => setTraceabilityDialogOpen(false)}
        maxWidth="md"
        fullWidth
        disablePortal={false}
        disableEnforceFocus={true}
        disableAutoFocus={true}
        disableRestoreFocus={true}
        container={() => document.getElementById('modal-root')}
        PaperProps={{
          sx: {
            borderRadius: 2,
            backgroundColor: '#fff',
          }
        }}
      >
        <DialogTitle sx={{ borderBottom: '1px solid #e2e8f0', pb: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#dc2626' }}>
              LOT Management: {traceabilityData?.lotNumber}
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
              Full tracking history for this LOT number
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {loadingTraceability ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress sx={{ color: '#dc2626' }} />
            </Box>
          ) : traceabilityData ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {/* Wood Receipts Stage */}
              <Box>
                <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  mb: 2,
                  pb: 1.5,
                  borderBottom: '2px solid #dc2626'
                }}>
                  <ReceiptLongIcon sx={{ color: '#dc2626', fontSize: '1.75rem' }} />
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#dc2626', fontSize: '1.125rem' }}>
                    Wood Receipt
                  </Typography>
                  <Chip
                    label={traceabilityData.stages.woodReceipts.length}
                    size="small"
                    sx={{
                      backgroundColor: '#dc2626',
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: '0.75rem'
                    }}
                  />
                </Box>
                {traceabilityData.stages.woodReceipts.length > 0 ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {traceabilityData.stages.woodReceipts.map((receipt: any, index: number) => (
                      <Paper
                        key={receipt.id}
                        elevation={0}
                        sx={{
                          border: '2px solid #fee2e2',
                          borderRadius: 2,
                          p: 3,
                          backgroundColor: '#fef2f2',
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            borderColor: '#dc2626',
                            boxShadow: '0 4px 12px rgba(220, 38, 38, 0.15)',
                          }
                        }}
                      >
                        <Grid container spacing={2.5}>
                          <Grid item xs={6}>
                            <Typography variant="caption" sx={{ color: '#991b1b', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.5px' }}>
                              Wood Type
                            </Typography>
                            <Typography variant="body1" sx={{ fontWeight: 700, color: '#1e293b', mt: 0.5 }}>
                              {receipt.woodType}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="caption" sx={{ color: '#991b1b', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.5px' }}>
                              Supplier
                            </Typography>
                            <Typography variant="body1" sx={{ fontWeight: 700, color: '#1e293b', mt: 0.5 }}>
                              {receipt.supplier}
                            </Typography>
                          </Grid>
                          <Grid item xs={3}>
                            <Typography variant="caption" sx={{ color: '#991b1b', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.5px' }}>
                              Est. Volume
                            </Typography>
                            <Typography variant="body1" sx={{ fontWeight: 700, color: '#dc2626', mt: 0.5 }}>
                              {receipt.estimatedVolumeM3 ? receipt.estimatedVolumeM3.toFixed(3) : 'N/A'} <Typography component="span" sx={{ fontSize: '0.75rem', color: '#64748b' }}>CBM</Typography>
                            </Typography>
                          </Grid>
                          <Grid item xs={3}>
                            <Typography variant="caption" sx={{ color: '#991b1b', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.5px' }}>
                              Est. Pieces
                            </Typography>
                            <Typography variant="body1" sx={{ fontWeight: 700, color: '#dc2626', mt: 0.5 }}>
                              {receipt.estimatedPieces || 'N/A'}
                            </Typography>
                          </Grid>
                          <Grid item xs={3}>
                            <Typography variant="caption" sx={{ color: '#059669', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.5px' }}>
                              Actual Volume
                            </Typography>
                            <Typography variant="body1" sx={{ fontWeight: 700, color: '#059669', mt: 0.5 }}>
                              {receipt.actualVolumeM3 ? receipt.actualVolumeM3.toFixed(3) : 'N/A'} <Typography component="span" sx={{ fontSize: '0.75rem', color: '#64748b' }}>CBM</Typography>
                            </Typography>
                          </Grid>
                          <Grid item xs={3}>
                            <Typography variant="caption" sx={{ color: '#059669', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.5px' }}>
                              Actual Pieces
                            </Typography>
                            <Typography variant="body1" sx={{ fontWeight: 700, color: '#059669', mt: 0.5 }}>
                              {receipt.actualPieces || 'N/A'}
                            </Typography>
                          </Grid>
                          <Grid item xs={3}>
                            <Typography variant="caption" sx={{ color: '#991b1b', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.5px' }}>
                              Status
                            </Typography>
                            <Box sx={{ mt: 0.5 }}>
                              <Chip
                                label={receipt.status}
                                size="small"
                                sx={{
                                  backgroundColor: '#dc2626',
                                  color: '#fff',
                                  fontWeight: 700,
                                  fontSize: '0.75rem'
                                }}
                              />
                            </Box>
                          </Grid>
                          <Grid item xs={3}>
                            <Typography variant="caption" sx={{ color: '#991b1b', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.5px' }}>
                              Receipt Date
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: '#475569', mt: 0.5 }}>
                              {new Date(receipt.receiptDate).toLocaleDateString()}
                            </Typography>
                          </Grid>
                          {receipt.lastWorkedBy && (
                            <Grid item xs={6}>
                              <Typography variant="caption" sx={{ color: '#0891b2', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.5px' }}>
                                Last Worked By
                              </Typography>
                              <Typography variant="body2" sx={{ fontWeight: 600, color: '#0e7490', mt: 0.5 }}>
                                {receipt.lastWorkedBy}
                              </Typography>
                            </Grid>
                          )}
                          {receipt.lastWorkedAt && (
                            <Grid item xs={6}>
                              <Typography variant="caption" sx={{ color: '#0891b2', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.5px' }}>
                                Last Updated
                              </Typography>
                              <Typography variant="body2" sx={{ fontWeight: 600, color: '#0e7490', mt: 0.5 }}>
                                {new Date(receipt.lastWorkedAt).toLocaleString()}
                              </Typography>
                            </Grid>
                          )}
                        </Grid>
                      </Paper>
                    ))}
                  </Box>
                ) : (
                  <Paper elevation={0} sx={{ p: 3, backgroundColor: '#fef2f2', border: '1px dashed #fca5a5', borderRadius: 2 }}>
                    <Typography variant="body2" sx={{ color: '#dc2626', fontStyle: 'italic', textAlign: 'center' }}>
                      No wood receipts found for this LOT
                    </Typography>
                  </Paper>
                )}
              </Box>

              {/* Wood Slicing Stage */}
              <Box>
                <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  mb: 2,
                  pb: 1.5,
                  borderBottom: '2px solid #dc2626'
                }}>
                  <ContentCutIcon sx={{ color: '#dc2626', fontSize: '1.75rem' }} />
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#dc2626', fontSize: '1.125rem' }}>
                    Wood Slicing
                  </Typography>
                  <Chip
                    label={traceabilityData.stages.slicing.length}
                    size="small"
                    sx={{ backgroundColor: '#dc2626', color: '#fff', fontWeight: 700 }}
                  />
                </Box>
                {traceabilityData.stages.slicing.length > 0 ? (() => {
                  // Calculate LOT-wide aggregated data
                  const operations = traceabilityData.stages.slicing;
                  let totalSleeperVolume = 0;
                  let totalPlankVolume = 0;
                  let totalSleepers = operations.length;
                  let totalPlanks = 0;

                  operations.forEach((op: any) => {
                    // Calculate sleeper volume
                    if (op.sleeperSizes) {
                      const sleeperVol = op.sleeperSizes.reduce((sum: number, size: any) => {
                        const width = (size.width || 0) / 100;
                        const height = (size.height || 0) / 100;
                        const length = size.length || 0;
                        const quantity = size.quantity || 1;
                        return sum + (width * height * length * quantity);
                      }, 0);
                      totalSleeperVolume += sleeperVol;
                    }

                    // Calculate plank volume
                    if (op.plankSizes) {
                      const plankVol = op.plankSizes.reduce((sum: number, size: any) => {
                        const width = (size.width || 0) / 100;
                        const height = (size.height || 0) / 100;
                        const length = size.length || 0;
                        const quantity = size.quantity || 1;
                        return sum + (width * height * length * quantity);
                      }, 0);
                      totalPlankVolume += plankVol;
                      totalPlanks += op.plankSizes.length;
                    }
                  });

                  const wasteVolume = totalSleeperVolume - totalPlankVolume;
                  const wastePercentage = totalSleeperVolume > 0 ? (wasteVolume / totalSleeperVolume) * 100 : 0;

                  // Get earliest start time
                  const sortedByTime = [...operations].sort((a: any, b: any) => {
                    const timeA = a.startTime ? new Date(a.startTime).getTime() : 0;
                    const timeB = b.startTime ? new Date(b.startTime).getTime() : 0;
                    return timeA - timeB;
                  });
                  const firstOperation = sortedByTime[0];
                  const startTime = firstOperation?.startTime;
                  const woodType = firstOperation?.woodType || 'Unknown';

                  return (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {/* LOT Summary */}
                      <Paper
                        elevation={0}
                        sx={{
                          border: '2px solid #fee2e2',
                          borderRadius: 2,
                          p: 3,
                          backgroundColor: '#fef2f2'
                        }}
                      >
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#dc2626', mb: 2 }}>
                          LOT Summary
                        </Typography>
                        <Grid container spacing={2}>
                          <Grid item xs={6} sm={4}>
                            <Typography variant="caption" sx={{ color: '#64748b', textTransform: 'uppercase', fontWeight: 600, fontSize: '0.7rem' }}>
                              Wood Type
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: '#1a1a1a', fontSize: '0.95rem' }}>
                              {woodType}
                            </Typography>
                          </Grid>
                          <Grid item xs={6} sm={4}>
                            <Typography variant="caption" sx={{ color: '#64748b', textTransform: 'uppercase', fontWeight: 600, fontSize: '0.7rem' }}>
                              Sleepers Sliced
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: '#1a1a1a', fontSize: '0.95rem' }}>
                              {totalSleepers} sleepers
                            </Typography>
                          </Grid>
                          <Grid item xs={12} sm={4}>
                            <Typography variant="caption" sx={{ color: '#64748b', textTransform: 'uppercase', fontWeight: 600, fontSize: '0.7rem' }}>
                              Started
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: '#1a1a1a', fontSize: '0.95rem' }}>
                              {startTime ? new Date(startTime).toLocaleString() : 'Not started'}
                            </Typography>
                          </Grid>
                        </Grid>
                      </Paper>

                      {/* Volume Statistics */}
                      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        <Paper
                          elevation={0}
                          sx={{
                            flex: 1,
                            minWidth: 200,
                            p: 2.5,
                            borderRadius: 2,
                            backgroundColor: '#eff6ff',
                            border: '2px solid #bfdbfe'
                          }}
                        >
                          <Typography variant="caption" sx={{ color: '#1e40af', fontSize: '0.75rem', fontWeight: 600 }}>
                            TOTAL SLEEPER VOLUME
                          </Typography>
                          <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e40af', mt: 1 }}>
                            {totalSleeperVolume.toFixed(3)} m³
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.7rem' }}>
                            Input material
                          </Typography>
                        </Paper>

                        <Paper
                          elevation={0}
                          sx={{
                            flex: 1,
                            minWidth: 200,
                            p: 2.5,
                            borderRadius: 2,
                            backgroundColor: '#f0fdf4',
                            border: '2px solid #bbf7d0'
                          }}
                        >
                          <Typography variant="caption" sx={{ color: '#15803d', fontSize: '0.75rem', fontWeight: 600 }}>
                            TOTAL PLANK VOLUME
                          </Typography>
                          <Typography variant="h5" sx={{ fontWeight: 700, color: '#15803d', mt: 1 }}>
                            {totalPlankVolume.toFixed(3)} m³
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.7rem' }}>
                            {totalPlanks} planks produced
                          </Typography>
                        </Paper>

                        <Paper
                          elevation={0}
                          sx={{
                            flex: 1,
                            minWidth: 200,
                            p: 2.5,
                            borderRadius: 2,
                            backgroundColor: '#fef2f2',
                            border: '2px solid #fecaca'
                          }}
                        >
                          <Typography variant="caption" sx={{ color: '#dc2626', fontSize: '0.75rem', fontWeight: 600 }}>
                            TOTAL WASTE
                          </Typography>
                          <Typography variant="h5" sx={{ fontWeight: 700, color: '#dc2626', mt: 1 }}>
                            {wastePercentage.toFixed(2)}%
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.7rem' }}>
                            {wasteVolume.toFixed(3)} m³ waste
                          </Typography>
                        </Paper>
                      </Box>
                    </Box>
                  );
                })() : (
                  <Paper elevation={0} sx={{ p: 3, backgroundColor: '#f8fafc', border: '2px dashed #cbd5e1', borderRadius: 2 }}>
                    <Typography variant="body2" sx={{ color: '#94a3b8', fontStyle: 'italic' }}>
                      No slicing operations recorded for this LOT yet
                    </Typography>
                  </Paper>
                )}
              </Box>
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={() => setTraceabilityDialogOpen(false)}
            sx={{
              backgroundColor: '#dc2626',
              color: '#fff',
              textTransform: 'none',
              fontSize: '0.875rem',
              fontWeight: 500,
              px: 3,
              py: 1,
              '&:hover': {
                backgroundColor: '#b91c1c',
              }
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </StyledContainer>
  );
};

export default WoodReceipt; 