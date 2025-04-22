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
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { styled as muiStyled } from '@mui/material/styles';
import { supabase } from '../../config/supabase';
import type { WoodReceipt } from '../../types/wood-receipt';
import { colors } from '../../theme/colors';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { PDFDownloadLink, Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
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

const NumberTextField = muiStyled(TextField)({
  '& input': {
    textAlign: 'right',
    fontSize: '0.875rem',
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    padding: '8px',
    '@media (max-width: 600px)': {
      padding: '12px 8px',
    },
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
            <NumberTextField
              fullWidth
              label="Thickness"
              size="small"
              type="number"
              value={row.thickness || ''}
              onChange={(e) => handleMeasurementChange(row.id, 'thickness', e.target.value)}
              inputProps={{ 
                step: "0.5",
                min: "0",
                inputMode: "decimal",
              }}
              InputProps={{
                endAdornment: <Typography variant="caption">in</Typography>
              }}
              sx={{
                '& .MuiInputBase-root': {
                  height: '48px',
                },
              }}
            />
          </Grid>
          <Grid item xs={4}>
            <NumberTextField
              fullWidth
              label="Width"
              size="small"
              type="number"
              value={row.width || ''}
              onChange={(e) => handleMeasurementChange(row.id, 'width', e.target.value)}
              inputProps={{ 
                step: "0.5",
                min: "0",
                inputMode: "decimal",
              }}
              InputProps={{
                endAdornment: <Typography variant="caption">in</Typography>
              }}
              sx={{
                '& .MuiInputBase-root': {
                  height: '48px',
                },
              }}
            />
          </Grid>
          <Grid item xs={4}>
            <NumberTextField
              fullWidth
              label="Length"
              size="small"
              type="number"
              value={row.length || ''}
              onChange={(e) => handleMeasurementChange(row.id, 'length', e.target.value)}
              inputProps={{ 
                step: "0.5",
                min: "0",
                inputMode: "decimal",
              }}
              InputProps={{
                endAdornment: <Typography variant="caption">ft</Typography>
              }}
              sx={{
                '& .MuiInputBase-root': {
                  height: '48px',
                },
              }}
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
    marginBottom: 15
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#2c3e50',
    marginBottom: 8,
    backgroundColor: '#f8fafc',
    padding: '6 8',
    borderRadius: 4
  },
  row: {
    flexDirection: 'row',
    marginBottom: 4,
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
    marginTop: 10
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderBottomColor: '#e2e8f0',
    borderBottomWidth: 1,
    padding: '8 6',
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#64748b'
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomColor: '#e2e8f0',
    borderBottomWidth: 1,
    padding: '8 6'
  },
  tableCell: {
    flex: 1
  },
  result: {
    marginTop: 15,
    padding: 10,
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

const ReceiptProcessing = () => {
  const [formData, setFormData] = useState<ReceiptForm>(initialFormState);
  const [showSuccess, setShowSuccess] = useState(false);
  const [receipts, setReceipts] = useState<WoodReceipt[]>([]);
  const [loading, setLoading] = useState(false);
  const [measurements, setMeasurements] = useState<SleeperMeasurement[]>([]);
  const [totalM3, setTotalM3] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showError, setShowError] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    fetchReceipts();
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('No active session found');
        // Handle unauthenticated state here (e.g., redirect to login)
        return;
      }
      console.log('Authenticated as:', session.user.email);
      
      // Test table access
      const { error } = await supabase
        .from('receipt_drafts')
        .select('count', { count: 'exact', head: true });
        
      if (error) {
        console.error('Table access test failed:', error);
      } else {
        console.log('Table access test succeeded');
      }
    };

    checkAuth();
  }, []);

  const fetchReceipts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('wood_receipts')
        .select('*, wood_type:wood_types(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReceipts(data || []);
    } catch (error) {
      console.error('Error fetching receipts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLotNumberChange = async (event: SelectChangeEvent<string>) => {
    const selectedLot = event.target.value;
    const selectedReceipt = receipts.find(receipt => receipt.lot_number === selectedLot);

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
      setError('Please select a LOT number');
      setShowError(true);
      return false;
    }
    if (measurements.length === 0) {
      setError('Please add at least one measurement');
      setShowError(true);
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    try {
      setIsProcessing(true);
      // Update the receipt status to PROCESSING
      const { error: receiptError } = await supabase
        .from('wood_receipts')
        .update({ 
          status: 'PROCESSING',
          processed_measurements: measurements,
          total_processed_volume: totalM3
        })
        .eq('lot_number', formData.receiptNumber);

      if (receiptError) throw receiptError;

      // Delete the draft after processing
      await supabase
        .from('receipt_drafts')
        .delete()
        .eq('receipt_id', formData.receiptNumber);

      setShowSuccess(true);
      await fetchReceipts();
    } catch (error) {
      console.error('Error processing receipt:', error);
    } finally {
      setIsProcessing(false);
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
        const newMeasurement = { ...m, [field]: parseFloat(value) || 0 };
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

      const draftData = {
        receipt_id: formData.receiptNumber,
        measurements: measurements,
        updated_at: new Date().toISOString()
      };

      console.log('Saving draft data:', draftData);

      // First check if a draft exists
      const { data: existingDraft } = await supabase
        .from('receipt_drafts')
        .select('id')
        .eq('receipt_id', formData.receiptNumber)
        .single();

      let error;
      if (existingDraft) {
        // Update existing draft
        const { error: updateError } = await supabase
          .from('receipt_drafts')
          .update(draftData)
          .eq('receipt_id', formData.receiptNumber);
        error = updateError;
      } else {
        // Insert new draft
        const { error: insertError } = await supabase
          .from('receipt_drafts')
          .insert(draftData);
        error = insertError;
      }

      if (error) {
        console.error('Error saving draft:', error);
        throw error;
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
      console.log('Loading draft for receipt:', receiptId);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('No active session found');
        return;
      }
      
      console.log('User authenticated:', session.user.id);

      const { data, error } = await supabase
        .from('receipt_drafts')
        .select('*')
        .eq('receipt_id', receiptId)
        .maybeSingle();

      if (error) {
        console.error('Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }

      if (data) {
        console.log('Found draft:', data);
        setMeasurements(data.measurements);
      } else {
        console.log('No draft found for receipt:', receiptId);
        setMeasurements([]);
      }
    } catch (error) {
      console.error('Error loading draft:', error);
      // Don't throw the error, just clear measurements
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
                  {receipts
                    .filter(receipt => receipt.status === 'PENDING')
                    .map((receipt) => (
                      <MenuItem 
                        key={receipt.lot_number} 
                        value={receipt.lot_number}
                        sx={{
                          fontSize: '0.875rem',
                          fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
                        }}
                      >
                        {receipt.lot_number}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Wood Type"
                value={formData.woodTypeName}
                InputProps={{ readOnly: true }}
                sx={commonFieldStyles}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Quantity (m³)"
                value={formData.quantity}
                InputProps={{ readOnly: true }}
                sx={commonFieldStyles}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Supplier"
                value={formData.supplier}
                InputProps={{ readOnly: true }}
                sx={commonFieldStyles}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Purchase Order"
                value={formData.purchaseOrder}
                InputProps={{ readOnly: true }}
                sx={commonFieldStyles}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Date"
                type="date"
                value={formData.date}
                InputProps={{ readOnly: true }}
                InputLabelProps={{ shrink: true }}
                sx={commonFieldStyles}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Status"
                value={formData.status}
                InputProps={{ readOnly: true }}
                sx={commonFieldStyles}
              />
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
                        <PDFDownloadLink
                          document={<ReceiptPDF formData={formData} measurements={measurements} totalM3={totalM3} />}
                          fileName={`receipt-${formData.receiptNumber}.pdf`}
                        >
                          {({ loading }) => (
                            <Button
                              startIcon={<PictureAsPdfIcon />}
                              variant="outlined"
                              disabled={loading || !formData.receiptNumber}
                            >
                              Generate PDF
                            </Button>
                          )}
                        </PDFDownloadLink>
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
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell align="center" sx={{ width: 80 }}>No</TableCell>
                        <TableCell align="center">Thickness (in)</TableCell>
                        <TableCell align="center">Width (in)</TableCell>
                        <TableCell align="center">Length (ft)</TableCell>
                        <TableCell align="center">m³</TableCell>
                        <TableCell align="center" sx={{ width: 70 }}>Action</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {measurements.map((row, index) => (
                        <TableRow key={row.id}>
                          <TableCell align="center">{String(index + 1).padStart(3, '0')}</TableCell>
                          <TableCell>
                            <NumberTextField
                              fullWidth
                              size="small"
                              type="number"
                              value={row.thickness || ''}
                              onChange={(e) => handleMeasurementChange(row.id, 'thickness', e.target.value)}
                              inputProps={{ step: "0.5", min: "0" }}
                            />
                          </TableCell>
                          <TableCell>
                            <NumberTextField
                              fullWidth
                              size="small"
                              type="number"
                              value={row.width || ''}
                              onChange={(e) => handleMeasurementChange(row.id, 'width', e.target.value)}
                              inputProps={{ step: "0.5", min: "0" }}
                            />
                          </TableCell>
                          <TableCell>
                            <NumberTextField
                              fullWidth
                              size="small"
                              type="number"
                              value={row.length || ''}
                              onChange={(e) => handleMeasurementChange(row.id, 'length', e.target.value)}
                              inputProps={{ step: "0.5", min: "0" }}
                            />
                          </TableCell>
                          <TableCell align="right">
                            {row.m3.toFixed(4)}
                          </TableCell>
                          <TableCell>
                            <IconButton 
                              size="small" 
                              onClick={() => handleDeleteRow(row.id)}
                              sx={{ color: colors.error }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell colSpan={4} align="right" sx={{ fontWeight: 600 }}>
                          Total m³:
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>
                          {totalM3.toFixed(4)}
                        </TableCell>
                        <TableCell />
                      </TableRow>
                    </TableBody>
                  </Table>
                </StyledTableContainer>
              )}

              <Box sx={{ 
                mt: 2,
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                justifyContent: 'space-between',
                gap: 2,
              }}>
                <Button
                  fullWidth={isMobile}
                  startIcon={<AddIcon />}
                  onClick={handleAddRow}
                  sx={{
                    color: colors.primary,
                    '&:hover': {
                      backgroundColor: 'rgba(25, 118, 210, 0.04)',
                    },
                    fontSize: '0.875rem',
                    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
                    height: isMobile ? '48px' : 'auto',
                  }}
                >
                  Add Sleeper
                </Button>
                
                <Box sx={{ 
                  display: 'flex',
                  gap: 2,
                  flexWrap: 'wrap',
                  justifyContent: 'flex-end'
                }}>
                  <Button
                    variant="outlined"
                    onClick={handleSaveDraft}
                    disabled={isSaving || !formData.receiptNumber}
                    startIcon={isSaving ? <CircularProgress size={20} /> : <SaveIcon />}
                  >
                    {isSaving ? 'Saving...' : 'Save Draft'}
                  </Button>

                  <PDFDownloadLink
                    document={<ReceiptPDF formData={formData} measurements={measurements} totalM3={totalM3} />}
                    fileName={`receipt-${formData.receiptNumber}.pdf`}
                  >
                    {({ loading }) => (
                      <Button
                        startIcon={<PictureAsPdfIcon />}
                        variant="outlined"
                        disabled={loading || !formData.receiptNumber}
                      >
                        Generate PDF
                      </Button>
                    )}
                  </PDFDownloadLink>

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

              {isMobile && (
                <Paper
                  sx={{
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    p: 2,
                    backgroundColor: '#fff',
                    boxShadow: '0px -2px 4px rgba(0, 0, 0, 0.1)',
                    zIndex: 1000,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    Total m³:
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {totalM3.toFixed(4)}
                  </Typography>
                </Paper>
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