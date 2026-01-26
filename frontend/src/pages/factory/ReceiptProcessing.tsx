import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  Checkbox,
  Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import HistoryIcon from '@mui/icons-material/History';
import InfoIcon from '@mui/icons-material/Info';
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
  qty: number; // Quantity of pieces with this dimension
  m3: number;
  isCustom?: boolean; // User checkbox to mark custom sizes
  isComplimentary?: boolean; // Free/bonus wood from supplier
  lastModifiedBy?: string;
  lastModifiedAt?: string;
}

interface ReceiptForm {
  receiptNumber: string;
  woodType: string;
  woodTypeName: string;
  quantity: string;
  expectedPieces?: string;
  supplier: string;
  date: string;
  status: string;
  purchaseOrder: string;
  woodFormat?: string; // 'SLEEPERS' or 'PLANKS'
  warehouseId?: string;
  warehouseName?: string;
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
  expectedPieces: '',
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
          No {formData.woodFormat === 'PLANKS' ? 'planks' : 'sleepers'} added yet. Click "Add {formData.woodFormat === 'PLANKS' ? 'Plank' : 'Sleeper'}" below to start.
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
    padding: '25 20',
    fontFamily: 'Helvetica',
    fontSize: 7.5,
    color: '#2c3e50'
  },
  header: {
    marginBottom: 14,
    borderBottom: 0.5,
    borderColor: '#cbd5e1',
    paddingBottom: 10
  },
  logo: {
    width: 80,
    marginBottom: 6
  },
  title: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 3
  },
  subtitle: {
    fontSize: 7.5,
    color: '#64748b',
    marginBottom: 10
  },
  metadata: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 7,
    color: '#64748b'
  },
  section: {
    marginBottom: 10
  },
  sectionTitle: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: '#2c3e50',
    marginBottom: 4,
    backgroundColor: '#f8fafc',
    padding: '3 5',
    borderRadius: 2
  },
  row: {
    flexDirection: 'row',
    marginBottom: 2,
    fontSize: 7.5
  },
  label: {
    width: '25%',
    color: '#64748b'
  },
  value: {
    width: '75%',
    color: '#2c3e50'
  },
  table: {
    marginTop: 4
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderBottomColor: '#cbd5e1',
    borderBottomWidth: 0.5,
    padding: '3 5',
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#475569'
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomColor: '#e2e8f0',
    borderBottomWidth: 0.5,
    padding: '2.5 5',
    fontSize: 7
  },
  tableCell: {
    flex: 1
  },
  result: {
    marginTop: 10,
    padding: 6,
    backgroundColor: '#f8fafc',
    borderRadius: 3,
    borderLeft: 2,
    borderLeftColor: '#3b82f6'
  },
  resultText: {
    fontFamily: 'Helvetica-Bold',
    color: '#2c3e50',
    fontSize: 9
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 6.5,
    paddingTop: 6,
    borderTopWidth: 0.5,
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
  totalPaidM3: number;
  totalComplimentaryM3: number;
  changeHistory: ChangeHistory[];
  measurementUnit: 'imperial' | 'metric';
}

const ReceiptPDF = ({ formData, measurements, totalM3, totalPaidM3, totalComplimentaryM3, changeHistory, measurementUnit }: ReceiptPDFProps) => {
  // Dynamic summary title based on wood format
  const summaryTitle = formData.woodFormat === 'PLANKS' ? 'Plank Summary' : 'Sleeper Size Summary';

  // Find the creator (first entry in history)
  const creator = changeHistory.length > 0 ? changeHistory[changeHistory.length - 1] : null;

  // Find the latest submitter/confirmer
  const submitter = changeHistory.find(entry =>
    entry.action === 'SUBMIT' || entry.action === 'CONFIRM' || entry.action === 'SUBMIT_FOR_APPROVAL'
  ) || changeHistory[0];

  return (
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
        <Text style={pdfStyles.sectionTitle}>{formData.woodFormat === 'PLANKS' ? 'Plank Measurements' : 'Sleeper Measurements'}</Text>
        <View style={pdfStyles.table}>
          <View style={pdfStyles.tableHeader}>
            <View style={[pdfStyles.tableCell, { flex: 0.4 }]}>
              <Text>No.</Text>
            </View>
            <View style={pdfStyles.tableCell}>
              <Text>{measurementUnit === 'imperial' ? 'Thickness (in)' : 'Thickness (cm)'}</Text>
            </View>
            <View style={pdfStyles.tableCell}>
              <Text>{measurementUnit === 'imperial' ? 'Width (in)' : 'Width (cm)'}</Text>
            </View>
            <View style={pdfStyles.tableCell}>
              <Text>{measurementUnit === 'imperial' ? 'Length (ft)' : 'Length (cm)'}</Text>
            </View>
            <View style={[pdfStyles.tableCell, { flex: 0.5 }]}>
              <Text>Qty</Text>
            </View>
            <View style={pdfStyles.tableCell}>
              <Text>Volume (m³)</Text>
            </View>
            {measurements.some(m => m.isComplimentary) && (
              <View style={[pdfStyles.tableCell, { flex: 0.5 }]}>
                <Text>Type</Text>
              </View>
            )}
          </View>
          {measurements.map((m: SleeperMeasurement, index: number) => (
            <View key={m.id} style={[pdfStyles.tableRow, m.isComplimentary ? { backgroundColor: '#f0fdf4' } : {}]}>
              <View style={[pdfStyles.tableCell, { flex: 0.4 }]}>
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
              <View style={[pdfStyles.tableCell, { flex: 0.5 }]}>
                <Text>{m.qty || 1}</Text>
              </View>
              <View style={pdfStyles.tableCell}>
                <Text>{m.m3.toFixed(4)}</Text>
              </View>
              {measurements.some(ms => ms.isComplimentary) && (
                <View style={[pdfStyles.tableCell, { flex: 0.5 }]}>
                  {m.isComplimentary ? (
                    <View style={{ backgroundColor: '#16a34a', padding: '1 3', borderRadius: 4, alignSelf: 'flex-start' }}>
                      <Text style={{ fontSize: 5, color: '#ffffff', fontFamily: 'Helvetica-Bold' }}>FREE</Text>
                    </View>
                  ) : (
                    <Text style={{ fontSize: 6, color: '#94a3b8' }}>Paid</Text>
                  )}
                </View>
              )}
            </View>
          ))}
        </View>
      </View>

      <View style={pdfStyles.section}>
        <Text style={pdfStyles.sectionTitle}>{summaryTitle}</Text>
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
          {getSleeperSizeSummary(measurements, measurementUnit).map((size, index) => (
            <View key={index} style={[pdfStyles.tableRow, size.isComplimentary ? { backgroundColor: '#f0fdf4' } : {}]}>
              <View style={pdfStyles.tableCell}>
                {size.size.includes('Custom') ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                    <View style={{
                      backgroundColor: '#fbbf24',
                      padding: '1 5',
                      borderRadius: 6,
                      alignSelf: 'flex-start'
                    }}>
                      <Text style={{
                        fontSize: 5,
                        fontFamily: 'Helvetica-Bold',
                        color: '#ffffff',
                        letterSpacing: 0.3
                      }}>CUSTOM</Text>
                    </View>
                    {size.isComplimentary && (
                      <View style={{ backgroundColor: '#16a34a', padding: '1 3', borderRadius: 4 }}>
                        <Text style={{ fontSize: 5, color: '#ffffff', fontFamily: 'Helvetica-Bold' }}>FREE</Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                    <Text style={size.isComplimentary ? { color: '#16a34a' } : {}}>{size.size.replace(' (Free)', '')}</Text>
                    {size.isComplimentary && (
                      <View style={{ backgroundColor: '#16a34a', padding: '1 3', borderRadius: 4 }}>
                        <Text style={{ fontSize: 5, color: '#ffffff', fontFamily: 'Helvetica-Bold' }}>FREE</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
              <View style={pdfStyles.tableCell}>
                <Text>{size.count}</Text>
              </View>
              <View style={pdfStyles.tableCell}>
                <Text style={size.isComplimentary ? { color: '#16a34a' } : {}}>{size.totalVolume.toFixed(4)}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={{ flexDirection: 'row', marginTop: 8, gap: 10 }}>
        {/* Pieces Section */}
        <View style={{ flex: 1, backgroundColor: '#f8fafc', padding: 6, borderRadius: 2, border: '0.5px solid #e2e8f0' }}>
          <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', marginBottom: 4, color: '#475569', letterSpacing: 0.3 }}>PIECES SUMMARY</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
            <Text style={{ fontSize: 6.5, color: '#64748b' }}>Total Pieces:</Text>
            <Text style={{ fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: '#1e293b' }}>
              {measurements.reduce((sum, m) => sum + (m.qty || 1), 0)}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
            <Text style={{ fontSize: 6.5, color: '#64748b' }}>Expected:</Text>
            <Text style={{ fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: '#1e293b' }}>
              {formData.expectedPieces && formData.expectedPieces.trim() !== '' ? formData.expectedPieces : 'N/A'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 2, borderTop: '0.5px solid #cbd5e1' }}>
            <Text style={{ fontSize: 6.5, color: '#64748b' }}>Variance:</Text>
            <Text style={{ fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: '#dc2626' }}>
              {formData.expectedPieces && formData.expectedPieces.trim() !== ''
                ? `${(parseInt(formData.expectedPieces) - measurements.reduce((sum, m) => sum + (m.qty || 1), 0))}`
                : 'N/A'}
            </Text>
          </View>
        </View>

        {/* Volume Section */}
        <View style={{ flex: 1, backgroundColor: '#f8fafc', padding: 6, borderRadius: 2, border: '0.5px solid #e2e8f0' }}>
          <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', marginBottom: 4, color: '#475569', letterSpacing: 0.3 }}>VOLUME SUMMARY</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
            <Text style={{ fontSize: 6.5, color: '#64748b' }}>Total Volume:</Text>
            <Text style={{ fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: '#1e293b' }}>
              {totalM3.toFixed(4)} m³
            </Text>
          </View>
          {totalComplimentaryM3 > 0 && (
            <>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                <Text style={{ fontSize: 6.5, color: '#64748b' }}>Paid Volume:</Text>
                <Text style={{ fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: '#1e293b' }}>
                  {totalPaidM3.toFixed(4)} m³
                </Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                <Text style={{ fontSize: 6.5, color: '#16a34a' }}>Free Volume:</Text>
                <Text style={{ fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: '#16a34a' }}>
                  {totalComplimentaryM3.toFixed(4)} m³
                </Text>
              </View>
            </>
          )}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
            <Text style={{ fontSize: 6.5, color: '#64748b' }}>Expected:</Text>
            <Text style={{ fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: '#1e293b' }}>
              {formData.quantity && formData.quantity.trim() !== '' ? `${formData.quantity} m³` : 'N/A'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 2, borderTop: '0.5px solid #cbd5e1' }}>
            <Text style={{ fontSize: 6.5, color: '#64748b' }}>Variance:</Text>
            <Text style={{ fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: '#dc2626' }}>
              {formData.quantity && formData.quantity.trim() !== '' ? `${(parseFloat(formData.quantity) - totalPaidM3).toFixed(4)} m³` : 'N/A'}
            </Text>
          </View>
        </View>
      </View>

      <View style={pdfStyles.footer}>
        <View style={{ marginBottom: 5 }}>
          {creator && (
            <Text style={{ fontSize: 6.5, color: '#64748b', marginBottom: 2 }}>
              Created by: {creator.userName} on {new Date(creator.timestamp).toLocaleDateString()}
            </Text>
          )}
          {submitter && submitter !== creator && (
            <Text style={{ fontSize: 6.5, color: '#64748b' }}>
              Submitted by: {submitter.userName} on {new Date(submitter.timestamp).toLocaleDateString()}
            </Text>
          )}
        </View>
        <Text style={{ fontSize: 6.5, color: '#94a3b8' }}>
          {APP_NAME} {APP_VERSION} • Generated by Wood Processing System
        </Text>
      </View>
    </Page>
  </Document>
  );
};

// Helper function to determine if measurement should default to custom
const shouldDefaultToCustom = (thickness: number | string, unit: 'imperial' | 'metric'): boolean => {
  // Rule 1: All metric → suggest custom
  if (unit === 'metric') return true;

  // Rule 2: Check if standard imperial size (1, 2, or 3)
  const standardSizes = [1, 2, 3];
  const thicknessNum = parseFloat(thickness.toString());

  if (standardSizes.includes(thicknessNum)) return false;

  // Rule 3: Non-standard imperial → suggest custom
  return true;
};

const getSleeperSizeSummary = (measurements: SleeperMeasurement[], unit: 'imperial' | 'metric' = 'imperial') => {
  const sizeMap = new Map<string, { count: number; totalVolume: number; isComplimentary: boolean }>();

  measurements.forEach(m => {
    // Check if measurement is custom
    let sizeKey: string;
    if (m.isCustom) {
      sizeKey = m.isComplimentary ? 'Custom (Free)' : 'Custom';
    } else {
      const baseKey = unit === 'imperial'
        ? `${m.thickness}" × ${m.width}" × ${m.length}'`
        : `${m.thickness}cm × ${m.width}cm × ${m.length}cm`;
      sizeKey = m.isComplimentary ? `${baseKey} (Free)` : baseKey;
    }
    const qty = m.qty || 1;

    if (sizeMap.has(sizeKey)) {
      const existing = sizeMap.get(sizeKey)!;
      sizeMap.set(sizeKey, {
        count: existing.count + qty,
        totalVolume: existing.totalVolume + m.m3,
        isComplimentary: m.isComplimentary || false
      });
    } else {
      sizeMap.set(sizeKey, {
        count: qty,
        totalVolume: m.m3,
        isComplimentary: m.isComplimentary || false
      });
    }
  });

  return Array.from(sizeMap.entries()).map(([size, data]) => ({
    size,
    count: data.count,
    totalVolume: data.totalVolume,
    isComplimentary: data.isComplimentary
  }));
};

const SleeperSizeSummary = ({ measurements, measurementUnit, woodFormat }: { measurements: SleeperMeasurement[]; measurementUnit: 'imperial' | 'metric'; woodFormat?: string }) => {
  const sizeSummary = getSleeperSizeSummary(measurements, measurementUnit);

  if (sizeSummary.length === 0) {
    return null;
  }

  const summaryTitle = woodFormat === 'PLANKS' ? 'Plank Summary' : 'Sleeper Size Summary';

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
          {summaryTitle}
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
                  <TableCell sx={{ fontSize: '0.875rem' }}>
                    {size.size === 'Custom' ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip
                          label="Custom"
                          size="small"
                          sx={{
                            backgroundColor: '#fef3c7',
                            color: '#92400e',
                            fontWeight: 600,
                            fontSize: '0.75rem',
                            border: '1px solid #fcd34d'
                          }}
                        />
                      </Box>
                    ) : (
                      size.size
                    )}
                  </TableCell>
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
  const [searchParams] = useSearchParams();
  const [receipts, setReceipts] = useState<WoodReceipt[]>([]);
  const [measurements, setMeasurements] = useState<SleeperMeasurement[]>([]);
  const [totalM3, setTotalM3] = useState<number>(0);
  const [totalPaidM3, setTotalPaidM3] = useState<number>(0);
  const [totalComplimentaryM3, setTotalComplimentaryM3] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string } | null>(null);
  const [changeHistory, setChangeHistory] = useState<ChangeHistory[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [lotToDelete, setLotToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [measurementUnit, setMeasurementUnit] = useState<'imperial' | 'metric'>('imperial'); // imperial = inch/ft, metric = cm
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [completedReceipts, setCompletedReceipts] = useState<WoodReceipt[]>([]);
  const [isReadOnly, setIsReadOnly] = useState(false);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    const init = async () => {
      await checkAuth();
      await fetchReceipts();
    };
    init();
  }, []);

  // Handle URL parameter for opening specific LOT from notification
  useEffect(() => {
    const lotParam = searchParams.get('lot');
    if (lotParam && receipts.length > 0) {
      const receipt = receipts.find(r => r.lotNumber === lotParam);
      if (receipt) {
        // If receipt is completed, set to read-only mode
        if (receipt.status === 'COMPLETED' || receipt.status === 'CANCELLED') {
          setIsReadOnly(true);
        }

        // Set the receipt number
        setFormData(prev => ({
          ...prev,
          receiptNumber: receipt.lotNumber || '',
          woodTypeName: receipt.woodType?.name || '',
          supplier: receipt.supplier || ''
        }));
        // Load the measurements
        loadDraft(lotParam);
        // Don't open history dialog - just show the receipt in read-only mode
      }
    }
  }, [searchParams, receipts]);

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

      // Debug logging
      console.log('Fetched receipts:', data.length);
      console.log('Receipt statuses:', data.map((r: any) => ({ lot: r.lotNumber, status: r.status })));

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
      console.log('Selected receipt data:', selectedReceipt);
      console.log('estimatedPieces:', selectedReceipt.estimatedPieces);
      console.log('estimatedVolumeM3:', selectedReceipt.estimatedVolumeM3);
      setFormData({
        receiptNumber: selectedLot,
        woodType: selectedReceipt.woodTypeId || '',
        woodTypeName: selectedReceipt.woodType?.name || '',
        quantity: selectedReceipt.estimatedVolumeM3?.toString() || '',
        expectedPieces: selectedReceipt.estimatedPieces?.toString() || '',
        supplier: selectedReceipt.supplier || '',
        date: selectedReceipt.receiptDate ? new Date(selectedReceipt.receiptDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        status: selectedReceipt.status || 'PENDING',
        purchaseOrder: selectedReceipt.purchaseOrder || '',
        woodFormat: selectedReceipt.woodFormat || 'SLEEPERS',
        warehouseId: selectedReceipt.warehouseId || '',
        warehouseName: selectedReceipt.warehouse?.name || 'No Warehouse',
      });
    }

    await loadDraft(selectedLot);
  };

  const validateForm = () => {
    if (!formData.receiptNumber) {
      enqueueSnackbar('Please select a LOT number', { variant: 'error' });
      return false;
    }
    if (measurements.length === 0) {
      enqueueSnackbar('Please add at least one measurement', { variant: 'error' });
      return false;
    }
    if (!formData.warehouseId) {
      enqueueSnackbar('Cannot complete receipt: No warehouse assigned. Please assign a warehouse to this LOT first in LOT Management.', { variant: 'error' });
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    try {
      if (isAdmin) {
        // Admin completes the processing - calls our new endpoint
        const response = await api.post(`/factory/receipts/complete/${formData.receiptNumber}`);

        const { stockUpdated, notificationsSent } = response.data;

        let successMessage = 'Receipt processed and completed successfully!';
        if (stockUpdated) {
          successMessage += ' Warehouse stock has been updated.';
        }
        if (notificationsSent > 0) {
          successMessage += ` ${notificationsSent} notification(s) sent.`;
        }

        enqueueSnackbar(successMessage, { variant: 'success' });
      } else {
        // Non-admin submits for approval (existing logic)
        const receiptsResponse = await api.get(`/management/wood-receipts`);
        const receipt = receiptsResponse.data.find((r: any) => r.lotNumber === formData.receiptNumber);

        if (!receipt) throw new Error('Receipt not found');

        await api.patch(`/management/wood-receipts/${receipt.id}`, {
          status: 'PENDING_APPROVAL',
          actual_volume_m3: totalM3,
          actual_pieces: measurements.reduce((sum, m) => sum + (m.qty || 1), 0)
        });

        enqueueSnackbar('Receipt submitted for admin approval successfully!', { variant: 'success' });
      }

      setShowSuccess(true);
      await fetchReceipts();

      // Reset form
      setFormData({
        receiptNumber: '',
        woodType: '',
        woodTypeName: '',
        quantity: '',
        expectedPieces: '',
        supplier: '',
        date: new Date().toISOString().split('T')[0],
        status: '',
        purchaseOrder: '',
      });
      setMeasurements([]);
    } catch (error: any) {
      console.error('Error processing receipt:', error);
      enqueueSnackbar(
        error.response?.data?.error || 'Failed to process receipt',
        { variant: 'error' }
      );
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
      qty: 1,
      m3: 0,
      isCustom: measurementUnit === 'metric', // Default checked for metric
      lastModifiedBy: currentUser?.email || 'Unknown User',
      lastModifiedAt: new Date().toISOString()
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
          [field]: field === 'qty'
            ? (parseInt(value) || 1)
            : field === 'isComplimentary' || field === 'isCustom'
              ? (value === 'true')
              : (parseFloat(value) || 0),
          lastModifiedBy: currentUser?.email || 'Unknown User',
          lastModifiedAt: new Date().toISOString()
        };

        // Auto-suggest custom checkbox when thickness changes
        if (field === 'thickness' && value !== '') {
          newMeasurement.isCustom = shouldDefaultToCustom(parseFloat(value), measurementUnit);
        }

        // Recalculate m3 if any dimension or quantity changes
        if (field === 'thickness' || field === 'width' || field === 'length' || field === 'qty') {
          const singlePieceM3 = calculateM3(
            newMeasurement.thickness,
            newMeasurement.width,
            newMeasurement.length
          );
          newMeasurement.m3 = singlePieceM3 * (newMeasurement.qty || 1);
        }
        return newMeasurement;
      }
      return m;
    }));
  };

  const handleCustomToggle = (id: number, isCustom: boolean) => {
    setHasUnsavedChanges(true);
    setMeasurements(measurements.map(m =>
      m.id === id
        ? {
            ...m,
            isCustom,
            lastModifiedBy: currentUser?.email || 'Unknown User',
            lastModifiedAt: new Date().toISOString()
          }
        : m
    ));
  };

  useEffect(() => {
    const paidTotal = measurements
      .filter(m => !m.isComplimentary)
      .reduce((sum, m) => sum + m.m3, 0);

    const complimentaryTotal = measurements
      .filter(m => m.isComplimentary)
      .reduce((sum, m) => sum + m.m3, 0);

    const total = paidTotal + complimentaryTotal;

    setTotalPaidM3(paidTotal);
    setTotalComplimentaryM3(complimentaryTotal);
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
        measurement_unit: measurementUnit,
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
          measurement_unit: draftData.measurement_unit,
          updated_at: draftData.updated_at,
          updated_by: draftData.updated_by
        });
      } else {
        // Insert new draft
        await api.post('/factory/drafts', draftData);
      }

      // Note: History entry is now created by the backend in the draft POST/PUT endpoints
      // to avoid duplicate entries (DRAFT_CREATED/DRAFT_UPDATED)

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

      // Set the measurement unit from the receipt
      if (receipt.measurementUnit) {
        setMeasurementUnit(receipt.measurementUnit as 'imperial' | 'metric');
      }

      // Try to load existing measurements first (for completed receipts)
      try {
        const measurementsResponse = await api.get(`/factory/measurements?receipt_id=${receipt.id}`);
        const savedMeasurements = measurementsResponse.data;

        // If we have saved measurements, use those
        if (savedMeasurements && savedMeasurements.length > 0) {
          const processedMeasurements = savedMeasurements.map((m: any, index: number) => ({
            id: index + 1,
            thickness: m.thickness || 0,
            width: m.width || 0,
            length: m.length || 0,
            qty: m.qty || 1,
            m3: m.volumeM3 || 0,
            isCustom: m.isCustom !== undefined ? m.isCustom : false,
            isComplimentary: m.isComplimentary !== undefined ? m.isComplimentary : false,
            lastModifiedBy: 'System',
            lastModifiedAt: m.createdAt || new Date().toISOString()
          }));
          setMeasurements(processedMeasurements);
          return;
        }
      } catch (measurementsError: any) {
        // Silently handle 404 - no measurements exist yet
        if (measurementsError.response?.status !== 404) {
          console.error('Error loading measurements:', measurementsError);
        }
      }

      // If no measurements found, try loading from draft
      try {
        const draftResponse = await api.get(`/factory/drafts?receipt_id=${receiptId}`);
        const draftData = draftResponse.data.length > 0 ? draftResponse.data[0] : null;

        console.log('Draft data loaded:', {
          hasDraft: !!draftData,
          hasMeasurements: !!draftData?.measurements,
          measurementCount: draftData?.measurements?.length,
          measurementUnit: draftData?.measurementUnit
        });

        if (draftData && draftData.measurements) {
          // Restore the measurement unit from the draft
          const draftMeasurementUnit = (draftData.measurementUnit as 'imperial' | 'metric') || 'imperial';
          if (draftData.measurementUnit) {
            setMeasurementUnit(draftMeasurementUnit);
          }

          // Helper function to calculate m3 with specific unit
          const calculateM3WithUnit = (thickness: number, width: number, length: number, unit: 'imperial' | 'metric'): number => {
            if (unit === 'imperial') {
              const thicknessM = thickness * 0.0254;
              const widthM = width * 0.0254;
              const lengthM = length * 0.3048;
              return thicknessM * widthM * lengthM;
            } else {
              return (thickness / 100) * (width / 100) * (length / 100);
            }
          };

          const processedMeasurements = draftData.measurements.map((m: any) => ({
            id: m.id || Math.random(),
            thickness: parseFloat(m.thickness) || 0,
            width: parseFloat(m.width) || 0,
            length: parseFloat(m.length) || 0,
            qty: parseInt(m.qty) || 1,
            m3: parseFloat(m.m3) || calculateM3WithUnit(
              parseFloat(m.thickness) || 0,
              parseFloat(m.width) || 0,
              parseFloat(m.length) || 0,
              draftMeasurementUnit
            ),
            isCustom: m.isCustom !== undefined ? m.isCustom : false,
            isComplimentary: m.isComplimentary !== undefined ? m.isComplimentary : false,
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

  const fetchCompletedReceipts = async () => {
    try {
      const response = await api.get('/management/wood-receipts');
      const completed = response.data.filter((receipt: WoodReceipt) =>
        ['COMPLETED', 'CANCELLED'].includes(receipt.status)
      );
      setCompletedReceipts(completed);
    } catch (error) {
      console.error('Error fetching completed receipts:', error);
    }
  };

  const handleViewHistory = async () => {
    await fetchCompletedReceipts();
    setHistoryDialogOpen(true);
  };

  const handleViewCompletedReceipt = async (receipt: WoodReceipt) => {
    setIsReadOnly(true);
    const woodTypeObj = (receipt as any).woodType || receipt.wood_type;
    const lotNumber = receipt.lotNumber || receipt.lot_number;

    setFormData({
      receiptNumber: lotNumber || '',
      woodType: woodTypeObj?.id || (receipt as any).woodTypeId || receipt.wood_type_id || '',
      woodTypeName: woodTypeObj?.name || '',
      quantity: String(receipt.quantity || receipt.estimatedVolumeM3 || ''),
      expectedPieces: String(receipt.estimatedPieces || ''),
      supplier: receipt.supplier || '',
      date: receipt.createdAt?.split('T')[0] || '',
      status: receipt.status,
      purchaseOrder: receipt.purchaseOrder || '',
      woodFormat: receipt.woodFormat || 'SLEEPERS',
      warehouseName: (receipt as any).warehouse?.name || 'No Warehouse',
    });

    // Set the measurement unit from the receipt
    if ((receipt as any).measurementUnit) {
      setMeasurementUnit((receipt as any).measurementUnit as 'imperial' | 'metric');
    }

    // Load change history for this receipt
    try {
      const historyResponse = await api.get(`/factory/receipt-history?receipt_id=${lotNumber}`);
      setChangeHistory(historyResponse.data || []);
    } catch (historyError: any) {
      if (historyError.response?.status !== 404) {
        console.error('Error loading history:', historyError);
      }
      setChangeHistory([]);
    }

    // Load measurements for this receipt using receipt ID
    try {
      const measurementsResponse = await api.get(`/factory/measurements?receipt_id=${receipt.id}`);
      if (measurementsResponse.data && measurementsResponse.data.length > 0) {
        const processedMeasurements = measurementsResponse.data.map((m: any, index: number) => ({
          id: index + 1,
          thickness: m.thickness || 0,
          width: m.width || 0,
          length: m.length || 0,
          qty: m.qty || 1,
          m3: m.volumeM3 || 0,
          isCustom: m.isCustom !== undefined ? m.isCustom : false,
          lastModifiedBy: 'System',
          lastModifiedAt: m.createdAt || new Date().toISOString()
        }));
        setMeasurements(processedMeasurements);
      }
    } catch (error) {
      console.error('Error loading measurements:', error);
    }

    setHistoryDialogOpen(false);
  };

  const handleCloseReadOnly = () => {
    setIsReadOnly(false);
    setFormData(initialFormState);
    setMeasurements([]);
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
          {/* Read-Only Banner */}
          {isReadOnly && (
            <Alert
              severity="info"
              sx={{
                mb: 3,
                borderRadius: 2,
                fontSize: '0.875rem',
              }}
              action={
                <Button
                  size="small"
                  onClick={handleCloseReadOnly}
                  sx={{
                    textTransform: 'none',
                    fontSize: '0.813rem',
                  }}
                >
                  Close
                </Button>
              }
            >
              <strong>Viewing Completed Receipt:</strong> This receipt is in read-only mode. All fields are disabled.
            </Alert>
          )}

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
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: '0.875rem', color: 'rgba(0, 0, 0, 0.87)' }}>
                      LOT Selection
                    </Typography>
                    {!isReadOnly && (
                      <Button
                        size="small"
                        startIcon={<HistoryIcon />}
                        onClick={handleViewHistory}
                        sx={{
                          textTransform: 'none',
                          color: '#dc2626',
                          fontSize: '0.813rem',
                          '&:hover': {
                            backgroundColor: alpha('#dc2626', 0.08),
                          }
                        }}
                      >
                        View History
                      </Button>
                    )}
                  </Box>
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                    <FormControl fullWidth required sx={textFieldSx}>
                      <InputLabel>LOT Number</InputLabel>
                      <Select
                        value={formData.receiptNumber}
                        label="LOT Number"
                        onChange={handleLotNumberChange}
                        disabled={isReadOnly}
                      >
                        {isReadOnly && formData.receiptNumber && (
                          <MenuItem value={formData.receiptNumber}>
                            {formData.receiptNumber} - {formData.woodTypeName} - {formData.supplier} (Read-Only)
                          </MenuItem>
                        )}
                        {!isReadOnly && receipts.length === 0 ? (
                          <MenuItem value="" disabled>
                            No receipts available
                          </MenuItem>
                        ) : (
                          !isReadOnly && receipts
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
                                    <Chip
                                      label={receipt.woodFormat === 'PLANKS' ? 'Planks' : 'Sleepers'}
                                      size="small"
                                      sx={{
                                        height: '20px',
                                        fontSize: '0.6875rem',
                                        fontWeight: 600,
                                        backgroundColor: receipt.woodFormat === 'PLANKS' ? '#dbeafe' : '#fef3c7',
                                        color: receipt.woodFormat === 'PLANKS' ? '#1e40af' : '#92400e',
                                        display: { xs: 'none', md: 'inline-flex' },
                                        '& .MuiChip-label': { px: 1 }
                                      }}
                                    />
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
                                    <Box
                                      sx={{
                                        display: { xs: 'none', md: 'block' },
                                        width: '1px',
                                        height: '20px',
                                        backgroundColor: '#e2e8f0',
                                        flexShrink: 0
                                      }}
                                    />
                                    <Chip
                                      label={
                                        receipt.status === 'CREATED' ? 'Created' :
                                        receipt.status === 'PENDING' ? 'Pending' :
                                        receipt.status === 'PENDING_APPROVAL' ? 'Awaiting Approval' :
                                        receipt.status === 'RECEIVED' ? 'Received' :
                                        receipt.status
                                      }
                                      size="small"
                                      sx={{
                                        height: '20px',
                                        fontSize: '0.6875rem',
                                        fontWeight: 600,
                                        backgroundColor:
                                          receipt.status === 'CREATED' ? '#f1f5f9' :
                                          receipt.status === 'PENDING' ? '#fef3c7' :
                                          receipt.status === 'PENDING_APPROVAL' ? '#ede9fe' :
                                          receipt.status === 'RECEIVED' ? '#dbeafe' :
                                          '#f1f5f9',
                                        color:
                                          receipt.status === 'CREATED' ? '#64748b' :
                                          receipt.status === 'PENDING' ? '#92400e' :
                                          receipt.status === 'PENDING_APPROVAL' ? '#7c3aed' :
                                          receipt.status === 'RECEIVED' ? '#1e40af' :
                                          '#64748b',
                                        display: { xs: 'none', md: 'inline-flex' },
                                        '& .MuiChip-label': { px: 1 }
                                      }}
                                    />
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
                        label="Warehouse"
                        value={formData.warehouseName || 'No Warehouse'}
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
                      {formData.woodFormat === 'PLANKS' ? 'Plank Measurements' : 'Sleeper Measurements'}
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
                            {!isReadOnly && (
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
                            )}
                            <BlobProvider
                              document={<ReceiptPDF
                                formData={formData}
                                measurements={measurements}
                                totalM3={totalM3}
                                totalPaidM3={totalPaidM3}
                                totalComplimentaryM3={totalComplimentaryM3}
                                changeHistory={changeHistory}
                                measurementUnit={measurementUnit}
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
                              disabled={!formData.receiptNumber || formData.status !== 'PENDING' || isReadOnly}
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
                              <TableCell align="center" sx={{ width: 70, fontWeight: 600, fontSize: '0.75rem', color: 'rgba(0, 0, 0, 0.7)', px: { xs: 1, sm: 2 } }}>Custom</TableCell>
                              <TableCell align="center" sx={{ width: 60, fontWeight: 600, fontSize: '0.75rem', color: 'rgba(0, 0, 0, 0.7)', px: { xs: 1, sm: 2 } }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                                  Free
                                  <Tooltip title="Mark as complimentary/free wood. Excluded from supplier payment but added to stock.">
                                    <InfoIcon sx={{ fontSize: '1rem', color: '#64748b', cursor: 'help' }} />
                                  </Tooltip>
                                </Box>
                              </TableCell>
                              <TableCell align="center" sx={{ width: { xs: 90, sm: 100 }, fontWeight: 600, fontSize: '0.75rem', color: 'rgba(0, 0, 0, 0.7)', px: { xs: 1, sm: 2 } }}>
                                {measurementUnit === 'imperial' ? 'Thick (in)' : 'Thick (cm)'}
                              </TableCell>
                              <TableCell align="center" sx={{ width: { xs: 90, sm: 100 }, fontWeight: 600, fontSize: '0.75rem', color: 'rgba(0, 0, 0, 0.7)', px: { xs: 1, sm: 2 } }}>
                                {measurementUnit === 'imperial' ? 'Width (in)' : 'Width (cm)'}
                              </TableCell>
                              <TableCell align="center" sx={{ width: { xs: 90, sm: 100 }, fontWeight: 600, fontSize: '0.75rem', color: 'rgba(0, 0, 0, 0.7)', px: { xs: 1, sm: 2 } }}>
                                {measurementUnit === 'imperial' ? 'Length (ft)' : 'Length (cm)'}
                              </TableCell>
                              <TableCell align="center" sx={{ width: { xs: 70, sm: 80 }, fontWeight: 600, fontSize: '0.75rem', color: 'rgba(0, 0, 0, 0.7)', px: { xs: 1, sm: 2 } }}>Qty</TableCell>
                              <TableCell align="center" sx={{ width: { xs: 90, sm: 110 }, fontWeight: 600, fontSize: '0.75rem', color: 'rgba(0, 0, 0, 0.7)', px: { xs: 1, sm: 2 } }}>Vol (m³)</TableCell>
                              <TableCell align="center" sx={{ width: { xs: 90, sm: 100 }, fontWeight: 600, fontSize: '0.75rem', color: 'rgba(0, 0, 0, 0.7)', px: { xs: 1, sm: 2 } }}>Actions</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {measurements.map((row, index) => (
                              <TableRow
                                key={row.id}
                                sx={{
                                  backgroundColor: row.isComplimentary
                                    ? alpha('#10b981', 0.05)
                                    : row.isCustom
                                      ? alpha('#f59e0b', 0.05)
                                      : 'transparent',
                                  '&:hover': {
                                    backgroundColor: row.isComplimentary
                                      ? alpha('#10b981', 0.08)
                                      : row.isCustom
                                        ? alpha('#f59e0b', 0.08)
                                        : alpha('#dc2626', 0.04),
                                  }
                                }}
                              >
                                <TableCell align="center" sx={{ fontSize: '0.875rem', px: { xs: 1, sm: 2 } }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                                    {String(index + 1).padStart(3, '0')}
                                    <Box
                                      component="span"
                                      sx={{
                                        fontSize: '0.65rem',
                                        fontWeight: 600,
                                        px: 0.5,
                                        py: 0.25,
                                        borderRadius: 0.5,
                                        backgroundColor: measurementUnit === 'imperial' ? '#dbeafe' : '#fef3c7',
                                        color: measurementUnit === 'imperial' ? '#1e40af' : '#92400e',
                                        border: measurementUnit === 'imperial' ? '1px solid #93c5fd' : '1px solid #fcd34d'
                                      }}
                                    >
                                      {measurementUnit === 'imperial' ? 'in/ft' : 'cm'}
                                    </Box>
                                  </Box>
                                </TableCell>
                                <TableCell align="center">
                                  <Checkbox
                                    checked={row.isCustom || false}
                                    onChange={(e) => handleCustomToggle(row.id, e.target.checked)}
                                    size="small"
                                    sx={{
                                      color: row.isCustom ? '#f59e0b' : 'rgba(0, 0, 0, 0.6)',
                                      '&.Mui-checked': { color: '#f59e0b' }
                                    }}
                                  />
                                </TableCell>
                                <TableCell align="center">
                                  <Checkbox
                                    checked={row.isComplimentary || false}
                                    onChange={(e) => handleMeasurementChange(row.id, 'isComplimentary', e.target.checked ? 'true' : 'false')}
                                    disabled={isReadOnly}
                                    size="small"
                                    sx={{
                                      color: '#10b981',
                                      '&.Mui-checked': { color: '#10b981' }
                                    }}
                                    title="Mark as complimentary/free wood"
                                  />
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
                                    disabled={isReadOnly}
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
                                    disabled={isReadOnly}
                                  />
                                </TableCell>
                                <TableCell>
                                  <CompactNumberTextField
                                    variant="outlined"
                                    size="small"
                                    type="number"
                                    value={row.length || ''}
                                    onChange={(e) => {
                                      handleMeasurementChange(row.id, 'length', e.target.value);
                                    }}
                                    onKeyDown={(e) => handleKeyDown(e, row.id, 'length')}
                                    onFocus={(e) => e.target.select()}
                                    inputProps={{
                                      step: 0.001,
                                      min: 0.5,
                                      max: measurementUnit === 'imperial' ? 99.999 : 999,
                                      'data-field': `length-${row.id}`
                                    }}
                                    error={row.length < 0.5 || (measurementUnit === 'imperial' ? row.length > 99.999 : row.length > 999)}
                                    disabled={isReadOnly}
                                  />
                                </TableCell>
                                <TableCell>
                                  <CompactNumberTextField
                                    variant="outlined"
                                    size="small"
                                    value={row.qty || ''}
                                    onChange={(e) => {
                                      if (e.target.value.length <= 4) handleMeasurementChange(row.id, 'qty', e.target.value);
                                    }}
                                    onKeyDown={(e) => handleKeyDown(e, row.id, 'qty')}
                                    inputProps={{
                                      step: 1,
                                      min: 1,
                                      max: 9999,
                                      maxLength: 4,
                                      'data-field': `qty-${row.id}`
                                    }}
                                    error={row.qty < 1}
                                    disabled={isReadOnly}
                                  />
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.875rem', px: { xs: 1, sm: 2 } }}>
                                  {row.m3.toFixed(4)}
                                </TableCell>
                                <TableCell align="center" sx={{ px: { xs: 0.5, sm: 2 } }}>
                                  {!isReadOnly && (
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
                                  )}
                                  {!isReadOnly && (
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
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>

                      {/* Add Sleeper/Plank button */}
                      {!isReadOnly && (
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
                            Add {formData.woodFormat === 'PLANKS' ? 'Plank' : 'Sleeper'}
                          </Button>
                        </Box>
                      )}
                    </>
                  )}
                </Box>

                <SleeperSizeSummary measurements={measurements} measurementUnit={measurementUnit} woodFormat={formData.woodFormat} />
                <ChangeHistoryDisplay changeHistory={changeHistory} />

                {/* Total Volume Display */}
                {measurements.length > 0 && (
                  <>
                    {/* Paid Wood Total - This is what supplier gets paid for */}
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
                          Paid Wood Total (Supplier Payment):
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 700, color: '#dc2626' }}>
                          {totalPaidM3.toFixed(4)} m³
                        </Typography>
                      </Box>
                      {formData.quantity && (
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                          <Typography variant="body2" sx={{ fontSize: '0.75rem', color: 'rgba(0, 0, 0, 0.6)' }}>
                            Expected: {formData.quantity} m³
                          </Typography>
                          <Typography variant="body2" sx={{ fontSize: '0.75rem', color: 'rgba(0, 0, 0, 0.6)' }}>
                            Variance: {(parseFloat(formData.quantity) - totalPaidM3).toFixed(4)} m³
                          </Typography>
                        </Box>
                      )}
                    </Box>

                    {/* Complimentary Wood Total - Only show if > 0 */}
                    {totalComplimentaryM3 > 0 && (
                      <Box
                        sx={{
                          mt: 2,
                          p: 2,
                          backgroundColor: alpha('#10b981', 0.1),
                          borderRadius: 2,
                          border: '2px solid',
                          borderColor: '#10b981',
                        }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: '0.875rem', color: '#10b981' }}>
                            Complimentary Wood (Bonus):
                          </Typography>
                          <Typography variant="h5" sx={{ fontWeight: 700, color: '#10b981' }}>
                            {totalComplimentaryM3.toFixed(4)} m³
                          </Typography>
                        </Box>
                        <Typography variant="caption" sx={{ fontSize: '0.7rem', color: '#64748b', mt: 0.5, display: 'block' }}>
                          Not included in supplier payment calculation
                        </Typography>
                      </Box>
                    )}
                  </>
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
                    {!isReadOnly && (
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
                    )}
                    <BlobProvider
                      document={<ReceiptPDF formData={formData} measurements={measurements} totalM3={totalM3} totalPaidM3={totalPaidM3} totalComplimentaryM3={totalComplimentaryM3} changeHistory={changeHistory} measurementUnit={measurementUnit} />}
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
                      {isAdmin ? 'Complete Receipt' : 'Submit for Approval'}
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
                              label={
                                entry.action === 'DRAFT_CREATED' ? 'Draft Created' :
                                entry.action === 'DRAFT_UPDATED' ? 'Draft Updated' :
                                entry.action === 'CREATE' ? 'Created' :
                                entry.action === 'UPDATE' ? 'Updated' :
                                entry.action === 'APPROVED' ? 'Approved' :
                                entry.action === 'COMPLETED' ? 'Completed' :
                                entry.action === 'SUBMIT' ? 'Submitted' :
                                entry.action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
                              }
                              size="small"
                              sx={{
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                height: '26px',
                                borderRadius: '6px',
                                bgcolor:
                                  entry.action === 'CREATE' || entry.action === 'DRAFT_CREATED'
                                    ? alpha('#10b981', 0.15)
                                    : entry.action === 'UPDATE' || entry.action === 'DRAFT_UPDATED'
                                    ? alpha('#3b82f6', 0.15)
                                    : entry.action === 'APPROVED'
                                    ? alpha('#8b5cf6', 0.15)
                                    : entry.action === 'COMPLETED'
                                    ? alpha('#059669', 0.15)
                                    : entry.action === 'SUBMIT'
                                    ? alpha('#f59e0b', 0.15)
                                    : alpha('#64748b', 0.15),
                                color:
                                  entry.action === 'CREATE' || entry.action === 'DRAFT_CREATED'
                                    ? '#059669'
                                    : entry.action === 'UPDATE' || entry.action === 'DRAFT_UPDATED'
                                    ? '#2563eb'
                                    : entry.action === 'APPROVED'
                                    ? '#7c3aed'
                                    : entry.action === 'COMPLETED'
                                    ? '#047857'
                                    : entry.action === 'SUBMIT'
                                    ? '#d97706'
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

        {/* History Dialog */}
        <Dialog
          open={historyDialogOpen}
          onClose={() => setHistoryDialogOpen(false)}
          maxWidth="lg"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
            }
          }}
        >
          <DialogTitle sx={{ fontSize: '1.125rem', fontWeight: 600, borderBottom: '1px solid rgba(0, 0, 0, 0.12)' }}>
            Completed Receipts History
          </DialogTitle>
          <DialogContent sx={{ p: 3 }}>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.813rem' }}>LOT Number</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.813rem' }}>Wood Type</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.813rem' }}>Supplier</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.813rem' }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.813rem' }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.813rem' }}>Volume (m³)</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.813rem' }}>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {completedReceipts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 4, fontSize: '0.875rem', color: 'rgba(0, 0, 0, 0.6)' }}>
                        No completed receipts found
                      </TableCell>
                    </TableRow>
                  ) : (
                    completedReceipts.map((receipt) => (
                      <TableRow key={receipt.id} hover>
                        <TableCell sx={{ fontSize: '0.875rem' }}>{receipt.lotNumber}</TableCell>
                        <TableCell sx={{ fontSize: '0.875rem' }}>
                          {(receipt as any).woodType?.name || receipt.wood_type?.name || 'N/A'}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.875rem' }}>{receipt.supplier}</TableCell>
                        <TableCell sx={{ fontSize: '0.875rem' }}>
                          {receipt.createdAt ? new Date(receipt.createdAt).toLocaleDateString() : '-'}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={receipt.status}
                            size="small"
                            sx={{
                              bgcolor: receipt.status === 'COMPLETED' ? alpha('#10b981', 0.1) : alpha('#ef4444', 0.1),
                              color: receipt.status === 'COMPLETED' ? '#059669' : '#dc2626',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.875rem' }}>
                          {receipt.actualVolumeM3 ? receipt.actualVolumeM3.toFixed(3) : '-'}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            onClick={() => handleViewCompletedReceipt(receipt)}
                            sx={{
                              textTransform: 'none',
                              fontSize: '0.813rem',
                              color: '#dc2626',
                            }}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </DialogContent>
          <DialogActions sx={{ p: 2, borderTop: '1px solid rgba(0, 0, 0, 0.12)' }}>
            <Button
              onClick={() => setHistoryDialogOpen(false)}
              sx={{
                color: 'rgba(0, 0, 0, 0.6)',
                fontSize: '0.875rem',
              }}
            >
              Close
            </Button>
          </DialogActions>
        </Dialog>

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
