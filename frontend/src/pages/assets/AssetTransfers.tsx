import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardContent,
  Grid,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stepper,
  Step,
  StepLabel
} from '@mui/material';
import {
  Add as AddIcon,
  Visibility as ViewIcon,
  SwapHoriz as TransferIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  LocalShipping as ShippingIcon
} from '@mui/icons-material';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { format } from 'date-fns';

const AssetTransfers = () => {
  const navigate = useNavigate();
  const [transfers, setTransfers] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<any>(null);

  const [transferForm, setTransferForm] = useState({
    assetId: '',
    fromLocationId: '',
    toLocationId: '',
    reason: '',
    notes: '',
    expectedArrival: '',
    conditionBefore: 'GOOD'
  });

  const [statusForm, setStatusForm] = useState({
    status: '',
    notes: '',
    conditionAfter: 'GOOD'
  });

  useEffect(() => {
    fetchTransfers();
    fetchAssets();
    fetchLocations();
  }, []);

  const fetchTransfers = async () => {
    try {
      const response = await api.get('/assets/transfers');
      setTransfers(response.data);
    } catch (error) {
      console.error('Error fetching transfers:', error);
    }
  };

  const fetchAssets = async () => {
    try {
      const response = await api.get('/assets');
      setAssets(response.data);
    } catch (error) {
      console.error('Error fetching assets:', error);
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

  const handleOpenDialog = () => {
    setTransferForm({
      assetId: '',
      fromLocationId: '',
      toLocationId: '',
      reason: '',
      notes: '',
      expectedArrival: '',
      conditionBefore: 'GOOD'
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  const handleCreateTransfer = async () => {
    try {
      await api.post('/assets/transfers', transferForm);
      handleCloseDialog();
      fetchTransfers();
    } catch (error: any) {
      console.error('Error creating transfer:', error);
      alert(error.response?.data?.error || 'Failed to create transfer');
    }
  };

  const handleOpenStatusDialog = (transfer: any, newStatus: string) => {
    setSelectedTransfer(transfer);
    setStatusForm({
      status: newStatus,
      notes: '',
      conditionAfter: 'GOOD'
    });
    setStatusDialogOpen(true);
  };

  const handleUpdateStatus = async () => {
    if (!selectedTransfer) return;

    try {
      await api.patch(`/assets/transfers/${selectedTransfer.id}/status`, statusForm);
      setStatusDialogOpen(false);
      setSelectedTransfer(null);
      fetchTransfers();
    } catch (error: any) {
      console.error('Error updating transfer status:', error);
      alert(error.response?.data?.error || 'Failed to update transfer status');
    }
  };

  const getStatusColor = (status: string) => {
    const colors: any = {
      PENDING: '#f59e0b',
      IN_TRANSIT: '#3b82f6',
      COMPLETED: '#10b981',
      CANCELLED: '#ef4444'
    };
    return colors[status] || '#64748b';
  };

  const getStatusIcon = (status: string) => {
    const icons: any = {
      PENDING: <TransferIcon fontSize="small" />,
      IN_TRANSIT: <ShippingIcon fontSize="small" />,
      COMPLETED: <CheckIcon fontSize="small" />,
      CANCELLED: <CancelIcon fontSize="small" />
    };
    return icons[status] || null;
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

  const pendingTransfers = transfers.filter(t => t.status === 'PENDING');
  const inTransitTransfers = transfers.filter(t => t.status === 'IN_TRANSIT');
  const completedTransfers = transfers.filter(t => t.status === 'COMPLETED');

  const selectedAsset = assets.find(a => a.id === transferForm.assetId);

  return (
    <Box sx={{ p: 3, backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TransferIcon sx={{ color: '#dc2626' }} />
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b' }}>
              Asset Transfers
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenDialog}
            sx={{
              backgroundColor: '#dc2626',
              '&:hover': { backgroundColor: '#b91c1c' },
              textTransform: 'none',
              fontSize: '0.875rem'
            }}
          >
            New Transfer
          </Button>
        </Box>
        <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.875rem' }}>
          Track and manage asset transfers between locations
        </Typography>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ border: '1px solid #e2e8f0' }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.75rem', mb: 0.5 }}>
                Total Transfers
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b' }}>
                {transfers.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ border: '1px solid #e2e8f0' }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.75rem', mb: 0.5 }}>
                Pending
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#f59e0b' }}>
                {pendingTransfers.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ border: '1px solid #e2e8f0' }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.75rem', mb: 0.5 }}>
                In Transit
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#3b82f6' }}>
                {inTransitTransfers.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ border: '1px solid #e2e8f0' }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.75rem', mb: 0.5 }}>
                Completed
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#10b981' }}>
                {completedTransfers.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Transfers Table */}
      <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2 }}>
        <Box sx={{ p: 2, borderBottom: '1px solid #e2e8f0' }}>
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b', fontSize: '1rem' }}>
            All Transfers
          </Typography>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f8fafc' }}>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Transfer #</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Asset</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>From</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>To</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', textAlign: 'center' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {transfers.map((transfer) => (
                <TableRow key={transfer.id} hover>
                  <TableCell sx={{ fontSize: '0.875rem', fontWeight: 600 }}>
                    {transfer.transferNumber}
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.875rem' }}>
                    <Box>
                      <Typography sx={{ fontSize: '0.875rem', fontWeight: 500 }}>
                        {transfer.asset.name}
                      </Typography>
                      <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                        {transfer.asset.assetTag}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.875rem', color: '#64748b' }}>
                    {transfer.fromLocation.name}
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.875rem', color: '#64748b' }}>
                    {transfer.toLocation.name}
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.875rem', color: '#64748b' }}>
                    {format(new Date(transfer.transferDate), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell>
                    <Chip
                      icon={getStatusIcon(transfer.status)}
                      label={transfer.status.replace('_', ' ')}
                      size="small"
                      sx={{
                        backgroundColor: `${getStatusColor(transfer.status)}15`,
                        color: getStatusColor(transfer.status),
                        fontSize: '0.75rem',
                        fontWeight: 600
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ textAlign: 'center' }}>
                    <IconButton
                      size="small"
                      onClick={() => navigate(`/assets/transfers/${transfer.id}`)}
                      sx={{ color: '#3b82f6' }}
                      title="View Details"
                    >
                      <ViewIcon fontSize="small" />
                    </IconButton>
                    {transfer.status === 'PENDING' && (
                      <IconButton
                        size="small"
                        onClick={() => handleOpenStatusDialog(transfer, 'IN_TRANSIT')}
                        sx={{ color: '#3b82f6' }}
                        title="Mark In Transit"
                      >
                        <ShippingIcon fontSize="small" />
                      </IconButton>
                    )}
                    {transfer.status === 'IN_TRANSIT' && (
                      <IconButton
                        size="small"
                        onClick={() => handleOpenStatusDialog(transfer, 'COMPLETED')}
                        sx={{ color: '#10b981' }}
                        title="Complete Transfer"
                      >
                        <CheckIcon fontSize="small" />
                      </IconButton>
                    )}
                    {(transfer.status === 'PENDING' || transfer.status === 'IN_TRANSIT') && (
                      <IconButton
                        size="small"
                        onClick={() => handleOpenStatusDialog(transfer, 'CANCELLED')}
                        sx={{ color: '#ef4444' }}
                        title="Cancel"
                      >
                        <CancelIcon fontSize="small" />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {transfers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} sx={{ textAlign: 'center', py: 4 }}>
                    <Typography sx={{ color: '#94a3b8', fontSize: '0.875rem' }}>
                      No transfers found. Create your first transfer to get started.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Create Transfer Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 600, color: '#1e293b' }}>
          Create New Transfer
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth required sx={fieldSx}>
              <InputLabel>Asset</InputLabel>
              <Select
                value={transferForm.assetId}
                onChange={(e) => {
                  const asset = assets.find(a => a.id === e.target.value);
                  setTransferForm(prev => ({
                    ...prev,
                    assetId: e.target.value,
                    fromLocationId: asset?.locationId || ''
                  }));
                }}
                label="Asset"
              >
                <MenuItem value="">
                  <em>Select an asset</em>
                </MenuItem>
                {assets.map((asset) => (
                  <MenuItem key={asset.id} value={asset.id}>
                    {asset.assetTag} - {asset.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {selectedAsset && selectedAsset.location && (
              <Box sx={{ p: 2, backgroundColor: '#f8fafc', borderRadius: 1 }}>
                <Typography sx={{ fontSize: '0.75rem', color: '#64748b', mb: 0.5 }}>
                  Current Location
                </Typography>
                <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>
                  {selectedAsset.location.name} ({selectedAsset.location.code})
                </Typography>
              </Box>
            )}

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required sx={fieldSx}>
                  <InputLabel>From Location</InputLabel>
                  <Select
                    value={transferForm.fromLocationId}
                    onChange={(e) => setTransferForm(prev => ({ ...prev, fromLocationId: e.target.value }))}
                    label="From Location"
                    disabled={!!selectedAsset?.locationId}
                  >
                    <MenuItem value="">
                      <em>Select location</em>
                    </MenuItem>
                    {locations.map((location) => (
                      <MenuItem key={location.id} value={location.id}>
                        {location.name} ({location.code})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required sx={fieldSx}>
                  <InputLabel>To Location</InputLabel>
                  <Select
                    value={transferForm.toLocationId}
                    onChange={(e) => setTransferForm(prev => ({ ...prev, toLocationId: e.target.value }))}
                    label="To Location"
                  >
                    <MenuItem value="">
                      <em>Select location</em>
                    </MenuItem>
                    {locations.filter(l => l.id !== transferForm.fromLocationId).map((location) => (
                      <MenuItem key={location.id} value={location.id}>
                        {location.name} ({location.code})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <TextField
              fullWidth
              label="Reason for Transfer"
              value={transferForm.reason}
              onChange={(e) => setTransferForm(prev => ({ ...prev, reason: e.target.value }))}
              placeholder="e.g., Project requirement, maintenance, relocation"
              sx={fieldSx}
            />

            <TextField
              fullWidth
              type="date"
              label="Expected Arrival"
              value={transferForm.expectedArrival}
              onChange={(e) => setTransferForm(prev => ({ ...prev, expectedArrival: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              sx={fieldSx}
            />

            <FormControl fullWidth sx={fieldSx}>
              <InputLabel>Condition Before Transfer</InputLabel>
              <Select
                value={transferForm.conditionBefore}
                onChange={(e) => setTransferForm(prev => ({ ...prev, conditionBefore: e.target.value }))}
                label="Condition Before Transfer"
              >
                <MenuItem value="EXCELLENT">Excellent</MenuItem>
                <MenuItem value="GOOD">Good</MenuItem>
                <MenuItem value="FAIR">Fair</MenuItem>
                <MenuItem value="POOR">Poor</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              multiline
              rows={3}
              label="Notes"
              value={transferForm.notes}
              onChange={(e) => setTransferForm(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes about this transfer"
              sx={fieldSx}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={handleCloseDialog}
            sx={{ color: '#64748b', textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateTransfer}
            variant="contained"
            disabled={!transferForm.assetId || !transferForm.fromLocationId || !transferForm.toLocationId}
            sx={{
              backgroundColor: '#dc2626',
              '&:hover': { backgroundColor: '#b91c1c' },
              textTransform: 'none'
            }}
          >
            Create Transfer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Update Status Dialog */}
      <Dialog open={statusDialogOpen} onClose={() => setStatusDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600, color: '#1e293b' }}>
          Update Transfer Status
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {selectedTransfer && (
              <Box sx={{ p: 2, backgroundColor: '#f8fafc', borderRadius: 1, mb: 2 }}>
                <Typography sx={{ fontSize: '0.75rem', color: '#64748b', mb: 1 }}>
                  Transfer: {selectedTransfer.transferNumber}
                </Typography>
                <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>
                  {selectedTransfer.asset.name} ({selectedTransfer.asset.assetTag})
                </Typography>
                <Typography sx={{ fontSize: '0.75rem', color: '#64748b', mt: 0.5 }}>
                  From: {selectedTransfer.fromLocation.name} → To: {selectedTransfer.toLocation.name}
                </Typography>
              </Box>
            )}

            <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>
              New Status: <Chip label={statusForm.status.replace('_', ' ')} size="small" sx={{ ml: 1 }} />
            </Typography>

            {statusForm.status === 'COMPLETED' && (
              <FormControl fullWidth sx={fieldSx}>
                <InputLabel>Condition After Transfer</InputLabel>
                <Select
                  value={statusForm.conditionAfter}
                  onChange={(e) => setStatusForm(prev => ({ ...prev, conditionAfter: e.target.value }))}
                  label="Condition After Transfer"
                >
                  <MenuItem value="EXCELLENT">Excellent</MenuItem>
                  <MenuItem value="GOOD">Good</MenuItem>
                  <MenuItem value="FAIR">Fair</MenuItem>
                  <MenuItem value="POOR">Poor</MenuItem>
                </Select>
              </FormControl>
            )}

            <TextField
              fullWidth
              multiline
              rows={3}
              label="Notes"
              value={statusForm.notes}
              onChange={(e) => setStatusForm(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Add notes about this status update"
              sx={fieldSx}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setStatusDialogOpen(false)}
            sx={{ color: '#64748b', textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpdateStatus}
            variant="contained"
            sx={{
              backgroundColor: '#dc2626',
              '&:hover': { backgroundColor: '#b91c1c' },
              textTransform: 'none'
            }}
          >
            Update Status
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AssetTransfers;
