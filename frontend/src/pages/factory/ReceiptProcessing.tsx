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
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { styled as muiStyled } from '@mui/material/styles';
import { supabase } from '../../config/supabase';
import type { WoodReceipt } from '../../types/wood-receipt';
import { colors } from '../../theme/colors';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { Document, Page, Text, View, StyleSheet, Image, BlobProvider } from '@react-pdf/renderer';
import SaveIcon from '@mui/icons-material/Save';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import logo from '../../assets/images/logo.png';
import { APP_NAME, APP_VERSION } from '../../constants/version';

// Styled Components
const StyledContainer = muiStyled(Container)(({ theme }) => ({
  backgroundColor: '#f5f5f5',
  minHeight: '100vh',
  paddingTop: theme.spacing(4),
  paddingBottom: theme.spacing(4),
}));

const StyledPaper = muiStyled(Paper)(({ theme }) => ({
  backgroundColor: '#fff',
  borderRadius: theme.spacing(1),
  boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.05)',
  padding: theme.spacing(3),
}));


// Common styles for form fields
const commonFieldStyles = {
  '& .MuiOutlinedInput-root': {
    fontSize: '0.875rem',
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    '& fieldset': {
      borderColor: 'rgba(0, 0, 0, 0.12)',
    },
    '&:hover fieldset': {
      borderColor: colors.primary,
    },
  },
  '& .MuiInputLabel-root': {
    fontSize: '0.875rem',
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    color: 'rgba(0, 0, 0, 0.6)',
  },
  '& .MuiSelect-select': {
    fontSize: '0.875rem',
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
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

// Add a new interface for change history
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

const StyledTableContainer = muiStyled(TableContainer)(({ theme }) => ({
  marginTop: theme.spacing(3),
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
      '& .MuiTableCell-root': {
        fontSize: '0.875rem',
        fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        '& .MuiTextField-root': {
          margin: 0,
        },
      },
    },
  },
}));

// Add this styled component for compact number fields
const CompactNumberTextField = muiStyled(TextField)({
  '& .MuiOutlinedInput-root': {
    padding: '0 4px',
    height: 28,
    background: '#f8fafc',
    borderRadius: 4,
    fontSize: '0.95rem',
    minHeight: 28,
  },
  '& input': {
    textAlign: 'right',
    padding: '4px 4px',
    fontSize: '0.95rem',
    MozAppearance: 'textfield',
  },
  '& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button': {
    WebkitAppearance: 'none',
    margin: 0,
  },
});

const MeasurementCard = muiStyled(Paper)(({ theme }) => ({
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
  handleDeleteRow 
}: {
  measurements: SleeperMeasurement[];
  handleMeasurementChange: (id: number, field: keyof SleeperMeasurement, value: string) => void;
  handleDeleteRow: (id: number) => void;
}) => (
  <Box sx={{ mb: 2 }}>
    {measurements.map((row, index) => (
      <MeasurementCard key={row.id}>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          mb: 2 
        }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            Sleeper #{String(index + 1).padStart(3, '0')}
          </Typography>
          <IconButton
            size="small"
            onClick={() => handleDeleteRow(row.id)}
            sx={{ color: colors.error }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={4}>
            <CompactNumberTextField
              fullWidth
              label="Thickness"
              size="small"
              type="number"
              value={row.thickness || ''}
              onChange={(e) => handleMeasurementChange(row.id, 'thickness', e.target.value)}
              inputProps={{
                step: 0.1,
                min: 0.5,
                max: 18,
                maxLength: 5,
                style: { width: 70, textAlign: 'right' }
              }}
              error={row.thickness < 0.5 || row.thickness > 18}
              helperText={row.thickness < 0.5 || row.thickness > 18 ? "!" : ""}
            />
          </Grid>
          <Grid item xs={4}>
            <CompactNumberTextField
              fullWidth
              label="Width"
              size="small"
              type="number"
              value={row.width || ''}
              onChange={(e) => handleMeasurementChange(row.id, 'width', e.target.value)}
              inputProps={{
                step: 0.1,
                min: 0.5,
                max: 18,
                maxLength: 5,
                style: { width: 70, textAlign: 'right' }
              }}
              error={row.width < 0.5 || row.width > 18}
              helperText={row.width < 0.5 || row.width > 18 ? "!" : ""}
            />
          </Grid>
          <Grid item xs={4}>
            <CompactNumberTextField
              fullWidth
              label="Length"
              size="small"
              type="number"
              value={row.length || ''}
              onChange={(e) => handleMeasurementChange(row.id, 'length', e.target.value)}
              inputProps={{
                step: 0.1,
                min: 0.5,
                max: 18,
                maxLength: 5,
                style: { width: 70, textAlign: 'right' }
              }}
              error={row.length < 0.5 || row.length > 18}
              helperText={row.length < 0.5 || row.length > 18 ? "!" : ""}
            />
          </Grid>
        </Grid>

        <Box sx={{ 
          mt: 2,
          p: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.02)',
          borderRadius: 1,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Typography variant="body2" color="textSecondary">
            Volume:
          </Typography>
          <Typography variant="body1" sx={{ fontWeight: 600 }}>
            {row.m3.toFixed(4)} m³
          </Typography>
        </Box>
      </MeasurementCard>
    ))}
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
    <Box sx={{ mt: 3, mb: 2 }}>
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
        Sleeper Size Summary
      </Typography>
      <TableContainer component={Paper} sx={{ mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Size</TableCell>
              <TableCell align="center">Count</TableCell>
              <TableCell align="right">Total Volume (m³)</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sizeSummary.map((size, index) => (
              <TableRow key={index}>
                <TableCell>{size.size}</TableCell>
                <TableCell align="center">{size.count}</TableCell>
                <TableCell align="right">{size.totalVolume.toFixed(4)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

const ChangeHistoryDisplay = ({ changeHistory }: { changeHistory: ChangeHistory[] }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (changeHistory.length === 0) {
    return null;
  }

  return (
    <Box sx={{ mt: 3, mb: 2 }}>
      <Button
        onClick={() => setIsExpanded(!isExpanded)}
        sx={{
          color: 'text.secondary',
          '&:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.04)',
          },
          width: '100%',
          justifyContent: 'flex-start',
          textTransform: 'none',
          mb: 1
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 500 }}>
          Change History ({changeHistory.length})
        </Typography>
      </Button>
      
      {isExpanded && (
        <TableContainer 
          component={Paper} 
          sx={{ 
            mb: 3,
            backgroundColor: 'rgba(0, 0, 0, 0.02)',
            '@media print': {
              display: 'none'
            }
          }}
        >
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: 'text.secondary' }}>Date/Time</TableCell>
                <TableCell sx={{ color: 'text.secondary' }}>User</TableCell>
                <TableCell sx={{ color: 'text.secondary' }}>Action</TableCell>
                <TableCell sx={{ color: 'text.secondary' }}>Details</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {changeHistory.map((entry) => (
                <TableRow 
                  key={`${entry.receiptId}-${entry.timestamp}-${entry.action}`}
                  sx={{ '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' } }}
                >
                  <TableCell sx={{ color: 'text.secondary' }}>
                    {new Date(entry.timestamp).toLocaleString()}
                  </TableCell>
                  <TableCell sx={{ color: 'text.secondary' }}>{entry.userName}</TableCell>
                  <TableCell sx={{ color: 'text.secondary' }}>{entry.action}</TableCell>
                  <TableCell sx={{ color: 'text.secondary' }}>{entry.details}</TableCell>
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
  const [formData, setFormData] = useState<ReceiptForm>(initialFormState);
  const [showSuccess, setShowSuccess] = useState(false);
  const [receipts, setReceipts] = useState<WoodReceipt[]>([]);
  const [measurements, setMeasurements] = useState<SleeperMeasurement[]>([]);
  const [totalM3, setTotalM3] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string } | null>(null);
  const [changeHistory, setChangeHistory] = useState<ChangeHistory[]>([]);

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
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setCurrentUser({
          id: session.user.id,
          email: session.user.email || 'Unknown User'
        });
      }
    } catch (error) {
      console.error('Error checking auth:', error);
    }
  };

  const fetchReceipts = async () => {
    try {
      console.log('Fetching receipts...');
      const { data, error } = await supabase
        .from('wood_receipts')
        .select('*, wood_type:wood_types(*)')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching receipts:', error);
        throw error;
      }
      
      console.log('Fetched receipts:', data);
      
      // Check if receipts have LOT numbers
      if (data && data.length > 0) {
        console.log('Receipts with LOT numbers:', data.map(r => ({
          id: r.id,
          lot_number: r.lot_number,
          status: r.status
        })));
        
        // If any receipts don't have LOT numbers, generate them
        const updatedReceipts = data.map(receipt => {
          if (!receipt.lot_number) {
            // Generate a LOT number based on the receipt ID
            const lotNumber = `LOT-${String(receipt.id).padStart(3, '0')}`;
            console.log(`Generated LOT number ${lotNumber} for receipt ${receipt.id}`);
            
            // Update the receipt in the database
            supabase
              .from('wood_receipts')
              .update({ lot_number: lotNumber })
              .eq('id', receipt.id)
              .then(({ error }) => {
                if (error) {
                  console.error(`Error updating LOT number for receipt ${receipt.id}:`, error);
                } else {
                  console.log(`Successfully updated LOT number for receipt ${receipt.id}`);
                }
              });
            
            // Return the receipt with the generated LOT number
            return { ...receipt, lot_number: lotNumber };
          }
          return receipt;
        });
        
        setReceipts(updatedReceipts);
      } else {
        console.warn('No receipts found or receipts have no LOT numbers');
        setReceipts([]);
      }
    } catch (error) {
      console.error('Error fetching receipts:', error);
      setReceipts([]);
    }
  };

  const handleLotNumberChange = async (event: SelectChangeEvent<string>) => {
    console.log('LOT number changed:', event.target.value);
    const selectedLot = event.target.value;
    const selectedReceipt = receipts.find(receipt => receipt.lot_number === selectedLot);

    console.log('Selected receipt:', selectedReceipt);
    if (selectedReceipt) {
      setFormData({
        receiptNumber: selectedLot,
        woodType: selectedReceipt.wood_type_id,
        woodTypeName: selectedReceipt.wood_type?.name || '',
        quantity: selectedReceipt.total_volume_m3?.toString() || '',
        supplier: selectedReceipt.supplier,
        date: selectedReceipt.purchase_date,
        status: selectedReceipt.status,
        purchaseOrder: selectedReceipt.purchase_order,
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

      // First update the receipt status and total volume
      const { error: receiptError } = await supabase
        .from('wood_receipts')
        .update({ 
          status: 'PROCESSING',
          total_volume_m3: totalM3
        })
        .eq('lot_number', formData.receiptNumber);

      if (receiptError) throw receiptError;

      // Get the receipt ID for the given lot number
      const { data: receiptData, error: receiptIdError } = await supabase
        .from('wood_receipts')
        .select('id')
        .eq('lot_number', formData.receiptNumber)
        .single();

      if (receiptIdError) throw receiptIdError;

      // Insert the measurements as receipt items
      const { error: itemsError } = await supabase
        .from('wood_receipt_items')
        .insert(receiptItems.map(item => ({
          ...item,
          receipt_id: receiptData.id
        })));

      if (itemsError) throw itemsError;

      // Delete the draft after processing
      await supabase
        .from('receipt_drafts')
        .delete()
        .eq('receipt_id', formData.receiptNumber);

      setShowSuccess(true);
      await fetchReceipts();
    } catch (error) {
      console.error('Error processing receipt:', error);
    }
  };

  const calculateM3 = (thickness: number, width: number, length: number): number => {
    // Convert inches to meters and feet to meters
    const thicknessM = thickness * 0.0254; // inch to meter
    const widthM = width * 0.0254; // inch to meter
    const lengthM = length * 0.3048; // feet to meter
    return thicknessM * widthM * lengthM;
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
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('No active session found');
        return;
      }

      const userId = session.user.id;
      const userName = session.user.email || 'Unknown User';
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

      console.log('Saving draft data:', draftData);

      // First check if a draft exists
      const { data: existingDraft, error: checkError } = await supabase
        .from('receipt_drafts')
        .select('id, receipt_id')
        .eq('receipt_id', formData.receiptNumber)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking for existing draft:', checkError);
        throw checkError;
      }

      let error;
      if (existingDraft) {
        // Update existing draft
        const { error: updateError } = await supabase
          .from('receipt_drafts')
          .update({
            measurements: draftData.measurements,
            updated_at: draftData.updated_at,
            updated_by: draftData.updated_by
          })
          .eq('receipt_id', formData.receiptNumber);
        error = updateError;
      } else {
        // Insert new draft
        const { error: insertError } = await supabase
          .from('receipt_drafts')
          .insert([draftData]);
        error = insertError;
      }

      if (error) {
        console.error('Error saving draft:', error);
        throw error;
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
      
      const { error: historyError } = await supabase
        .from('receipt_change_history')
        .insert([historyEntry]);
        
      if (historyError) {
        console.error('Error saving history:', historyError);
      } else {
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
      }
      
      setShowSuccess(true);
    } catch (error) {
      console.error('Error saving draft:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const loadDraft = async (receiptId: string) => {
    try {
      console.log('Loading data for receipt:', receiptId);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('No active session found');
        return;
      }

      // Always load change history first
      const { data: historyData, error: historyError } = await supabase
        .from('receipt_change_history')
        .select('*')
        .eq('receipt_id', receiptId)
        .order('timestamp', { ascending: false });

      if (historyError) {
        console.error('Error loading history:', historyError);
      } else {
        setChangeHistory(historyData || []);
      }

      // First, try to get the receipt ID from the wood_receipts table
      const { data: receiptData, error: receiptError } = await supabase
        .from('wood_receipts')
        .select('id')
        .eq('lot_number', receiptId)
        .single();

      if (receiptError) {
        console.error('Error getting receipt ID:', receiptError);
        throw receiptError;
      }

      // Try to load existing receipt items first
      const { data: receiptItems, error: itemsError } = await supabase
        .from('wood_receipt_items')
        .select('*')
        .eq('receipt_id', receiptData.id);

      if (itemsError) {
        console.error('Error loading receipt items:', itemsError);
      }

      // If we have receipt items, use those
      if (receiptItems && receiptItems.length > 0) {
        console.log('Found existing receipt items:', receiptItems);
        const processedMeasurements = receiptItems.map((item, index) => ({
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
        console.log('Processed measurements from receipt items:', processedMeasurements);
        setMeasurements(processedMeasurements);
        return;
      }

      // If no receipt items found, try loading from draft
      const { data: draftData, error: draftError } = await supabase
        .from('receipt_drafts')
        .select('*')
        .eq('receipt_id', receiptId)
        .maybeSingle();

      if (draftError) {
        console.error('Error loading draft:', draftError);
        throw draftError;
      }

      if (draftData && draftData.measurements) {
        console.log('Found draft with measurements:', draftData.measurements);
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
        console.log('Processed measurements from draft:', processedMeasurements);
        setMeasurements(processedMeasurements);
      } else {
        console.log('No data found for receipt:', receiptId);
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
          // Add more shortcuts as needed
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isSaving, formData.receiptNumber]);

  console.log('Current receipts for dropdown:', receipts.map(r => ({
    id: r.id,
    lot_number: r.lot_number,
    status: r.status
  })));

  return (
    <StyledContainer maxWidth="lg">
      <Typography 
        variant="h4" 
        sx={{ 
          mb: 4,
          color: 'rgba(0, 0, 0, 0.87)',
          fontWeight: 600,
          fontSize: '1.5rem',
          fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        }}
      >
        Receipt Processing
      </Typography>
      
      <StyledPaper>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControl fullWidth required sx={commonFieldStyles}>
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
                            key={receipt.lot_number || receipt.id} 
                            value={receipt.lot_number || ''}
                            sx={{
                              fontSize: '0.875rem',
                              fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              gap: 1
                            }}
                          >
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                fontSize: '1rem',
                                fontWeight: 500,
                                color: '#2c3e50',
                                fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif'
                              }}
                            >
                              {receipt.lot_number || 'No LOT Number'}
                              {receipt.status && (
                                <Chip
                                  label={receipt.status}
                                  size="small"
                                  color={
                                    receipt.status === 'PENDING' ? 'default' :
                                    receipt.status === 'RECEIVED' ? 'primary' :
                                    receipt.status === 'PROCESSING' ? 'warning' :
                                    'default'
                                  }
                                  sx={{
                                    fontSize: '0.85rem',
                                    fontWeight: 500,
                                    height: 24,
                                    px: 1.5,
                                    background: receipt.status === 'PROCESSING' ? '#e87722' : undefined,
                                    color: receipt.status === 'PROCESSING' ? '#fff' : undefined
                                  }}
                                />
                              )}
                            </Box>
                          </MenuItem>
                        );
                      })
                  )}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <Grid container spacing={1} alignItems="center" sx={{ mb: 2 }}>
                <Grid item xs={12} md={4}>
                  <TextField fullWidth size="small" label="Wood Type" value={formData.woodTypeName} InputProps={{ readOnly: true }} sx={commonFieldStyles} />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField fullWidth size="small" label="Quantity (m³)" value={formData.quantity} InputProps={{ readOnly: true }} sx={commonFieldStyles} />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField fullWidth size="small" label="Supplier" value={formData.supplier} InputProps={{ readOnly: true }} sx={commonFieldStyles} />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField fullWidth size="small" label="Purchase Order" value={formData.purchaseOrder} InputProps={{ readOnly: true }} sx={commonFieldStyles} />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField fullWidth size="small" label="Date" type="date" value={formData.date} InputProps={{ readOnly: true }} InputLabelProps={{ shrink: true }} sx={commonFieldStyles} />
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
                          color={
                            formData.status === 'PENDING' ? 'default' :
                            formData.status === 'RECEIVED' ? 'primary' :
                            formData.status === 'PROCESSING' ? 'warning' :
                            'default'
                          }
                          sx={{
                            ml: 1,
                            fontSize: '0.8rem',
                            height: 22,
                            px: 1,
                            background: formData.status === 'PROCESSING' ? '#e87722' : undefined,
                            color: formData.status === 'PROCESSING' ? '#fff' : undefined
                          }}
                        />
                      ) : null
                    }}
                    sx={commonFieldStyles}
                  />
                </Grid>
              </Grid>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Sleeper Measurements
              </Typography>
              
              {isMobile ? (
                <>
                  <MobileMeasurements
                    measurements={measurements}
                    handleMeasurementChange={handleMeasurementChange}
                    handleDeleteRow={handleDeleteRow}
                  />
                  <Box sx={{ 
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    bgcolor: 'background.paper',
                    boxShadow: '0px -2px 4px rgba(0, 0, 0, 0.1)',
                    zIndex: 1000,
                  }}>
                    <Box sx={{ 
                      p: 2,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 2,
                    }}>
                      <Box sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                          Total Volume:
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          {totalM3.toFixed(4)} m³
                        </Typography>
                      </Box>
                      <Box sx={{
                        display: 'flex',
                        gap: 2,
                      }}>
                        <Button
                          fullWidth
                          variant="outlined"
                          startIcon={<AddIcon />}
                          onClick={handleAddRow}
                          sx={{ height: '48px' }}
                        >
                          Add Sleeper
                        </Button>
                        <Button
                          variant="outlined"
                          onClick={handleSaveDraft}
                          disabled={isSaving || !formData.receiptNumber}
                          startIcon={isSaving ? <CircularProgress size={20} /> : <SaveIcon />}
                        >
                          {isSaving ? 'Saving...' : 'Save Draft'}
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
                              startIcon={<PictureAsPdfIcon />}
                              variant="outlined"
                              disabled={loading || !formData.receiptNumber}
                              onClick={() => {
                                if (url) {
                                  const link = document.createElement('a');
                                  link.href = url;
                                  link.download = `receipt-${formData.receiptNumber}.pdf`;
                                  link.click();
                                }
                              }}
                            >
                              {loading ? 'Generating PDF...' : 'Generate PDF'}
                            </Button>
                          )}
                        </BlobProvider>
                        <Button
                          variant="contained"
                          type="submit"
                          disabled={!formData.receiptNumber || formData.status !== 'PENDING'}
                          sx={{ bgcolor: colors.primary }}
                        >
                          Complete Processing
                        </Button>
                      </Box>
                    </Box>
                  </Box>
                </>
              ) : (
                <StyledTableContainer>
                  <Table size="small" sx={{
                    '& .MuiTableCell-root': {
                      padding: '4px 8px',
                      fontSize: '0.82rem',
                    },
                    '& .MuiInputBase-root': {
                      fontSize: '0.82rem',
                      height: 32,
                    },
                  }}>
                    <TableHead>
                      <TableRow>
                        <TableCell align="center" sx={{ width: 60, fontWeight: 700 }}>No</TableCell>
                        <TableCell align="center" sx={{ width: 90 }}>Thickness (in)</TableCell>
                        <TableCell align="center" sx={{ width: 90 }}>Width (in)</TableCell>
                        <TableCell align="center" sx={{ width: 90 }}>Length (ft)</TableCell>
                        <TableCell align="center" sx={{ width: 110 }}>m³</TableCell>
                        <TableCell align="center" sx={{ width: 90 }}>Action</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {measurements.map((row, index) => (
                        <TableRow key={row.id} hover sx={{ '&:hover': { backgroundColor: '#f5faff' }, minHeight: 32 }}>
                          <TableCell align="center">{String(index + 1).padStart(3, '0')}</TableCell>
                          <TableCell>
                            <CompactNumberTextField
                              variant="outlined"
                              size="small"
                              value={row.thickness || ''}
                              onChange={(e) => {
                                if (e.target.value.length <= 5) handleMeasurementChange(row.id, 'thickness', e.target.value);
                              }}
                              inputProps={{ step: 0.1, min: 0.5, max: 18, maxLength: 5, style: { width: 70, textAlign: 'right' } }}
                              error={row.thickness < 0.5 || row.thickness > 18}
                              helperText={row.thickness < 0.5 || row.thickness > 18 ? '!' : ''}
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
                              inputProps={{ step: 0.1, min: 0.5, max: 18, maxLength: 5, style: { width: 70, textAlign: 'right' } }}
                              error={row.width < 0.5 || row.width > 18}
                              helperText={row.width < 0.5 || row.width > 18 ? '!' : ''}
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
                              inputProps={{ step: 0.1, min: 0.5, max: 18, maxLength: 5, style: { width: 70, textAlign: 'right' } }}
                              error={row.length < 0.5 || row.length > 18}
                              helperText={row.length < 0.5 || row.length > 18 ? '!' : ''}
                            />
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600, width: 110 }}>
                            {row.m3.toFixed(4)}
                          </TableCell>
                          <TableCell align="center" sx={{ width: 90 }}>
                            <IconButton 
                              size="small" 
                              onClick={() => handleDeleteRow(row.id)}
                              sx={{ color: colors.error }}
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
                              sx={{ color: colors.primary, ml: 0.5 }}
                              title="Duplicate Row"
                            >
                              <AddIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </StyledTableContainer>
              )}

              {/* Add Sleeper button at the bottom of the table */}
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                <Button
                  startIcon={<AddIcon />}
                  onClick={handleAddRow}
                  sx={{
                    color: colors.primary,
                    fontWeight: 600,
                    fontSize: '0.95rem',
                    px: 2.5,
                    py: 1,
                    borderRadius: 2,
                    boxShadow: '0 2px 8px rgba(25, 118, 210, 0.08)',
                    '&:hover': { bgcolor: 'rgba(25, 118, 210, 0.04)' },
                  }}
                >
                  Add Sleeper
                </Button>
              </Box>

              <SleeperSizeSummary measurements={measurements} />
              <ChangeHistoryDisplay changeHistory={changeHistory} />

              {/* Action bar for Save/Print/Complete */}
              {!isMobile && (
                <Box sx={{
                  mt: 2,
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
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = `receipt-${formData.receiptNumber}.pdf`;
                            link.click();
                          }
                        }}
                      >
                        {loading ? 'Generating PDF...' : 'Generate PDF'}
                      </Button>
                    )}
                  </BlobProvider>
                  <Button
                    variant="contained"
                    type="submit"
                    disabled={!formData.receiptNumber || formData.status !== 'PENDING'}
                    sx={{ bgcolor: colors.primary }}
                  >
                    Complete Processing
                  </Button>
                </Box>
              )}
            </Grid>
          </Grid>
        </form>
      </StyledPaper>

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
              fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
            }
          }}
        >
          Receipt processing started successfully!
        </Alert>
      </Snackbar>
    </StyledContainer>
  );
};

export default ReceiptProcessing; 