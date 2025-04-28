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
  DialogActions
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { useSnackbar } from 'notistack';
import { supabase } from '../../config/supabase';
import type { WoodType } from '../../types/calculations';
import type { WoodReceipt as WoodReceiptType } from '../../types/wood-receipt';
import { colors } from '../../theme/colors';
import { styled } from '@mui/material/styles';

interface PostgrestError {
  code: string;
  message: string;
  details: string | null;
  hint: string | null;
}

type ReceiptStatus = 'PENDING' | 'RECEIVED' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED';

interface EditingReceipt extends Omit<WoodReceiptType, 'total_volume_m3' | 'total_pieces'> {
  total_volume_m3: string | number;
  total_pieces: string | number;
}

const StyledContainer = styled(Container)(({ theme }) => ({
  backgroundColor: '#f5f5f5',
  minHeight: '100vh',
  paddingTop: theme.spacing(4),
  paddingBottom: theme.spacing(4),
}));

const StyledPaper = styled(Paper)(({ theme }) => ({
  backgroundColor: '#fff',
  borderRadius: theme.spacing(1),
  boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.05)',
}));

const StyledTableContainer = styled(TableContainer)(({ theme }) => ({
  '& .MuiTable-root': {
    '& .MuiTableHead-root': {
      '& .MuiTableCell-root': {
        backgroundColor: '#f5f5f5',
        color: 'rgba(0, 0, 0, 0.87)',
        fontWeight: 600,
        fontSize: '0.875rem',
        fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      },
    },
    '& .MuiTableBody-root': {
      '& .MuiTableRow-root': {
        '&:hover': {
          backgroundColor: '#f5f5f5',
        },
      },
      '& .MuiTableCell-root': {
        color: 'rgba(0, 0, 0, 0.6)',
        fontSize: '0.875rem',
        fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      },
    },
  },
}));

const StyledButton = styled(Button)(({ theme }) => ({
  backgroundColor: '#1976d2',
  color: '#fff',
  '&:hover': {
    backgroundColor: '#1565c0',
  },
  borderRadius: theme.spacing(1),
  textTransform: 'none',
  padding: theme.spacing(1, 3),
  fontSize: '0.875rem',
  fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  fontWeight: 500,
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
    total_volume_m3: '',
    total_pieces: '',
    notes: '',
    status: 'PENDING',
    lot_number: 'Auto-generated',
  });
  const [editingReceipt, setEditingReceipt] = useState<EditingReceipt | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkAuth = async () => {
      // Get both user and session
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (userError || sessionError) {
        console.error('Auth errors:', { userError, sessionError });
        enqueueSnackbar('Authentication error', { variant: 'error' });
        return;
      }

      if (!user || !session) {
        console.error('No user or session');
        enqueueSnackbar('Please sign in to access this page', { variant: 'error' });
        return;
      }

      console.log('Auth state:', {
        user: user,
        session: session,
        role: session.user.role, // Log the user's role
        accessToken: session.access_token.substring(0, 20) + '...' // Log part of the token
      });

      // Test a simple query first
      const { data: testData, error: testError } = await supabase
        .from('wood_types')
        .select('count')
        .single();

      if (testError) {
        console.error('Test query failed:', testError);
      } else {
        console.log('Test query succeeded');
        // Only proceed if test query works
        await fetchWoodTypes();
        await fetchReceipts();
      }
    };

    checkAuth();
  }, []);

  const fetchWoodTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('wood_types')
        .select('*')
        .order('name');

      if (error) throw error;
      setWoodTypes(data || []);
    } catch (error) {
      console.error('Error fetching wood types:', error);
      enqueueSnackbar('Failed to fetch wood types', { variant: 'error' });
    }
  };

  const fetchReceipts = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const { data, error } = await supabase
        .from('wood_receipts')
        .select('*, wood_type:wood_types(*)')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Full query error:', error);
        throw error;
      }

      console.log('Fetched receipts:', data?.map(r => ({
        lot_number: r.lot_number,
        status: r.status,
        id: r.id
      })));

      setReceipts(data || []);
    } catch (error: PostgrestError | any) {
      console.error('Error fetching receipts:', {
        message: error.message,
        code: error.code,
        details: error?.details,
        hint: error?.hint,
        isPostgrestError: 'code' in error
      });
      enqueueSnackbar(
        `Failed to fetch receipts: ${error.message}`, 
        { variant: 'error' }
      );
    }
  };

  const handleCreateReceipt = async () => {
    try {
      setLoading(true);
      
      // Generate LOT number (format: LOT-XXX)
      const { data: maxLotData, error: lotError } = await supabase
        .from('wood_receipts')
        .select('lot_number')
        .order('lot_number', { ascending: false })
        .limit(1);

      let sequence = 1;
      if (!lotError && maxLotData && maxLotData.length > 0) {
        const lastLot = maxLotData[0].lot_number;
        const lastNumber = parseInt(lastLot.split('-')[1]);
        sequence = lastNumber + 1;
      }

      const lotNumber = `LOT-${String(sequence).padStart(3, '0')}`;

      // Prepare the data for insertion
      const receiptData = {
        wood_type_id: newReceipt.wood_type_id,
        supplier: newReceipt.supplier,
        purchase_date: newReceipt.purchase_date,
        purchase_order: newReceipt.purchase_order,
        lot_number: lotNumber,
        status: 'PENDING' as ReceiptStatus,
        notes: newReceipt.notes || null,
        created_by: (await supabase.auth.getUser()).data.user?.id,
        // Only include these if they have values
        ...(newReceipt.total_volume_m3 ? { total_volume_m3: parseFloat(newReceipt.total_volume_m3) } : {}),
        ...(newReceipt.total_pieces ? { total_pieces: parseInt(newReceipt.total_pieces) } : {})
      };

      console.log('Inserting receipt data:', receiptData);

      const { data, error } = await supabase
        .from('wood_receipts')
        .insert([receiptData])
        .select()
        .single();

      if (error) {
        console.error('Insert error:', error);
        throw error;
      }

      enqueueSnackbar('Receipt created successfully', { variant: 'success' });
      setOpenDialog(false);
      fetchReceipts();
      setNewReceipt({
        wood_type_id: '',
        supplier: '',
        purchase_date: new Date().toISOString().split('T')[0],
        purchase_order: '',
        total_volume_m3: '',
        total_pieces: '',
        notes: '',
        status: 'PENDING',
        lot_number: 'Auto-generated',
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
      total_volume_m3: '',
      total_pieces: '',
      notes: '',
      status: 'PENDING',
      lot_number: 'Auto-generated',
    });
  };

  const handleEditClick = (receipt: WoodReceiptType) => {
    setEditingReceipt({
      ...receipt,
      total_volume_m3: receipt.total_volume_m3?.toString() || '',
      total_pieces: receipt.total_pieces?.toString() || '',
    });
    setEditDialogOpen(true);
  };

  const handleUpdateReceipt = async () => {
    if (!editingReceipt) return;
    
    try {
      setLoading(true);
      
      const updateData = {
        wood_type_id: editingReceipt.wood_type_id,
        supplier: editingReceipt.supplier,
        purchase_date: editingReceipt.purchase_date,
        purchase_order: editingReceipt.purchase_order,
        lot_number: editingReceipt.lot_number,
        status: editingReceipt.status as ReceiptStatus,
        notes: editingReceipt.notes || null,
        ...(editingReceipt.total_volume_m3 ? { total_volume_m3: parseFloat(editingReceipt.total_volume_m3.toString()) } : {}),
        ...(editingReceipt.total_pieces ? { total_pieces: parseInt(editingReceipt.total_pieces.toString()) } : {})
      };

      console.log('Updating receipt with data:', updateData);

      const { error } = await supabase
        .from('wood_receipts')
        .update(updateData)
        .eq('id', editingReceipt.id);

      if (error) throw error;

      await fetchReceipts(); // Refresh the list first
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

  return (
    <StyledContainer maxWidth="lg">
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 4 
      }}>
        <Typography 
          variant="h4" 
          sx={{ 
            color: 'rgba(0, 0, 0, 0.87)',
            fontWeight: 600,
            fontSize: '1.5rem', // 24px
            fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
          }}
        >
          Wood Receipt Management
        </Typography>
        <StyledButton
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
          aria-label="create new receipt"
        >
          Create New Receipt
        </StyledButton>
      </Box>

      <StyledPaper>
        <StyledTableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>LOT Number</TableCell>
                <TableCell>Wood Type</TableCell>
                <TableCell>Supplier</TableCell>
                <TableCell>PO Number</TableCell>
                <TableCell>Volume (CBM)</TableCell>
                <TableCell>Pieces</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {receipts.map((receipt) => (
                <TableRow key={receipt.id}>
                  <TableCell>
                    {receipt.lot_number ? receipt.lot_number : 'N/A'}
                  </TableCell>
                  <TableCell>{receipt.wood_type?.name}</TableCell>
                  <TableCell>{receipt.supplier}</TableCell>
                  <TableCell>{receipt.purchase_order}</TableCell>
                  <TableCell>{receipt.total_volume_m3}</TableCell>
                  <TableCell>{receipt.total_pieces}</TableCell>
                  <TableCell>
                    <Chip
                      label={receipt.status}
                      color={
                        receipt.status === 'PENDING' ? 'default' :
                        receipt.status === 'RECEIVED' ? 'primary' :
                        receipt.status === 'PROCESSING' ? 'warning' :
                        receipt.status === 'COMPLETED' ? 'success' :
                        'error'
                      }
                      size="small"
                      sx={{
                        fontSize: '0.75rem', // 12px
                        fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
                        fontWeight: 500,
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton 
                      size="small" 
                      onClick={() => handleEditClick(receipt)}
                      aria-label="edit receipt"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          handleEditClick(receipt);
                        }
                      }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </StyledTableContainer>
      </StyledPaper>

      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
        keepMounted={false}
        disablePortal={false}
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
          Create New Wood Receipt
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
                type="number"
                label="Total Volume (CBM)"
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
                label="Number of Sleepers"
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
          <StyledButton
            onClick={handleCreateReceipt}
            disabled={loading || 
              !newReceipt.wood_type_id || 
              !newReceipt.supplier || 
              !newReceipt.purchase_date ||
              !newReceipt.purchase_order
            }
          >
            {loading ? 'Creating...' : 'Create'}
          </StyledButton>
        </DialogActions>
      </Dialog>

      <Dialog
        open={editDialogOpen}
        onClose={handleCloseEditDialog}
        maxWidth="sm"
        fullWidth
        keepMounted={false}
        disablePortal={false}
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
                  label="Total Volume (CBM)"
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
                  label="Number of Sleepers"
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
                  select
                  fullWidth
                  label="Status"
                  value={editingReceipt.status}
                  onChange={(e) => setEditingReceipt(prev => 
                    prev ? { ...prev, status: e.target.value as ReceiptStatus } : null
                  )}
                  required
                  sx={textFieldSx}
                >
                  <MenuItem value="PENDING">Pending</MenuItem>
                  <MenuItem value="RECEIVED">Received</MenuItem>
                  <MenuItem value="PROCESSING">Processing</MenuItem>
                  <MenuItem value="COMPLETED">Completed</MenuItem>
                  <MenuItem value="CANCELLED">Cancelled</MenuItem>
                </TextField>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditDialog}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleUpdateReceipt}
            disabled={loading || !editingReceipt?.wood_type_id || !editingReceipt?.supplier || !editingReceipt?.purchase_date || !editingReceipt?.purchase_order}
          >
            {loading ? 'Updating...' : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>
    </StyledContainer>
  );
};

export default WoodReceipt; 