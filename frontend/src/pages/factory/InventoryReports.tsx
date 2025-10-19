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
  AccordionDetails,
  Button,
  Stack
} from '@mui/material';
import InventoryIcon from '@mui/icons-material/Inventory';
import WarningIcon from '@mui/icons-material/Warning';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import api from '../../lib/api';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

interface Transfer {
  id: string;
  transferNumber: string;
  fromWarehouse: Warehouse;
  toWarehouse: Warehouse;
  status: string;
  transferDate: string;
  items: Array<{
    id: string;
    woodType: WoodType;
    thickness: string;
    quantity: number;
    woodStatus: string;
  }>;
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
  const [inTransitTransfers, setInTransitTransfers] = useState<Transfer[]>([]);

  useEffect(() => {
    fetchWarehouses();
    fetchLowStockAlerts();
    fetchAdjustments();
    fetchInTransitTransfers();
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

  const fetchInTransitTransfers = async () => {
    try {
      const response = await api.get('/transfers');
      const inTransit = response.data.filter((transfer: Transfer) =>
        transfer.status === 'APPROVED' || transfer.status === 'IN_TRANSIT'
      );
      setInTransitTransfers(inTransit);
    } catch (err) {
      console.error('Failed to fetch in-transit transfers:', err);
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

  const exportToPDF = () => {
    // Create PDF in landscape orientation
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Add logo
    const logo = new Image();
    logo.src = '/src/assets/images/logo.png';
    doc.addImage(logo, 'PNG', 14, 10, 25, 8);

    // Header - Company name and title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(44, 62, 80); // Dark blue-gray
    doc.text('U Design', 42, 16);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(220, 38, 38); // Red
    doc.text('Inventory Report', 42, 22);

    // Timestamp and version in top right
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139); // Gray
    doc.text(`Generated: ${format(new Date(), 'PPpp')}`, pageWidth - 14, 14, { align: 'right' });
    doc.text('v3.9', pageWidth - 14, 18, { align: 'right' });

    // Gray line under header
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(14, 26, pageWidth - 14, 26);

    let startY = 35;

    if (tabValue === 0) {
      // By Warehouse Report - Info box
      const warehouse = warehouses.find(w => w.id === selectedWarehouse);
      if (warehouse) {
        // Info box background
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(14, startY, pageWidth - 28, 15, 2, 2, 'FD');

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text('Warehouse:', 18, startY + 6);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(44, 62, 80);
        doc.text(`${warehouse.name} (${warehouse.code})`, 18, startY + 11);

        startY += 20;
      }

      if (warehouseStock.length > 0) {
        const tableData = warehouseStock.map(stock => [
          stock.woodType.name,
          stock.thickness,
          stock.statusNotDried.toString(),
          stock.statusUnderDrying.toString(),
          stock.statusDried.toString(),
          stock.statusDamaged.toString(),
          (stock.statusInTransitOut + stock.statusInTransitIn).toString(),
          getTotalStock(stock).toString(),
          getAvailableStock(stock).toString()
        ]);

        autoTable(doc, {
          startY,
          head: [['Wood Type', 'Thickness', 'Not Dried', 'Under Drying', 'Dried', 'Damaged', 'In Transit', 'Total', 'Available']],
          body: tableData,
          theme: 'plain',
          headStyles: {
            fillColor: [248, 250, 252],
            textColor: [30, 41, 59],
            fontStyle: 'bold',
            fontSize: 9,
            halign: 'left',
            cellPadding: { top: 3, right: 4, bottom: 3, left: 4 },
            lineWidth: 0.1,
            lineColor: [226, 232, 240]
          },
          bodyStyles: {
            fontSize: 8,
            cellPadding: { top: 3, right: 4, bottom: 3, left: 4 },
            textColor: [44, 62, 80]
          },
          alternateRowStyles: {
            fillColor: [250, 250, 250]
          },
          columnStyles: {
            0: { cellWidth: 35, fontStyle: 'bold', textColor: [30, 41, 59] },
            1: { cellWidth: 25, halign: 'center' },
            2: { cellWidth: 25, halign: 'right' },
            3: { cellWidth: 28, halign: 'right' },
            4: { cellWidth: 25, halign: 'right' },
            5: { cellWidth: 25, halign: 'right' },
            6: { cellWidth: 25, halign: 'right' },
            7: { cellWidth: 25, halign: 'right', fontStyle: 'bold' },
            8: { cellWidth: 25, halign: 'right', fontStyle: 'bold', textColor: [22, 163, 74] }
          },
          margin: { left: 14, right: 14 },
          tableLineColor: [226, 232, 240],
          tableLineWidth: 0.1
        });
      }
    }

    // Footer with line and metadata
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);

      const footerY = pageHeight - 15;

      // Footer line
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(14, footerY, pageWidth - 14, footerY);

      // Footer text
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'normal');

      // Left: Company name
      doc.text('U Design - Wood Management System', 14, footerY + 5);

      // Center: Page number
      doc.text(
        `Page ${i} of ${pageCount}`,
        pageWidth / 2,
        footerY + 5,
        { align: 'center' }
      );

      // Right: Timestamp
      doc.text(
        format(new Date(), 'dd/MM/yyyy HH:mm'),
        pageWidth - 14,
        footerY + 5,
        { align: 'right' }
      );
    }

    const fileName = tabValue === 0
      ? `UD - Inventory Report (${warehouses.find(w => w.id === selectedWarehouse)?.code || 'Warehouse'}).pdf`
      : 'UD - Inventory Report.pdf';

    doc.save(fileName);
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
            <InventoryIcon sx={{ fontSize: 40, color: '#dc2626' }} />
            <Typography variant="h4" component="h1" fontWeight={700} sx={{ color: '#1e293b' }}>
              Inventory Reports
            </Typography>
          </Box>
          {tabValue === 0 && warehouseStock.length > 0 && (
            <Button
              variant="contained"
              startIcon={<PictureAsPdfIcon />}
              onClick={exportToPDF}
              sx={{
                backgroundColor: '#dc2626',
                color: '#fff',
                textTransform: 'none',
                fontWeight: 600,
                px: 3,
                '&:hover': {
                  backgroundColor: '#b91c1c',
                },
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
            >
              Export PDF
            </Button>
          )}
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
            <Paper
              sx={{
                p: 2,
                mb: 3,
                borderRadius: 2,
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0'
              }}
            >
              <TextField
                select
                label="Select Warehouse"
                value={selectedWarehouse}
                onChange={(e) => setSelectedWarehouse(e.target.value)}
                sx={{
                  minWidth: 300,
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#fff',
                    '&:hover fieldset': {
                      borderColor: '#dc2626',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#dc2626',
                    }
                  },
                  '& .MuiInputLabel-root.Mui-focused': {
                    color: '#dc2626'
                  }
                }}
              >
                {warehouses.map((w) => (
                  <MenuItem key={w.id} value={w.id}>
                    {w.name} ({w.code})
                  </MenuItem>
                ))}
              </TextField>
            </Paper>

            <TableContainer
              component={Paper}
              sx={{
                borderRadius: 2,
                overflow: 'hidden',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
            >
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f8fafc' }}>
                    <TableCell sx={{ fontWeight: 700, color: '#1e293b', fontSize: '0.875rem' }}>Wood Type</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#1e293b', fontSize: '0.875rem' }}>Thickness</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: '#1e293b', fontSize: '0.875rem' }}>Not Dried</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: '#1e293b', fontSize: '0.875rem' }}>Under Drying</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: '#1e293b', fontSize: '0.875rem' }}>Dried</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: '#1e293b', fontSize: '0.875rem' }}>Damaged</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: '#1e293b', fontSize: '0.875rem' }}>In Transit</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: '#1e293b', fontSize: '0.875rem' }}>Total</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: '#1e293b', fontSize: '0.875rem' }}>Available</TableCell>
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
                      <TableRow
                        key={stock.id}
                        sx={{
                          '&:hover': {
                            backgroundColor: '#f8fafc',
                          },
                          '&:nth-of-type(even)': {
                            backgroundColor: '#fafafa',
                          }
                        }}
                      >
                        <TableCell sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>
                          {stock.woodType.name}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.875rem', color: '#64748b' }}>
                          {stock.thickness}
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: '0.875rem', color: '#64748b' }}>
                          {stock.statusNotDried}
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: '0.875rem', color: '#64748b' }}>
                          {stock.statusUnderDrying}
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: '0.875rem', color: '#64748b' }}>
                          {stock.statusDried}
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: '0.875rem', color: '#64748b' }}>
                          {stock.statusDamaged}
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: '0.875rem', color: '#64748b' }}>
                          {stock.statusInTransitOut + stock.statusInTransitIn}
                          {(stock.statusInTransitOut > 0 || stock.statusInTransitIn > 0) && (
                            <Typography variant="caption" display="block" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                              Out: {stock.statusInTransitOut} | In: {stock.statusInTransitIn}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <Typography sx={{ fontWeight: 700, color: '#1e293b', fontSize: '0.875rem' }}>
                            {getTotalStock(stock)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Chip
                            label={getAvailableStock(stock)}
                            size="small"
                            sx={{
                              backgroundColor: '#dcfce7',
                              color: '#16a34a',
                              fontWeight: 700,
                              fontSize: '0.75rem',
                              height: 24,
                              minWidth: 40,
                              borderRadius: '12px'
                            }}
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
                      <Grid item xs={2.4}>
                        <Card variant="outlined">
                          <CardContent>
                            <Typography variant="caption" color="text.secondary">
                              Not Dried
                            </Typography>
                            <Typography variant="h6">{item.totalNotDried}</Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid item xs={2.4}>
                        <Card variant="outlined">
                          <CardContent>
                            <Typography variant="caption" color="text.secondary">
                              Under Drying
                            </Typography>
                            <Typography variant="h6">{item.totalUnderDrying}</Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid item xs={2.4}>
                        <Card variant="outlined">
                          <CardContent>
                            <Typography variant="caption" color="text.secondary">
                              Dried
                            </Typography>
                            <Typography variant="h6">{item.totalDried}</Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid item xs={2.4}>
                        <Card variant="outlined">
                          <CardContent>
                            <Typography variant="caption" color="text.secondary">
                              Damaged
                            </Typography>
                            <Typography variant="h6">{item.totalDamaged}</Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid item xs={2.4}>
                        <Card variant="outlined" sx={{ bgcolor: '#e0f2fe' }}>
                          <CardContent>
                            <Typography variant="caption" color="text.secondary">
                              In Transit
                            </Typography>
                            <Typography variant="h6" color="primary">
                              {item.totalInTransit || 0}
                            </Typography>
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

            {/* In Transit Transfers Section */}
            {inTransitTransfers.length > 0 && (
              <Box sx={{ mt: 4 }}>
                <Paper sx={{ p: 2, bgcolor: '#e0f2fe', border: '1px solid #0284c7' }}>
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <WarningIcon color="info" />
                    <Typography variant="h6" fontWeight="bold">
                      Pending Arrivals ({inTransitTransfers.length} transfers)
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" mb={2}>
                    The following transfers are in transit and not yet completed at the destination warehouse.
                  </Typography>
                  {inTransitTransfers.map((transfer) => (
                    <Box key={transfer.id} sx={{ mb: 2 }}>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                        <Typography variant="subtitle2" fontWeight="bold">
                          {transfer.transferNumber}
                        </Typography>
                        <Chip
                          label={transfer.status}
                          size="small"
                          color="primary"
                        />
                      </Box>
                      <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                        {transfer.fromWarehouse.name} → {transfer.toWarehouse.name} • {format(new Date(transfer.transferDate), 'MMM dd, yyyy')}
                      </Typography>
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell><strong>Wood Type</strong></TableCell>
                              <TableCell><strong>Thickness</strong></TableCell>
                              <TableCell align="right"><strong>Quantity</strong></TableCell>
                              <TableCell><strong>Status</strong></TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {transfer.items.map((item) => (
                              <TableRow key={item.id}>
                                <TableCell>{item.woodType.name}</TableCell>
                                <TableCell>{item.thickness}</TableCell>
                                <TableCell align="right"><strong>{item.quantity} pcs</strong></TableCell>
                                <TableCell>{getStatusLabel(item.woodStatus)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>
                  ))}
                </Paper>
              </Box>
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
