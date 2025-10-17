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
  Alert,
  CircularProgress,
  Container,
  Tabs,
  Tab,
  Card,
  CardContent,
  Grid,
  Chip,
  MenuItem,
  TextField,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import InventoryIcon from '@mui/icons-material/Inventory';
import WarningIcon from '@mui/icons-material/Warning';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import api from '../../lib/api';
import { format } from 'date-fns';

interface Warehouse {
  code: string;
  name: string;
  stockControlEnabled: boolean;
}

interface WoodType {
  id: string;
  name: string;
}

interface Stock {
  id: string;
  warehouseId: string;
  thickness: string;
  statusNotDried: number;
  statusUnderDrying: number;
  statusDried: number;
  statusDamaged: number;
  statusInTransitOut: number;
  statusInTransitIn: number;
  minimumStockLevel: number | null;
  woodType: WoodType;
  warehouse: Warehouse;
}

interface ConsolidatedStock {
  detailed: Stock[];
  summary: Array<{
    woodType: WoodType;
    thickness: string;
    totalNotDried: number;
    totalUnderDrying: number;
    totalDried: number;
    totalDamaged: number;
    totalInTransit: number;
    warehouses: Array<{
      warehouse: Warehouse;
      quantities: {
        notDried: number;
        underDrying: number;
        dried: number;
        damaged: number;
        inTransitOut: number;
        inTransitIn: number;
      };
    }>;
  }>;
}

interface LowStockAlert {
  id: string;
  warehouse: Warehouse;
  woodType: WoodType;
  thickness: string;
  currentStock: number;
  minimumStockLevel: number;
  shortfall: number;
  statusNotDried: number;
  statusDried: number;
}

interface StockAdjustment {
  id: string;
  warehouse: Warehouse;
  woodType: WoodType;
  thickness: string;
  woodStatus: string;
  quantityBefore: number;
  quantityAfter: number;
  quantityChange: number;
  reason: string;
  notes: string | null;
  adjustedAt: string;
  adjustedBy: {
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
}

const InventoryReports: FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');
  const [warehouseStock, setWarehouseStock] = useState<Stock[]>([]);
  const [consolidatedStock, setConsolidatedStock] = useState<ConsolidatedStock | null>(null);
  const [lowStockAlerts, setLowStockAlerts] = useState<LowStockAlert[]>([]);
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);

  useEffect(() => {
    fetchWarehouses();
    fetchLowStockAlerts();
    fetchAdjustments();
  }, []);

  useEffect(() => {
    if (tabValue === 0 && selectedWarehouse) {
      fetchWarehouseStock(selectedWarehouse);
    } else if (tabValue === 1) {
      fetchConsolidatedStock();
    }
  }, [tabValue, selectedWarehouse]);

  const fetchWarehouses = async () => {
    try {
      const response = await api.get('/management/warehouses');
      const stockControlWarehouses = response.data.filter((w: any) => w.stockControlEnabled);
      setWarehouses(stockControlWarehouses);
      if (stockControlWarehouses.length > 0) {
        setSelectedWarehouse(stockControlWarehouses[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch warehouses:', err);
    }
  };

  const fetchWarehouseStock = async (warehouseId: string) => {
    try {
      setLoading(true);
      const response = await api.get(`/management/warehouses/${warehouseId}/stock`);
      setWarehouseStock(response.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch warehouse stock');
    } finally {
      setLoading(false);
    }
  };

  const fetchConsolidatedStock = async () => {
    try {
      setLoading(true);
      const response = await api.get('/management/stock/consolidated');
      setConsolidatedStock(response.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch consolidated stock');
    } finally {
      setLoading(false);
    }
  };

  const fetchLowStockAlerts = async () => {
    try {
      const response = await api.get('/management/stock/alerts');
      setLowStockAlerts(response.data);
    } catch (err) {
      console.error('Failed to fetch low stock alerts:', err);
    }
  };

  const fetchAdjustments = async () => {
    try {
      const response = await api.get('/management/stock/adjustments');
      setAdjustments(response.data);
    } catch (err) {
      console.error('Failed to fetch adjustments:', err);
    }
  };

  const getTotalStock = (stock: Stock) => {
    return stock.statusNotDried + stock.statusUnderDrying + stock.statusDried + stock.statusDamaged;
  };

  const getAvailableStock = (stock: Stock) => {
    return stock.statusNotDried + stock.statusDried;
  };

  const getUserDisplay = (user: any) => {
    const name = [user.firstName, user.lastName].filter(Boolean).join(' ');
    return name || user.email;
  };

  const getStatusLabel = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading && tabValue < 2) {
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
            <InventoryIcon sx={{ fontSize: 40, color: 'primary.main' }} />
            <Typography variant="h4" component="h1" fontWeight="bold">
              Inventory Reports
            </Typography>
          </Box>
        </Box>

        {/* Alerts */}
        {error && (
          <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Low Stock Alerts Summary */}
        {lowStockAlerts.length > 0 && (
          <Alert severity="warning" icon={<WarningIcon />} sx={{ mb: 2 }}>
            <strong>{lowStockAlerts.length}</strong> item(s) below minimum stock level
          </Alert>
        )}

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
            <Tab label="By Warehouse" />
            <Tab label="Consolidated View" />
            <Tab label="Low Stock Alerts" />
            <Tab label="Stock Adjustments" />
          </Tabs>
        </Box>

        {/* Tab 0: By Warehouse */}
        {tabValue === 0 && (
          <Box>
            <TextField
              select
              label="Select Warehouse"
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
              sx={{ mb: 3, minWidth: 300 }}
            >
              {warehouses.map((w) => (
                <MenuItem key={w.id} value={w.id}>
                  {w.name} ({w.code})
                </MenuItem>
              ))}
            </TextField>

            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Wood Type</strong></TableCell>
                    <TableCell><strong>Thickness</strong></TableCell>
                    <TableCell align="right"><strong>Not Dried</strong></TableCell>
                    <TableCell align="right"><strong>Under Drying</strong></TableCell>
                    <TableCell align="right"><strong>Dried</strong></TableCell>
                    <TableCell align="right"><strong>Damaged</strong></TableCell>
                    <TableCell align="right"><strong>In Transit</strong></TableCell>
                    <TableCell align="right"><strong>Total</strong></TableCell>
                    <TableCell align="right"><strong>Available</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {warehouseStock.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                        <Typography color="text.secondary">
                          No stock items in this warehouse
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    warehouseStock.map((stock) => (
                      <TableRow key={stock.id} hover>
                        <TableCell>{stock.woodType.name}</TableCell>
                        <TableCell>{stock.thickness}</TableCell>
                        <TableCell align="right">{stock.statusNotDried}</TableCell>
                        <TableCell align="right">{stock.statusUnderDrying}</TableCell>
                        <TableCell align="right">{stock.statusDried}</TableCell>
                        <TableCell align="right">{stock.statusDamaged}</TableCell>
                        <TableCell align="right">
                          {stock.statusInTransitOut + stock.statusInTransitIn}
                          {(stock.statusInTransitOut > 0 || stock.statusInTransitIn > 0) && (
                            <Typography variant="caption" display="block" color="text.secondary">
                              Out: {stock.statusInTransitOut} | In: {stock.statusInTransitIn}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <strong>{getTotalStock(stock)}</strong>
                        </TableCell>
                        <TableCell align="right">
                          <Chip
                            label={getAvailableStock(stock)}
                            size="small"
                            color="success"
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* Tab 1: Consolidated View */}
        {tabValue === 1 && consolidatedStock && (
          <Box>
            {consolidatedStock.summary.length === 0 ? (
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <Typography color="text.secondary">
                  No stock items across all warehouses
                </Typography>
              </Paper>
            ) : (
              consolidatedStock.summary.map((item, index) => (
                <Accordion key={index} sx={{ mb: 2 }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box display="flex" justifyContent="space-between" width="100%" pr={2}>
                      <Typography fontWeight="medium">
                        {item.woodType.name} • {item.thickness}
                      </Typography>
                      <Box display="flex" gap={2}>
                        <Chip
                          label={`Total: ${item.totalNotDried + item.totalUnderDrying + item.totalDried + item.totalDamaged}`}
                          size="small"
                        />
                        <Chip
                          label={`Available: ${item.totalNotDried + item.totalDried}`}
                          size="small"
                          color="success"
                        />
                      </Box>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={2} sx={{ mb: 2 }}>
                      <Grid item xs={3}>
                        <Card variant="outlined">
                          <CardContent>
                            <Typography variant="caption" color="text.secondary">
                              Not Dried
                            </Typography>
                            <Typography variant="h6">{item.totalNotDried}</Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid item xs={3}>
                        <Card variant="outlined">
                          <CardContent>
                            <Typography variant="caption" color="text.secondary">
                              Under Drying
                            </Typography>
                            <Typography variant="h6">{item.totalUnderDrying}</Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid item xs={3}>
                        <Card variant="outlined">
                          <CardContent>
                            <Typography variant="caption" color="text.secondary">
                              Dried
                            </Typography>
                            <Typography variant="h6">{item.totalDried}</Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid item xs={3}>
                        <Card variant="outlined">
                          <CardContent>
                            <Typography variant="caption" color="text.secondary">
                              Damaged
                            </Typography>
                            <Typography variant="h6">{item.totalDamaged}</Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    </Grid>

                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      By Warehouse:
                    </Typography>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Warehouse</TableCell>
                            <TableCell align="right">Not Dried</TableCell>
                            <TableCell align="right">Under Drying</TableCell>
                            <TableCell align="right">Dried</TableCell>
                            <TableCell align="right">Damaged</TableCell>
                            <TableCell align="right">In Transit</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {item.warehouses.map((wh, idx) => (
                            <TableRow key={idx}>
                              <TableCell>{wh.warehouse.name}</TableCell>
                              <TableCell align="right">{wh.quantities.notDried}</TableCell>
                              <TableCell align="right">{wh.quantities.underDrying}</TableCell>
                              <TableCell align="right">{wh.quantities.dried}</TableCell>
                              <TableCell align="right">{wh.quantities.damaged}</TableCell>
                              <TableCell align="right">
                                {wh.quantities.inTransitOut + wh.quantities.inTransitIn}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </AccordionDetails>
                </Accordion>
              ))
            )}
          </Box>
        )}

        {/* Tab 2: Low Stock Alerts */}
        {tabValue === 2 && (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Warehouse</strong></TableCell>
                  <TableCell><strong>Wood Type</strong></TableCell>
                  <TableCell><strong>Thickness</strong></TableCell>
                  <TableCell align="right"><strong>Current Stock</strong></TableCell>
                  <TableCell align="right"><strong>Minimum Level</strong></TableCell>
                  <TableCell align="right"><strong>Shortfall</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {lowStockAlerts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">
                        No low stock alerts. All items are above minimum levels.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  lowStockAlerts.map((alert) => (
                    <TableRow key={alert.id} hover>
                      <TableCell>
                        {alert.warehouse.name}
                        <Typography variant="caption" display="block" color="text.secondary">
                          {alert.warehouse.code}
                        </Typography>
                      </TableCell>
                      <TableCell>{alert.woodType.name}</TableCell>
                      <TableCell>{alert.thickness}</TableCell>
                      <TableCell align="right">
                        <Chip
                          label={alert.currentStock}
                          size="small"
                          color="error"
                        />
                      </TableCell>
                      <TableCell align="right">{alert.minimumStockLevel}</TableCell>
                      <TableCell align="right">
                        <Box display="flex" alignItems="center" justifyContent="flex-end" gap={0.5}>
                          <TrendingDownIcon fontSize="small" color="error" />
                          <Typography color="error.main" fontWeight="medium">
                            {alert.shortfall}
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Tab 3: Stock Adjustments */}
        {tabValue === 3 && (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Date</strong></TableCell>
                  <TableCell><strong>Warehouse</strong></TableCell>
                  <TableCell><strong>Wood Type</strong></TableCell>
                  <TableCell><strong>Thickness</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                  <TableCell align="right"><strong>Before</strong></TableCell>
                  <TableCell align="right"><strong>After</strong></TableCell>
                  <TableCell align="right"><strong>Change</strong></TableCell>
                  <TableCell><strong>Reason</strong></TableCell>
                  <TableCell><strong>Adjusted By</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {adjustments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">
                        No stock adjustments recorded
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  adjustments.map((adj) => (
                    <TableRow key={adj.id} hover>
                      <TableCell>
                        <Typography variant="body2">
                          {format(new Date(adj.adjustedAt), 'MMM dd, yyyy')}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {format(new Date(adj.adjustedAt), 'HH:mm')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {adj.warehouse.name}
                        <Typography variant="caption" display="block" color="text.secondary">
                          {adj.warehouse.code}
                        </Typography>
                      </TableCell>
                      <TableCell>{adj.woodType.name}</TableCell>
                      <TableCell>{adj.thickness}</TableCell>
                      <TableCell>
                        <Chip
                          label={getStatusLabel(adj.woodStatus)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">{adj.quantityBefore}</TableCell>
                      <TableCell align="right">{adj.quantityAfter}</TableCell>
                      <TableCell align="right">
                        <Box display="flex" alignItems="center" justifyContent="flex-end" gap={0.5}>
                          {adj.quantityChange > 0 ? (
                            <>
                              <TrendingUpIcon fontSize="small" color="success" />
                              <Typography color="success.main" fontWeight="medium">
                                +{adj.quantityChange}
                              </Typography>
                            </>
                          ) : (
                            <>
                              <TrendingDownIcon fontSize="small" color="error" />
                              <Typography color="error.main" fontWeight="medium">
                                {adj.quantityChange}
                              </Typography>
                            </>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {getStatusLabel(adj.reason)}
                        </Typography>
                        {adj.notes && (
                          <Typography variant="caption" color="text.secondary">
                            {adj.notes}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>{getUserDisplay(adj.adjustedBy)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </Container>
  );
};

export default InventoryReports;
