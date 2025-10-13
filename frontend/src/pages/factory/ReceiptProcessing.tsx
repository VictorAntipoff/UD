import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Snackbar,
  SelectChangeEvent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  CircularProgress,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import HistoryIcon from '@mui/icons-material/History';
import PersonIcon from '@mui/icons-material/Person';
import { alpha } from '@mui/material/styles';
import { styled } from '@mui/material/styles';
import type { WoodReceipt } from '../../types/wood-receipt';
import api from '../../lib/api';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { Document, Page, Text, View, StyleSheet, Image, BlobProvider } from '@react-pdf/renderer';
import logo from '../../assets/images/logo.png';
import { APP_NAME, APP_VERSION } from '../../constants/version';
import { useSnackbar, SnackbarProvider } from 'notistack';
import { useAuth } from '../../hooks/useAuth';

// Styled Components
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
    fontSize: '0.875rem',
  },
  '& .MuiInputLabel-root': {
    color: 'rgba(0, 0, 0, 0.6)',
    fontSize: '0.875rem',
    '&.Mui-focused': {
      color: '#dc2626',
    },
  },
};

interface SleeperMeasurement {
  id: number;
  thickness: number;
  width: number;
  length: number;
  m3: number;
  lastModifiedBy?: string;
  lastModifiedAt?: string;
}

interface ReceiptForm {
  receiptNumber: string;
  woodType: string;
  woodTypeName: string;
  quantity: string;
  supplier: string;
  date: string;
  status: string;
  purchaseOrder: string;
  lastModifiedBy?: string;
  lastModifiedAt?: string;
}

interface ChangeHistory {
  id: number;
  receiptId: string;
  userId: string;
  userName: string;
  action: string;
  timestamp: string;
  details: string;
}

const initialFormState: ReceiptForm = {
  receiptNumber: '',
  woodType: '',
  woodTypeName: '',
  quantity: '',
  supplier: '',
  date: new Date().toISOString().split('T')[0],
  status: '',
  purchaseOrder: '',
};

const CompactNumberTextField = styled(TextField)({
  '& .MuiOutlinedInput-root': {
    padding: '0 4px',
    height: 32,
    background: '#f8fafc',
    borderRadius: 4,
    fontSize: '0.875rem',
    minHeight: 32,
    '&:hover fieldset': {
      borderColor: '#dc2626',
    },
    '&.Mui-focused fieldset': {
      borderColor: '#dc2626',
    },
  },
  '& input': {
    textAlign: 'right',
    padding: '4px',
    fontSize: '0.875rem',
    MozAppearance: 'textfield',
  },
  '& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button': {
    WebkitAppearance: 'none',
    margin: 0,
  },
});

const MeasurementCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  marginBottom: theme.spacing(2),
  backgroundColor: '#fff',
  borderRadius: theme.spacing(1),
  boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.05)',
  '&:hover': {
    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.1)',
  },
  transition: 'box-shadow 0.3s ease',
}));

const MobileMeasurements = ({
  measurements,
  handleMeasurementChange,
  handleDeleteRow,
  measurementUnit,
  handleKeyDown
}: {
  measurements: SleeperMeasurement[];
  handleMeasurementChange: (id: number, field: keyof SleeperMeasurement, value: string) => void;
  handleDeleteRow: (id: number) => void;
  measurementUnit: 'imperial' | 'metric';
  handleKeyDown: (e: React.KeyboardEvent, rowId: number, field: 'thickness' | 'width' | 'length') => void;
}) => (
  <Box sx={{ mb: 2 }}>
    {measurements.length === 0 ? (
      <Box sx={{
        p: 3,
        textAlign: 'center',
        color: '#64748b',
        backgroundColor: '#f8fafc',
        borderRadius: 2,
        border: '1px dashed #cbd5e1'
      }}>
        <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
          No sleepers added yet. Click "Add Sleeper" below to start.
        </Typography>
      </Box>
    ) : (
      measurements.map((row, index) => (
      <Box
        key={row.id}
        sx={{
          mb: 1.5,
          p: 1.5,
          backgroundColor: '#fff',
          borderRadius: 2,
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}
      >
        <Box sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 1.5
        }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.875rem', color: '#1e293b' }}>
            #{String(index + 1).padStart(3, '0')}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
            <Typography variant="caption" sx={{ fontWeight: 600, color: '#dc2626', fontSize: '0.75rem' }}>
              {row.m3.toFixed(4)} m³
            </Typography>
            <IconButton
              size="small"
              onClick={() => handleDeleteRow(row.id)}
              sx={{
                color: '#dc2626',
                p: 0.5,
                '&:hover': {
                  backgroundColor: alpha('#dc2626', 0.1),
                }
              }}
            >
              <DeleteIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>
        </Box>

        <Grid container spacing={1}>
          <Grid item xs={4}>
            <CompactNumberTextField
              fullWidth
              placeholder="Thick"
              size="small"
              type="number"
              value={row.thickness || ''}
              onChange={(e) => handleMeasurementChange(row.id, 'thickness', e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, row.id, 'thickness')}
              inputProps={{
                step: 0.1,
                min: 0.5,
                max: 18,
                maxLength: 5,
                'data-field': `thickness-${row.id}`
              }}
              sx={{
                '& .MuiInputBase-input': {
                  fontSize: '0.875rem',
                  padding: '8px',
                  textAlign: 'center'
                }
              }}
              error={row.thickness < 0.5 || row.thickness > 18}
            />
            <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mt: 0.5, fontSize: '0.65rem', color: '#64748b' }}>
              {measurementUnit === 'imperial' ? 'Thick (in)' : 'Thick (cm)'}
            </Typography>
          </Grid>
          <Grid item xs={4}>
            <CompactNumberTextField
              fullWidth
              placeholder="Width"
              size="small"
              type="number"
              value={row.width || ''}
              onChange={(e) => handleMeasurementChange(row.id, 'width', e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, row.id, 'width')}
              inputProps={{
                step: 0.1,
                min: 0.5,
                max: measurementUnit === 'imperial' ? 18 : 50,
                maxLength: 5,
                'data-field': `width-${row.id}`
              }}
              sx={{
                '& .MuiInputBase-input': {
                  fontSize: '0.875rem',
                  padding: '8px',
                  textAlign: 'center'
                }
              }}
              error={row.width < 0.5 || (measurementUnit === 'imperial' ? row.width > 18 : row.width > 50)}
            />
            <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mt: 0.5, fontSize: '0.65rem', color: '#64748b' }}>
              {measurementUnit === 'imperial' ? 'Width (in)' : 'Width (cm)'}
            </Typography>
          </Grid>
          <Grid item xs={4}>
            <CompactNumberTextField
              fullWidth
              placeholder="Length"
              size="small"
              type="number"
              value={row.length || ''}
              onChange={(e) => handleMeasurementChange(row.id, 'length', e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, row.id, 'length')}
              inputProps={{
                step: 0.1,
                min: 0.5,
                max: measurementUnit === 'imperial' ? 18 : 600,
                maxLength: 5,
                'data-field': `length-${row.id}`
              }}
              sx={{
                '& .MuiInputBase-input': {
                  fontSize: '0.875rem',
                  padding: '8px',
                  textAlign: 'center'
                }
              }}
              error={row.length < 0.5 || (measurementUnit === 'imperial' ? row.length > 18 : row.length > 600)}
            />
            <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mt: 0.5, fontSize: '0.65rem', color: '#64748b' }}>
              {measurementUnit === 'imperial' ? 'Length (ft)' : 'Length (cm)'}
            </Typography>
          </Grid>
        </Grid>
      </Box>
      ))
    )}
  </Box>
);

const pdfStyles = StyleSheet.create({
  page: {
    padding: '40 60',
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#2c3e50'
  },
  header: {
    marginBottom: 20,
    borderBottom: 1,
    borderColor: '#e2e8f0',
    paddingBottom: 15
  },
  logo: {
    width: 120,
    marginBottom: 10
  },
  title: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 5
  },
  subtitle: {
    fontSize: 10,
    color: '#64748b',
    marginBottom: 15
  },
  metadata: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 9,
    color: '#64748b'
  },
  section: {
    marginBottom: 12
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#2c3e50',
    marginBottom: 6,
    backgroundColor: '#f8fafc',
    padding: '4 6',
    borderRadius: 4
  },
  row: {
    flexDirection: 'row',
    marginBottom: 3,
    fontSize: 10
  },
  label: {
    width: '30%',
    color: '#64748b'
  },
  value: {
    width: '70%',
    color: '#2c3e50'
  },
  table: {
    marginTop: 6
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderBottomColor: '#e2e8f0',
    borderBottomWidth: 1,
    padding: '4 6',
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#64748b'
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomColor: '#e2e8f0',
    borderBottomWidth: 1,
    padding: '3 6'
  },
  tableCell: {
    flex: 1
  },
  result: {
    marginTop: 12,
    padding: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 4,
    borderLeft: 2,
    borderLeftColor: '#3b82f6'
  },
  resultText: {
    fontFamily: 'Helvetica-Bold',
    color: '#2c3e50',
    fontSize: 12
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 60,
    right: 60,
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0'
  },
  dimensionValue: {
    fontFamily: 'Helvetica-Bold'
  }
});

const formatNumber = (num: number): string => {
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

interface ReceiptPDFProps {
  formData: ReceiptForm;
  measurements: SleeperMeasurement[];
  totalM3: number;
}

const ReceiptPDF = ({ formData, measurements, totalM3 }: ReceiptPDFProps) => (
  <Document>
    <Page size="A4" style={pdfStyles.page}>
      <View style={pdfStyles.header}>
        <Image src={logo} style={pdfStyles.logo} />
        <Text style={pdfStyles.title}>Receipt Processing Report</Text>
        <Text style={pdfStyles.subtitle}>Professional Wood Solutions</Text>
        <View style={pdfStyles.metadata}>
          <View>
            <Text>Generated on: {new Date().toLocaleString()}</Text>
          </View>
          <View>
            <Text>LOT Number: {formData.receiptNumber}</Text>
          </View>
        </View>
      </View>

      <View style={pdfStyles.section}>
        <Text style={pdfStyles.sectionTitle}>Receipt Information</Text>
        <View style={pdfStyles.row}>
          <Text style={pdfStyles.label}>Wood Type:</Text>
          <Text style={pdfStyles.value}>{formData.woodTypeName}</Text>
        </View>
        <View style={pdfStyles.row}>
          <Text style={pdfStyles.label}>Supplier:</Text>
          <Text style={pdfStyles.value}>{formData.supplier}</Text>
        </View>
        <View style={pdfStyles.row}>
          <Text style={pdfStyles.label}>Purchase Order:</Text>
          <Text style={pdfStyles.value}>{formData.purchaseOrder}</Text>
        </View>
        <View style={pdfStyles.row}>
          <Text style={pdfStyles.label}>Date:</Text>
          <Text style={pdfStyles.value}>{formData.date}</Text>
        </View>
        {formData.lastModifiedBy && (
          <View style={pdfStyles.row}>
            <Text style={pdfStyles.label}>Last Modified By:</Text>
            <Text style={pdfStyles.value}>{formData.lastModifiedBy}</Text>
          </View>
        )}
        {formData.lastModifiedAt && (
          <View style={pdfStyles.row}>
            <Text style={pdfStyles.label}>Last Modified At:</Text>
            <Text style={pdfStyles.value}>{new Date(formData.lastModifiedAt).toLocaleString()}</Text>
          </View>
        )}
      </View>

      <View style={pdfStyles.section}>
        <Text style={pdfStyles.sectionTitle}>Sleeper Measurements</Text>
        <View style={pdfStyles.table}>
          <View style={pdfStyles.tableHeader}>
            <View style={[pdfStyles.tableCell, { flex: 0.5 }]}>
              <Text>No.</Text>
            </View>
            <View style={pdfStyles.tableCell}>
              <Text>Thickness (in)</Text>
            </View>
            <View style={pdfStyles.tableCell}>
              <Text>Width (in)</Text>
            </View>
            <View style={pdfStyles.tableCell}>
              <Text>Length (ft)</Text>
            </View>
            <View style={pdfStyles.tableCell}>
              <Text>Volume (m³)</Text>
            </View>
          </View>
          {measurements.map((m: SleeperMeasurement, index: number) => (
            <View key={m.id} style={pdfStyles.tableRow}>
              <View style={[pdfStyles.tableCell, { flex: 0.5 }]}>
                <Text>{String(index + 1).padStart(3, '0')}</Text>
              </View>
              <View style={pdfStyles.tableCell}>
                <Text>{formatNumber(m.thickness)}</Text>
              </View>
              <View style={pdfStyles.tableCell}>
                <Text>{formatNumber(m.width)}</Text>
              </View>
              <View style={pdfStyles.tableCell}>
                <Text>{formatNumber(m.length)}</Text>
              </View>
              <View style={pdfStyles.tableCell}>
                <Text>{m.m3.toFixed(4)}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={pdfStyles.section}>
        <Text style={pdfStyles.sectionTitle}>Sleeper Size Summary</Text>
        <View style={pdfStyles.table}>
          <View style={pdfStyles.tableHeader}>
            <View style={pdfStyles.tableCell}>
              <Text>Size</Text>
            </View>
            <View style={pdfStyles.tableCell}>
              <Text>Count</Text>
            </View>
            <View style={pdfStyles.tableCell}>
              <Text>Total Volume (m³)</Text>
            </View>
          </View>
          {getSleeperSizeSummary(measurements).map((size, index) => (
            <View key={index} style={pdfStyles.tableRow}>
              <View style={pdfStyles.tableCell}>
                <Text>{size.size}</Text>
              </View>
              <View style={pdfStyles.tableCell}>
                <Text>{size.count}</Text>
              </View>
              <View style={pdfStyles.tableCell}>
                <Text>{size.totalVolume.toFixed(4)}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={pdfStyles.result}>
        <View style={pdfStyles.row}>
          <Text style={pdfStyles.label}>Total Volume:</Text>
          <Text style={[pdfStyles.value, pdfStyles.dimensionValue]}>
            {totalM3.toFixed(4)} m³
          </Text>
        </View>
        <View style={pdfStyles.row}>
          <Text style={pdfStyles.label}>Expected Volume:</Text>
          <Text style={[pdfStyles.value, pdfStyles.dimensionValue]}>
            {formData.quantity} m³
          </Text>
        </View>
        <View style={pdfStyles.row}>
          <Text style={pdfStyles.label}>Variance:</Text>
          <Text style={[pdfStyles.value, pdfStyles.dimensionValue]}>
            {(parseFloat(formData.quantity) - totalM3).toFixed(4)} m³
          </Text>
        </View>
      </View>

      <View style={pdfStyles.footer}>
        <Text>
          {APP_NAME} {APP_VERSION} • Generated by Wood Processing System
        </Text>
      </View>
    </Page>
  </Document>
);

const getSleeperSizeSummary = (measurements: SleeperMeasurement[]) => {
  const sizeMap = new Map<string, { count: number; totalVolume: number }>();

  measurements.forEach(m => {
    const sizeKey = `${m.thickness}" × ${m.width}" × ${m.length}'`;

    if (sizeMap.has(sizeKey)) {
      const existing = sizeMap.get(sizeKey)!;
      sizeMap.set(sizeKey, {
        count: existing.count + 1,
        totalVolume: existing.totalVolume + m.m3
      });
    } else {
      sizeMap.set(sizeKey, {
        count: 1,
        totalVolume: m.m3
      });
    }
  });

  return Array.from(sizeMap.entries()).map(([size, data]) => ({
    size,
    count: data.count,
    totalVolume: data.totalVolume
  }));
};

const SleeperSizeSummary = ({ measurements }: { measurements: SleeperMeasurement[] }) => {
  const sizeSummary = getSleeperSizeSummary(measurements);

  if (sizeSummary.length === 0) {
    return null;
  }

  return (
    <Box sx={{ mt: 3 }}>
      <Box
        sx={{
          p: 2,
          mb: 2,
          backgroundColor: '#f8fafc',
          borderRadius: 2,
        }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: '0.875rem', color: 'rgba(0, 0, 0, 0.87)', mb: 2 }}>
          Sleeper Size Summary
        </Typography>
        <TableContainer
          component={Paper}
          elevation={0}
          sx={{
            border: '1px solid',
            borderColor: 'rgba(0, 0, 0, 0.12)',
            borderRadius: 1,
          }}
        >
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f8fafc' }}>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'rgba(0, 0, 0, 0.7)' }}>Size</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'rgba(0, 0, 0, 0.7)' }}>Count</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'rgba(0, 0, 0, 0.7)' }}>Total Volume (m³)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sizeSummary.map((size, index) => (
                <TableRow
                  key={index}
                  sx={{
                    '&:hover': {
                      backgroundColor: alpha('#dc2626', 0.04),
                    }
                  }}
                >
                  <TableCell sx={{ fontSize: '0.875rem' }}>{size.size}</TableCell>
                  <TableCell align="center" sx={{ fontSize: '0.875rem' }}>{size.count}</TableCell>
                  <TableCell align="right" sx={{ fontSize: '0.875rem', fontWeight: 500 }}>{size.totalVolume.toFixed(4)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Box>
  );
};

const ChangeHistoryDisplay = ({ changeHistory }: { changeHistory: ChangeHistory[] }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (changeHistory.length === 0) {
    return null;
  }

  return (
    <Box sx={{ mt: 3 }}>
      <Button
        onClick={() => setIsExpanded(!isExpanded)}
        sx={{
          color: 'rgba(0, 0, 0, 0.6)',
          '&:hover': {
            backgroundColor: alpha('#dc2626', 0.04),
          },
          width: '100%',
          justifyContent: 'flex-start',
          textTransform: 'none',
          mb: 1,
          fontSize: '0.875rem',
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 500, fontSize: '0.875rem' }}>
          Change History ({changeHistory.length})
        </Typography>
      </Button>

      {isExpanded && (
        <TableContainer
          component={Paper}
          elevation={0}
          sx={{
            mb: 3,
            backgroundColor: '#f8fafc',
            border: '1px solid',
            borderColor: 'rgba(0, 0, 0, 0.12)',
            borderRadius: 1,
            '@media print': {
              display: 'none'
            }
          }}
        >
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f8fafc' }}>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'rgba(0, 0, 0, 0.7)' }}>Date/Time</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'rgba(0, 0, 0, 0.7)' }}>User</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'rgba(0, 0, 0, 0.7)' }}>Action</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'rgba(0, 0, 0, 0.7)' }}>Details</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {changeHistory.map((entry) => (
                <TableRow
                  key={`${entry.receiptId}-${entry.timestamp}-${entry.action}`}
                  sx={{
                    '&:hover': {
                      backgroundColor: alpha('#dc2626', 0.04),
                    }
                  }}
                >
                  <TableCell sx={{ fontSize: '0.875rem' }}>
                    {new Date(entry.timestamp).toLocaleString()}
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.875rem' }}>{entry.userName}</TableCell>
                  <TableCell sx={{ fontSize: '0.875rem' }}>{entry.action}</TableCell>
                  <TableCell sx={{ fontSize: '0.875rem' }}>{entry.details}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

const ReceiptProcessing = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const { enqueueSnackbar } = useSnackbar();
  const [formData, setFormData] = useState<ReceiptForm>(initialFormState);
  const [showSuccess, setShowSuccess] = useState(false);
  const [receipts, setReceipts] = useState<WoodReceipt[]>([]);
  const [measurements, setMeasurements] = useState<SleeperMeasurement[]>([]);
  const [totalM3, setTotalM3] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string } | null>(null);
  const [changeHistory, setChangeHistory] = useState<ChangeHistory[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [lotToDelete, setLotToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [measurementUnit, setMeasurementUnit] = useState<'imperial' | 'metric'>('imperial'); // imperial = inch/ft, metric = cm
  const { enqueueSnackbar } = useSnackbar();

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    const init = async () => {
      await checkAuth();
      await fetchReceipts();
    };
    init();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await api.get('/auth/me');
      if (response.data && response.data.user) {
        setCurrentUser({
          id: response.data.user.id,
          email: response.data.user.email || 'Unknown User'
        });
      }
    } catch (error) {
      console.error('Error checking auth:', error);
    }
  };

  const fetchReceipts = async () => {
    try {
      const response = await api.get('/management/wood-receipts');
      const data = response.data;

      // Show all receipts (not filtering by status anymore)
      if (data && data.length > 0) {
        setReceipts(data);
      } else {
        console.warn('No receipts found');
        setReceipts([]);
      }
    } catch (error: any) {
      // Silently handle 404 - receipts endpoint not yet implemented
      if (error.response?.status !== 404) {
        console.error('Error fetching receipts:', error);
      }
      setReceipts([]);
    }
  };

  const handleLotNumberChange = async (event: SelectChangeEvent<string>) => {
    const selectedLot = event.target.value;
    const selectedReceipt = receipts.find(receipt => receipt.lotNumber === selectedLot);
    if (selectedReceipt) {
      setFormData({
        receiptNumber: selectedLot,
        woodType: selectedReceipt.woodTypeId || '',
        woodTypeName: selectedReceipt.woodType?.name || '',
        quantity: selectedReceipt.estimatedVolumeM3?.toString() || '',
        supplier: selectedReceipt.supplier || '',
        date: selectedReceipt.receiptDate ? new Date(selectedReceipt.receiptDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        status: selectedReceipt.status || 'PENDING',
        purchaseOrder: selectedReceipt.purchaseOrder || '',
      });
    }

    await loadDraft(selectedLot);
  };

  const validateForm = () => {
    if (!formData.receiptNumber) {
      console.error('Please select a LOT number');
      return false;
    }
    if (measurements.length === 0) {
      console.error('Please add at least one measurement');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    try {
      // Convert measurements to receipt items
      const receiptItems = measurements.map(m => ({
        length: m.length,
        width: m.width,
        height: m.thickness,
        quantity: 1,
        volume_m3: m.m3,
        grade: 'A', // Default grade, adjust if needed
        notes: m.lastModifiedBy ? `Last modified by ${m.lastModifiedBy} at ${m.lastModifiedAt}` : undefined
      }));

      // Get the receipt by lot number first
      const receiptsResponse = await api.get(`/management/wood-receipts`);
      const receipt = receiptsResponse.data.find((r: any) => r.lotNumber === formData.receiptNumber);

      if (!receipt) throw new Error('Receipt not found');

      // Update the receipt status and total volume
      // Admin can complete directly, users need approval (PENDING_APPROVAL)
      const newStatus = isAdmin ? 'COMPLETED' : 'PENDING_APPROVAL';
      await api.patch(`/management/wood-receipts/${receipt.id}`, {
        status: newStatus,
        total_volume_m3: totalM3
      });

      // Insert the measurements as receipt items
      await api.post('/factory/receipt-items', {
        items: receiptItems.map(item => ({
          ...item,
          receipt_id: receipt.id
        }))
      });

      // Delete the draft after processing
      await api.delete(`/factory/drafts?receipt_id=${formData.receiptNumber}`);

      // Show appropriate success message
      const successMessage = isAdmin
        ? 'Receipt processed and completed successfully!'
        : 'Receipt submitted for admin approval successfully!';
      enqueueSnackbar(successMessage, { variant: 'success' });

      setShowSuccess(true);
      await fetchReceipts();
    } catch (error) {
      console.error('Error processing receipt:', error);
    }
  };

  const calculateM3 = (thickness: number, width: number, length: number): number => {
    if (measurementUnit === 'imperial') {
      // Convert inches to meters and feet to meters
      const thicknessM = thickness * 0.0254; // inch to meter
      const widthM = width * 0.0254; // inch to meter
      const lengthM = length * 0.3048; // feet to meter
      return thicknessM * widthM * lengthM;
    } else {
      // Metric: all in cm, convert to meters
      const thicknessM = thickness / 100; // cm to meter
      const widthM = width / 100; // cm to meter
      const lengthM = length / 100; // cm to meter
      return thicknessM * widthM * lengthM;
    }
  };

  const handleAddRow = () => {
    const newId = measurements.length > 0 ? Math.max(...measurements.map(m => m.id)) + 1 : 1;
    setMeasurements([...measurements, {
      id: newId,
      thickness: 0,
      width: 0,
      length: 0,
      m3: 0
    }]);
    // Focus on the new row's thickness input after state update and scroll into view
    setTimeout(() => {
      const input = document.querySelector(`input[data-field="thickness-${newId}"]`) as HTMLInputElement;
      if (input) {
        input.focus();
        input.select();
        // Scroll the input into view, with some offset for mobile bottom bar
        input.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }
    }, 100);
  };

  const handleKeyDown = (e: React.KeyboardEvent, rowId: number, field: 'thickness' | 'width' | 'length') => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const currentRow = measurements.find(m => m.id === rowId);
      if (!currentRow) return;

      // Check if current field has a value
      const currentValue = currentRow[field];
      if (!currentValue || currentValue === 0) return;

      // Move to next field or add new row
      if (field === 'thickness') {
        const input = document.querySelector(`input[data-field="width-${rowId}"]`) as HTMLInputElement;
        if (input) {
          input.focus();
          input.select();
        }
      } else if (field === 'width') {
        const input = document.querySelector(`input[data-field="length-${rowId}"]`) as HTMLInputElement;
        if (input) {
          input.focus();
          input.select();
        }
      } else if (field === 'length') {
        // After length, add new row if all fields are filled
        if (currentRow.thickness > 0 && currentRow.width > 0 && currentRow.length > 0) {
          handleAddRow();
        }
      }
    }
  };

  const handleDeleteRow = (id: number) => {
    setMeasurements(measurements.filter(m => m.id !== id));
  };

  const handleMeasurementChange = (id: number, field: keyof SleeperMeasurement, value: string) => {
    setHasUnsavedChanges(true);
    setMeasurements(measurements.map(m => {
      if (m.id === id) {
        const newMeasurement = {
          ...m,
          [field]: parseFloat(value) || 0,
          lastModifiedBy: currentUser?.email || 'Unknown User',
          lastModifiedAt: new Date().toISOString()
        };
        if (field === 'thickness' || field === 'width' || field === 'length') {
          newMeasurement.m3 = calculateM3(
            newMeasurement.thickness,
            newMeasurement.width,
            newMeasurement.length
          );
        }
        return newMeasurement;
      }
      return m;
    }));
  };

  useEffect(() => {
    const total = measurements.reduce((sum, m) => sum + m.m3, 0);
    setTotalM3(total);
  }, [measurements]);

  const handleSaveDraft = async () => {
    try {
      setIsSaving(true);

      if (!formData.receiptNumber) {
        enqueueSnackbar('Please select a LOT number first', {
          variant: 'warning',
          autoHideDuration: 3000,
        });
        return;
      }

      if (measurements.length === 0) {
        enqueueSnackbar('Please add at least one sleeper measurement', {
          variant: 'warning',
          autoHideDuration: 3000,
        });
        return;
      }

      if (!currentUser) {
        console.error('No current user found');
        enqueueSnackbar('Authentication error. Please refresh the page.', {
          variant: 'error',
          autoHideDuration: 3000,
        });
        return;
      }

      const userId = currentUser.id;
      const userName = currentUser.email || 'Unknown User';
      const timestamp = new Date().toISOString();

      // Prepare the draft data
      const draftData = {
        receipt_id: formData.receiptNumber,
        measurements: measurements.map(m => ({
          ...m,
          lastModifiedBy: m.lastModifiedBy || userName,
          lastModifiedAt: m.lastModifiedAt || timestamp
        })),
        updated_at: timestamp,
        updated_by: userId
      };

      // Check if a draft exists
      const existingDraftsResponse = await api.get(`/factory/drafts?receipt_id=${formData.receiptNumber}`);
      const existingDraft = existingDraftsResponse.data.length > 0 ? existingDraftsResponse.data[0] : null;

      if (existingDraft) {
        // Update existing draft
        await api.patch(`/factory/drafts/${existingDraft.id}`, {
          measurements: draftData.measurements,
          updated_at: draftData.updated_at,
          updated_by: draftData.updated_by
        });
      } else {
        // Insert new draft
        await api.post('/factory/drafts', draftData);
      }

      // Add to change history
      const historyEntry = {
        receipt_id: formData.receiptNumber,
        user_id: userId,
        user_name: userName,
        action: existingDraft ? 'UPDATE' : 'CREATE',
        timestamp: timestamp,
        details: `Draft ${existingDraft ? 'updated' : 'created'} with ${measurements.length} measurements`
      };

      try {
        await api.post('/factory/receipt-history', historyEntry);
        setChangeHistory(prev => [
          ...prev,
          {
            id: Date.now(),
            receiptId: historyEntry.receipt_id,
            userId: historyEntry.user_id,
            userName: historyEntry.user_name,
            action: historyEntry.action,
            timestamp: historyEntry.timestamp,
            details: historyEntry.details,
          }
        ]);
      } catch (historyError) {
        console.error('Error saving history:', historyError);
      }

      // Show success notification with timestamp
      const saveTime = new Date(timestamp).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      enqueueSnackbar(`Draft saved successfully at ${saveTime}`, {
        variant: 'success',
        autoHideDuration: 4000,
      });

      setShowSuccess(true);
      setHasUnsavedChanges(false);
    } catch (error: any) {
      console.error('Error saving draft:', error);
      enqueueSnackbar(`Failed to save draft: ${error?.response?.data?.error || error.message || 'Unknown error'}`, {
        variant: 'error',
        autoHideDuration: 5000,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const loadDraft = async (receiptId: string) => {
    try {

      // Always load change history first
      try {
        const historyResponse = await api.get(`/factory/receipt-history?receipt_id=${receiptId}`);
        setChangeHistory(historyResponse.data || []);
      } catch (historyError: any) {
        // Silently handle 404 - no history exists yet
        if (historyError.response?.status !== 404) {
          console.error('Error loading history:', historyError);
        }
      }

      // First, try to get the receipt ID from the wood_receipts table
      const receiptsResponse = await api.get(`/management/wood-receipts`);
      const receipt = receiptsResponse.data.find((r: any) => r.lotNumber === receiptId);

      if (!receipt) {
        console.error('Error getting receipt ID: Receipt not found');
        throw new Error('Receipt not found');
      }

      // Try to load existing receipt items first
      try {
        const itemsResponse = await api.get(`/factory/receipt-items?receipt_id=${receipt.id}`);
        const receiptItems = itemsResponse.data;

        // If we have receipt items, use those
        if (receiptItems && receiptItems.length > 0) {
          const processedMeasurements = receiptItems.map((item: any, index: number) => ({
            id: index + 1,
            thickness: item.height || 0, // height in the DB corresponds to thickness
            width: item.width || 0,
            length: item.length || 0,
            m3: item.volume_m3 || calculateM3(
              item.height || 0,
              item.width || 0,
              item.length || 0
            ),
            lastModifiedBy: item.notes?.split('Last modified by ')?.[1]?.split(' at ')?.[0] || 'Unknown',
            lastModifiedAt: item.updated_at || item.created_at || new Date().toISOString()
          }));
          setMeasurements(processedMeasurements);
          return;
        }
      } catch (itemsError: any) {
        // Silently handle 404 - no items exist yet
        if (itemsError.response?.status !== 404) {
          console.error('Error loading receipt items:', itemsError);
        }
      }

      // If no receipt items found, try loading from draft
      try {
        const draftResponse = await api.get(`/factory/drafts?receipt_id=${receiptId}`);
        const draftData = draftResponse.data.length > 0 ? draftResponse.data[0] : null;

        if (draftData && draftData.measurements) {
          const processedMeasurements = draftData.measurements.map((m: any) => ({
            id: m.id || Math.random(),
            thickness: parseFloat(m.thickness) || 0,
            width: parseFloat(m.width) || 0,
            length: parseFloat(m.length) || 0,
            m3: parseFloat(m.m3) || calculateM3(
              parseFloat(m.thickness) || 0,
              parseFloat(m.width) || 0,
              parseFloat(m.length) || 0
            ),
            lastModifiedBy: m.lastModifiedBy || 'Unknown',
            lastModifiedAt: m.lastModifiedAt || new Date().toISOString()
          }));
          setMeasurements(processedMeasurements);
        } else {
          setMeasurements([]);
        }
      } catch (draftError: any) {
        // Silently handle 404 - no draft exists yet
        if (draftError.response?.status !== 404) {
          console.error('Error loading draft:', draftError);
        }
        setMeasurements([]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setMeasurements([]);
    }
  };

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 's':
            e.preventDefault();
            if (!isSaving && formData.receiptNumber) {
              handleSaveDraft();
            }
            break;
          case 'n':
            e.preventDefault();
            handleAddRow();
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isSaving, formData.receiptNumber]);

  const handleDeleteLot = async () => {
    if (!lotToDelete) return;

    try {
      setIsDeleting(true);

      // Get the receipt ID for the lot number
      const receiptsResponse = await api.get(`/management/wood-receipts`);
      const receipt = receiptsResponse.data.find((r: any) => r.lotNumber === lotToDelete);

      if (!receipt) {
        throw new Error('Failed to find receipt');
      }

      // Check if there are any receipt items
      const itemsResponse = await api.get(`/factory/receipt-items?receipt_id=${receipt.id}`);
      const items = itemsResponse.data;

      if (items && items.length > 0) {
        throw new Error('Cannot delete: Receipt has already been processed');
      }

      // Delete any drafts first
      await api.delete(`/factory/drafts?receipt_id=${lotToDelete}`);

      // Delete the receipt
      await api.delete(`/management/wood-receipts/${receipt.id}`);

      // Refresh the receipts list
      await fetchReceipts();
      enqueueSnackbar('Receipt deleted successfully', { variant: 'success' });
    } catch (error: any) {
      console.error('Error deleting receipt:', error);
      enqueueSnackbar(
        `Failed to delete receipt: ${error.response?.data?.message || error.message}`,
        { variant: 'error' }
      );
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setLotToDelete(null);
    }
  };

  return (
    <SnackbarProvider maxSnack={3}>
      <StyledContainer maxWidth="lg">
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
              <ReceiptLongIcon sx={{ fontSize: 28, color: 'white' }} />
            </Box>
            <Box>
              <Typography
                variant="h4"
                sx={{
                  color: 'white',
                  fontWeight: 700,
                  fontSize: '1.75rem',
                  letterSpacing: '-0.025em',
                }}
              >
                Receipt Processing
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontSize: '0.875rem',
                  mt: 0.5,
                }}
              >
                Process wood receipts and record sleeper measurements
              </Typography>
            </Box>
          </Box>
        </Paper>

        {/* Main Content */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, sm: 3 },
            pb: { xs: 25, sm: 3 },
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'rgba(0, 0, 0, 0.12)',
          }}
        >
          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              {/* LOT Selection Section */}
              <Grid item xs={12}>
                <Box
                  sx={{
                    p: 2,
                    mb: 3,
                    backgroundColor: '#f8fafc',
                    borderRadius: 2,
                  }}
                >
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: '0.875rem', color: 'rgba(0, 0, 0, 0.87)', mb: 2 }}>
                    LOT Selection
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                    <FormControl fullWidth required sx={textFieldSx}>
                      <InputLabel>LOT Number</InputLabel>
                      <Select
                        value={formData.receiptNumber}
                        label="LOT Number"
                        onChange={handleLotNumberChange}
                      >
                        {receipts.length === 0 ? (
                          <MenuItem value="" disabled>
                            No receipts available
                          </MenuItem>
                        ) : (
                          receipts
                            .filter(receipt => !['COMPLETED', 'CANCELLED'].includes(receipt.status))
                            .map((receipt) => {
                              return (
                                <MenuItem
                                  key={receipt.lotNumber || receipt.id}
                                  value={receipt.lotNumber || ''}
                                  sx={{
                                    display: 'flex',
                                    flexDirection: { xs: 'column', md: 'row' },
                                    alignItems: { xs: 'flex-start', md: 'center' },
                                    justifyContent: 'space-between',
                                    gap: { xs: 1, md: 1.5 },
                                    py: 1.5,
                                    borderBottom: '1px solid #f1f5f9',
                                    position: 'relative',
                                    '&:last-child': {
                                      borderBottom: 'none'
                                    }
                                  }}
                                >
                                  <Box
                                    sx={{
                                      display: 'flex',
                                      flexDirection: { xs: 'column', md: 'row' },
                                      alignItems: { xs: 'flex-start', md: 'center' },
                                      gap: { xs: 0.5, md: 1.5 },
                                      flex: 1,
                                      width: { xs: '100%', md: 'auto' },
                                      pr: { xs: 5, md: 0 }
                                    }}
                                  >
                                    <Typography
                                      sx={{
                                        fontSize: { xs: '0.9375rem', md: '0.875rem' },
                                        fontWeight: 600,
                                        color: '#dc2626',
                                        minWidth: { xs: 'auto', md: '120px' },
                                        flexShrink: 0
                                      }}
                                    >
                                      {receipt.lotNumber || 'No LOT Number'}
                                    </Typography>
                                    <Box
                                      sx={{
                                        display: { xs: 'none', md: 'block' },
                                        width: '1px',
                                        height: '20px',
                                        backgroundColor: '#e2e8f0',
                                        flexShrink: 0
                                      }}
                                    />
                                    <Typography
                                      sx={{
                                        fontSize: { xs: '0.8125rem', md: '0.8125rem' },
                                        color: { xs: '#64748b', md: '#475569' },
                                        minWidth: { xs: 'auto', md: '100px' },
                                        flexShrink: 0
                                      }}
                                    >
                                      {receipt.woodType?.name || 'N/A'}
                                    </Typography>
                                    <Box
                                      sx={{
                                        display: { xs: 'none', md: 'block' },
                                        width: '1px',
                                        height: '20px',
                                        backgroundColor: '#e2e8f0',
                                        flexShrink: 0
                                      }}
                                    />
                                    <Typography
                                      sx={{
                                        fontSize: { xs: '0.8125rem', md: '0.8125rem' },
                                        color: { xs: '#64748b', md: '#475569' },
                                        flex: { xs: 'none', md: 1 },
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: { xs: 'normal', md: 'nowrap' }
                                      }}
                                    >
                                      {receipt.supplier || 'N/A'}
                                    </Typography>
                                    <Box
                                      sx={{
                                        display: { xs: 'none', md: 'block' },
                                        width: '1px',
                                        height: '20px',
                                        backgroundColor: '#e2e8f0',
                                        flexShrink: 0
                                      }}
                                    />
                                    <Typography
                                      sx={{
                                        fontSize: { xs: '0.75rem', md: '0.8125rem' },
                                        color: '#64748b',
                                        minWidth: { xs: 'auto', md: '90px' },
                                        flexShrink: 0
                                      }}
                                    >
                                      {receipt.receiptDate ? new Date(receipt.receiptDate).toLocaleDateString() : 'N/A'}
                                    </Typography>
                                  </Box>
                                </MenuItem>
                              );
                            })
                        )}
                      </Select>
                    </FormControl>
                  </Box>
                </Box>
              </Grid>

              {/* Receipt Information Section */}
              <Grid item xs={12}>
                <Box
                  sx={{
                    p: 2,
                    mb: 3,
                    backgroundColor: '#f8fafc',
                    borderRadius: 2,
                  }}
                >
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: '0.875rem', color: 'rgba(0, 0, 0, 0.87)', mb: 2 }}>
                    Receipt Information
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Wood Type"
                        value={formData.woodTypeName}
                        InputProps={{ readOnly: true }}
                        sx={textFieldSx}
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Quantity (m³)"
                        value={formData.quantity}
                        InputProps={{ readOnly: true }}
                        sx={textFieldSx}
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Supplier"
                        value={formData.supplier}
                        InputProps={{ readOnly: true }}
                        sx={textFieldSx}
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Purchase Order"
                        value={formData.purchaseOrder}
                        InputProps={{ readOnly: true }}
                        sx={textFieldSx}
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Date"
                        type="date"
                        value={formData.date}
                        InputProps={{ readOnly: true }}
                        InputLabelProps={{ shrink: true }}
                        sx={textFieldSx}
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        size="small"
                        label="LOT / Status"
                        value={formData.receiptNumber}
                        InputProps={{
                          readOnly: true,
                          endAdornment: formData.status ? (
                            <Chip
                              label={formData.status}
                              size="small"
                              sx={{
                                ml: 1,
                                fontSize: '0.75rem',
                                height: 22,
                                px: 1,
                                backgroundColor:
                                  formData.status === 'PENDING' ? alpha('#9e9e9e', 0.1) :
                                  formData.status === 'RECEIVED' ? alpha('#2196f3', 0.1) :
                                  formData.status === 'PROCESSING' ? alpha('#e87722', 0.1) :
                                  alpha('#9e9e9e', 0.1),
                                color:
                                  formData.status === 'PENDING' ? '#616161' :
                                  formData.status === 'RECEIVED' ? '#1976d2' :
                                  formData.status === 'PROCESSING' ? '#e87722' :
                                  '#616161',
                              }}
                            />
                          ) : null
                        }}
                        sx={textFieldSx}
                      />
                    </Grid>
                  </Grid>
                </Box>
              </Grid>

              {/* Sleeper Measurements Section */}
              <Grid item xs={12}>
                <Box
                  sx={{
                    p: 2,
                    backgroundColor: '#f8fafc',
                    borderRadius: 2,
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: '0.875rem', color: 'rgba(0, 0, 0, 0.87)' }}>
                      Sleeper Measurements
                    </Typography>
                    <Box sx={{
                      display: 'flex',
                      border: '1px solid #dc2626',
                      borderRadius: 1,
                      overflow: 'hidden',
                    }}>
                      <Box
                        onClick={() => setMeasurementUnit('imperial')}
                        sx={{
                          px: { xs: 1.5, sm: 2 },
                          py: 0.5,
                          cursor: 'pointer',
                          fontSize: { xs: '0.75rem', sm: '0.8125rem' },
                          fontWeight: 600,
                          backgroundColor: measurementUnit === 'imperial' ? '#dc2626' : 'transparent',
                          color: measurementUnit === 'imperial' ? '#fff' : '#dc2626',
                          transition: 'all 0.2s',
                          '&:hover': {
                            backgroundColor: measurementUnit === 'imperial' ? '#b91c1c' : alpha('#dc2626', 0.1),
                          }
                        }}
                      >
                        in/ft
                      </Box>
                      <Box
                        onClick={() => setMeasurementUnit('metric')}
                        sx={{
                          px: { xs: 1.5, sm: 2 },
                          py: 0.5,
                          cursor: 'pointer',
                          fontSize: { xs: '0.75rem', sm: '0.8125rem' },
                          fontWeight: 600,
                          backgroundColor: measurementUnit === 'metric' ? '#dc2626' : 'transparent',
                          color: measurementUnit === 'metric' ? '#fff' : '#dc2626',
                          borderLeft: '1px solid #dc2626',
                          transition: 'all 0.2s',
                          '&:hover': {
                            backgroundColor: measurementUnit === 'metric' ? '#b91c1c' : alpha('#dc2626', 0.1),
                          }
                        }}
                      >
                        cm
                      </Box>
                    </Box>
                  </Box>

                  {isMobile ? (
                    <>
                      <MobileMeasurements
                        measurements={measurements}
                        handleMeasurementChange={handleMeasurementChange}
                        handleDeleteRow={handleDeleteRow}
                        measurementUnit={measurementUnit}
                        handleKeyDown={handleKeyDown}
                      />
                      <Box sx={{
                        position: 'fixed',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        bgcolor: 'background.paper',
                        boxShadow: '0px -2px 8px rgba(0, 0, 0, 0.15)',
                        zIndex: 1000,
                        borderTop: '2px solid #dc2626',
                      }}>
                        <Box sx={{
                          p: 1.5,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 1,
                        }}>
                          <Box sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            px: 1,
                          }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                              Total:
                            </Typography>
                            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#dc2626', fontSize: '1rem' }}>
                              {totalM3.toFixed(4)} m³
                            </Typography>
                          </Box>
                          <Box sx={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: 1,
                          }}>
                            <Button
                              fullWidth
                              variant="outlined"
                              startIcon={<AddIcon />}
                              onClick={handleAddRow}
                              sx={{
                                height: '40px',
                                fontSize: '0.8125rem',
                                borderColor: '#dc2626',
                                color: '#dc2626',
                                '&:hover': {
                                  borderColor: '#b91c1c',
                                  backgroundColor: alpha('#dc2626', 0.04),
                                }
                              }}
                            >
                              Add
                            </Button>
                            <Button
                              fullWidth
                              variant="outlined"
                              onClick={handleSaveDraft}
                              disabled={isSaving || !formData.receiptNumber}
                              startIcon={isSaving ? <CircularProgress size={16} /> : <SaveIcon />}
                              sx={{
                                height: '40px',
                                fontSize: '0.8125rem',
                                borderColor: '#dc2626',
                                color: '#dc2626',
                                '&:hover': {
                                  borderColor: '#b91c1c',
                                  backgroundColor: alpha('#dc2626', 0.04),
                                }
                              }}
                            >
                              {isSaving ? 'Saving...' : 'Save'}
                            </Button>
                            <BlobProvider
                              document={<ReceiptPDF
                                formData={formData}
                                measurements={measurements}
                                totalM3={totalM3}
                              />}
                            >
                              {({ url, loading }) => (
                                <Button
                                  fullWidth
                                  startIcon={<PictureAsPdfIcon />}
                                  variant="outlined"
                                  disabled={loading || !formData.receiptNumber}
                                  onClick={() => {
                                    if (url) {
                                      // Format: LOT-2025-001 (Mninga) - 2025-10-09.pdf
                                      const woodTypeName = formData.woodTypeName || 'Unknown';
                                      const date = formData.date ? new Date(formData.date).toISOString().split('T')[0] : 'No-Date';
                                      const fileName = `${formData.receiptNumber} (${woodTypeName}) - ${date}.pdf`;

                                      const link = document.createElement('a');
                                      link.href = url;
                                      link.download = fileName;
                                      link.click();
                                    }
                                  }}
                                  sx={{
                                    height: '40px',
                                    fontSize: '0.8125rem',
                                    borderColor: '#dc2626',
                                    color: '#dc2626',
                                    '&:hover': {
                                      borderColor: '#b91c1c',
                                      backgroundColor: alpha('#dc2626', 0.04),
                                    }
                                  }}
                                >
                                  PDF
                                </Button>
                              )}
                            </BlobProvider>
                            <Button
                              fullWidth
                              variant="contained"
                              type="submit"
                              disabled={!formData.receiptNumber || formData.status !== 'PENDING'}
                              sx={{
                                height: '40px',
                                fontSize: '0.8125rem',
                                bgcolor: '#dc2626',
                                '&:hover': {
                                  bgcolor: '#b91c1c',
                                }
                              }}
                            >
                              Complete
                            </Button>
                          </Box>
                        </Box>
                      </Box>
                    </>
                  ) : (
                    <>
                      <TableContainer
                        component={Paper}
                        elevation={0}
                        sx={{
                          border: '1px solid',
                          borderColor: 'rgba(0, 0, 0, 0.12)',
                          borderRadius: 1,
                          overflowX: 'auto',
                          mb: 2
                        }}
                      >
                        <Table size="small" sx={{ minWidth: { xs: 600, sm: 'auto' } }}>
                          <TableHead>
                            <TableRow sx={{ backgroundColor: '#f8fafc' }}>
                              <TableCell align="center" sx={{ width: { xs: 50, sm: 60 }, fontWeight: 600, fontSize: '0.75rem', color: 'rgba(0, 0, 0, 0.7)', px: { xs: 1, sm: 2 } }}>No</TableCell>
                              <TableCell align="center" sx={{ width: { xs: 90, sm: 100 }, fontWeight: 600, fontSize: '0.75rem', color: 'rgba(0, 0, 0, 0.7)', px: { xs: 1, sm: 2 } }}>
                                {measurementUnit === 'imperial' ? 'Thick (in)' : 'Thick (cm)'}
                              </TableCell>
                              <TableCell align="center" sx={{ width: { xs: 90, sm: 100 }, fontWeight: 600, fontSize: '0.75rem', color: 'rgba(0, 0, 0, 0.7)', px: { xs: 1, sm: 2 } }}>
                                {measurementUnit === 'imperial' ? 'Width (in)' : 'Width (cm)'}
                              </TableCell>
                              <TableCell align="center" sx={{ width: { xs: 90, sm: 100 }, fontWeight: 600, fontSize: '0.75rem', color: 'rgba(0, 0, 0, 0.7)', px: { xs: 1, sm: 2 } }}>
                                {measurementUnit === 'imperial' ? 'Length (ft)' : 'Length (cm)'}
                              </TableCell>
                              <TableCell align="center" sx={{ width: { xs: 90, sm: 110 }, fontWeight: 600, fontSize: '0.75rem', color: 'rgba(0, 0, 0, 0.7)', px: { xs: 1, sm: 2 } }}>Vol (m³)</TableCell>
                              <TableCell align="center" sx={{ width: { xs: 90, sm: 100 }, fontWeight: 600, fontSize: '0.75rem', color: 'rgba(0, 0, 0, 0.7)', px: { xs: 1, sm: 2 } }}>Actions</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {measurements.map((row, index) => (
                              <TableRow
                                key={row.id}
                                sx={{
                                  '&:hover': {
                                    backgroundColor: alpha('#dc2626', 0.04),
                                  }
                                }}
                              >
                                <TableCell align="center" sx={{ fontSize: '0.875rem', px: { xs: 1, sm: 2 } }}>
                                  {String(index + 1).padStart(3, '0')}
                                </TableCell>
                                <TableCell>
                                  <CompactNumberTextField
                                    variant="outlined"
                                    size="small"
                                    value={row.thickness || ''}
                                    onChange={(e) => {
                                      if (e.target.value.length <= 5) handleMeasurementChange(row.id, 'thickness', e.target.value);
                                    }}
                                    onKeyDown={(e) => handleKeyDown(e, row.id, 'thickness')}
                                    inputProps={{
                                      step: 0.1,
                                      min: 0.5,
                                      max: 18,
                                      maxLength: 5,
                                      'data-field': `thickness-${row.id}`
                                    }}
                                    error={row.thickness < 0.5 || row.thickness > 18}
                                  />
                                </TableCell>
                                <TableCell>
                                  <CompactNumberTextField
                                    variant="outlined"
                                    size="small"
                                    value={row.width || ''}
                                    onChange={(e) => {
                                      if (e.target.value.length <= 5) handleMeasurementChange(row.id, 'width', e.target.value);
                                    }}
                                    onKeyDown={(e) => handleKeyDown(e, row.id, 'width')}
                                    inputProps={{
                                      step: 0.1,
                                      min: 0.5,
                                      max: 18,
                                      maxLength: 5,
                                      'data-field': `width-${row.id}`
                                    }}
                                    error={row.width < 0.5 || row.width > 18}
                                  />
                                </TableCell>
                                <TableCell>
                                  <CompactNumberTextField
                                    variant="outlined"
                                    size="small"
                                    value={row.length || ''}
                                    onChange={(e) => {
                                      if (e.target.value.length <= 5) handleMeasurementChange(row.id, 'length', e.target.value);
                                    }}
                                    onKeyDown={(e) => handleKeyDown(e, row.id, 'length')}
                                    inputProps={{
                                      step: 0.1,
                                      min: 0.5,
                                      max: 18,
                                      maxLength: 5,
                                      'data-field': `length-${row.id}`
                                    }}
                                    error={row.length < 0.5 || row.length > 18}
                                  />
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.875rem', px: { xs: 1, sm: 2 } }}>
                                  {row.m3.toFixed(4)}
                                </TableCell>
                                <TableCell align="center" sx={{ px: { xs: 0.5, sm: 2 } }}>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleDeleteRow(row.id)}
                                    sx={{
                                      color: '#dc2626',
                                      '&:hover': {
                                        backgroundColor: alpha('#dc2626', 0.1),
                                      }
                                    }}
                                    title="Delete Row"
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    onClick={() => {
                                      const newId = measurements.length > 0 ? Math.max(...measurements.map(m => m.id)) + 1 : 1;
                                      setMeasurements([
                                        ...measurements.slice(0, index + 1),
                                        { ...row, id: newId, lastModifiedBy: currentUser?.email || 'Unknown User', lastModifiedAt: new Date().toISOString() },
                                        ...measurements.slice(index + 1)
                                      ]);
                                    }}
                                    sx={{
                                      color: '#dc2626',
                                      ml: 0.5,
                                      '&:hover': {
                                        backgroundColor: alpha('#dc2626', 0.1),
                                      }
                                    }}
                                    title="Duplicate Row"
                                  >
                                    <AddIcon fontSize="small" />
                                  </IconButton>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>

                      {/* Add Sleeper button */}
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                        <Button
                          startIcon={<AddIcon />}
                          onClick={handleAddRow}
                          sx={{
                            color: '#dc2626',
                            fontWeight: 600,
                            fontSize: '0.875rem',
                            '&:hover': {
                              bgcolor: alpha('#dc2626', 0.04),
                            },
                          }}
                        >
                          Add Sleeper
                        </Button>
                      </Box>
                    </>
                  )}
                </Box>

                <SleeperSizeSummary measurements={measurements} />
                <ChangeHistoryDisplay changeHistory={changeHistory} />

                {/* Total Volume Display */}
                {measurements.length > 0 && (
                  <Box
                    sx={{
                      mt: 3,
                      p: 2,
                      backgroundColor: alpha('#dc2626', 0.1),
                      borderRadius: 2,
                      border: '2px solid',
                      borderColor: '#dc2626',
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: '0.875rem', color: '#dc2626' }}>
                        Total Volume:
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: '#dc2626' }}>
                        {totalM3.toFixed(4)} m³
                      </Typography>
                    </Box>
                    {formData.quantity && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                        <Typography variant="body2" sx={{ fontSize: '0.75rem', color: 'rgba(0, 0, 0, 0.6)' }}>
                          Expected: {formData.quantity} m³
                        </Typography>
                        <Typography variant="body2" sx={{ fontSize: '0.75rem', color: 'rgba(0, 0, 0, 0.6)' }}>
                          Variance: {(parseFloat(formData.quantity) - totalM3).toFixed(4)} m³
                        </Typography>
                      </Box>
                    )}
                  </Box>
                )}

                {/* Action buttons for desktop */}
                {!isMobile && (
                  <Box sx={{
                    mt: 3,
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'flex-end',
                    gap: 2,
                  }}>
                    <Button
                      variant="outlined"
                      onClick={handleSaveDraft}
                      disabled={isSaving || !formData.receiptNumber}
                      startIcon={isSaving ? <CircularProgress size={20} /> : <SaveIcon />}
                      sx={{
                        borderColor: '#dc2626',
                        color: '#dc2626',
                        '&:hover': {
                          borderColor: '#b91c1c',
                          backgroundColor: alpha('#dc2626', 0.04),
                        }
                      }}
                    >
                      {isSaving ? 'Saving...' : 'Save Draft'}
                    </Button>
                    <BlobProvider
                      document={<ReceiptPDF formData={formData} measurements={measurements} totalM3={totalM3} />}
                    >
                      {({ url, loading }) => (
                        <Button
                          startIcon={<PictureAsPdfIcon />}
                          variant="outlined"
                          disabled={loading || !formData.receiptNumber}
                          onClick={() => {
                            if (url) {
                              // Format: LOT-2025-001 (Mninga) - 2025-10-09.pdf
                              const woodTypeName = formData.woodTypeName || 'Unknown';
                              const date = formData.date ? new Date(formData.date).toISOString().split('T')[0] : 'No-Date';
                              const fileName = `${formData.receiptNumber} (${woodTypeName}) - ${date}.pdf`;

                              const link = document.createElement('a');
                              link.href = url;
                              link.download = fileName;
                              link.click();
                            }
                          }}
                          sx={{
                            borderColor: '#dc2626',
                            color: '#dc2626',
                            '&:hover': {
                              borderColor: '#b91c1c',
                              backgroundColor: alpha('#dc2626', 0.04),
                            }
                          }}
                        >
                          {loading ? 'Generating PDF...' : 'Export PDF'}
                        </Button>
                      )}
                    </BlobProvider>
                    <Button
                      variant="contained"
                      type="submit"
                      disabled={!formData.receiptNumber || formData.status !== 'PENDING' || measurements.length === 0}
                      sx={{
                        bgcolor: '#dc2626',
                        '&:hover': {
                          bgcolor: '#b91c1c',
                        },
                        '&:disabled': {
                          bgcolor: '#cbd5e1',
                          color: '#94a3b8'
                        }
                      }}
                    >
                      {isAdmin ? 'Complete Processing' : 'Submit for Approval'}
                    </Button>
                  </Box>
                )}
              </Grid>
            </Grid>
          </form>
        </Paper>

        {/* Receipt History Table */}
        {formData.receiptNumber && (
          <Paper
            elevation={3}
            sx={{
              p: 3,
              mt: 3,
              borderRadius: 3,
              background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            }}
          >
            <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <HistoryIcon sx={{ color: '#dc2626', fontSize: '1.75rem' }} />
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 600,
                  fontSize: '1.125rem',
                  color: '#1e293b',
                }}
              >
                Receipt History
              </Typography>
            </Box>

            {changeHistory.length === 0 ? (
              <Box
                sx={{
                  textAlign: 'center',
                  py: 4,
                  color: '#64748b',
                }}
              >
                <HistoryIcon sx={{ fontSize: '3rem', opacity: 0.3, mb: 1 }} />
                <Typography sx={{ fontSize: '0.875rem' }}>
                  No history available for this receipt
                </Typography>
              </Box>
            ) : (
              <TableContainer
                sx={{
                  border: '1px solid #e2e8f0',
                  borderRadius: 2,
                  overflow: 'hidden',
                }}
              >
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f8fafc' }}>
                      <TableCell
                        sx={{
                          fontWeight: 600,
                          fontSize: '0.8125rem',
                          color: '#475569',
                          borderBottom: '2px solid #e2e8f0',
                          py: 1.5,
                        }}
                      >
                        Date & Time
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: 600,
                          fontSize: '0.8125rem',
                          color: '#475569',
                          borderBottom: '2px solid #e2e8f0',
                          py: 1.5,
                        }}
                      >
                        User
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: 600,
                          fontSize: '0.8125rem',
                          color: '#475569',
                          borderBottom: '2px solid #e2e8f0',
                          py: 1.5,
                        }}
                      >
                        Action
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: 600,
                          fontSize: '0.8125rem',
                          color: '#475569',
                          borderBottom: '2px solid #e2e8f0',
                          py: 1.5,
                        }}
                      >
                        Details
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {changeHistory
                      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                      .map((entry, index) => (
                        <TableRow
                          key={`${entry.receiptId}-${entry.timestamp}-${index}`}
                          sx={{
                            '&:hover': {
                              backgroundColor: alpha('#dc2626', 0.03),
                            },
                            '&:last-child td': {
                              borderBottom: 'none',
                            },
                          }}
                        >
                          <TableCell
                            sx={{
                              fontSize: '0.8125rem',
                              color: '#475569',
                              py: 1.5,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {new Date(entry.timestamp).toLocaleString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </TableCell>
                          <TableCell
                            sx={{
                              fontSize: '0.8125rem',
                              color: '#1e293b',
                              py: 1.5,
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                              <PersonIcon sx={{ fontSize: '1rem', color: '#64748b' }} />
                              {entry.userName || 'Unknown'}
                            </Box>
                          </TableCell>
                          <TableCell
                            sx={{
                              fontSize: '0.8125rem',
                              py: 1.5,
                            }}
                          >
                            <Chip
                              label={entry.action}
                              size="small"
                              sx={{
                                fontSize: '0.75rem',
                                fontWeight: 500,
                                height: '24px',
                                bgcolor:
                                  entry.action === 'CREATE'
                                    ? alpha('#10b981', 0.1)
                                    : entry.action === 'UPDATE'
                                    ? alpha('#3b82f6', 0.1)
                                    : entry.action === 'SUBMIT'
                                    ? alpha('#dc2626', 0.1)
                                    : alpha('#64748b', 0.1),
                                color:
                                  entry.action === 'CREATE'
                                    ? '#059669'
                                    : entry.action === 'UPDATE'
                                    ? '#2563eb'
                                    : entry.action === 'SUBMIT'
                                    ? '#dc2626'
                                    : '#475569',
                                border: 'none',
                              }}
                            />
                          </TableCell>
                          <TableCell
                            sx={{
                              fontSize: '0.8125rem',
                              color: '#64748b',
                              py: 1.5,
                            }}
                          >
                            {entry.details}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        )}

        <Snackbar
          open={showSuccess}
          autoHideDuration={6000}
          onClose={() => setShowSuccess(false)}
        >
          <Alert
            onClose={() => setShowSuccess(false)}
            severity="success"
            sx={{
              width: '100%',
              '& .MuiAlert-message': {
                fontSize: '0.875rem',
              }
            }}
          >
            Receipt processing started successfully!
          </Alert>
        </Snackbar>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={() => {
            if (!isDeleting) {
              setDeleteDialogOpen(false);
              setLotToDelete(null);
            }
          }}
          PaperProps={{
            sx: {
              borderRadius: 3,
            }
          }}
        >
          <DialogTitle sx={{ fontSize: '1.125rem', fontWeight: 600 }}>
            Delete Receipt
          </DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ fontSize: '0.875rem' }}>
              Are you sure you want to delete receipt {lotToDelete}? This action cannot be undone.
              Only unprocessed receipts can be deleted.
            </DialogContentText>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button
              onClick={() => {
                setDeleteDialogOpen(false);
                setLotToDelete(null);
              }}
              disabled={isDeleting}
              sx={{
                color: 'rgba(0, 0, 0, 0.6)',
                fontSize: '0.875rem',
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteLot}
              disabled={isDeleting}
              startIcon={isDeleting ? <CircularProgress size={20} /> : <DeleteForeverIcon />}
              sx={{
                bgcolor: '#dc2626',
                color: 'white',
                fontSize: '0.875rem',
                '&:hover': {
                  bgcolor: '#b91c1c',
                }
              }}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>
      </StyledContainer>
    </SnackbarProvider>
  );
};

export default ReceiptProcessing;
