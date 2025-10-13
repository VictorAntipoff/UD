import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Autocomplete,
  Grid,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  Table,
  TableHead,
  TableBody,
  TableCell,
  TableRow,
  TableContainer,
  Container
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PrintIcon from '@mui/icons-material/Print';
import ContentCutIcon from '@mui/icons-material/ContentCut';
import { styled, alpha } from '@mui/material/styles';
import api from '../../lib/api';
import { format } from 'date-fns';
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  pdf,
  Image
} from '@react-pdf/renderer';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '../../contexts/AuthContext';
import SleeperSelector from '../../components/SleeperSelector';

// Constants
const TIMEOUT_DURATION = 20000;
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

// Utility functions
const withTimeout = <T,>(promise: Promise<T>, timeout: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Request timed out')), timeout)
    )
  ]);
};

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const inchesToCm = (inches: number) => inches * 2.54;
const feetToMeters = (feet: number) => feet * 0.3048;
const cmToInches = (cm: number) => cm / 2.54;
const metersToFeet = (m: number) => m / 0.3048;

// Interfaces
interface WoodType {
  id: string;
  name: string;
  grade: string;
  density: number | null;
  images: string[];
  origin: string;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  description: string | null;
  price_range: {
    max: number;
    min: number;
  };
  sustainability: {
    growth_rate: string;
    certification: string[];
    environmental_impact: string | null;
  };
  technical_data: {
    shrinkage: number | null;
    janka_hardness: number | null;
    moisture_content: number | null;
  };
  characteristics: {
    color: string | null;
    grain: string | null;
    durability: string | null;
    workability: string | null;
    applications: string[];
  };
  alternative_names: string[];
}

interface SleeperSize {
  id: string;
  sequence: number;
  width: number;
  height: number;
  length: number;
  quantity: number;
}

interface PlankSize {
  id: string;
  sequence: number;
  parentSequence: number;
  width: number;
  height: number;
  length: number;
  quantity: number;
}

interface SavedOperation {
  id: string;
  serial_number: string;
  wood_type_id: string;
  lot_number?: string | null;
  sleeper_number?: number | null;
  wood_type?: WoodType;
  start_time: string | null;
  sleeper_sizes: SleeperSize[];
  plank_sizes: PlankSize[];
  status: 'draft' | 'in_progress' | 'completed';
  waste_percentage: number | null;
  created_at: string;
  updated_at: string;
  notes?: string;
}

type OperationStatus = 'draft' | 'in_progress' | 'completed';

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

// Default values
const defaultSleeperSize: SleeperSize = {
  id: crypto.randomUUID(),
  sequence: 1,
  width: 0,
  height: 0,
  length: 0,
  quantity: 1
};

const defaultPlankSize: PlankSize = {
  id: crypto.randomUUID(),
  sequence: 1,
  parentSequence: 1,
  width: 0,
  height: 0,
  length: 0,
  quantity: 1
};

// PDF Styles
const pdfStyles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Helvetica',
    fontSize: 8,
    color: '#1e293b'
  },
  logo: {
    width: 100,
    marginBottom: 10
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#dc2626',
    marginBottom: 2
  },
  subtitle: {
    fontSize: 8,
    color: '#64748b',
    marginBottom: 10
  },
  metadata: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottom: 1,
    borderColor: '#e2e8f0',
    paddingBottom: 8,
    marginBottom: 15
  },
  metadataText: {
    fontSize: 7,
    color: '#64748b'
  },
  section: {
    marginBottom: 15,
    border: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4
  },
  sectionHeader: {
    backgroundColor: '#f1f5f9',
    padding: 6,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    borderBottom: 1,
    borderColor: '#e2e8f0'
  },
  sectionTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#0f172a'
  },
  contentGrid: {
    padding: 8
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 4
  },
  label: {
    width: '30%',
    fontSize: 7,
    color: '#64748b'
  },
  value: {
    flex: 1,
    fontSize: 7,
    color: '#0f172a'
  },
  table: {
    padding: 6
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    padding: 4,
    marginBottom: 2
  },
  tableHeaderCell: {
    fontSize: 7,
    fontWeight: 'bold',
    color: '#64748b'
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: 1,
    borderColor: '#f1f5f9',
    padding: 4
  },
  tableCell: {
    fontSize: 7,
    color: '#334155'
  },
  resultSection: {
    backgroundColor: '#0f172a',
    padding: 10,
    borderRadius: 4,
    marginTop: 20
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4
  },
  resultLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#e2e8f0'
  },
  resultValue: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#ffffff'
  }
});

// Helper Components
const DimensionInput = ({
  label,
  value,
  onChange,
  unit,
  convertedValue,
  disabled = false
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  unit: string;
  convertedValue: string;
  disabled?: boolean;
}) => (
  <TextField
    fullWidth
    type="number"
    size="small"
    label={label}
    value={value || ''}
    onChange={(e) => onChange(Number(e.target.value))}
    disabled={disabled}
    InputProps={{
      endAdornment: (
        <Box
          component="span"
          sx={{
            display: 'flex',
            alignItems: 'center',
            color: 'text.secondary',
            fontSize: '0.75rem',
            whiteSpace: 'nowrap',
            userSelect: 'none'
          }}
        >
          {unit}
          <Typography
            variant="caption"
            sx={{
              ml: 0.5,
              color: 'text.disabled',
              fontSize: '0.65rem'
            }}
          >
            ({convertedValue}cm)
          </Typography>
        </Box>
      )
    }}
    sx={textFieldSx}
  />
);

const QuantityInput = ({
  value,
  onChange,
  disabled = false
}: {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) => (
  <TextField
    fullWidth
    type="number"
    size="small"
    label="Quantity"
    value={value}
    onChange={(e) => onChange(Math.max(1, Number(e.target.value)))}
    disabled={disabled}
    InputProps={{
      inputProps: { min: 1 },
      endAdornment: (
        <Box
          component="span"
          sx={{
            display: 'flex',
            alignItems: 'center',
            color: 'text.secondary',
            fontSize: '0.75rem',
            whiteSpace: 'nowrap',
            userSelect: 'none'
          }}
        >
          pcs
        </Box>
      )
    }}
    sx={textFieldSx}
  />
);

// Helper functions
const generateSizeKey = (size: SleeperSize | PlankSize) => {
  return `${size.height}-${size.width}-${size.length}`;
};

const combineMatchingSizes = (sizes: (SleeperSize | PlankSize)[]) => {
  const sizeMap = new Map<string, (SleeperSize | PlankSize) & { totalQuantity: number }>();

  sizes.forEach(size => {
    const key = generateSizeKey(size);
    if (sizeMap.has(key)) {
      const existing = sizeMap.get(key)!;
      existing.totalQuantity += size.quantity;
    } else {
      sizeMap.set(key, { ...size, totalQuantity: size.quantity });
    }
  });

  return Array.from(sizeMap.values());
};

const formatDimension = (value: number, unit: string) => {
  if (unit === 'm') {
    return `${Number(value).toFixed(2)}${unit}`;
  }
  if (unit === 'cm') {
    return `${Number(value).toFixed(1)}${unit}`;
  }
  return `${value}${unit}`;
};

const formatSize = (size: SleeperSize | PlankSize, parentLength?: number) => {
  const height = size.height || 0;
  const width = size.width || 0;
  const length = parentLength || size.length || 0;

  return `${formatDimension(height, 'cm')} (${cmToInches(height).toFixed(1)}") ×
          ${formatDimension(width, 'cm')} (${cmToInches(width).toFixed(1)}") ×
          ${formatDimension(length, 'm')} (${metersToFeet(length).toFixed(1)}')`;
};

const calculateDuration = (operation: SavedOperation) => {
  const startTime = new Date(operation.start_time || '');
  const endTime = new Date(operation.updated_at);
  const duration = endTime.getTime() - startTime.getTime();
  const hours = Math.floor(duration / (1000 * 60 * 60));
  const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
};

const calculateOperationVolumes = (operation: SavedOperation) => {
  const sleeperVolume = operation.sleeper_sizes.reduce((total, size) => {
    const width = (size.width || 0) / 100;
    const height = (size.height || 0) / 100;
    const length = (size.length || 0);
    const quantity = size.quantity || 1;
    return total + (width * height * length * quantity);
  }, 0).toFixed(3);

  const plankVolume = operation.plank_sizes.reduce((total, size) => {
    const width = (size.width || 0) / 100;
    const height = (size.height || 0) / 100;
    const length = (size.length || 0);
    const quantity = size.quantity || 1;
    return total + (width * height * length * quantity);
  }, 0).toFixed(3);

  return { sleeperVolume, plankVolume };
};

const getStatusColor = (status: string): "default" | "primary" | "warning" | "success" => {
  switch (status) {
    case 'draft':
      return 'default';
    case 'in_progress':
      return 'warning';
    case 'completed':
      return 'success';
    default:
      return 'default';
  }
};

// Summary Section Table Component
const SummarySectionTable = ({
  title,
  items,
  type,
  sleeperSizes,
  selectedSleeperNumber
}: {
  title: string;
  items: (SleeperSize | PlankSize)[];
  type: 'sleeper' | 'plank';
  sleeperSizes: SleeperSize[];
  selectedSleeperNumber?: number | null;
}) => {
  const groupedItems = type === 'plank'
    ? items.reduce((groups, item) => {
        const plank = item as PlankSize;
        const key = plank.parentSequence;
        if (!groups[key]) {
          groups[key] = [];
        }
        groups[key].push(plank);
        return groups;
      }, {} as Record<number, PlankSize[]>)
    : null;

  const totalVolume = items.reduce((total, item) => {
    if (type === 'plank') {
      const plank = item as PlankSize;
      const parentSleeper = sleeperSizes.find(s => s.sequence === plank.parentSequence);
      if (!parentSleeper) return total;

      const width = (plank.width || 0) / 100;
      const height = (plank.height || 0) / 100;
      const length = parentSleeper.length;
      const quantity = plank.quantity || 1;
      return total + (width * height * length * quantity);
    } else {
      const sleeper = item as SleeperSize;
      const width = (sleeper.width || 0) / 100;
      const height = (sleeper.height || 0) / 100;
      const length = sleeper.length || 0;
      const quantity = sleeper.quantity || 1;
      return total + (width * height * length * quantity);
    }
  }, 0);

  return (
    <Box>
      <Typography
        variant="subtitle1"
        sx={{
          mb: 2,
          fontWeight: 600,
          color: '#1e293b',
          fontSize: '0.95rem'
        }}
      >
        {title} - Total Volume: {totalVolume.toFixed(3)} m³
      </Typography>
      {type === 'plank' && groupedItems ? (
        Object.entries(groupedItems).map(([sleeperSeq, planks]) => {
          const parentSleeper = sleeperSizes.find(s => s.sequence === Number(sleeperSeq));
          return (
            <Box key={sleeperSeq} sx={{ mb: 3 }}>
              <Typography
                variant="subtitle2"
                sx={{
                  mb: 1.5,
                  color: '#dc2626',
                  fontWeight: 600,
                  fontSize: '0.875rem'
                }}
              >
                From Sleeper #{selectedSleeperNumber || sleeperSeq}
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f8fafc' }}>
                      <TableCell sx={{ fontWeight: 600, color: '#64748b', fontSize: '0.75rem' }}>Plank No.</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#64748b', fontSize: '0.75rem' }}>Dimensions (Metric / Imperial)</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#64748b', fontSize: '0.75rem' }}>Quantity</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#64748b', fontSize: '0.75rem' }}>Volume</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {planks.map((plank, index) => {
                      const volumeM3 = parentSleeper ? (
                        (plank.width / 100) *
                        (plank.height / 100) *
                        parentSleeper.length *
                        plank.quantity
                      ) : 0;

                      const plankLabel = `SL${String(selectedSleeperNumber || sleeperSeq).padStart(3, '0')}-${String(index + 1).padStart(2, '0')}`;

                      return (
                        <TableRow
                          key={plank.id}
                          sx={{
                            '&:hover': { bgcolor: '#f8fafc' },
                            transition: 'background-color 0.2s ease',
                          }}
                        >
                          <TableCell sx={{ fontSize: '0.875rem', fontWeight: 600 }}>{plankLabel}</TableCell>
                          <TableCell sx={{ fontSize: '0.875rem' }}>{formatSize(plank, parentSleeper?.length)}</TableCell>
                          <TableCell sx={{ fontSize: '0.875rem' }}>{plank.quantity}</TableCell>
                          <TableCell sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#dc2626' }}>{volumeM3.toFixed(3)} m³</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          );
        })
      ) : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#f8fafc' }}>
                <TableCell sx={{ fontWeight: 600, color: '#64748b', fontSize: '0.75rem' }}>No.</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#64748b', fontSize: '0.75rem' }}>Dimensions (Metric / Imperial)</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#64748b', fontSize: '0.75rem' }}>Quantity</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#64748b', fontSize: '0.75rem' }}>Volume</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item) => {
                const volumeM3 = (
                  (item.width / 100) *
                  (item.height / 100) *
                  item.length *
                  item.quantity
                );

                return (
                  <TableRow
                    key={item.id}
                    sx={{
                      '&:hover': { bgcolor: '#f8fafc' },
                      transition: 'background-color 0.2s ease',
                    }}
                  >
                    <TableCell sx={{ fontSize: '0.875rem' }}>{item.sequence}</TableCell>
                    <TableCell sx={{ fontSize: '0.875rem' }}>{formatSize(item)}</TableCell>
                    <TableCell sx={{ fontSize: '0.875rem' }}>{item.quantity}</TableCell>
                    <TableCell sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#dc2626' }}>{volumeM3.toFixed(3)} m³</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

// PDF Report Components
const OperationReport = ({ operation }: { operation: SavedOperation }) => {
  const { sleeperVolume, plankVolume } = calculateOperationVolumes(operation);
  const wastePercentage = ((parseFloat(sleeperVolume) - parseFloat(plankVolume)) / parseFloat(sleeperVolume)) * 100;

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <Image src="/logo.png" style={pdfStyles.logo} />
        <Text style={pdfStyles.title}>Wood Slicer Report</Text>
        <Text style={pdfStyles.subtitle}>Professional Wood Solutions</Text>

        <View style={pdfStyles.metadata}>
          <Text style={pdfStyles.metadataText}>Generated: {format(new Date(), 'PPpp')}</Text>
          <Text style={pdfStyles.metadataText}>Operation #{operation.serial_number}</Text>
        </View>

        <View style={pdfStyles.section}>
          <View style={pdfStyles.sectionHeader}>
            <Text style={pdfStyles.sectionTitle}>WOOD SPECIFICATIONS</Text>
          </View>

          <View style={pdfStyles.contentGrid}>
            <View style={pdfStyles.infoRow}>
              <Text style={pdfStyles.label}>Wood Type:</Text>
              <Text style={pdfStyles.value}>{operation.wood_type?.name}</Text>
            </View>
            <View style={pdfStyles.infoRow}>
              <Text style={pdfStyles.label}>Grade:</Text>
              <Text style={pdfStyles.value}>{operation.wood_type?.grade}</Text>
            </View>
            <View style={pdfStyles.infoRow}>
              <Text style={pdfStyles.label}>Operation Time:</Text>
              <Text style={pdfStyles.value}>{calculateDuration(operation)}</Text>
            </View>
          </View>
        </View>

        <View style={pdfStyles.section}>
          <View style={pdfStyles.sectionHeader}>
            <Text style={pdfStyles.sectionTitle}>SLEEPER DETAILS</Text>
          </View>

          <View style={pdfStyles.table}>
            <View style={pdfStyles.tableHeader}>
              <Text style={[pdfStyles.tableHeaderCell, { flex: 1 }]}>Height</Text>
              <Text style={[pdfStyles.tableHeaderCell, { flex: 1 }]}>Width</Text>
              <Text style={[pdfStyles.tableHeaderCell, { flex: 1 }]}>Length</Text>
              <Text style={[pdfStyles.tableHeaderCell, { flex: 0.5, textAlign: 'right' }]}>Qty</Text>
            </View>
            {operation.sleeper_sizes.map((size, index) => (
              <View key={index} style={pdfStyles.tableRow}>
                <Text style={[pdfStyles.tableCell, { flex: 1 }]}>{cmToInches(size.height).toFixed(2)}"</Text>
                <Text style={[pdfStyles.tableCell, { flex: 1 }]}>{cmToInches(size.width).toFixed(2)}"</Text>
                <Text style={[pdfStyles.tableCell, { flex: 1 }]}>{metersToFeet(size.length).toFixed(2)}'</Text>
                <Text style={[pdfStyles.tableCell, { flex: 0.5, textAlign: 'right' }]}>{size.quantity}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={pdfStyles.section}>
          <View style={pdfStyles.sectionHeader}>
            <Text style={pdfStyles.sectionTitle}>PLANK DETAILS</Text>
          </View>

          <View style={pdfStyles.table}>
            <View style={pdfStyles.tableHeader}>
              <Text style={[pdfStyles.tableHeaderCell, { flex: 1 }]}>Height</Text>
              <Text style={[pdfStyles.tableHeaderCell, { flex: 1 }]}>Width</Text>
              <Text style={[pdfStyles.tableHeaderCell, { flex: 1 }]}>Length</Text>
              <Text style={[pdfStyles.tableHeaderCell, { flex: 0.5, textAlign: 'right' }]}>Qty</Text>
            </View>
            {operation.plank_sizes.map((size, index) => (
              <View key={index} style={pdfStyles.tableRow}>
                <Text style={[pdfStyles.tableCell, { flex: 1 }]}>{cmToInches(size.height).toFixed(2)}"</Text>
                <Text style={[pdfStyles.tableCell, { flex: 1 }]}>{cmToInches(size.width).toFixed(2)}"</Text>
                <Text style={[pdfStyles.tableCell, { flex: 1 }]}>{metersToFeet(size.length).toFixed(2)}'</Text>
                <Text style={[pdfStyles.tableCell, { flex: 0.5, textAlign: 'right' }]}>{size.quantity}</Text>
              </View>
            ))}
          </View>
        </View>

        {operation.notes && (
          <View style={[pdfStyles.section, { marginBottom: 20 }]}>
            <View style={pdfStyles.sectionHeader}>
              <Text style={pdfStyles.sectionTitle}>REMARKS</Text>
            </View>
            <View style={[pdfStyles.contentGrid, { padding: 10 }]}>
              <Text style={[pdfStyles.value, { lineHeight: 1.5 }]}>{operation.notes}</Text>
            </View>
          </View>
        )}

        <View style={pdfStyles.resultSection}>
          <View style={pdfStyles.resultRow}>
            <Text style={pdfStyles.resultLabel}>Total Volume:</Text>
            <Text style={pdfStyles.resultValue}>{sleeperVolume} m³</Text>
          </View>
          <View style={pdfStyles.resultRow}>
            <Text style={pdfStyles.resultLabel}>Plank Volume:</Text>
            <Text style={pdfStyles.resultValue}>{plankVolume} m³</Text>
          </View>
          <View style={pdfStyles.resultRow}>
            <Text style={pdfStyles.resultLabel}>Waste Percentage:</Text>
            <Text style={pdfStyles.resultValue}>{wastePercentage.toFixed(2)}%</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};

const CombinedOperationReport = ({ operations }: { operations: SavedOperation[] }) => {
  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <Image src="/logo.png" style={pdfStyles.logo} />
        <Text style={pdfStyles.title}>Combined Wood Slicing Report</Text>
        <Text style={pdfStyles.subtitle}>
          {format(new Date(), 'PPpp')}
        </Text>

        <View style={[pdfStyles.section, { marginTop: 20 }]}>
          <View style={pdfStyles.sectionHeader}>
            <Text style={pdfStyles.sectionTitle}>OPERATIONS SUMMARY</Text>
          </View>
          <View style={pdfStyles.table}>
            <View style={pdfStyles.tableHeader}>
              <Text style={[pdfStyles.tableHeaderCell, { flex: 1 }]}>Serial No.</Text>
              <Text style={[pdfStyles.tableHeaderCell, { flex: 1 }]}>Wood Type</Text>
              <Text style={[pdfStyles.tableHeaderCell, { flex: 1 }]}>Status</Text>
              <Text style={[pdfStyles.tableHeaderCell, { flex: 1 }]}>Waste %</Text>
            </View>
            {operations.map((op, index) => (
              <View key={index} style={pdfStyles.tableRow}>
                <Text style={[pdfStyles.tableCell, { flex: 1 }]}>{op.serial_number}</Text>
                <Text style={[pdfStyles.tableCell, { flex: 1 }]}>{op.wood_type?.name}</Text>
                <Text style={[pdfStyles.tableCell, { flex: 1 }]}>{op.status}</Text>
                <Text style={[pdfStyles.tableCell, { flex: 1 }]}>{op.waste_percentage?.toFixed(2)}%</Text>
              </View>
            ))}
          </View>
        </View>

        {operations.map((operation, index) => (
          <View key={index} wrap={false} style={{ marginTop: 20, borderTop: 1, borderColor: '#e2e8f0', paddingTop: 10 }}>
            <Text style={[pdfStyles.sectionTitle, { marginBottom: 10 }]}>
              Operation #{operation.serial_number}
            </Text>

            <View style={pdfStyles.contentGrid}>
              <View style={pdfStyles.infoRow}>
                <Text style={pdfStyles.label}>Wood Type:</Text>
                <Text style={pdfStyles.value}>
                  {operation.wood_type?.name} (Grade {operation.wood_type?.grade})
                </Text>
              </View>
              <View style={pdfStyles.infoRow}>
                <Text style={pdfStyles.label}>Status:</Text>
                <Text style={pdfStyles.value}>{operation.status}</Text>
              </View>
              <View style={pdfStyles.infoRow}>
                <Text style={pdfStyles.label}>Waste:</Text>
                <Text style={pdfStyles.value}>{operation.waste_percentage?.toFixed(2)}%</Text>
              </View>
            </View>

            {operation.notes && (
              <View style={[pdfStyles.section, { marginTop: 10 }]}>
                <View style={pdfStyles.sectionHeader}>
                  <Text style={pdfStyles.sectionTitle}>REMARKS</Text>
                </View>
                <View style={[pdfStyles.contentGrid, { padding: 10 }]}>
                  <Text style={[pdfStyles.value, { lineHeight: 1.5 }]}>{operation.notes}</Text>
                </View>
              </View>
            )}
          </View>
        ))}
      </Page>
    </Document>
  );
};

const generateCombinedReport = async (operations: SavedOperation[]) => {
  try {
    const blob = await pdf(<CombinedOperationReport operations={operations} />).toBlob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `combined-operations-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error generating combined report:', error);
    throw new Error('Failed to generate combined report');
  }
};

// Paste Dialog Component
const PasteSleeperDialog = ({
  open,
  onClose,
  onPaste
}: {
  open: boolean;
  onClose: () => void;
  onPaste: (sleepers: SleeperSize[]) => void;
}) => {
  const [pasteValue, setPasteValue] = useState('');

  const parseExcelData = (text: string): SleeperSize[] => {
    const rows = text.split('\n').filter(row => row.trim());
    return rows.map((row, index) => {
      const cells = row.split('\t');
      return {
        id: uuidv4(),
        sequence: index + 1,
        height: inchesToCm(parseFloat(cells[0]) || 0),
        width: inchesToCm(parseFloat(cells[1]) || 0),
        length: feetToMeters(parseFloat(cells[2]) || 0),
        quantity: parseInt(cells[3]) || 1
      };
    });
  };

  const handlePaste = () => {
    try {
      const sleepers = parseExcelData(pasteValue);
      onPaste(sleepers);
      onClose();
      setPasteValue('');
    } catch (error) {
      console.error('Error parsing paste data:', error);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3 }
      }}
    >
      <DialogTitle
        sx={{
          fontSize: '1.25rem',
          fontWeight: 700,
          color: '#1e293b',
          borderBottom: '1px solid #e2e8f0',
          pb: 2,
        }}
      >
        Paste Sleeper Data from Excel
      </DialogTitle>
      <DialogContent sx={{ py: 3 }}>
        <Box sx={{ mt: 1 }}>
          <Typography
            variant="body2"
            sx={{
              mb: 2,
              color: '#64748b',
              fontSize: '0.875rem'
            }}
          >
            Format: Height(inches) Width(inches) Length(feet) Quantity
          </Typography>
          <Typography
            variant="caption"
            sx={{
              mb: 2,
              display: 'block',
              color: '#94a3b8',
              fontSize: '0.75rem'
            }}
          >
            Example:<br />
            2 8 6 1<br />
            2 8 6 2<br />
          </Typography>
          <TextField
            multiline
            rows={6}
            fullWidth
            placeholder="Paste your Excel data here..."
            value={pasteValue}
            onChange={(e) => setPasteValue(e.target.value)}
            sx={textFieldSx}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, pt: 0 }}>
        <Button
          onClick={onClose}
          sx={{
            textTransform: 'none',
            color: '#64748b',
            '&:hover': { bgcolor: alpha('#dc2626', 0.08) }
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handlePaste}
          variant="contained"
          sx={{
            textTransform: 'none',
            bgcolor: '#dc2626',
            '&:hover': { bgcolor: '#b91c1c' },
            fontWeight: 600
          }}
        >
          Import Sleepers
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Main Component
const WoodSlicer = () => {
  // States
  const [woodTypes, setWoodTypes] = useState<WoodType[]>([]);
  const [selectedWoodType, setSelectedWoodType] = useState<WoodType | null>(null);
  const [lotNumber, setLotNumber] = useState<string>('');
  const [availableLotNumbers, setAvailableLotNumbers] = useState<string[]>([]);
  const [availableReceipts, setAvailableReceipts] = useState<any[]>([]);
  const [supplierName, setSupplierName] = useState<string>('');
  const [lotDetails, setLotDetails] = useState<any>(null);
  const [sleeperSizes, setSleeperSizes] = useState<SleeperSize[]>([]);
  const [plankSizes, setPlankSizes] = useState<PlankSize[]>([]);
  const [serialNumber, setSerialNumber] = useState('');
  const [startTime, setStartTime] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [operationId, setOperationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [savedOperations, setSavedOperations] = useState<SavedOperation[]>([]);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [showCompletedDialog, setShowCompletedDialog] = useState(false);
  const [selectedOperation, setSelectedOperation] = useState<SavedOperation | null>(null);
  const [showPasteDialog, setShowPasteDialog] = useState(false);
  const [operationNotes, setOperationNotes] = useState<string>('');

  // New sleeper selection states
  const [availableSleepers, setAvailableSleepers] = useState<any[]>([]);
  const [selectedSleeperNumber, setSelectedSleeperNumber] = useState<number | null>(null);
  const [usedSleeperNumbers, setUsedSleeperNumbers] = useState<Set<number>>(new Set());
  const [showSleeperSelector, setShowSleeperSelector] = useState(false);
  const [lotOperations, setLotOperations] = useState<SavedOperation[]>([]); // All operations for current LOT

  // Get user role from AuthContext
  const { user } = useAuth();
  const userRole = user?.role || 'FACTORY';
  const canEdit = userRole === 'SUPERVISOR' || userRole === 'ADMIN';
  const isAdmin = userRole === 'ADMIN';

  // Auto-save states
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // LOT check states

  // Generate serial number
  const generateSerialNumber = (): string => {
    return `WS-${Date.now().toString(36).toUpperCase()}`;
  };

  // Check connection
  const checkConnection = async () => {
    try {
      setIsLoading(true);
      await api.get('/factory/wood-types');
      setConnectionError(null);
      return true;
    } catch (error) {
      console.error('API connection error:', error);
      setConnectionError('Unable to connect to the database. Please check your connection.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch wood types
  const fetchWoodTypes = async () => {
    const MAX_RETRIES = 3;
    let attempt = 0;

    while (attempt < MAX_RETRIES) {
      try {
        setIsLoading(true);
        const response = await api.get('/factory/wood-types');
        setWoodTypes(response.data || []);
        setIsLoading(false);
        return;
      } catch (error: any) {
        attempt++;
        console.error(`Fetch attempt ${attempt} failed:`, error);

        if (attempt === MAX_RETRIES) {
          setError('Failed to load wood types. Please refresh the page.');
          setIsLoading(false);
        } else {
          await wait(Math.pow(2, attempt) * 1000);
        }
      }
    }
  };

  // Fetch lot numbers
  const fetchLotNumbers = async () => {
    try {
      const response = await api.get('/management/wood-receipts');
      const receipts = response.data || [];

      // Enrich receipts with draft and history data
      const enrichedReceipts = await Promise.all(
        receipts.map(async (receipt: any) => {
          let draftData = null;
          let historyData = [];
          let actualVolumeM3 = receipt.actualVolumeM3 || 0;
          let actualPieces = receipt.actualPieces || 0;
          let startDate = null;
          let completionDate = null;
          let workingUser = null;

          try {
            // Fetch draft data
            const draftResponse = await api.get(`/factory/drafts?receipt_id=${receipt.lotNumber}`);
            if (draftResponse.data && draftResponse.data.length > 0) {
              draftData = draftResponse.data[0];

              // Calculate totals from draft measurements
              if (draftData.measurements && Array.isArray(draftData.measurements)) {
                actualPieces = draftData.measurements.length;
                actualVolumeM3 = draftData.measurements.reduce((sum: number, m: any) => {
                  const thickness = parseFloat(m.thickness) || 0;
                  const width = parseFloat(m.width) || 0;
                  const length = parseFloat(m.length) || 0;
                  const qty = parseInt(m.qty) || 1;
                  return sum + ((thickness / 100) * (width / 100) * (length / 100) * qty);
                }, 0);
              }
            }
          } catch (err) {
            // Silently handle - no draft exists
          }

          try {
            // Fetch history data
            const historyResponse = await api.get(`/factory/receipt-history?receipt_id=${receipt.lotNumber}`);
            historyData = historyResponse.data || [];

            // Find start date (first CREATE or UPDATE action)
            const startEntry = historyData.find((h: any) => h.action === 'CREATE' || h.action === 'UPDATE');
            if (startEntry) {
              startDate = new Date(startEntry.timestamp);
              workingUser = startEntry.userName;
            }

            // Find completion date (SUBMIT action)
            const completeEntry = historyData.find((h: any) => h.action === 'SUBMIT');
            if (completeEntry) {
              completionDate = new Date(completeEntry.timestamp);
            }

            // If not completed, find the most recent user
            if (!completionDate && historyData.length > 0) {
              const sortedHistory = [...historyData].sort((a: any, b: any) =>
                new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
              );
              workingUser = sortedHistory[0].userName;
            }
          } catch (err) {
            // Silently handle - no history exists
          }

          return {
            ...receipt,
            draftData,
            historyData,
            actualVolumeM3,
            actualPieces,
            startDate,
            completionDate,
            workingUser,
            isDraft: !!draftData && !completionDate,
            isCompleted: !!completionDate
          };
        })
      );

      setAvailableReceipts(enrichedReceipts);

      const lots = enrichedReceipts
        .map((r: any) => r.lotNumber)
        .filter((lot: string | null) => lot != null && lot !== '')
        .filter((lot: string, index: number, self: string[]) => self.indexOf(lot) === index)
        .sort();
      setAvailableLotNumbers(lots);
    } catch (error) {
      console.error('Error fetching lot numbers:', error);
    }
  };

  // Fetch lot details
  const fetchLotDetails = async (lot: string) => {
    if (!lot) {
      setSupplierName('');
      setLotDetails(null);
      setSelectedWoodType(null);
      return;
    }

    try {
      const response = await api.get('/management/wood-receipts');
      const receipts = response.data || [];
      const receipt = receipts.find((r: any) => r.lotNumber === lot);

      if (receipt) {
        setLotDetails(receipt);
        setSupplierName(receipt.supplier || '');

        if (receipt.woodType) {
          setSelectedWoodType(receipt.woodType);
        } else if (receipt.woodTypeId) {
          const woodTypeResponse = await api.get(`/factory/wood-types`);
          const woodType = woodTypeResponse.data.find((wt: WoodType) => wt.id === receipt.woodTypeId);
          if (woodType) {
            setSelectedWoodType(woodType);
          }
        }

        // Fetch sleeper measurements from draft
        await fetchSleeperMeasurements(lot);

        // Fetch used sleeper numbers from existing operations
        await fetchUsedSleeperNumbers(lot);
      } else {
        setSupplierName('');
        setLotDetails(null);
        setSelectedWoodType(null);
        setAvailableSleepers([]);
        setUsedSleeperNumbers(new Set());
      }
    } catch (error) {
      console.error('Error fetching LOT details:', error);
      setError('Failed to load LOT details');
    }
  };

  // Fetch sleeper measurements from draft
  const fetchSleeperMeasurements = async (lotNumber: string) => {
    try {
      const response = await api.get(`/factory/drafts?receipt_id=${lotNumber}`);
      if (response.data && response.data.length > 0) {
        const draft = response.data[0];
        if (draft.measurements && Array.isArray(draft.measurements)) {
          setAvailableSleepers(draft.measurements);
          setShowSleeperSelector(true);
        } else {
          setAvailableSleepers([]);
          setShowSleeperSelector(false);
        }
      } else {
        setAvailableSleepers([]);
        setShowSleeperSelector(false);
      }
    } catch (error) {
      console.error('Error fetching sleeper measurements:', error);
      setAvailableSleepers([]);
      setShowSleeperSelector(false);
    }
  };

  // Fetch used sleeper numbers from existing operations
  const fetchUsedSleeperNumbers = async (lotNumber: string) => {
    try {
      const response = await api.get(`/factory/operations?_t=${Date.now()}`);
      const operations = response.data || [];
      const usedNumbers = new Set<number>();
      const lotOps: SavedOperation[] = [];

      console.log('Fetching used sleeper numbers for LOT:', lotNumber);
      console.log('Total operations:', operations.length);
      console.log('First operation sample:', JSON.stringify(operations[0], null, 2));

      operations.forEach((op: SavedOperation) => {
        console.log('Operation:', op.serial_number, 'LOT:', op.lot_number, 'Sleeper#:', op.sleeper_number);
        if (op.lot_number === lotNumber) {
          lotOps.push(op); // Store all operations for this LOT
          if (op.sleeper_number) {
            console.log('Found operation for sleeper:', op.sleeper_number, 'Op ID:', op.id);
            usedNumbers.add(op.sleeper_number);
          }
        }
      });

      console.log('Used sleeper numbers:', Array.from(usedNumbers));
      console.log('LOT operations:', lotOps.length);
      setUsedSleeperNumbers(usedNumbers);
      setLotOperations(lotOps); // Store for volume calculation
    } catch (error) {
      console.error('Error fetching used sleeper numbers:', error);
      setUsedSleeperNumbers(new Set());
      setLotOperations([]);
    }
  };

  // Handle sleeper selection
  const handleSleeperSelect = async (sleeper: any) => {
    const sleeperNumber = availableSleepers.indexOf(sleeper) + 1;
    setSelectedSleeperNumber(sleeperNumber);

    console.log('Selected sleeper data:', sleeper);

    // Check if this sleeper has already been sliced (has an existing operation)
    if (usedSleeperNumbers.has(sleeperNumber) && lotNumber) {
      console.log('Sleeper already sliced, loading existing operation...');

      // Find the existing operation for this sleeper
      try {
        const response = await api.get('/factory/operations');
        const operations = response.data || [];
        const existingOperation = operations.find(
          (op: any) => op.lot_number === lotNumber && op.sleeper_number === sleeperNumber
        );

        if (existingOperation) {
          console.log('Found existing operation:', existingOperation);

          // Load the existing operation data
          setOperationId(existingOperation.id);
          setSerialNumber(existingOperation.serial_number);
          setSleeperSizes(existingOperation.sleeper_sizes || []);
          setPlankSizes(existingOperation.plank_sizes || []);
          setOperationNotes(existingOperation.notes || '');
          setStartTime(existingOperation.start_time);

          console.log('Loaded operation with', existingOperation.plank_sizes?.length || 0, 'planks');
          return;
        }
      } catch (error) {
        console.error('Error loading existing operation:', error);
      }
    }

    // If no existing operation, set up a new one
    // Convert dimensions from inches/feet (stored in receipt) to cm/meters (stored in operations)
    // Receipt stores: width/thickness in inches, length in feet
    // Operations store: width/height in cm, length in meters
    const widthInCm = inchesToCm(sleeper.width || 0);
    const heightInCm = inchesToCm(sleeper.thickness || sleeper.height || 0);
    const lengthInMeters = feetToMeters(sleeper.length || 0);

    // Auto-fill sleeper dimensions
    setSleeperSizes([{
      id: crypto.randomUUID(),
      sequence: 1,
      width: widthInCm,
      height: heightInCm,
      length: lengthInMeters,
      quantity: 1
    }]);

    // Reset planks - start with empty array, let user add planks manually
    setPlankSizes([]);
  };

  // useEffect
  useEffect(() => {
    fetchWoodTypes();
    fetchLotNumbers();
    checkConnection();
    if (!operationId) {
      setSerialNumber(generateSerialNumber());
    }
  }, [operationId]);

  useEffect(() => {
    if (showCompletedDialog) {
      if (savedOperations.length === 0) {
        fetchSavedOperations();
      }
    }
  }, [showCompletedDialog]);

  // Handlers for adding/removing sizes
  const addSleeperSize = () => {
    const newSequence = sleeperSizes.length + 1;
    setSleeperSizes([
      ...sleeperSizes,
      {
        id: uuidv4(),
        sequence: newSequence,
        width: 0,
        height: 0,
        length: 0,
        quantity: 1
      }
    ]);
  };

  const removeSleeperSize = (id: string) => {
    setSleeperSizes(sleeperSizes.filter(size => size.id !== id));
  };

  const addPlankSize = async (sleeperSequence: number) => {
    const newPlank = {
      id: uuidv4(),
      sequence: plankSizes.length + 1,
      parentSequence: sleeperSequence,
      width: 0,
      height: 0,
      length: 0,
      quantity: 1
    };

    setPlankSizes([...plankSizes, newPlank]);

    // If no operation exists yet, create one now
    if (!operationId && selectedWoodType && lotNumber && selectedSleeperNumber) {
      console.log('Creating operation for first plank, sleeper number:', selectedSleeperNumber);
      // Small delay to let state update
      setTimeout(() => {
        handleSave(false);
      }, 100);
    }
  };

  const removePlankSize = (id: string) => {
    setPlankSizes(plankSizes.filter(size => size.id !== id));
  };

  // Calculation functions
  const calculateSleeperVolume = () => {
    // Calculate total volume for ALL sleepers in the LOT (from receipt measurements)
    console.log('[calculateSleeperVolume] availableSleepers count:', availableSleepers.length);
    const total = availableSleepers.reduce((sum, sleeper, index) => {
      // Convert from receipt units (inches/feet) to SI units (meters)
      const widthM = inchesToCm(sleeper.width || 0) / 100; // inches -> cm -> meters
      const heightM = inchesToCm(sleeper.thickness || sleeper.height || 0) / 100; // inches -> cm -> meters
      const lengthM = feetToMeters(sleeper.length || 0); // feet -> meters
      const volume = widthM * heightM * lengthM;
      console.log(`[calculateSleeperVolume] Sleeper ${index + 1}: ${sleeper.width}×${sleeper.thickness}×${sleeper.length} = ${volume.toFixed(4)} m³`);
      return sum + volume;
    }, 0);
    console.log('[calculateSleeperVolume] TOTAL:', total.toFixed(4), 'm³');
    return total;
  };

  const calculatePlankVolume = () => {
    // Calculate total volume for ALL planks from ALL completed operations in this LOT
    // PLUS planks currently being worked on (in plankSizes)
    console.log('[calculatePlankVolume] START');
    console.log('[calculatePlankVolume] lotOperations count:', lotOperations.length);
    console.log('[calculatePlankVolume] current plankSizes count:', plankSizes.length);
    let total = 0;

    // Add planks from saved operations
    lotOperations.forEach((op: SavedOperation, opIndex) => {
      if (op.plank_sizes && Array.isArray(op.plank_sizes)) {
        console.log(`[calculatePlankVolume] Operation ${opIndex + 1} has ${op.plank_sizes.length} planks`);
        op.plank_sizes.forEach((plank: any, plankIndex) => {
          // Planks are stored in cm and inherit length from sleeper
          const width = (plank.width || 0) / 100; // cm -> meters
          const height = (plank.height || 0) / 100; // cm -> meters
          const length = (plank.length || 0); // Already in meters
          const quantity = plank.quantity || 1;
          const volume = width * height * length * quantity;
          console.log(`  Plank ${plankIndex + 1}: ${plank.width}×${plank.height}×${length} × ${quantity} = ${volume.toFixed(4)} m³`);
          total += volume;
        });
      }
    });

    // Add planks currently being worked on (not yet saved)
    console.log('[calculatePlankVolume] Processing current plankSizes...');
    plankSizes.forEach((plank, index) => {
      const parentSleeper = sleeperSizes.find(s => s.sequence === plank.parentSequence);
      if (!parentSleeper) {
        console.log(`  Current plank ${index + 1}: NO PARENT SLEEPER FOUND (parentSequence: ${plank.parentSequence})`);
        return;
      }

      const width = (plank.width || 0) / 100; // cm -> meters
      const height = (plank.height || 0) / 100; // cm -> meters
      const length = parentSleeper.length; // meters
      const quantity = plank.quantity || 1;
      const volume = width * height * length * quantity;
      console.log(`  Current plank ${index + 1}: ${plank.width}×${plank.height}×${length} × ${quantity} = ${volume.toFixed(4)} m³`);
      total += volume;
    });

    console.log('[calculatePlankVolume] TOTAL:', total.toFixed(4), 'm³');
    return total;
  };

  // Calculate volume for CURRENT sleeper being worked on (from sleeperSizes)
  const calculateCurrentSleeperVolume = () => {
    return sleeperSizes.reduce((total, size) => {
      const width = (size.width || 0) / 100;
      const height = (size.height || 0) / 100;
      const length = (size.length || 0);
      const quantity = size.quantity || 1;
      const volume = width * height * length * quantity;
      return total + volume;
    }, 0);
  };

  // Calculate volume for planks cut from CURRENT sleeper (from plankSizes)
  const calculateCurrentPlankVolume = () => {
    return plankSizes.reduce((total, plank) => {
      const parentSleeper = sleeperSizes.find(s => s.sequence === plank.parentSequence);
      if (!parentSleeper) return total;

      const width = (plank.width || 0) / 100;
      const height = (plank.height || 0) / 100;
      const length = parentSleeper.length;
      const quantity = plank.quantity || 1;
      const volume = width * height * length * quantity;
      return total + volume;
    }, 0);
  };

  // Calculate waste percentage for CURRENT sleeper
  const calculateCurrentSleeperWaste = () => {
    const sleeperVolume = calculateCurrentSleeperVolume();
    const plankVolume = calculateCurrentPlankVolume();

    if (sleeperVolume === 0) return '0.00';

    const wasteVolume = sleeperVolume - plankVolume;
    const wastePercentage = (wasteVolume / sleeperVolume) * 100;

    return Math.max(0, wastePercentage).toFixed(2);
  };

  // Calculate waste percentage for FULL LOT
  const calculateWastePercentage = () => {
    const sleeperVolume = calculateSleeperVolume();
    const plankVolume = calculatePlankVolume();

    if (sleeperVolume === 0) return '0.00';

    const wasteVolume = sleeperVolume - plankVolume;
    const wastePercentage = (wasteVolume / sleeperVolume) * 100;

    return Math.max(0, wastePercentage).toFixed(2);
  };

  const calculateWaste = () => {
    if (!selectedWoodType || !startTime) return;
    const wastePercentage = calculateWastePercentage();
    const sleeperVolume = calculateSleeperVolume();
    const plankVolume = calculatePlankVolume();

    console.log('Calculation Details:', {
      sleeperSizes,
      plankSizes,
      sleeperVolume,
      plankVolume,
      wastePercentage
    });

    return wastePercentage;
  };

  // Save operation
  const handleSave = async (isAutoSave = false) => {
    // Skip auto-save if essential data is missing
    if (isAutoSave && (!selectedWoodType || !lotNumber || !serialNumber)) {
      return;
    }

    let attempt = 0;

    while (attempt < MAX_RETRIES) {
      try {
        if (isAutoSave) setAutoSaving(true);

        const wastePercentage = parseFloat(calculateWastePercentage());

        let status: OperationStatus;
        if (startTime) {
          status = 'in_progress';
        } else {
          status = 'draft';
        }

        if (!serialNumber) {
          setSerialNumber(generateSerialNumber());
        }

        const operationData = {
          serial_number: serialNumber,
          wood_type_id: selectedWoodType!.id,
          lot_number: lotNumber || null,
          sleeper_number: selectedSleeperNumber,
          start_time: startTime,
          sleeper_sizes: sleeperSizes,
          plank_sizes: plankSizes,
          status: status,
          waste_percentage: wastePercentage,
          notes: operationNotes,
          updated_at: new Date().toISOString(),
          auto_check_completion: true // Enable auto-completion check
        };

        console.log('=== SAVE OPERATION ===');
        console.log('selectedSleeperNumber:', selectedSleeperNumber);
        console.log('operationId:', operationId);
        console.log('Saving operation with data:', operationData);
        console.log('Total planks being saved:', plankSizes.length);
        console.log('Plank sizes detail:', JSON.stringify(plankSizes, null, 2));

        let savedOperation;
        if (operationId) {
          // Updating existing operation
          const response = await api.patch(`/factory/operations/${operationId}`, operationData);
          savedOperation = response.data;
          console.log('Saved operation response:', JSON.stringify(savedOperation, null, 2));
          console.log('Planks in saved response:', savedOperation.plank_sizes?.length, savedOperation.plank_sizes);
        } else {
          // Creating new operation - check for duplicates first
          if (selectedSleeperNumber && lotNumber) {
            const checkResponse = await api.get('/factory/operations');
            const existingOps = checkResponse.data || [];
            const duplicate = existingOps.find(
              (op: any) => op.lot_number === lotNumber && op.sleeper_number === selectedSleeperNumber
            );

            if (duplicate) {
              throw new Error(`Sleeper #${selectedSleeperNumber} has already been sliced! Please select a different sleeper.`);
            }
          }

          const response = await api.post('/factory/operations', operationData);
          savedOperation = response.data;
          setOperationId(savedOperation.id);
          console.log('Created operation response:', JSON.stringify(savedOperation, null, 2));
          console.log('Planks in created response:', savedOperation.plank_sizes?.length, savedOperation.plank_sizes);
        }

        setError(null);
        setLastSaved(new Date());
        return savedOperation;
      } catch (error: any) {
        console.error('Save error:', error);
        attempt++;
        if (attempt === MAX_RETRIES) {
          if (!isAutoSave) {
            setError(error.response?.data?.message || error.message || 'Failed to save operation');
          }
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      } finally {
        if (isAutoSave) setAutoSaving(false);
      }
    }
  };

  // Debounced auto-save function
  const triggerAutoSave = useCallback(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      handleSave(true);
    }, 2000); // Auto-save 2 seconds after last change
  }, [handleSave]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  // Auto-save when data changes
  useEffect(() => {
    if (operationId && selectedWoodType && lotNumber) {
      triggerAutoSave();
    }
  }, [sleeperSizes, plankSizes, operationNotes, selectedSleeperNumber]);

  // Complete operation
  const handleComplete = async () => {
    if (!operationId) {
      setError('Please save the operation first');
      return;
    }

    try {
      const wastePercentage = parseFloat(calculateWastePercentage());

      if (wastePercentage > 10) {
        const response = await api.get(`/factory/approval-requests?operationId=${operationId}&type=high_waste&limit=1`);
        const approvalRequests = response.data;
        const latestRequest = approvalRequests?.[0];

        if (!latestRequest || latestRequest.status !== 'approved') {
          if (!latestRequest) {
            const approvalData = {
              type: 'high_waste',
              operation_id: operationId,
              status: 'pending',
              notes: `Operation requires approval due to high waste percentage (${wastePercentage.toFixed(2)}%)`
            };
            await api.post('/factory/approval-requests', approvalData);
          }
          setError('Cannot complete operation. Approval required for high waste percentage');
          return;
        }
      }

      await api.patch(`/factory/operations/${operationId}/complete`, {
        status: 'completed',
        end_time: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      setError(null);
    } catch (error: any) {
      console.error('Complete error:', error);
      setError(error.response?.data?.message || error.message || 'Failed to complete operation');
    }
  };

  // Fetch saved operations
  const fetchSavedOperations = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/factory/operations');
      console.log('Fetched operations:', response.data?.length, 'operations');
      response.data?.forEach((op: any, index: number) => {
        console.log(`Operation ${index + 1}:`, op.id, 'Planks:', op.plank_sizes?.length, op.plank_sizes);
      });
      setSavedOperations(response.data || []);
    } catch (error: any) {
      if (error.response?.status === 404) {
        setSavedOperations([]);
      } else {
        console.error('Error fetching saved operations:', error);
        setError(error.response?.data?.message || 'Failed to load saved operations');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Load operation
  const loadOperation = async (id: string) => {
    try {
      const response = await api.get(`/factory/operations/${id}`);
      const data = response.data;

      console.log('Loading operation:', id);
      console.log('Loaded operation data:', JSON.stringify(data, null, 2));
      console.log('Planks in loaded operation:', data.plank_sizes?.length, data.plank_sizes);

      if (data) {
        setOperationId(data.id);
        setSerialNumber(data.serial_number);
        setSelectedWoodType(data.wood_type);
        setLotNumber(data.lot_number || '');
        setSleeperSizes(data.sleeper_sizes);
        setPlankSizes(data.plank_sizes);
        setStartTime(data.start_time);
        setOperationNotes(data.notes || '');
        setShowLoadDialog(false);

        console.log('State after load - plankSizes:', data.plank_sizes?.length);
      }
    } catch (error: any) {
      console.error('Error loading operation:', error);
      setError(error.response?.data?.message || 'Failed to load operation');
    }
  };

  // Delete operation
  const handleDeleteOperation = async (operationId: string) => {
    try {
      await api.delete(`/factory/operations/${operationId}`);
      setSavedOperations(savedOperations.filter(op => op.id !== operationId));
    } catch (error: any) {
      console.error('Error deleting operation:', error);
      setError(error.response?.data?.message || error.message || 'Failed to delete operation');
    }
  };

  // Operation toggle (start/end)
  const handleOperationToggle = async () => {
    if (!lotNumber || !selectedWoodType) {
      setError('Please select a LOT number first');
      return;
    }

    if (!startTime) {
      setStartTime(new Date().toISOString());
      await handleSave();
    } else {
      setShowEndDialog(true);
    }
  };

  // Paste sleepers handler
  const handlePasteSleepers = (newSleepers: SleeperSize[]) => {
    setSleeperSizes(newSleepers);
  };

  // Dialogs
  const EndOperationDialog = () => (
    <Dialog
      open={showEndDialog}
      onClose={() => setShowEndDialog(false)}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3 }
      }}
    >
      <DialogTitle
        sx={{
          borderBottom: '1px solid #e2e8f0',
          fontSize: '1.25rem',
          fontWeight: 700,
          color: '#1e293b',
          pb: 2
        }}
      >
        End Operation
      </DialogTitle>
      <DialogContent sx={{ py: 3 }}>
        <Typography sx={{ color: '#64748b', fontSize: '0.875rem' }}>
          Are you sure you want to end this operation? This action cannot be undone.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, pt: 0 }}>
        <Button
          onClick={() => setShowEndDialog(false)}
          sx={{
            textTransform: 'none',
            color: '#64748b',
            '&:hover': { bgcolor: alpha('#dc2626', 0.08) }
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={async () => {
            setShowEndDialog(false);
            try {
              const operationData = {
                status: 'completed',
                updated_at: new Date().toISOString()
              };

              await api.patch(`/factory/operations/${operationId}`, operationData);

              setStartTime(null);
              setOperationId(null);
              setSerialNumber(generateSerialNumber());
              setSleeperSizes([]);
              setPlankSizes([]);
              setSelectedWoodType(null);
            } catch (error: any) {
              console.error('Error ending operation:', error);
              setError(error.response?.data?.message || error.message || 'Failed to end operation');
            }
          }}
          variant="contained"
          sx={{
            textTransform: 'none',
            bgcolor: '#dc2626',
            '&:hover': { bgcolor: '#b91c1c' },
            fontWeight: 600
          }}
        >
          End Operation
        </Button>
      </DialogActions>
    </Dialog>
  );

  const CompletedOperationsDialog = () => (
    <Dialog
      open={showCompletedDialog}
      onClose={() => setShowCompletedDialog(false)}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3 }
      }}
    >
      <DialogTitle
        sx={{
          borderBottom: '1px solid #e2e8f0',
          fontSize: '1.25rem',
          fontWeight: 700,
          color: '#1e293b',
          pb: 2
        }}
      >
        Slicing History for {lotNumber}
      </DialogTitle>
      <DialogContent sx={{ p: 0 }}>
        {savedOperations.filter(op => op.lot_number === lotNumber).length === 0 ? (
          <Box sx={{ p: 8, textAlign: 'center', color: '#94a3b8' }}>
            <Typography sx={{ fontSize: '0.875rem' }}>No slicing operations found for this LOT</Typography>
          </Box>
        ) : (
          <List sx={{ py: 0 }}>
            {savedOperations
              .filter(op => op.lot_number === lotNumber)
              .sort((a, b) => (a.sleeper_number || 0) - (b.sleeper_number || 0))
              .map((operation) => {
                const { sleeperVolume } = calculateOperationVolumes(operation);
                return (
                  <ListItem
                    key={operation.id}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderBottom: '1px solid #e2e8f0',
                      py: 2.5,
                      px: 3,
                      '&:hover': { bgcolor: '#f8fafc' },
                      transition: 'background-color 0.2s ease'
                    }}
                  >
                    <Box>
                      <Typography
                        variant="subtitle1"
                        sx={{
                          mb: 0.5,
                          fontWeight: 600,
                          color: '#1e293b',
                          fontSize: '0.875rem'
                        }}
                      >
                        Sleeper #{operation.sleeper_number} - {operation.serial_number}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          color: '#64748b',
                          fontSize: '0.75rem'
                        }}
                      >
                        Status: {operation.status} •
                        Wood Type: {operation.wood_type?.name} •
                        Waste: {operation.waste_percentage?.toFixed(2)}% •
                        Volume: {sleeperVolume} m³ •
                        Planks: {operation.plank_sizes?.length || 0}
                      </Typography>
                    </Box>
                    <Button
                      size="small"
                      onClick={() => setSelectedOperation(operation)}
                      sx={{
                        textTransform: 'none',
                        color: '#dc2626',
                        fontWeight: 600,
                        '&:hover': {
                          bgcolor: alpha('#dc2626', 0.08)
                        }
                      }}
                    >
                      View Details
                    </Button>
                  </ListItem>
                );
              })}
          </List>
        )}
      </DialogContent>
      <DialogActions
        sx={{
          borderTop: '1px solid #e2e8f0',
          px: 3,
          py: 2,
          display: 'flex',
          justifyContent: 'space-between'
        }}
      >
        <Button
          onClick={() => {
            const lotOperations = savedOperations.filter(op => op.lot_number === lotNumber);
            generateCombinedReport(lotOperations);
          }}
          startIcon={<PrintIcon />}
          variant="contained"
          sx={{
            textTransform: 'none',
            bgcolor: '#dc2626',
            '&:hover': { bgcolor: '#b91c1c' },
            fontWeight: 600
          }}
        >
          Generate Combined Report
        </Button>
        <Button
          onClick={() => setShowCompletedDialog(false)}
          sx={{
            textTransform: 'none',
            color: '#64748b',
            '&:hover': { bgcolor: alpha('#dc2626', 0.08) }
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );

  const OperationDetailsDialog = () => {
    if (!selectedOperation) return null;

    const { sleeperVolume } = calculateOperationVolumes(selectedOperation);

    const handlePrint = async () => {
      try {
        const blob = await pdf(<OperationReport operation={selectedOperation} />).toBlob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `operation-${selectedOperation.serial_number}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Error generating PDF:', error);
        setError('Failed to generate report');
      }
    };

    return (
      <Dialog
        open={Boolean(selectedOperation)}
        onClose={() => setSelectedOperation(null)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3 }
        }}
      >
        <DialogTitle
          sx={{
            borderBottom: '1px solid #e2e8f0',
            fontSize: '1.25rem',
            fontWeight: 700,
            color: '#1e293b',
            pb: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.25rem' }}>
              Operation Details
            </Typography>
            <Chip
              label={selectedOperation.serial_number}
              sx={{
                backgroundColor: alpha('#dc2626', 0.1),
                color: '#dc2626',
                fontWeight: 600,
                fontSize: '0.75rem'
              }}
            />
          </Stack>
        </DialogTitle>

        <DialogContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', gap: 2, mb: 4, flexWrap: 'wrap' }}>
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: 2,
                bgcolor: '#f8fafc',
                border: '1px solid #e2e8f0',
                minWidth: 200,
                flex: 1
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  color: '#64748b',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
              >
                Wood Type
              </Typography>
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 700,
                  mt: 0.5,
                  color: '#1e293b',
                  fontSize: '0.875rem'
                }}
              >
                {selectedOperation.wood_type?.name || 'Unknown'}
                {selectedOperation.wood_type?.grade ? ` (Grade ${selectedOperation.wood_type.grade})` : ''}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  mt: 1,
                  color: '#dc2626',
                  fontWeight: 600,
                  fontSize: '0.75rem'
                }}
              >
                Waste: {selectedOperation.waste_percentage?.toFixed(2)}%
              </Typography>
            </Paper>

            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: 2,
                bgcolor: '#f8fafc',
                border: '1px solid #e2e8f0',
                minWidth: 200,
                flex: 1
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  color: '#64748b',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
              >
                Operation Time
              </Typography>
              <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                <Typography variant="body2" sx={{ fontSize: '0.75rem', color: '#334155' }}>
                  Start: {format(new Date(selectedOperation.start_time || ''), 'PPpp')}
                </Typography>
                <Typography variant="body2" sx={{ fontSize: '0.75rem', color: '#334155' }}>
                  End: {format(new Date(selectedOperation.updated_at), 'PPpp')}
                </Typography>
                <Typography
                  variant="subtitle2"
                  sx={{
                    color: '#dc2626',
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    mt: 0.5
                  }}
                >
                  Duration: {calculateDuration(selectedOperation)}
                </Typography>
              </Stack>
            </Paper>

            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: 2,
                bgcolor: '#f8fafc',
                border: '1px solid #e2e8f0',
                minWidth: 200,
                flex: 1
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  color: '#64748b',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
              >
                Volume Information
              </Typography>
              <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                <Typography variant="body1" sx={{ fontSize: '0.875rem', color: '#334155' }}>
                  Total Sleeper Volume: {Number(calculateSleeperVolume()).toFixed(3)} m³
                </Typography>
                <Typography variant="body1" sx={{ fontSize: '0.875rem', color: '#334155' }}>
                  Total Plank Volume: {Number(calculatePlankVolume()).toFixed(3)} m³
                </Typography>
                <Typography
                  variant="subtitle2"
                  sx={{
                    color: '#dc2626',
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    mt: 0.5
                  }}
                >
                  Waste: {selectedOperation.waste_percentage?.toFixed(2)}%
                </Typography>
              </Stack>
            </Paper>
          </Box>

          <Stack spacing={3}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 2,
                bgcolor: 'white',
                border: '1px solid #e2e8f0'
              }}
            >
              <Typography
                variant="subtitle1"
                sx={{
                  mb: 2,
                  fontWeight: 600,
                  color: '#1e293b',
                  fontSize: '0.95rem'
                }}
              >
                Sleeper Sizes ({selectedOperation.sleeper_sizes.length})
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f8fafc' }}>
                    <TableCell sx={{ fontWeight: 600, color: '#64748b', fontSize: '0.75rem' }}>No.</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#64748b', fontSize: '0.75rem' }}>Dimensions</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#64748b', fontSize: '0.75rem' }}>Quantity</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {selectedOperation.sleeper_sizes.map((size, index) => (
                    <TableRow
                      key={index}
                      sx={{
                        '&:hover': { bgcolor: '#f8fafc' },
                        transition: 'background-color 0.2s ease',
                      }}
                    >
                      <TableCell sx={{ fontSize: '0.875rem' }}>{size.sequence}</TableCell>
                      <TableCell sx={{ fontSize: '0.875rem' }}>{formatSize(size)}</TableCell>
                      <TableCell sx={{ fontSize: '0.875rem' }}>{size.quantity} pcs</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>

            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 2,
                bgcolor: 'white',
                border: '1px solid #e2e8f0'
              }}
            >
              <Typography
                variant="subtitle1"
                sx={{
                  mb: 2,
                  fontWeight: 600,
                  color: '#1e293b',
                  fontSize: '0.95rem'
                }}
              >
                Plank Sizes ({selectedOperation.plank_sizes.length})
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f8fafc' }}>
                    <TableCell sx={{ fontWeight: 600, color: '#64748b', fontSize: '0.75rem' }}>No.</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#64748b', fontSize: '0.75rem' }}>From Sleeper</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#64748b', fontSize: '0.75rem' }}>Dimensions</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#64748b', fontSize: '0.75rem' }}>Quantity</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {selectedOperation.plank_sizes.map((size, index) => (
                    <TableRow
                      key={index}
                      sx={{
                        '&:hover': { bgcolor: '#f8fafc' },
                        transition: 'background-color 0.2s ease',
                      }}
                    >
                      <TableCell sx={{ fontSize: '0.875rem' }}>{size.sequence}</TableCell>
                      <TableCell sx={{ fontSize: '0.875rem' }}>
                        {'parentSequence' in size ? `#${size.parentSequence}` : '-'}
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.875rem' }}>{formatSize(size)}</TableCell>
                      <TableCell sx={{ fontSize: '0.875rem' }}>{size.quantity} pcs</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          </Stack>
        </DialogContent>

        <DialogActions
          sx={{
            borderTop: '1px solid #e2e8f0',
            px: 3,
            py: 2,
            gap: 2
          }}
        >
          <Button
            onClick={handlePrint}
            startIcon={<PrintIcon />}
            variant="contained"
            sx={{
              textTransform: 'none',
              bgcolor: '#dc2626',
              '&:hover': { bgcolor: '#b91c1c' },
              fontWeight: 600
            }}
          >
            Generate Report
          </Button>

          <Button
            onClick={() => setSelectedOperation(null)}
            sx={{
              textTransform: 'none',
              color: '#64748b',
              '&:hover': { bgcolor: alpha('#dc2626', 0.08) }
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  const LoadOperationDialog = () => (
    <Dialog
      open={showLoadDialog}
      onClose={() => setShowLoadDialog(false)}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3 }
      }}
    >
      <DialogTitle
        sx={{
          borderBottom: '1px solid #e2e8f0',
          fontSize: '1.25rem',
          fontWeight: 700,
          color: '#1e293b',
          pb: 2
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <FolderOpenIcon sx={{ color: '#dc2626', fontSize: 28 }} />
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.25rem' }}>Load Saved Operation</Typography>
        </Stack>
      </DialogTitle>
      <DialogContent sx={{ p: 0 }}>
        {savedOperations.filter(op => op.status !== 'completed').length === 0 ? (
          <Box sx={{ p: 8, textAlign: 'center', color: '#94a3b8' }}>
            <Typography sx={{ fontSize: '0.875rem' }}>No saved operations found</Typography>
          </Box>
        ) : (
          <List sx={{ py: 0 }}>
            {savedOperations
              .filter(op => op.status !== 'completed')
              .map((operation) => {
                const { sleeperVolume, plankVolume } = calculateOperationVolumes(operation);
                return (
                  <ListItem
                    key={operation.id}
                    sx={{
                      borderBottom: '1px solid #e2e8f0',
                      py: 2.5,
                      px: 3,
                      '&:hover': { bgcolor: '#f8fafc' },
                      transition: 'background-color 0.2s ease'
                    }}
                  >
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                        <Typography
                          variant="subtitle1"
                          sx={{
                            fontWeight: 600,
                            color: '#1e293b',
                            fontSize: '0.875rem'
                          }}
                        >
                          {operation.serial_number}
                        </Typography>
                        <Chip
                          label={operation.status}
                          size="small"
                          color={getStatusColor(operation.status)}
                          sx={{
                            textTransform: 'capitalize',
                            fontSize: '0.75rem',
                            height: '24px',
                            fontWeight: 600
                          }}
                        />
                      </Box>

                      <Grid container spacing={2} sx={{ mt: 0.5 }}>
                        <Grid item xs={12} sm={4}>
                          <Typography
                            variant="caption"
                            sx={{
                              color: '#64748b',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px'
                            }}
                          >
                            Wood Type
                          </Typography>
                          <Typography variant="body2" sx={{ fontSize: '0.875rem', color: '#334155', mt: 0.5 }}>
                            {operation.wood_type?.name || 'Unknown'}
                            {operation.wood_type?.grade ? ` (Grade ${operation.wood_type.grade})` : ''}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <Typography
                            variant="caption"
                            sx={{
                              color: '#64748b',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px'
                            }}
                          >
                            Total Sleeper Volume
                          </Typography>
                          <Typography variant="body2" sx={{ fontSize: '0.875rem', color: '#334155', fontWeight: 600, mt: 0.5 }}>
                            {sleeperVolume} m³
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <Typography
                            variant="caption"
                            sx={{
                              color: '#64748b',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px'
                            }}
                          >
                            Total Plank Volume
                          </Typography>
                          <Typography variant="body2" sx={{ fontSize: '0.875rem', color: '#334155', fontWeight: 600, mt: 0.5 }}>
                            {plankVolume} m³
                          </Typography>
                        </Grid>
                      </Grid>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.5, color: '#64748b' }}>
                        <AccessTimeIcon sx={{ fontSize: '1rem' }} />
                        <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                          {format(new Date(operation.updated_at), 'MMM d, yyyy h:mm a')}
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1, ml: 2 }}>
                      <Button
                        size="small"
                        onClick={() => loadOperation(operation.id)}
                        sx={{
                          textTransform: 'none',
                          color: '#dc2626',
                          fontWeight: 600,
                          '&:hover': {
                            bgcolor: alpha('#dc2626', 0.08)
                          }
                        }}
                      >
                        Load
                      </Button>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteOperation(operation.id)}
                        sx={{
                          color: '#64748b',
                          '&:hover': {
                            backgroundColor: alpha('#dc2626', 0.08),
                            color: '#dc2626'
                          }
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </ListItem>
                );
              })}
          </List>
        )}
      </DialogContent>
      <DialogActions sx={{ borderTop: '1px solid #e2e8f0', px: 3, py: 2 }}>
        <Button
          onClick={() => setShowLoadDialog(false)}
          sx={{
            textTransform: 'none',
            color: '#64748b',
            '&:hover': { bgcolor: alpha('#dc2626', 0.08) }
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );

  // Loading and error states
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress sx={{ color: '#dc2626' }} />
      </Box>
    );
  }

  if (connectionError) {
    return (
      <StyledContainer maxWidth="lg">
        <Alert
          severity="error"
          sx={{
            maxWidth: 600,
            mx: 'auto',
            borderRadius: 2
          }}
        >
          {connectionError}
        </Alert>
      </StyledContainer>
    );
  }

  // Main render
  return (
    <StyledContainer maxWidth="xl">
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
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
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
              <ContentCutIcon sx={{ fontSize: 28, color: 'white' }} />
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
                Wood Slicing Operation
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontSize: '0.875rem',
                  mt: 0.5,
                }}
              >
                Serial: {serialNumber} {startTime && '• In Progress'}
              </Typography>
            </Box>
          </Box>
          {lotNumber && (
            <Button
              variant="outlined"
              startIcon={<FolderOpenIcon />}
              onClick={() => {
                fetchSavedOperations();
                setShowCompletedDialog(true);
              }}
              sx={{
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                fontWeight: 600,
                fontSize: '0.875rem',
                textTransform: 'none',
                px: 2.5,
                borderColor: 'rgba(255, 255, 255, 0.3)',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  borderColor: 'rgba(255, 255, 255, 0.5)',
                },
              }}
            >
              Slicing History
            </Button>
          )}
        </Box>
      </Paper>

      {error && (
        <Alert
          severity={error.includes('Approval required') ? 'warning' : 'error'}
          onClose={() => setError(null)}
          sx={{
            mb: 3,
            borderRadius: 2,
            '& .MuiAlert-message': {
              fontSize: '0.875rem'
            }
          }}
        >
          {error}
        </Alert>
      )}

      {/* Main Content */}
      <Grid container spacing={3}>
        <Grid item xs={12} lg={8}>
          {/* LOT Selection */}
          <Paper
            elevation={0}
            sx={{
              p: 3,
              mb: 3,
              borderRadius: 2,
              border: '1px solid #e2e8f0',
              backgroundColor: 'white',
            }}
          >
            <Typography
              variant="h6"
              sx={{
                mb: 2.5,
                fontWeight: 700,
                color: '#1e293b',
                fontSize: '1rem'
              }}
            >
              LOT Number Selection *
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Autocomplete
                value={lotNumber || null}
                onChange={(_, newValue) => {
                  const selectedLot = newValue || '';
                  setLotNumber(selectedLot);
                  fetchLotDetails(selectedLot);
                }}
                options={availableLotNumbers}
                isOptionEqualToValue={(option, value) => option === value}
                renderOption={(props, option) => {
                  const receipt = availableReceipts.find(r => r.lotNumber === option);
                  const { key, ...otherProps } = props;
                  if (!receipt) return <li key={key} {...otherProps}>{option}</li>;

                  const hasData = receipt.actualPieces > 0 || receipt.actualVolumeM3 > 0;
                  const statusColor = receipt.isCompleted ? '#dc2626' : receipt.isDraft ? '#64748b' : '#94a3b8';

                  return (
                    <li key={key} {...otherProps}>
                      <Box sx={{ width: '100%', py: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                          <Typography sx={{ fontWeight: 600, fontSize: '0.9375rem', color: '#1e293b' }}>
                            {option}
                          </Typography>
                          <Chip
                            label={receipt.isCompleted ? 'Completed' : receipt.isDraft ? 'Draft' : 'Not Started'}
                            size="small"
                            sx={{
                              fontSize: '0.6875rem',
                              height: '20px',
                              bgcolor: alpha(statusColor, 0.1),
                              color: statusColor,
                              fontWeight: 600
                            }}
                          />
                        </Box>

                        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', mb: 0.5 }}>
                          <Box>
                            <Typography sx={{ fontSize: '0.6875rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>
                              Volume (m³)
                            </Typography>
                            <Typography sx={{ fontSize: '0.8125rem', color: statusColor, fontWeight: 600 }}>
                              {hasData ? receipt.actualVolumeM3.toFixed(3) : 'N/A'}
                            </Typography>
                          </Box>
                          <Box>
                            <Typography sx={{ fontSize: '0.6875rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>
                              Pieces
                            </Typography>
                            <Typography sx={{ fontSize: '0.8125rem', color: statusColor, fontWeight: 600 }}>
                              {hasData ? receipt.actualPieces : 'N/A'}
                            </Typography>
                          </Box>
                          {receipt.startDate && (
                            <Box>
                              <Typography sx={{ fontSize: '0.6875rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>
                                Started
                              </Typography>
                              <Typography sx={{ fontSize: '0.8125rem', color: '#64748b' }}>
                                {receipt.startDate.toLocaleDateString()}
                              </Typography>
                            </Box>
                          )}
                          {receipt.completionDate && (
                            <Box>
                              <Typography sx={{ fontSize: '0.6875rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>
                                Completed
                              </Typography>
                              <Typography sx={{ fontSize: '0.8125rem', color: '#64748b' }}>
                                {receipt.completionDate.toLocaleDateString()}
                              </Typography>
                            </Box>
                          )}
                        </Box>

                        {receipt.workingUser && (
                          <Typography sx={{ fontSize: '0.75rem', color: '#64748b', mt: 0.5 }}>
                            User: {receipt.workingUser}
                          </Typography>
                        )}
                      </Box>
                    </li>
                  );
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="LOT Number"
                    size="small"
                    placeholder="Select LOT from list"
                    required
                    error={!lotNumber}
                    helperText={!lotNumber ? 'LOT number is required to start slicing' : ''}
                    sx={textFieldSx}
                  />
                )}
                sx={{ width: '100%' }}
                ListboxProps={{
                  sx: {
                    maxHeight: '400px',
                    '& .MuiAutocomplete-option': {
                      borderBottom: '1px solid #e2e8f0',
                      '&:last-child': {
                        borderBottom: 'none'
                      }
                    }
                  }
                }}
              />

              {lotNumber && (
                <Box sx={{
                  display: 'flex',
                  gap: 2,
                  flexWrap: 'wrap',
                  p: 2.5,
                  backgroundColor: '#f8fafc',
                  borderRadius: 2,
                  border: '1px solid #e2e8f0'
                }}>
                  <Box sx={{ flex: 1, minWidth: 200 }}>
                    <Typography
                      variant="caption"
                      sx={{
                        color: '#64748b',
                        textTransform: 'uppercase',
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        letterSpacing: '0.5px'
                      }}
                    >
                      Wood Type
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 700,
                        color: '#1e293b',
                        mt: 0.5,
                        fontSize: '0.875rem'
                      }}
                    >
                      {selectedWoodType ? `${selectedWoodType.name} (Grade ${selectedWoodType.grade})` : 'Loading...'}
                    </Typography>
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 200 }}>
                    <Typography
                      variant="caption"
                      sx={{
                        color: '#64748b',
                        textTransform: 'uppercase',
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        letterSpacing: '0.5px'
                      }}
                    >
                      Supplier
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 700,
                        color: '#1e293b',
                        mt: 0.5,
                        fontSize: '0.875rem'
                      }}
                    >
                      {supplierName || 'Loading...'}
                    </Typography>
                  </Box>
                </Box>
              )}
            </Box>
          </Paper>

          {/* LOT Exists Warning */}
          {/* Auto-save Indicator */}
          {(autoSaving || lastSaved) && (
            <Paper
              elevation={0}
              sx={{
                p: 2,
                mb: 3,
                borderRadius: 2,
                border: '1px solid #e2e8f0',
                backgroundColor: '#f8fafc',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}
            >
              {autoSaving ? (
                <>
                  <CircularProgress size={16} />
                  <Typography variant="body2" sx={{ color: '#64748b' }}>
                    Saving...
                  </Typography>
                </>
              ) : lastSaved ? (
                <Typography variant="body2" sx={{ color: '#16a34a' }}>
                  ✓ Last saved: {format(lastSaved, 'HH:mm:ss')}
                </Typography>
              ) : null}
            </Paper>
          )}

          {/* Sleeper Selector */}
          {showSleeperSelector && availableSleepers.length > 0 && (
            <Paper
              elevation={0}
              sx={{
                p: 3,
                mb: 3,
                borderRadius: 2,
                border: '1px solid #e2e8f0',
                backgroundColor: '#fff'
              }}
            >
              <SleeperSelector
                sleepers={availableSleepers.map((sleeper, index) => ({
                  number: index + 1,
                  width: sleeper.width || 0,
                  height: sleeper.thickness || 0,
                  length: sleeper.length || 0,
                  isUsed: usedSleeperNumbers.has(index + 1)
                }))}
                onSelectSleeper={(sleeper) => handleSleeperSelect(availableSleepers[sleeper.number - 1])}
                selectedSleeperNumber={selectedSleeperNumber}
              />
            </Paper>
          )}

          {/* Sleepers and Planks */}
          {lotNumber && selectedSleeperNumber && (
          <Paper
            elevation={0}
            sx={{
              p: 3,
              mb: 3,
              borderRadius: 2,
              border: '1px solid #e2e8f0',
              backgroundColor: 'white',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                  color: '#1e293b',
                  fontSize: '1rem'
                }}
              >
                Sleepers and Planks
              </Typography>
              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <Button
                  startIcon={<AddIcon />}
                  onClick={addSleeperSize}
                  variant="outlined"
                  size="small"
                  sx={{
                    textTransform: 'none',
                    borderColor: '#e2e8f0',
                    color: '#64748b',
                    fontWeight: 600,
                    '&:hover': {
                      borderColor: '#dc2626',
                      color: '#dc2626',
                      bgcolor: alpha('#dc2626', 0.04)
                    }
                  }}
                >
                  Add Sleeper
                </Button>
                <Button
                  onClick={() => setShowPasteDialog(true)}
                  variant="outlined"
                  size="small"
                  sx={{
                    textTransform: 'none',
                    borderColor: '#e2e8f0',
                    color: '#64748b',
                    fontWeight: 600,
                    '&:hover': {
                      borderColor: '#dc2626',
                      color: '#dc2626',
                      bgcolor: alpha('#dc2626', 0.04)
                    }
                  }}
                >
                  Paste from Excel
                </Button>
              </Box>
            </Box>

            <Stack spacing={2.5}>
              {sleeperSizes.map((sleeper, sleeperIndex) => (
                <Paper
                  key={sleeper.id}
                  elevation={0}
                  sx={{
                    p: 2.5,
                    border: '1px solid #e2e8f0',
                    borderRadius: 2,
                    bgcolor: '#fafafa',
                    position: 'relative'
                  }}
                >
                  <Box sx={{ mb: 2.5 }}>
                    {/* Single line layout with square label on left */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      {/* Square Sleeper Number Label */}
                      <Box
                        sx={{
                          width: 100,
                          height: 100,
                          bgcolor: '#dc2626',
                          color: 'white',
                          borderRadius: 2,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          gap: 0.5
                        }}
                      >
                        <Typography sx={{ fontWeight: 700, fontSize: '0.75rem', opacity: 0.9 }}>
                          Sleeper
                        </Typography>
                        <Typography sx={{ fontWeight: 800, fontSize: '1.5rem', lineHeight: 1 }}>
                          #{selectedSleeperNumber || sleeper.sequence}
                        </Typography>
                        <Typography sx={{ fontWeight: 600, fontSize: '0.65rem', opacity: 0.8 }}>
                          SL{String(selectedSleeperNumber || sleeper.sequence).padStart(3, '0')}
                        </Typography>
                      </Box>

                      {/* Dimension Inputs in a row */}
                      <Box sx={{ display: 'flex', gap: 1.5, flex: 1, flexWrap: 'nowrap', minWidth: 0 }}>
                        <Box sx={{ flex: 1, minWidth: 120 }}>
                          <DimensionInput
                            label="Height"
                            value={cmToInches(sleeper.height || 0)}
                            onChange={(value) => {
                              const newSizes = [...sleeperSizes];
                              newSizes[sleeperIndex].height = inchesToCm(value);
                              setSleeperSizes(newSizes);
                            }}
                            unit="in"
                            convertedValue={sleeper.height?.toFixed(1)}
                            disabled={true}
                          />
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 120 }}>
                          <DimensionInput
                            label="Width"
                            value={cmToInches(sleeper.width || 0)}
                            onChange={(value) => {
                              const newSizes = [...sleeperSizes];
                              newSizes[sleeperIndex].width = inchesToCm(value);
                              setSleeperSizes(newSizes);
                            }}
                            unit="in"
                            convertedValue={sleeper.width?.toFixed(1)}
                            disabled={true}
                          />
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 140 }}>
                          <DimensionInput
                            label="Length"
                            value={metersToFeet(sleeper.length || 0)}
                            onChange={(value) => {
                              const newSizes = [...sleeperSizes];
                              newSizes[sleeperIndex].length = feetToMeters(value);
                              setSleeperSizes(newSizes);

                              const newPlankSizes = [...plankSizes];
                              newPlankSizes.forEach(plank => {
                                if (plank.parentSequence === sleeper.sequence) {
                                  plank.length = feetToMeters(value);
                                }
                              });
                              setPlankSizes(newPlankSizes);
                            }}
                            unit="feet"
                            convertedValue={sleeper.length?.toFixed(2)}
                            disabled={true}
                          />
                        </Box>
                        <Box sx={{ flex: 0, minWidth: 100 }}>
                          <QuantityInput
                            value={sleeper.quantity}
                            onChange={(value) => {
                              const newSizes = [...sleeperSizes];
                              newSizes[sleeperIndex].quantity = value;
                              setSleeperSizes(newSizes);
                            }}
                            disabled={true}
                          />
                        </Box>
                      </Box>
                    </Box>
                  </Box>

                  {/* Planks Section */}
                  <Box sx={{ ml: 2, mt: 3, pt: 3, borderTop: '1px solid #e2e8f0' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography
                        variant="subtitle2"
                        sx={{
                          color: '#64748b',
                          fontWeight: 600,
                          fontSize: '0.875rem'
                        }}
                      >
                        Associated Planks
                      </Typography>
                      <Button
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={() => addPlankSize(sleeper.sequence)}
                        sx={{
                          textTransform: 'none',
                          color: '#dc2626',
                          fontWeight: 600,
                          fontSize: '0.75rem',
                          '&:hover': {
                            bgcolor: alpha('#dc2626', 0.08)
                          }
                        }}
                      >
                        Add Plank
                      </Button>
                    </Box>

                    <Stack spacing={2}>
                      {plankSizes
                        .filter(plank => plank.parentSequence === sleeper.sequence)
                        .map((plank) => (
                          <Box
                            key={plank.id}
                            sx={{
                              p: 1.5,
                              borderRadius: 1.5,
                              bgcolor: 'white',
                              border: '1px solid #e2e8f0',
                              position: 'relative'
                            }}
                          >
                            {/* Single line layout with square plank label on left */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              {/* Square Plank Number Label */}
                              <Box
                                sx={{
                                  width: 100,
                                  height: 100,
                                  bgcolor: '#64748b',
                                  color: 'white',
                                  borderRadius: 2,
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                  gap: 0.5
                                }}
                              >
                                <Typography sx={{ fontWeight: 700, fontSize: '0.75rem', opacity: 0.9 }}>
                                  Plank
                                </Typography>
                                <Typography sx={{ fontWeight: 800, fontSize: '1.25rem', lineHeight: 1 }}>
                                  #{plankSizes.filter(p => p.parentSequence === sleeper.sequence).indexOf(plank) + 1}
                                </Typography>
                                <Typography sx={{ fontWeight: 600, fontSize: '0.65rem', opacity: 0.8 }}>
                                  SL{String(selectedSleeperNumber || sleeper.sequence).padStart(3, '0')}-{String(plankSizes.filter(p => p.parentSequence === sleeper.sequence).indexOf(plank) + 1).padStart(2, '0')}
                                </Typography>
                              </Box>

                              {/* Dimension Inputs in a row */}
                              <Box sx={{ display: 'flex', gap: 1.5, flex: 1, flexWrap: 'nowrap', minWidth: 0 }}>
                                <Box sx={{ flex: 1, minWidth: 120 }}>
                                  <DimensionInput
                                    label="Height"
                                    value={cmToInches(plank.height || 0)}
                                    onChange={(value) => {
                                      const newSizes = [...plankSizes];
                                      const globalPlankIndex = newSizes.findIndex(p => p.id === plank.id);
                                      newSizes[globalPlankIndex].height = inchesToCm(value);
                                      setPlankSizes(newSizes);
                                    }}
                                    unit="in"
                                    convertedValue={plank.height?.toFixed(1)}
                                  />
                                </Box>
                                <Box sx={{ flex: 1, minWidth: 120 }}>
                                  <DimensionInput
                                    label="Width"
                                    value={cmToInches(plank.width || 0)}
                                    onChange={(value) => {
                                      const newSizes = [...plankSizes];
                                      const globalPlankIndex = newSizes.findIndex(p => p.id === plank.id);
                                      newSizes[globalPlankIndex].width = inchesToCm(value);
                                      setPlankSizes(newSizes);
                                    }}
                                    unit="in"
                                    convertedValue={plank.width?.toFixed(1)}
                                  />
                                </Box>
                                <Box sx={{ flex: 1, minWidth: 140 }}>
                                  <DimensionInput
                                    label="Length"
                                    value={metersToFeet(sleeperSizes.find(s => s.sequence === plank.parentSequence)?.length || 0)}
                                    onChange={() => {}}
                                    unit="feet"
                                    convertedValue={sleeperSizes.find(s => s.sequence === plank.parentSequence)?.length?.toFixed(2) || '0.00'}
                                    disabled={true}
                                  />
                                </Box>
                                <Box sx={{ flex: 0, minWidth: 100 }}>
                                  <QuantityInput
                                    value={plank.quantity}
                                    onChange={(value) => {
                                      const newSizes = [...plankSizes];
                                      const globalPlankIndex = newSizes.findIndex(p => p.id === plank.id);
                                      newSizes[globalPlankIndex].quantity = value;
                                      setPlankSizes(newSizes);
                                    }}
                                  />
                                </Box>
                              </Box>
                            </Box>

                            {plankSizes.filter(p => p.parentSequence === sleeper.sequence).length > 1 && (
                              <IconButton
                                onClick={() => removePlankSize(plank.id)}
                                size="small"
                                sx={{
                                  position: 'absolute',
                                  top: -10,
                                  right: -10,
                                  width: 28,
                                  height: 28,
                                  bgcolor: '#dc2626',
                                  color: 'white',
                                  '&:hover': {
                                    bgcolor: '#b91c1c',
                                  },
                                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                }}
                              >
                                <DeleteIcon sx={{ fontSize: '1rem' }} />
                              </IconButton>
                            )}
                          </Box>
                      ))}
                    </Stack>

                    {/* Per-Sleeper Calculation Summary */}
                    {plankSizes.filter(p => p.parentSequence === sleeper.sequence).length > 0 && (
                      <Box sx={{ mt: 3, p: 2, bgcolor: alpha('#3b82f6', 0.05), borderRadius: 1.5, border: '1px solid', borderColor: alpha('#3b82f6', 0.2) }}>
                        <Typography variant="subtitle2" sx={{ color: '#475569', fontSize: '0.75rem', fontWeight: 600, mb: 1.5 }}>
                          Current Sleeper Summary
                        </Typography>
                        <Grid container spacing={2}>
                          <Grid item xs={4}>
                            <Box>
                              <Typography sx={{ color: '#64748b', fontSize: '0.625rem', fontWeight: 600, mb: 0.5 }}>
                                SLEEPER VOL.
                              </Typography>
                              <Typography sx={{ color: '#1e293b', fontSize: '0.875rem', fontWeight: 700 }}>
                                {calculateCurrentSleeperVolume().toFixed(3)} m³
                              </Typography>
                            </Box>
                          </Grid>
                          <Grid item xs={4}>
                            <Box>
                              <Typography sx={{ color: '#64748b', fontSize: '0.625rem', fontWeight: 600, mb: 0.5 }}>
                                PLANK VOL.
                              </Typography>
                              <Typography sx={{ color: '#1e293b', fontSize: '0.875rem', fontWeight: 700 }}>
                                {calculateCurrentPlankVolume().toFixed(3)} m³
                              </Typography>
                            </Box>
                          </Grid>
                          <Grid item xs={4}>
                            <Box>
                              <Typography sx={{ color: '#dc2626', fontSize: '0.625rem', fontWeight: 600, mb: 0.5 }}>
                                WASTE %
                              </Typography>
                              <Typography sx={{ color: '#dc2626', fontSize: '0.875rem', fontWeight: 700 }}>
                                {calculateCurrentSleeperWaste()}%
                              </Typography>
                            </Box>
                          </Grid>
                        </Grid>
                      </Box>
                    )}
                  </Box>

                  {sleeperSizes.length > 1 && (
                    <IconButton
                      onClick={() => removeSleeperSize(sleeper.id)}
                      size="small"
                      sx={{
                        position: 'absolute',
                        top: -10,
                        right: -10,
                        width: 28,
                        height: 28,
                        bgcolor: '#dc2626',
                        color: 'white',
                        '&:hover': {
                          bgcolor: '#b91c1c',
                        },
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}
                    >
                      <DeleteIcon sx={{ fontSize: '1rem' }} />
                    </IconButton>
                  )}
                </Paper>
              ))}
            </Stack>

            {/* Done Slicing Button */}
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              {selectedSleeperNumber && usedSleeperNumbers.has(selectedSleeperNumber) && (
                <Button
                  variant="outlined"
                  size="large"
                  onClick={async () => {
                    // Just save and clear selection without resetting
                    await handleSave(false);
                    setSelectedSleeperNumber(null);
                    setSleeperSizes([]);
                    setPlankSizes([]);
                    setOperationId(null);
                  }}
                  sx={{
                    borderColor: '#64748b',
                    color: '#64748b',
                    fontWeight: 600,
                    px: 4,
                    py: 1.5,
                    textTransform: 'none',
                    '&:hover': {
                      borderColor: '#475569',
                      bgcolor: 'rgba(100, 116, 139, 0.04)'
                    }
                  }}
                >
                  Cancel Edit
                </Button>
              )}
              <Button
                variant="contained"
                size="large"
                onClick={async () => {
                  // Save the current operation with all planks
                  await handleSave(false);

                  // Reset operation state for next sleeper
                  setOperationId(null);
                  setSerialNumber(generateSerialNumber());
                  setSelectedSleeperNumber(null);
                  setSleeperSizes([]);
                  setPlankSizes([]);

                  // Refresh used sleeper numbers to update the sleeper selector
                  if (lotNumber) {
                    await fetchUsedSleeperNumbers(lotNumber);
                  }
                }}
                sx={{
                  bgcolor: '#16a34a',
                  color: 'white',
                  fontWeight: 600,
                  px: 4,
                  py: 1.5,
                  textTransform: 'none',
                  '&:hover': {
                    bgcolor: '#15803d'
                  }
                }}
              >
                {selectedSleeperNumber && usedSleeperNumbers.has(selectedSleeperNumber)
                  ? 'Update Sleeper'
                  : 'Done Slicing This Sleeper'}
              </Button>
            </Box>
          </Paper>
          )}

          {/* Operation Notes */}
          {lotNumber && selectedSleeperNumber && (
          <Paper
            elevation={0}
            sx={{
              p: 3,
              mb: 3,
              borderRadius: 2,
              border: '1px solid #e2e8f0',
              backgroundColor: 'white',
            }}
          >
            <Typography
              variant="h6"
              sx={{
                mb: 2.5,
                fontWeight: 700,
                color: '#1e293b',
                fontSize: '1rem'
              }}
            >
              Operation Notes
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={4}
              value={operationNotes}
              onChange={(e) => setOperationNotes(e.target.value)}
              placeholder="Add any notes about this operation..."
              sx={textFieldSx}
            />
          </Paper>
          )}

          {/* Summary Section */}
          {(sleeperSizes.some(size => size.height > 0 || size.width > 0 || size.length > 0) ||
            plankSizes.some(size => size.height > 0 || size.width > 0 || size.length > 0)) && (
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 2,
                border: '1px solid #e2e8f0',
                backgroundColor: 'white',
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  mb: 3,
                  fontWeight: 700,
                  color: '#1e293b',
                  fontSize: '1rem'
                }}
              >
                Summary
              </Typography>

              <Stack spacing={3}>
                <SummarySectionTable
                  title="Sleeper Sizes Summary"
                  items={sleeperSizes}
                  type="sleeper"
                  sleeperSizes={sleeperSizes}
                  selectedSleeperNumber={selectedSleeperNumber}
                />
                <SummarySectionTable
                  title="Plank Sizes Summary"
                  items={plankSizes}
                  type="plank"
                  sleeperSizes={sleeperSizes}
                  selectedSleeperNumber={selectedSleeperNumber}
                />
              </Stack>
            </Paper>
          )}
        </Grid>

        {/* Right Column - Results */}
        <Grid item xs={12} lg={4}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 2,
              border: '1px solid #e2e8f0',
              backgroundColor: 'white',
              position: 'sticky',
              top: 24,
            }}
          >
            <Box sx={{ mb: 3 }}>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                  color: '#1e293b',
                  fontSize: '1rem'
                }}
              >
                Calculation Results
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: '#64748b',
                  fontSize: '0.75rem',
                  mt: 0.5
                }}
              >
                Updates automatically as you add planks
              </Typography>
            </Box>

            <Stack spacing={2.5}>
              <Paper
                sx={{
                  p: 2.5,
                  bgcolor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 2
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    color: '#64748b',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}
                >
                  Total Sleeper Volume
                </Typography>
                <Typography
                  variant="h6"
                  sx={{
                    color: '#1e293b',
                    mt: 1,
                    fontWeight: 700,
                    fontSize: '1.5rem'
                  }}
                >
                  {calculateSleeperVolume().toFixed(3)} m³
                </Typography>
              </Paper>

              <Paper
                sx={{
                  p: 2.5,
                  bgcolor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 2
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    color: '#64748b',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}
                >
                  Total Plank Volume
                </Typography>
                <Typography
                  variant="h6"
                  sx={{
                    color: '#1e293b',
                    mt: 1,
                    fontWeight: 700,
                    fontSize: '1.5rem'
                  }}
                >
                  {calculatePlankVolume().toFixed(3)} m³
                </Typography>
              </Paper>

              <Paper
                sx={{
                  p: 2.5,
                  bgcolor: alpha('#dc2626', 0.08),
                  border: '1px solid',
                  borderColor: alpha('#dc2626', 0.2),
                  borderRadius: 2
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    color: '#b91c1c',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}
                >
                  Estimated Waste
                </Typography>
                <Typography
                  variant="h6"
                  sx={{
                    color: '#dc2626',
                    mt: 1,
                    fontWeight: 700,
                    fontSize: '1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}
                >
                  {calculateWastePercentage()}%
                </Typography>
              </Paper>
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      {/* Dialogs */}
      <EndOperationDialog />
      <CompletedOperationsDialog />
      <OperationDetailsDialog />
      <PasteSleeperDialog
        open={showPasteDialog}
        onClose={() => setShowPasteDialog(false)}
        onPaste={handlePasteSleepers}
      />
    </StyledContainer>
  );
};

export default WoodSlicer;
