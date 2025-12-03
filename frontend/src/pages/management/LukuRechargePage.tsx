import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  TextField,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Card,
  CardContent,
  Chip,
  Stack,
  CircularProgress,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  TablePagination,
  Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import DeleteIcon from '@mui/icons-material/Delete';
import LinkIcon from '@mui/icons-material/Link';
import BoltIcon from '@mui/icons-material/Bolt';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import ReceiptIcon from '@mui/icons-material/Receipt';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useNavigate } from 'react-router-dom';
import { alpha } from '@mui/material/styles';
import api from '../../lib/api';
import colors from '../../styles/colors';

// Extended colors for this component
const extendedColors = {
  ...colors,
  success: '#10b981',
  info: '#3b82f6',
  warning: '#f59e0b',
  error: '#ef4444',
  primaryHover: '#cc0000',
};

interface ElectricityRecharge {
  id: string;
  rechargeDate: string;
  token: string;
  kwhAmount: number;
  totalPaid: number;
  baseCost?: number;
  vat?: number;
  ewuraFee?: number;
  reaFee?: number;
  debtCollected?: number;
  notes?: string;
  meterReadingAfter?: number;
  dryingProcessId?: string;
  dryingProcess?: {
    batchNumber: string;
    status: string;
  };
}

interface Statistics {
  totalPaid: number;
  totalKwh: number;
  averagePricePerKwh: number;
  rechargeCount: number;
}

export default function LukuRechargePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [recharges, setRecharges] = useState<ElectricityRecharge[]>([]);
  const [filteredRecharges, setFilteredRecharges] = useState<ElectricityRecharge[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [openDialog, setOpenDialog] = useState(false);
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState<{
    open: boolean;
    recharge: ElectricityRecharge | null;
  }>({ open: false, recharge: null });
  const [viewDetailsDialog, setViewDetailsDialog] = useState<{
    open: boolean;
    recharge: ElectricityRecharge | null;
  }>({ open: false, recharge: null });
  const [smsText, setSmsText] = useState('');
  const [parseError, setParseError] = useState('');

  useEffect(() => {
    fetchRecharges();
    fetchStatistics();
  }, []);

  useEffect(() => {
    filterRecharges();
  }, [recharges, searchText, statusFilter]);

  const fetchRecharges = async () => {
    try {
      setLoading(true);
      const response = await api.get('/electricity/recharges');
      setRecharges(response.data);
    } catch (error) {
      console.error('Error fetching recharges:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await api.get('/electricity/statistics');
      setStatistics(response.data);
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  const filterRecharges = () => {
    let filtered = [...recharges];

    // Search filter
    if (searchText) {
      const search = searchText.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.token.toLowerCase().includes(search) ||
          r.dryingProcess?.batchNumber.toLowerCase().includes(search) ||
          r.notes?.toLowerCase().includes(search)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'assigned') {
        filtered = filtered.filter((r) => r.dryingProcessId);
      } else if (statusFilter === 'unassigned') {
        filtered = filtered.filter((r) => !r.dryingProcessId);
      }
    }

    setFilteredRecharges(filtered);
  };

  const handleAddRecharge = async () => {
    try {
      setParseError('');
      const response = await api.post('/electricity/recharges/parse-sms', {
        smsText,
      });

      setOpenDialog(false);
      setSmsText('');
      fetchRecharges();
      fetchStatistics();
    } catch (error: any) {
      setParseError(error.response?.data?.error || 'Failed to parse SMS');
    }
  };

  const handleDeleteRecharge = async () => {
    if (!deleteConfirmDialog.recharge) return;

    try {
      await api.delete(`/electricity/recharges/${deleteConfirmDialog.recharge.id}`);
      setDeleteConfirmDialog({ open: false, recharge: null });
      fetchRecharges();
      fetchStatistics();
    } catch (error) {
      console.error('Error deleting recharge:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" gutterBottom sx={{ color: extendedColors.primary, fontWeight: 600 }}>
            Luku Recharges
          </Typography>
          <Typography variant="body2" color="text.secondary">
            View and manage all electricity recharges
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
          sx={{
            backgroundColor: extendedColors.primary,
            '&:hover': { backgroundColor: extendedColors.primaryHover },
          }}
        >
          Add Recharge
        </Button>
      </Box>

      {/* Statistics Cards */}
      {statistics && (
        <Grid container spacing={3} mb={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Box
                    sx={{
                      backgroundColor: alpha(extendedColors.primary, 0.1),
                      borderRadius: 2,
                      p: 1.5,
                    }}
                  >
                    <ReceiptIcon sx={{ color: extendedColors.primary, fontSize: 32 }} />
                  </Box>
                  <Box>
                    <Typography variant="h5" fontWeight="600">
                      {statistics.rechargeCount}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Recharges
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Box
                    sx={{
                      backgroundColor: alpha(extendedColors.success, 0.1),
                      borderRadius: 2,
                      p: 1.5,
                    }}
                  >
                    <BoltIcon sx={{ color: extendedColors.success, fontSize: 32 }} />
                  </Box>
                  <Box>
                    <Typography variant="h5" fontWeight="600">
                      {formatCurrency(statistics.totalKwh)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total kWh
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Box
                    sx={{
                      backgroundColor: alpha(extendedColors.info, 0.1),
                      borderRadius: 2,
                      p: 1.5,
                    }}
                  >
                    <AttachMoneyIcon sx={{ color: extendedColors.info, fontSize: 32 }} />
                  </Box>
                  <Box>
                    <Typography variant="h5" fontWeight="600">
                      {formatCurrency(statistics.totalPaid)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Spent (TSH)
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Box
                    sx={{
                      backgroundColor: alpha(extendedColors.warning, 0.1),
                      borderRadius: 2,
                      p: 1.5,
                    }}
                  >
                    <LocalFireDepartmentIcon sx={{ color: extendedColors.warning, fontSize: 32 }} />
                  </Box>
                  <Box>
                    <Typography variant="h5" fontWeight="600">
                      {statistics.averagePricePerKwh.toFixed(2)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Avg Rate (TSH/kWh)
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search by token, batch number, or notes..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="all">All Recharges</MenuItem>
                <MenuItem value="assigned">Assigned to Process</MenuItem>
                <MenuItem value="unassigned">Unassigned</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <Typography variant="body2" color="text.secondary">
              Showing {filteredRecharges.length} of {recharges.length} recharges
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Recharges Table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: colors.grey.light }}>
                <TableCell sx={{ fontWeight: 600 }}>Date & Time</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Token</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>
                  kWh Added
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>
                  Amount Paid
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>
                  Rate (TSH/kWh)
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Process</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600 }}>
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredRecharges
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((recharge) => (
                  <TableRow
                    key={recharge.id}
                    hover
                    sx={{ '&:hover': { backgroundColor: colors.grey.light } }}
                  >
                    <TableCell>{formatDate(recharge.rechargeDate)}</TableCell>
                    <TableCell>
                      <Tooltip title={recharge.token}>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {recharge.token.substring(0, 12)}...
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="right">{formatCurrency(recharge.kwhAmount)}</TableCell>
                    <TableCell align="right">{formatCurrency(recharge.totalPaid)} TSH</TableCell>
                    <TableCell align="right">
                      {(recharge.totalPaid / recharge.kwhAmount).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {recharge.dryingProcess ? (
                        <Chip
                          label={recharge.dryingProcess.batchNumber}
                          size="small"
                          color="primary"
                          icon={<LinkIcon />}
                          onClick={() =>
                            navigate(`/dashboard/factory/drying-process`)
                          }
                          sx={{ cursor: 'pointer' }}
                        />
                      ) : (
                        <Chip label="Unassigned" size="small" variant="outlined" />
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="View Details">
                        <IconButton
                          size="small"
                          onClick={() =>
                            setViewDetailsDialog({ open: true, recharge })
                          }
                          sx={{ color: extendedColors.info }}
                        >
                          <VisibilityIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          onClick={() =>
                            setDeleteConfirmDialog({ open: true, recharge })
                          }
                          sx={{ color: extendedColors.error }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              {filteredRecharges.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      No recharges found
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
          component="div"
          count={filteredRecharges.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>

      {/* Add Recharge Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Add New Recharge</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              Paste the complete SMS message from your Luku recharge. The system will
              automatically parse the token, kWh, amount, and date.
            </Alert>
            {parseError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {parseError}
              </Alert>
            )}
            <TextField
              fullWidth
              multiline
              rows={6}
              label="SMS Text"
              placeholder="Example:
Malipo yamekamilika.19a5466a493d5a81 9007253091723254640 TOKEN 5065 4772 4466 9198 8602 1680.0KWH Cost 490573.78 VAT 18% 88303.27 EWURA 1% 4905.74 REA 3% 14717.21 Debt Collected 1500.00 TOTAL TZS 600000.00 2025-11-05 17:23"
              value={smsText}
              onChange={(e) => setSmsText(e.target.value)}
              sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button
            onClick={handleAddRecharge}
            variant="contained"
            disabled={!smsText.trim()}
            sx={{
              backgroundColor: extendedColors.primary,
              '&:hover': { backgroundColor: extendedColors.primaryHover },
            }}
          >
            Parse & Add
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmDialog.open}
        onClose={() => setDeleteConfirmDialog({ open: false, recharge: null })}
      >
        <DialogTitle>Delete Recharge?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this recharge? This action cannot be undone.
          </Typography>
          {deleteConfirmDialog.recharge && (
            <Box sx={{ mt: 2, p: 2, backgroundColor: colors.grey.light, borderRadius: 1 }}>
              <Typography variant="body2">
                <strong>Token:</strong> {deleteConfirmDialog.recharge.token.substring(0, 15)}...
              </Typography>
              <Typography variant="body2">
                <strong>kWh:</strong> {deleteConfirmDialog.recharge.kwhAmount}
              </Typography>
              <Typography variant="body2">
                <strong>Amount:</strong> {formatCurrency(deleteConfirmDialog.recharge.totalPaid)}{' '}
                TSH
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmDialog({ open: false, recharge: null })}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteRecharge}
            variant="contained"
            sx={{
              backgroundColor: extendedColors.error,
              '&:hover': { backgroundColor: '#b91c1c' },
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog
        open={viewDetailsDialog.open}
        onClose={() => setViewDetailsDialog({ open: false, recharge: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <BoltIcon sx={{ color: extendedColors.primary }} />
            <Typography variant="h6" fontWeight="600">
              Recharge Details
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {viewDetailsDialog.recharge && (
            <Box>
              {/* Main Info Card */}
              <Card sx={{ mb: 2, backgroundColor: colors.grey.light }}>
                <CardContent>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <Typography variant="caption" color="text.secondary">
                        Date & Time
                      </Typography>
                      <Typography variant="body1" fontWeight="600">
                        {formatDate(viewDetailsDialog.recharge.rechargeDate)}
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="caption" color="text.secondary">
                        Token Number
                      </Typography>
                      <Typography
                        variant="body2"
                        fontWeight="600"
                        sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}
                      >
                        {viewDetailsDialog.recharge.token}
                      </Typography>
                    </Grid>
                    {viewDetailsDialog.recharge.dryingProcess && (
                      <Grid item xs={12}>
                        <Typography variant="caption" color="text.secondary">
                          Drying Process
                        </Typography>
                        <Box mt={0.5}>
                          <Chip
                            label={viewDetailsDialog.recharge.dryingProcess.batchNumber}
                            size="small"
                            color="primary"
                            icon={<LinkIcon />}
                            onClick={() => {
                              setViewDetailsDialog({ open: false, recharge: null });
                              navigate(`/dashboard/factory/drying-process`);
                            }}
                            sx={{ cursor: 'pointer' }}
                          />
                        </Box>
                      </Grid>
                    )}
                  </Grid>
                </CardContent>
              </Card>

              {/* Cost Breakdown */}
              <Typography variant="subtitle2" fontWeight="600" mb={1}>
                Cost Breakdown
              </Typography>
              <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Stack spacing={1.5}>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2">kWh Purchased</Typography>
                    <Typography variant="body2" fontWeight="600">
                      {formatCurrency(viewDetailsDialog.recharge.kwhAmount)} kWh
                    </Typography>
                  </Box>
                  {viewDetailsDialog.recharge.baseCost !== undefined && viewDetailsDialog.recharge.baseCost > 0 && (
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">
                        Base Cost
                      </Typography>
                      <Typography variant="body2">
                        {formatCurrency(viewDetailsDialog.recharge.baseCost)} TSH
                      </Typography>
                    </Box>
                  )}
                  {viewDetailsDialog.recharge.vat !== undefined && viewDetailsDialog.recharge.vat > 0 && (
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">
                        VAT (18%)
                      </Typography>
                      <Typography variant="body2">
                        {formatCurrency(viewDetailsDialog.recharge.vat)} TSH
                      </Typography>
                    </Box>
                  )}
                  {viewDetailsDialog.recharge.ewuraFee !== undefined && viewDetailsDialog.recharge.ewuraFee > 0 && (
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">
                        EWURA Fee (1%)
                      </Typography>
                      <Typography variant="body2">
                        {formatCurrency(viewDetailsDialog.recharge.ewuraFee)} TSH
                      </Typography>
                    </Box>
                  )}
                  {viewDetailsDialog.recharge.reaFee !== undefined && viewDetailsDialog.recharge.reaFee > 0 && (
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">
                        REA Fee (3%)
                      </Typography>
                      <Typography variant="body2">
                        {formatCurrency(viewDetailsDialog.recharge.reaFee)} TSH
                      </Typography>
                    </Box>
                  )}
                  {viewDetailsDialog.recharge.debtCollected !== undefined && viewDetailsDialog.recharge.debtCollected > 0 && (
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">
                        Debt Collected
                      </Typography>
                      <Typography variant="body2">
                        {formatCurrency(viewDetailsDialog.recharge.debtCollected)} TSH
                      </Typography>
                    </Box>
                  )}
                  <Box
                    display="flex"
                    justifyContent="space-between"
                    pt={1}
                    borderTop={1}
                    borderColor="divider"
                  >
                    <Typography variant="body1" fontWeight="600">
                      Total Paid
                    </Typography>
                    <Typography variant="body1" fontWeight="600" color="primary">
                      {formatCurrency(viewDetailsDialog.recharge.totalPaid)} TSH
                    </Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      Rate per kWh
                    </Typography>
                    <Typography variant="body2" fontWeight="600">
                      {(viewDetailsDialog.recharge.totalPaid / viewDetailsDialog.recharge.kwhAmount).toFixed(2)} TSH/kWh
                    </Typography>
                  </Box>
                </Stack>
              </Paper>

              {/* Additional Info */}
              {(viewDetailsDialog.recharge.meterReadingAfter || viewDetailsDialog.recharge.notes) && (
                <>
                  <Typography variant="subtitle2" fontWeight="600" mb={1}>
                    Additional Information
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Stack spacing={1.5}>
                      {viewDetailsDialog.recharge.meterReadingAfter && (
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Meter Reading After
                          </Typography>
                          <Typography variant="body2" fontWeight="600">
                            {viewDetailsDialog.recharge.meterReadingAfter.toFixed(2)} kWh
                          </Typography>
                        </Box>
                      )}
                      {viewDetailsDialog.recharge.notes && (
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Notes
                          </Typography>
                          <Typography variant="body2">
                            {viewDetailsDialog.recharge.notes}
                          </Typography>
                        </Box>
                      )}
                    </Stack>
                  </Paper>
                </>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDetailsDialog({ open: false, recharge: null })}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

