import { useState, useEffect, type FC } from 'react';
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
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { format } from 'date-fns';
import { Document, Page, Text, View, StyleSheet, Image, BlobProvider } from '@react-pdf/renderer';
import api from '../../lib/api';
import logo from '../../assets/images/logo.png';

// PDF Styles matching other reports
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
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#dc2626',
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
  summaryLabelRed: {
    fontSize: 6.5,
    color: '#991b1b',
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
  summaryValueRed: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#dc2626'
  },
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
  },
  chipGreen: {
    backgroundColor: '#dcfce7',
    color: '#166534',
    padding: '2 6',
    borderRadius: 8,
    fontSize: 6.5
  },
  chipRed: {
    backgroundColor: '#fef2f2',
    color: '#991b1b',
    padding: '2 6',
    borderRadius: 8,
    fontSize: 6.5
  },
  chipBlue: {
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    padding: '2 6',
    borderRadius: 8,
    fontSize: 6.5
  },
  chipYellow: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
    padding: '2 6',
    borderRadius: 8,
    fontSize: 6.5
  },
  chipDefault: {
    backgroundColor: '#f1f5f9',
    color: '#475569',
    padding: '2 6',
    borderRadius: 8,
    fontSize: 6.5
  }
});

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

// PDF Component
interface MovementPDFProps {
  woodTypeName: string;
  thickness: string;
  movements: StockMovement[];
  dateRange: string;
  warehouseFilter: string;
  movementTypeFilter: string;
  timestamp: string;
}

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

const getStatusLabel = (status: string | null) => {
  if (!status) return '-';
  return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const getMovementChipStyle = (type: string) => {
  switch (type) {
    case 'RECEIPT_SYNC':
      return pdfStyles.chipGreen;
    case 'TRANSFER_IN':
      return pdfStyles.chipBlue;
    case 'TRANSFER_OUT':
      return pdfStyles.chipYellow;
    case 'DRYING_END':
      return pdfStyles.chipGreen;
    case 'MANUAL_ADJUSTMENT':
      return pdfStyles.chipDefault;
    default:
      return pdfStyles.chipDefault;
  }
};

const MovementPDF: FC<MovementPDFProps> = ({
  woodTypeName,
  thickness,
  movements,
  dateRange,
  warehouseFilter,
  movementTypeFilter,
  timestamp
}) => {
  // Calculate totals
  const totalIn = movements.filter(m => m.quantityChange > 0).reduce((sum, m) => sum + m.quantityChange, 0);
  const totalOut = movements.filter(m => m.quantityChange < 0).reduce((sum, m) => sum + Math.abs(m.quantityChange), 0);
  const netChange = totalIn - totalOut;

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={pdfStyles.page}>
        {/* Header */}
        <View style={pdfStyles.header} fixed>
          <View style={pdfStyles.headerLeft}>
            <Image src={logo} style={pdfStyles.logo} />
            <Text style={pdfStyles.title}>Stock Movement History</Text>
            <Text style={pdfStyles.subtitle}>Professional Wood Solutions</Text>
          </View>
          <View style={pdfStyles.headerRight}>
            <Text style={pdfStyles.headerMeta}>Generated: {timestamp}</Text>
            <Text style={pdfStyles.headerMeta}>Total Records: {movements.length}</Text>
            <Text style={pdfStyles.headerMeta}>v1.0.0</Text>
          </View>
        </View>

        {/* Info Card */}
        <View style={pdfStyles.infoCard}>
          <View style={pdfStyles.infoCardHeader}>
            <Text style={pdfStyles.infoCardTitle}>{woodTypeName} - {thickness}</Text>
          </View>
          <View style={pdfStyles.infoGrid}>
            <View style={pdfStyles.infoColumn}>
              <View style={pdfStyles.infoRow}>
                <Text style={pdfStyles.infoLabel}>Date Range:</Text>
                <Text style={pdfStyles.infoValue}>{dateRange}</Text>
              </View>
              <View style={pdfStyles.infoRow}>
                <Text style={pdfStyles.infoLabel}>Warehouse:</Text>
                <Text style={pdfStyles.infoValue}>{warehouseFilter}</Text>
              </View>
            </View>
            <View style={pdfStyles.infoColumn}>
              <View style={pdfStyles.infoRow}>
                <Text style={pdfStyles.infoLabel}>Movement Type:</Text>
                <Text style={pdfStyles.infoValue}>{movementTypeFilter}</Text>
              </View>
              <View style={pdfStyles.infoRow}>
                <Text style={pdfStyles.infoLabel}>Total Records:</Text>
                <Text style={pdfStyles.infoValue}>{movements.length}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Movement Table */}
        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Movement Details</Text>
          <View style={pdfStyles.table}>
            {/* Table Header */}
            <View style={pdfStyles.tableHeader} fixed>
              <Text style={[pdfStyles.tableCell, { flex: 1.2 }]}>Date & Time</Text>
              <Text style={[pdfStyles.tableCell, { flex: 1.5 }]}>Warehouse</Text>
              <Text style={pdfStyles.tableCellCenter}>Type</Text>
              <Text style={pdfStyles.tableCellRight}>Quantity</Text>
              <Text style={[pdfStyles.tableCell, { flex: 1.5 }]}>Status Change</Text>
              <Text style={pdfStyles.tableCell}>Reference</Text>
              <Text style={[pdfStyles.tableCell, { flex: 1.5 }]}>Details</Text>
            </View>

            {/* Table Body */}
            {movements.map((movement, index) => (
              <View key={movement.id} style={index % 2 === 0 ? pdfStyles.tableRow : pdfStyles.tableRowAlt} wrap={false}>
                <Text style={[pdfStyles.tableCell, { flex: 1.2 }]}>
                  {format(new Date(movement.createdAt), 'MMM dd, yyyy HH:mm')}
                </Text>
                <Text style={[pdfStyles.tableCell, { flex: 1.5 }]}>
                  {movement.Warehouse?.name} ({movement.Warehouse?.code})
                </Text>
                <View style={[pdfStyles.tableCellCenter, { alignItems: 'center' }]}>
                  <Text style={getMovementChipStyle(movement.movementType)}>
                    {getMovementTypeLabel(movement.movementType)}
                  </Text>
                </View>
                <Text style={[
                  pdfStyles.tableCellRight,
                  {
                    fontFamily: 'Helvetica-Bold',
                    color: movement.quantityChange > 0 ? '#16a34a' : '#dc2626'
                  }
                ]}>
                  {movement.quantityChange > 0 ? '+' : ''}{movement.quantityChange}
                </Text>
                <Text style={[pdfStyles.tableCell, { flex: 1.5 }]}>
                  {movement.fromStatus && movement.toStatus
                    ? `${getStatusLabel(movement.fromStatus)} → ${getStatusLabel(movement.toStatus)}`
                    : movement.toStatus
                      ? getStatusLabel(movement.toStatus)
                      : '-'}
                </Text>
                <Text style={pdfStyles.tableCell}>{movement.referenceNumber || '-'}</Text>
                <Text style={[pdfStyles.tableCell, { flex: 1.5 }]}>{movement.details || '-'}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Summary Boxes */}
        <View style={pdfStyles.summaryRow}>
          <View style={pdfStyles.summaryBox}>
            <Text style={pdfStyles.summaryLabel}>TOTAL RECORDS</Text>
            <Text style={pdfStyles.summaryValue}>{movements.length}</Text>
          </View>
          <View style={pdfStyles.summaryBoxGreen}>
            <Text style={pdfStyles.summaryLabelGreen}>TOTAL IN</Text>
            <Text style={pdfStyles.summaryValueGreen}>+{totalIn.toLocaleString()}</Text>
          </View>
          <View style={pdfStyles.summaryBoxRed}>
            <Text style={pdfStyles.summaryLabelRed}>TOTAL OUT</Text>
            <Text style={pdfStyles.summaryValueRed}>-{totalOut.toLocaleString()}</Text>
          </View>
          <View style={netChange >= 0 ? pdfStyles.summaryBoxGreen : pdfStyles.summaryBoxRed}>
            <Text style={netChange >= 0 ? pdfStyles.summaryLabelGreen : pdfStyles.summaryLabelRed}>NET CHANGE</Text>
            <Text style={netChange >= 0 ? pdfStyles.summaryValueGreen : pdfStyles.summaryValueRed}>
              {netChange >= 0 ? '+' : ''}{netChange.toLocaleString()}
            </Text>
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
  const [timePeriod, setTimePeriod] = useState<string>('30');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [warehouseFilter, setWarehouseFilter] = useState('all');
  const [movementTypeFilter, setMovementTypeFilter] = useState('all');
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  useEffect(() => {
    if (open) {
      fetchWarehouses();
      fetchMovements();
    }
  }, [open, woodTypeId, thickness, timePeriod, startDate, endDate, warehouseFilter, movementTypeFilter]);

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
        thickness: thickness
      });

      // Handle time period
      if (timePeriod === 'custom') {
        if (startDate) {
          params.append('startDate', startDate);
        }
        if (endDate) {
          params.append('endDate', endDate);
        }
      } else if (timePeriod !== 'all') {
        params.append('days', timePeriod);
      }
      // If 'all', don't send any date parameters

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

  // Get date range label for PDF
  const getDateRangeLabel = () => {
    if (timePeriod === 'all') return 'All Time';
    if (timePeriod === 'custom') {
      if (startDate && endDate) {
        return `${format(new Date(startDate), 'MMM dd, yyyy')} - ${format(new Date(endDate), 'MMM dd, yyyy')}`;
      }
      if (startDate) return `From ${format(new Date(startDate), 'MMM dd, yyyy')}`;
      if (endDate) return `Until ${format(new Date(endDate), 'MMM dd, yyyy')}`;
      return 'Custom Range';
    }
    return `Last ${timePeriod} days`;
  };

  // Get warehouse filter label for PDF
  const getWarehouseLabel = () => {
    if (warehouseFilter === 'all') return 'All Warehouses';
    const wh = warehouses.find(w => w.id === warehouseFilter);
    return wh ? `${wh.name} (${wh.code})` : warehouseFilter;
  };

  // Get movement type filter label for PDF
  const getMovementTypeLabel2 = () => {
    if (movementTypeFilter === 'all') return 'All Types';
    return getMovementTypeLabel(movementTypeFilter);
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
        <Box display="flex" gap={2} mb={3} flexWrap="wrap" alignItems="flex-end">
          <TextField
            select
            label="Time Period"
            value={timePeriod}
            onChange={(e) => setTimePeriod(e.target.value)}
            size="small"
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="30">Last 30 days</MenuItem>
            <MenuItem value="90">Last 90 days</MenuItem>
            <MenuItem value="180">Last 180 days</MenuItem>
            <MenuItem value="365">Last 1 year</MenuItem>
            <MenuItem value="all">All Time</MenuItem>
            <MenuItem value="custom">Custom Range</MenuItem>
          </TextField>

          {timePeriod === 'custom' && (
            <>
              <TextField
                label="From Date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                size="small"
                InputLabelProps={{ shrink: true }}
                sx={{ minWidth: 150 }}
              />
              <TextField
                label="To Date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                size="small"
                InputLabelProps={{ shrink: true }}
                sx={{ minWidth: 150 }}
              />
            </>
          )}

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

          {/* Export PDF Button */}
          {movements.length > 0 && (
            <BlobProvider
              document={
                <MovementPDF
                  woodTypeName={woodTypeName}
                  thickness={thickness}
                  movements={movements}
                  dateRange={getDateRangeLabel()}
                  warehouseFilter={getWarehouseLabel()}
                  movementTypeFilter={getMovementTypeLabel2()}
                  timestamp={format(new Date(), 'dd MMM yyyy, HH:mm:ss')}
                />
              }
            >
              {({ url, loading: pdfLoading }) => (
                <Button
                  variant="contained"
                  startIcon={pdfLoading ? <CircularProgress size={18} color="inherit" /> : <PictureAsPdfIcon />}
                  disabled={pdfLoading}
                  onClick={() => {
                    if (url) {
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = `Stock_Movement_${woodTypeName.replace(/\s+/g, '_')}_${thickness}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
                      link.click();
                    }
                  }}
                  sx={{
                    backgroundColor: '#dc2626',
                    color: '#fff',
                    textTransform: 'none',
                    fontWeight: 600,
                    px: 2,
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

        {/* Summary Stats */}
        {movements.length > 0 && (
          <Box display="flex" gap={2} mt={2}>
            <Paper sx={{ p: 2, flex: 1, textAlign: 'center', backgroundColor: '#f8fafc' }}>
              <Typography variant="caption" color="text.secondary">Total Records</Typography>
              <Typography variant="h6" fontWeight={700}>{movements.length}</Typography>
            </Paper>
            <Paper sx={{ p: 2, flex: 1, textAlign: 'center', backgroundColor: '#dcfce7' }}>
              <Typography variant="caption" sx={{ color: '#166534' }}>Total In</Typography>
              <Typography variant="h6" fontWeight={700} sx={{ color: '#16a34a' }}>
                +{movements.filter(m => m.quantityChange > 0).reduce((sum, m) => sum + m.quantityChange, 0).toLocaleString()}
              </Typography>
            </Paper>
            <Paper sx={{ p: 2, flex: 1, textAlign: 'center', backgroundColor: '#fef2f2' }}>
              <Typography variant="caption" sx={{ color: '#991b1b' }}>Total Out</Typography>
              <Typography variant="h6" fontWeight={700} sx={{ color: '#dc2626' }}>
                -{movements.filter(m => m.quantityChange < 0).reduce((sum, m) => sum + Math.abs(m.quantityChange), 0).toLocaleString()}
              </Typography>
            </Paper>
            <Paper sx={{
              p: 2,
              flex: 1,
              textAlign: 'center',
              backgroundColor: movements.reduce((sum, m) => sum + m.quantityChange, 0) >= 0 ? '#dcfce7' : '#fef2f2'
            }}>
              <Typography variant="caption" sx={{
                color: movements.reduce((sum, m) => sum + m.quantityChange, 0) >= 0 ? '#166534' : '#991b1b'
              }}>Net Change</Typography>
              <Typography variant="h6" fontWeight={700} sx={{
                color: movements.reduce((sum, m) => sum + m.quantityChange, 0) >= 0 ? '#16a34a' : '#dc2626'
              }}>
                {movements.reduce((sum, m) => sum + m.quantityChange, 0) >= 0 ? '+' : ''}
                {movements.reduce((sum, m) => sum + m.quantityChange, 0).toLocaleString()}
              </Typography>
            </Paper>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
