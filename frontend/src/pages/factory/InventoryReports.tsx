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
import { Document, Page, Text, View, StyleSheet, Image, BlobProvider } from '@react-pdf/renderer';
import logo from '../../assets/images/logo.png';
import { StockMovementDialog } from '../../components/stock/StockMovementDialog';

// PDF Styles matching LOT Traceability Report
const pdfStyles = StyleSheet.create({
  page: {
    padding: '25 30',
    fontFamily: 'Helvetica',
    fontSize: 8,
    color: '#2c3e50'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  headerLeft: {
    flex: 1
  },
  headerRight: {
    alignItems: 'flex-end'
  },
  logo: {
    width: 80,
    marginBottom: 4
  },
  title: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#dc2626',
    marginBottom: 2
  },
  subtitle: {
    fontSize: 7,
    color: '#64748b'
  },
  headerMeta: {
    fontSize: 7,
    color: '#64748b',
    textAlign: 'right',
    marginBottom: 2
  },
  // Info Card
  infoCard: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
    padding: 12,
    marginBottom: 12
  },
  infoCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  infoCardTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b'
  },
  infoGrid: {
    flexDirection: 'row'
  },
  infoColumn: {
    flex: 1
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 6,
    alignItems: 'flex-start'
  },
  infoLabel: {
    width: 80,
    fontSize: 7.5,
    color: '#64748b',
    paddingTop: 1
  },
  infoValue: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b'
  },
  // Section
  section: {
    marginBottom: 10
  },
  sectionTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b',
    backgroundColor: '#f1f5f9',
    padding: '5 8',
    borderRadius: 3,
    marginBottom: 6
  },
  // Table
  table: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 3
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    padding: '5 6',
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#475569'
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e2e8f0',
    padding: '4 6',
    fontSize: 7
  },
  tableRowAlt: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e2e8f0',
    padding: '4 6',
    fontSize: 7,
    backgroundColor: '#fafafa'
  },
  tableCell: {
    flex: 1
  },
  tableCellRight: {
    flex: 1,
    textAlign: 'right'
  },
  tableCellCenter: {
    flex: 1,
    textAlign: 'center'
  },
  // Summary boxes
  summaryRow: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 8
  },
  summaryBox: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
    padding: 10,
    alignItems: 'center'
  },
  summaryBoxGreen: {
    flex: 1,
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#22c55e',
    borderRadius: 4,
    padding: 10,
    alignItems: 'center'
  },
  summaryBoxRed: {
    flex: 1,
    backgroundColor: '#dc2626',
    borderRadius: 4,
    padding: 10,
    alignItems: 'center'
  },
  summaryLabel: {
    fontSize: 6.5,
    color: '#64748b',
    marginBottom: 3
  },
  summaryLabelGreen: {
    fontSize: 6.5,
    color: '#166534',
    marginBottom: 3
  },
  summaryLabelWhite: {
    fontSize: 6.5,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 3
  },
  summaryValue: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b'
  },
  summaryValueGreen: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#16a34a'
  },
  summaryValueWhite: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff'
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 30,
    right: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0'
  },
  footerText: {
    fontSize: 6.5,
    color: '#94a3b8'
  },
  footerBrand: {
    fontSize: 6.5,
    color: '#94a3b8'
  },
  pageNumber: {
    fontSize: 6.5,
    color: '#94a3b8'
  }
});

// PDF Component
interface InventoryPDFProps {
  warehouse: Warehouse;
  woodTypeFilter: string;
  stockData: Stock[];
  timestamp: string;
}

const InventoryPDF: FC<InventoryPDFProps> = ({ warehouse, woodTypeFilter, stockData, timestamp }) => {
  // Calculate totals
  const totals = stockData.reduce((acc, stock) => ({
    notDried: acc.notDried + stock.statusNotDried,
    underDrying: acc.underDrying + stock.statusUnderDrying,
    dried: acc.dried + stock.statusDried,
    damaged: acc.damaged + stock.statusDamaged,
    inTransit: acc.inTransit + (stock.statusInTransitOut || 0) + (stock.statusInTransitIn || 0),
    total: acc.total + stock.statusNotDried + stock.statusUnderDrying + stock.statusDried + stock.statusDamaged,
    available: acc.available + stock.statusNotDried + stock.statusDried
  }), { notDried: 0, underDrying: 0, dried: 0, damaged: 0, inTransit: 0, total: 0, available: 0 });

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={pdfStyles.page}>
        {/* Header */}
        <View style={pdfStyles.header} fixed>
          <View style={pdfStyles.headerLeft}>
            <Image src={logo} style={pdfStyles.logo} />
            <Text style={pdfStyles.title}>Inventory Report</Text>
            <Text style={pdfStyles.subtitle}>Professional Wood Solutions</Text>
          </View>
          <View style={pdfStyles.headerRight}>
            <Text style={pdfStyles.headerMeta}>Generated: {timestamp}</Text>
            <Text style={pdfStyles.headerMeta}>Warehouse: {warehouse.name}</Text>
            <Text style={pdfStyles.headerMeta}>v1.0.0</Text>
          </View>
        </View>

        {/* Info Card */}
        <View style={pdfStyles.infoCard}>
          <View style={pdfStyles.infoCardHeader}>
            <Text style={pdfStyles.infoCardTitle}>{warehouse.name} ({warehouse.code})</Text>
          </View>
          <View style={pdfStyles.infoGrid}>
            <View style={pdfStyles.infoColumn}>
              <View style={pdfStyles.infoRow}>
                <Text style={pdfStyles.infoLabel}>Wood Type:</Text>
                <Text style={pdfStyles.infoValue}>{woodTypeFilter}</Text>
              </View>
              <View style={pdfStyles.infoRow}>
                <Text style={pdfStyles.infoLabel}>Total Items:</Text>
                <Text style={pdfStyles.infoValue}>{stockData.length} types</Text>
              </View>
            </View>
            <View style={pdfStyles.infoColumn}>
              <View style={pdfStyles.infoRow}>
                <Text style={pdfStyles.infoLabel}>Total Pieces:</Text>
                <Text style={pdfStyles.infoValue}>{totals.total.toLocaleString()} pcs</Text>
              </View>
              <View style={pdfStyles.infoRow}>
                <Text style={pdfStyles.infoLabel}>Available:</Text>
                <Text style={[pdfStyles.infoValue, { color: '#16a34a' }]}>{totals.available.toLocaleString()} pcs</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Stock Details Table */}
        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Stock Details</Text>
          <View style={pdfStyles.table}>
            {/* Table Header */}
            <View style={pdfStyles.tableHeader} fixed>
              <Text style={[pdfStyles.tableCell, { flex: 2 }]}>Wood Type</Text>
              <Text style={pdfStyles.tableCellCenter}>Thickness</Text>
              <Text style={pdfStyles.tableCellRight}>Not Dried</Text>
              <Text style={pdfStyles.tableCellRight}>Drying</Text>
              <Text style={pdfStyles.tableCellRight}>Dried</Text>
              <Text style={pdfStyles.tableCellRight}>Damaged</Text>
              <Text style={pdfStyles.tableCellRight}>In Transit</Text>
              <Text style={pdfStyles.tableCellRight}>Total</Text>
              <Text style={pdfStyles.tableCellRight}>Available</Text>
            </View>

            {/* Table Body */}
            {stockData.map((stock, index) => (
              <View key={stock.id} style={index % 2 === 0 ? pdfStyles.tableRow : pdfStyles.tableRowAlt} wrap={false}>
                <Text style={[pdfStyles.tableCell, { flex: 2, fontFamily: 'Helvetica-Bold' }]}>{stock.woodType.name}</Text>
                <Text style={pdfStyles.tableCellCenter}>{stock.thickness}</Text>
                <Text style={pdfStyles.tableCellRight}>{stock.statusNotDried.toLocaleString()}</Text>
                <Text style={pdfStyles.tableCellRight}>{stock.statusUnderDrying.toLocaleString()}</Text>
                <Text style={[pdfStyles.tableCellRight, { color: '#dc2626', fontFamily: 'Helvetica-Bold' }]}>{stock.statusDried.toLocaleString()}</Text>
                <Text style={[pdfStyles.tableCellRight, { color: '#ea580c' }]}>{stock.statusDamaged.toLocaleString()}</Text>
                <Text style={pdfStyles.tableCellRight}>{((stock.statusInTransitOut || 0) + (stock.statusInTransitIn || 0)).toLocaleString()}</Text>
                <Text style={[pdfStyles.tableCellRight, { fontFamily: 'Helvetica-Bold' }]}>
                  {(stock.statusNotDried + stock.statusUnderDrying + stock.statusDried + stock.statusDamaged).toLocaleString()}
                </Text>
                <Text style={[pdfStyles.tableCellRight, { color: '#16a34a', fontFamily: 'Helvetica-Bold' }]}>
                  {(stock.statusNotDried + stock.statusDried).toLocaleString()}
                </Text>
              </View>
            ))}

            {/* Totals Row */}
            <View style={[pdfStyles.tableRow, { backgroundColor: '#f1f5f9', borderTopWidth: 1, borderTopColor: '#e2e8f0' }]} wrap={false}>
              <Text style={[pdfStyles.tableCell, { flex: 2, fontFamily: 'Helvetica-Bold' }]}>TOTALS</Text>
              <Text style={pdfStyles.tableCellCenter}>-</Text>
              <Text style={[pdfStyles.tableCellRight, { fontFamily: 'Helvetica-Bold' }]}>{totals.notDried.toLocaleString()}</Text>
              <Text style={[pdfStyles.tableCellRight, { fontFamily: 'Helvetica-Bold' }]}>{totals.underDrying.toLocaleString()}</Text>
              <Text style={[pdfStyles.tableCellRight, { color: '#dc2626', fontFamily: 'Helvetica-Bold' }]}>{totals.dried.toLocaleString()}</Text>
              <Text style={[pdfStyles.tableCellRight, { fontFamily: 'Helvetica-Bold' }]}>{totals.damaged.toLocaleString()}</Text>
              <Text style={[pdfStyles.tableCellRight, { fontFamily: 'Helvetica-Bold' }]}>{totals.inTransit.toLocaleString()}</Text>
              <Text style={[pdfStyles.tableCellRight, { fontFamily: 'Helvetica-Bold' }]}>{totals.total.toLocaleString()}</Text>
              <Text style={[pdfStyles.tableCellRight, { color: '#16a34a', fontFamily: 'Helvetica-Bold' }]}>{totals.available.toLocaleString()}</Text>
            </View>
          </View>
        </View>

        {/* Summary Boxes */}
        <View style={pdfStyles.summaryRow}>
          <View style={pdfStyles.summaryBox}>
            <Text style={pdfStyles.summaryLabel}>TOTAL PIECES</Text>
            <Text style={pdfStyles.summaryValue}>{totals.total.toLocaleString()}</Text>
          </View>
          <View style={pdfStyles.summaryBoxGreen}>
            <Text style={pdfStyles.summaryLabelGreen}>AVAILABLE</Text>
            <Text style={pdfStyles.summaryValueGreen}>{totals.available.toLocaleString()}</Text>
          </View>
          <View style={pdfStyles.summaryBoxRed}>
            <Text style={pdfStyles.summaryLabelWhite}>DRIED & READY</Text>
            <Text style={pdfStyles.summaryValueWhite}>{totals.dried.toLocaleString()}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={pdfStyles.footer} fixed>
          <Text style={pdfStyles.footerText}>This is a computer-generated document. No signature required.</Text>
          <Text style={pdfStyles.pageNumber} render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} />
          <Text style={pdfStyles.footerBrand}>U Design v1.0.0</Text>
        </View>
      </Page>
    </Document>
  );
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
  const [selectedWoodType, setSelectedWoodType] = useState<string>('all');
  const [warehouseStock, setWarehouseStock] = useState<Stock[]>([]);
  const [consolidatedStock, setConsolidatedStock] = useState<ConsolidatedStock | null>(null);
  const [lowStockAlerts, setLowStockAlerts] = useState<LowStockAlert[]>([]);
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);
  const [inTransitTransfers, setInTransitTransfers] = useState<Transfer[]>([]);
  const [dryingProcesses, setDryingProcesses] = useState<any[]>([]);

  // Stock movement dialog state
  const [movementDialogOpen, setMovementDialogOpen] = useState(false);
  const [selectedWoodTypeForMovement, setSelectedWoodTypeForMovement] = useState<{ id: string; name: string; thickness: string } | null>(null);

  useEffect(() => {
    fetchWarehouses();
    fetchLowStockAlerts();
    fetchAdjustments();
    fetchInTransitTransfers();
    fetchDryingProcesses();
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

  const fetchDryingProcesses = async () => {
    try {
      const response = await api.get('/factory/drying-processes');
      setDryingProcesses(response.data || []);
    } catch (err) {
      console.error('Failed to fetch drying processes:', err);
    }
  };

  const getEstimatedCompletion = (warehouseId: string, woodTypeId: string, thickness: string) => {
    const process = dryingProcesses.find(p =>
      p.status === 'IN_PROGRESS' &&
      p.sourceWarehouseId === warehouseId &&
      p.woodTypeId === woodTypeId &&
      p.stockThickness === thickness &&
      p.readings && p.readings.length >= 2
    );

    if (!process) return null;

    const TARGET_HUMIDITY = 12;
    const readings = process.readings;

    // Calculate linear regression for humidity decline
    const dataPoints = [
      { time: new Date(process.startTime).getTime(), humidity: process.startingHumidity || readings[0].humidity },
      ...readings.map((r: any) => ({ time: new Date(r.readingTime).getTime(), humidity: r.humidity }))
    ];

    const n = dataPoints.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

    dataPoints.forEach((point, i) => {
      sumX += i;
      sumY += point.humidity;
      sumXY += i * point.humidity;
      sumX2 += i * i;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

    // If humidity not decreasing, can't estimate
    if (slope >= 0) return null;

    const currentHumidity = readings[readings.length - 1].humidity;
    if (currentHumidity <= TARGET_HUMIDITY) return null;

    // Calculate estimated completion
    const stepsToTarget = Math.ceil((currentHumidity - TARGET_HUMIDITY) / Math.abs(slope));
    const lastReadingTime = new Date(readings[readings.length - 1].readingTime).getTime();
    const avgTimeBetweenReadings = (lastReadingTime - new Date(process.startTime).getTime()) / readings.length;
    const estimatedCompletionTime = lastReadingTime + (stepsToTarget * avgTimeBetweenReadings);

    return new Date(estimatedCompletionTime);
  };

  const getTotalStock = (stock: Stock) => {
    return stock.statusNotDried + stock.statusUnderDrying + stock.statusDried + stock.statusDamaged;
  };

  const getAvailableStock = (stock: Stock) => {
    return stock.statusNotDried + stock.statusDried;
  };

  // Get unique wood types from warehouse stock
  const uniqueWoodTypes = Array.from(
    new Set(warehouseStock.map(stock => stock.woodType.id))
  ).map(id => {
    const stock = warehouseStock.find(s => s.woodType.id === id);
    return stock!.woodType;
  }).sort((a, b) => a.name.localeCompare(b.name));

  // Filter warehouse stock by selected wood type
  const filteredWarehouseStock = selectedWoodType === 'all'
    ? warehouseStock
    : warehouseStock.filter(stock => stock.woodType.id === selectedWoodType);

  const getUserDisplay = (user: any) => {
    const name = [user.firstName, user.lastName].filter(Boolean).join(' ');
    return name || user.email;
  };

  const getStatusLabel = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const handleWoodTypeClick = (id: string, name: string, thickness: string) => {
    setSelectedWoodTypeForMovement({ id, name, thickness });
    setMovementDialogOpen(true);
  };

  // Get current warehouse for PDF
  const currentWarehouse = warehouses.find(w => w.id === selectedWarehouse);
  const currentWoodTypeFilter = selectedWoodType === 'all'
    ? 'All Wood Types'
    : uniqueWoodTypes.find(w => w.id === selectedWoodType)?.name || 'All Wood Types';

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
          {tabValue === 0 && warehouseStock.length > 0 && currentWarehouse && (
            <BlobProvider
              document={
                <InventoryPDF
                  warehouse={currentWarehouse}
                  woodTypeFilter={currentWoodTypeFilter}
                  stockData={filteredWarehouseStock}
                  timestamp={format(new Date(), 'dd MMM yyyy, HH:mm:ss')}
                />
              }
            >
              {({ blob, url, loading: pdfLoading }) => (
                <Button
                  variant="contained"
                  startIcon={pdfLoading ? <CircularProgress size={18} color="inherit" /> : <PictureAsPdfIcon />}
                  disabled={pdfLoading}
                  onClick={() => {
                    if (url) {
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = `Inventory_Report_${currentWarehouse.code}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
                      link.click();
                    }
                  }}
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
                  {pdfLoading ? 'Generating...' : 'Export PDF'}
                </Button>
              )}
            </BlobProvider>
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
        <Box sx={{ mb: 3 }}>
          <Tabs
            value={tabValue}
            onChange={(_, v) => setTabValue(v)}
            sx={{
              '& .MuiTabs-indicator': {
                backgroundColor: '#dc2626',
                height: 3,
                borderRadius: '3px 3px 0 0',
              },
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 500,
                fontSize: '0.875rem',
                color: '#64748b',
                minHeight: 44,
                px: 2.5,
                '&:hover': {
                  color: '#dc2626',
                  backgroundColor: '#fef2f2',
                },
                '&.Mui-selected': {
                  color: '#dc2626',
                  fontWeight: 600,
                },
              },
              borderBottom: '2px solid #e2e8f0',
            }}
          >
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
                px: 2,
                py: 1.5,
                mb: 2,
                borderRadius: 2,
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0'
              }}
            >
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                <TextField
                  select
                  label="Select Warehouse"
                  value={selectedWarehouse}
                  onChange={(e) => setSelectedWarehouse(e.target.value)}
                  size="small"
                  sx={{
                    minWidth: 280,
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

                <TextField
                  select
                  label="Filter by Wood Type"
                  value={selectedWoodType}
                  onChange={(e) => setSelectedWoodType(e.target.value)}
                  size="small"
                  sx={{
                    minWidth: 220,
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
                  <MenuItem value="all">All Wood Types</MenuItem>
                  {uniqueWoodTypes.map((woodType) => (
                    <MenuItem key={woodType.id} value={woodType.id}>
                      {woodType.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>
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
                  {filteredWarehouseStock.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                        <Typography color="text.secondary">
                          {warehouseStock.length === 0
                            ? 'No stock items in this warehouse'
                            : 'No stock items match the selected wood type'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredWarehouseStock.map((stock) => (
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
                        <TableCell
                          sx={{
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            color: '#dc2626',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                            '&:hover': {
                              color: '#b91c1c',
                              backgroundColor: '#fef2f2'
                            }
                          }}
                          onClick={() => handleWoodTypeClick(stock.woodType.id, stock.woodType.name, stock.thickness)}
                        >
                          {stock.woodType.name}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.875rem', color: '#64748b' }}>
                          {stock.thickness}
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: '0.875rem', color: '#64748b' }}>
                          {stock.statusNotDried}
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: '0.875rem', color: '#64748b', verticalAlign: 'middle' }}>
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                            <Box>{stock.statusUnderDrying}</Box>
                            {stock.statusUnderDrying > 0 && (() => {
                              const estimatedDate = getEstimatedCompletion(stock.warehouseId, stock.woodType.id, stock.thickness);
                              if (estimatedDate) {
                                return (
                                  <Typography variant="caption" display="block" sx={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                                    Est: {format(estimatedDate, 'MMM d, yyyy, h:mm a')}
                                  </Typography>
                                );
                              }
                              return null;
                            })()}
                          </Box>
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: '0.875rem', color: '#dc2626', fontWeight: 700 }}>
                          {stock.statusDried}
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: '0.875rem', color: '#64748b' }}>
                          {stock.statusDamaged}
                        </TableCell>
                        <TableCell align="right">
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
                            <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#64748b' }}>
                              {stock.statusInTransitOut + stock.statusInTransitIn}
                            </Typography>
                            {(stock.statusInTransitOut > 0 || stock.statusInTransitIn > 0) && (
                              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                {stock.statusInTransitOut > 0 && (
                                  <Chip
                                    label={`Out: ${stock.statusInTransitOut}`}
                                    size="small"
                                    sx={{
                                      height: '18px',
                                      fontSize: '0.65rem',
                                      backgroundColor: '#fef3c7',
                                      color: '#92400e',
                                      fontWeight: 600,
                                      '& .MuiChip-label': { px: 1 }
                                    }}
                                  />
                                )}
                                {stock.statusInTransitIn > 0 && (
                                  <Chip
                                    label={`In: ${stock.statusInTransitIn}`}
                                    size="small"
                                    sx={{
                                      height: '18px',
                                      fontSize: '0.65rem',
                                      backgroundColor: '#dbeafe',
                                      color: '#1e40af',
                                      fontWeight: 600,
                                      '& .MuiChip-label': { px: 1 }
                                    }}
                                  />
                                )}
                              </Box>
                            )}
                          </Box>
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

      {/* Stock Movement Dialog */}
      {selectedWoodTypeForMovement && (
        <StockMovementDialog
          open={movementDialogOpen}
          onClose={() => setMovementDialogOpen(false)}
          woodTypeId={selectedWoodTypeForMovement.id}
          woodTypeName={selectedWoodTypeForMovement.name}
          thickness={selectedWoodTypeForMovement.thickness}
        />
      )}
    </Container>
  );
};

export default InventoryReports;
