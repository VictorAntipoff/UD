import { useState, useEffect } from 'react';
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
  MenuItem,
  TableContainer
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PrintIcon from '@mui/icons-material/Print';
import { supabase } from '../../config/supabase';
import { useTheme, Theme } from '@mui/material/styles';
import { format } from 'date-fns';
import { 
  Document, 
  Page, 
  View, 
  Text, 
  StyleSheet, 
  pdf, 
  Image  // Add Image to imports
} from '@react-pdf/renderer';
import { v4 as uuidv4 } from 'uuid';

// Add these near the top of your file after other constants
const TIMEOUT_DURATION = 20000; // 20 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

// Add this utility function
const withTimeout = <T,>(promise: Promise<T>, timeout: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error('Request timed out')), timeout)
    )
  ]);
};

// Add this utility function
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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
  wood_type?: WoodType;
  start_time: string | null;
  sleeper_sizes: SleeperSize[];
  plank_sizes: PlankSize[];
  status: 'draft' | 'in_progress' | 'completed';
  waste_percentage: number | null;
  created_at: string;
  updated_at: string;
  notes?: string; // Add this line
}

// First, add this type near the top with other interfaces
interface OperationResponse {
  data: SavedOperation;
  error: any;
}

// Add this near your other interfaces
interface ApprovalRequest {
  id: string;
  type: string;
  status: 'pending' | 'approved' | 'rejected';
  operation_id: string;
  requestor_id: string;
  notes?: string;
}

// First, add the conversion utilities at the top of the file after imports
const inchesToCm = (inches: number) => inches * 2.54;
const feetToMeters = (feet: number) => feet * 0.3048;
const cmToInches = (cm: number) => cm / 2.54;
const metersToFeet = (m: number) => m / 0.3048;

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

// Add a type for the theme to ensure proper typing
const getStyles = (theme: Theme) => ({
  headerPaper: {
    p: 3,
    mb: 3,
    borderRadius: 2,
    border: `1px solid ${theme.palette.divider}`,
    background: `linear-gradient(45deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
    color: 'white'
  },
  contentPaper: {
    p: 3,
    mb: 3,
    borderRadius: 2,
    border: `1px solid ${theme.palette.divider}`,
    transition: 'all 0.2s ease-in-out',
    '&:hover': {
      boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
    }
  },
  resultsPaper: {
    p: 3,
    borderRadius: 2,
    border: `1px solid ${theme.palette.divider}`,
    background: theme.palette.background.paper,
    position: 'sticky',
    top: 24,
    transition: 'all 0.2s ease-in-out',
    '&:hover': {
      boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
    }
  },
  page: { padding: 30 },
  header: { marginBottom: 20 },
  title: { fontSize: 20, marginBottom: 10 },
  subtitle: { fontSize: 14, color: '#666' },
  section: { marginBottom: 15 },
  sectionTitle: { fontSize: 16, marginBottom: 5 },
});

// Add PDF styles before the OperationReport component
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

// Update the DimensionInput component
const DimensionInput = ({ 
  label, 
  value, 
  onChange, 
  unit, 
  convertedValue, 
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  unit: string;
  convertedValue: string;
}) => (
  <TextField
    fullWidth
    type="number"
    size="small"
    label={label}
    value={value || ''}
    onChange={(e) => onChange(Number(e.target.value))}
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
    sx={{
      '& .MuiOutlinedInput-root': {
        borderRadius: 1,
        backgroundColor: 'background.paper',
      },
      '& .MuiInputLabel-root': {
        fontSize: '0.875rem'
      },
      '& input': {
        py: 1,
        fontSize: '0.875rem'
      }
    }}
  />
);

// Add this new component for quantity input
const QuantityInput = ({ 
  value, 
  onChange 
}: {
  value: number;
  onChange: (value: number) => void;
}) => (
  <TextField
    fullWidth
    type="number"
    size="small"
    label="Quantity"
    value={value}
    onChange={(e) => onChange(Math.max(1, Number(e.target.value)))}
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
    sx={{
      '& .MuiOutlinedInput-root': {
        borderRadius: 1,
        backgroundColor: 'background.paper',
      },
      '& .MuiInputLabel-root': {
        fontSize: '0.875rem'
      },
      '& input': {
        py: 1,
        fontSize: '0.875rem'
      }
    }}
  />
);

// Add these helper functions at the top
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

// Update the formatSize function to include both metric and imperial
const formatSize = (size: SleeperSize | PlankSize, parentLength?: number) => {
  const height = size.height || 0;
  const width = size.width || 0;
  const length = parentLength || size.length || 0;

  return `${formatDimension(height, 'cm')} (${cmToInches(height).toFixed(1)}") × 
          ${formatDimension(width, 'cm')} (${cmToInches(width).toFixed(1)}") × 
          ${formatDimension(length, 'm')} (${metersToFeet(length).toFixed(1)}')`;
};

// Update the SummarySectionTable component
const SummarySectionTable = ({ 
  title, 
  items,
  type,
  sleeperSizes
}: { 
  title: string;
  items: (SleeperSize | PlankSize)[];
  type: 'sleeper' | 'plank';
  sleeperSizes: SleeperSize[];
}) => {
  // Group items by sequence if they're planks
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

  // Calculate total volume in m³
  const totalVolume = items.reduce((total, item) => {
    if (type === 'plank') {
      const plank = item as PlankSize;
      const parentSleeper = sleeperSizes.find(s => s.sequence === plank.parentSequence);
      if (!parentSleeper) return total;

      const width = (plank.width || 0) / 100;   // cm to m
      const height = (plank.height || 0) / 100;  // cm to m
      const length = parentSleeper.length;        // use parent sleeper length
      const quantity = plank.quantity || 1;
      return total + (width * height * length * quantity);
    } else {
      const sleeper = item as SleeperSize;
      const width = (sleeper.width || 0) / 100;   // cm to m
      const height = (sleeper.height || 0) / 100;  // cm to m
      const length = sleeper.length || 0;          // already in meters
      const quantity = sleeper.quantity || 1;
      return total + (width * height * length * quantity);
    }
  }, 0);

  return (
    <Box>
      <Typography variant="subtitle1" sx={{ mb: 2 }}>
        {title} - Total Volume: {totalVolume.toFixed(3)} m³
      </Typography>
      {type === 'plank' && groupedItems ? (
        // Render planks grouped by sleeper
        Object.entries(groupedItems).map(([sleeperSeq, planks]) => {
          const parentSleeper = sleeperSizes.find(s => s.sequence === Number(sleeperSeq));
          return (
            <Box key={sleeperSeq} sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, color: 'primary.main' }}>
                From Sleeper #{sleeperSeq}
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Plank No.</TableCell>
                      <TableCell>Dimensions (Metric / Imperial)</TableCell>
                      <TableCell>Quantity</TableCell>
                      <TableCell>Volume</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {planks.map((plank) => {
                      const volumeM3 = parentSleeper ? (
                        (plank.width / 100) * 
                        (plank.height / 100) * 
                        parentSleeper.length * 
                        plank.quantity
                      ) : 0;
                      
                      return (
                        <TableRow key={plank.id}>
                          <TableCell>{plank.sequence}</TableCell>
                          <TableCell>{formatSize(plank, parentSleeper?.length)}</TableCell>
                          <TableCell>{plank.quantity}</TableCell>
                          <TableCell>{volumeM3.toFixed(3)} m³</TableCell>
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
        // Render sleepers normally
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>No.</TableCell>
                <TableCell>Dimensions (Metric / Imperial)</TableCell>
                <TableCell>Quantity</TableCell>
                <TableCell>Volume</TableCell>
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
                  <TableRow key={item.id}>
                    <TableCell>{item.sequence}</TableCell>
                    <TableCell>{formatSize(item)}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{volumeM3.toFixed(3)} m³</TableCell>
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

// Add this helper function to calculate volumes for saved operations
const calculateOperationVolumes = (operation: SavedOperation) => {
  const sleeperVolume = operation.sleeper_sizes.reduce((total, size) => {
    const width = (size.width || 0) / 100;   // cm to m
    const height = (size.height || 0) / 100;  // cm to m
    const length = (size.length || 0);        // already in meters
    const quantity = size.quantity || 1;
    return total + (width * height * length * quantity);
  }, 0).toFixed(3);

  const plankVolume = operation.plank_sizes.reduce((total, size) => {
    const width = (size.width || 0) / 100;   // cm to m
    const height = (size.height || 0) / 100;  // cm to m
    const length = (size.length || 0);        // already in meters
    const quantity = size.quantity || 1;
    return total + (width * height * length * quantity);
  }, 0).toFixed(3);

  return { sleeperVolume, plankVolume };
};


// Update the OperationReport component
const OperationReport = ({ operation }: { operation: SavedOperation }) => {
  const { sleeperVolume, plankVolume } = calculateOperationVolumes(operation);
  const wastePercentage = ((parseFloat(sleeperVolume) - parseFloat(plankVolume)) / parseFloat(sleeperVolume)) * 100;

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        {/* Header */}
        <Image src="/logo.png" style={pdfStyles.logo} />
        <Text style={pdfStyles.title}>Wood Slicer Report</Text>
        <Text style={pdfStyles.subtitle}>Professional Wood Solutions</Text>
        
        <View style={pdfStyles.metadata}>
          <Text style={pdfStyles.metadataText}>Generated: {format(new Date(), 'PPpp')}</Text>
          <Text style={pdfStyles.metadataText}>Operation #{operation.serial_number}</Text>
        </View>

        {/* Main Content */}
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

        {/* Sleeper Details */}
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

        {/* Plank Details */}
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

        {/* Move Notes Section before Results Section */}
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

        {/* Results Section */}
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

// Add a new component for combined reports
const CombinedOperationReport = ({ operations }: { operations: SavedOperation[] }) => {
  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        {/* Header */}
        <Image src="/logo.png" style={pdfStyles.logo} />
        <Text style={pdfStyles.title}>Combined Wood Slicing Report</Text>
        <Text style={pdfStyles.subtitle}>
          {format(new Date(), 'PPpp')}
        </Text>

        {/* Summary Section */}
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

        {/* Detailed Operations */}
        {operations.map((operation, index) => (
          <View key={index} wrap={false} style={{ marginTop: 20, borderTop: 1, borderColor: '#e2e8f0', paddingTop: 10 }}>
            <Text style={[pdfStyles.sectionTitle, { marginBottom: 10 }]}>
              Operation #{operation.serial_number}
            </Text>

            {/* Operation Details */}
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

            {/* Remarks Section */}
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

// Add a function to generate the combined report
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

// Add this helper function near the top with other utility functions
const calculateDuration = (operation: SavedOperation) => {
  const startTime = new Date(operation.start_time || '');
  const endTime = new Date(operation.updated_at);
  const duration = endTime.getTime() - startTime.getTime();
  const hours = Math.floor(duration / (1000 * 60 * 60));
  const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
};

// Helper function to format dimensions
const formatDimension = (value: number, unit: string) => {
  // For meters, show 2 decimal places
  if (unit === 'm') {
    return `${Number(value).toFixed(2)}${unit}`;
  }
  // For centimeters, show 1 decimal place
  if (unit === 'cm') {
    return `${Number(value).toFixed(1)}${unit}`;
  }
  return `${value}${unit}`;
};

const WoodSlicer = () => {
  const theme = useTheme();
  const styles = getStyles(theme);
  
  // States
  const [woodTypes, setWoodTypes] = useState<WoodType[]>([]);
  const [selectedWoodType, setSelectedWoodType] = useState<WoodType | null>(null);
  const [sleeperSizes, setSleeperSizes] = useState<SleeperSize[]>([defaultSleeperSize]);
  const [plankSizes, setPlankSizes] = useState<PlankSize[]>([defaultPlankSize]);
  const [serialNumber, setSerialNumber] = useState('');
  const [startTime, setStartTime] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [operationId, setOperationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [savedOperations, setSavedOperations] = useState<SavedOperation[]>([]);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [showCompletedDialog, setShowCompletedDialog] = useState(false);
  const [selectedOperation, setSelectedOperation] = useState<SavedOperation | null>(null);
  const [showPasteDialog, setShowPasteDialog] = useState(false);
  const [operationNotes, setOperationNotes] = useState<string>('');

  // Add this function before useEffect
  const checkConnection = async () => {
    try {
      setIsLoading(true);
      const { error } = await supabase.from('wood_types').select('count');
      if (error) throw error;
      setConnectionError(null);
      return true;
    } catch (error) {
      console.error('Supabase connection error:', error);
      setConnectionError('Unable to connect to the database. Please check your connection.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Update useEffect to use the function
  useEffect(() => {
    fetchWoodTypes();
    checkConnection();
    // Only generate serial number for new operations
    if (!operationId) {
      setSerialNumber(generateSerialNumber());
    }
  }, [operationId]);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Auth error:', error);
        setError('Authentication error. Please sign in again.');
      }
      if (!session) {
        setError('Please sign in to use this feature.');
      }
    };

    checkAuth();
  }, []);

  const fetchWoodTypes = async () => {
    const MAX_RETRIES = 3;
    let attempt = 0;

    while (attempt < MAX_RETRIES) {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('wood_types')
          .select('*')
          .order('name');

        if (error) throw error;

        setWoodTypes(data || []);
        setIsLoading(false);
        return; // Success - exit the retry loop

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

  const generateSerialNumber = (): string => {
    return `WS-${Date.now().toString(36).toUpperCase()}`;
  };

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

  const addPlankSize = (sleeperSequence: number) => {
    setPlankSizes([
      ...plankSizes,
      {
        id: uuidv4(),
        sequence: plankSizes.length + 1,
        parentSequence: sleeperSequence,
        width: 0,
        height: 0,
        length: 0,
        quantity: 1
      }
    ]);
  };

  const removePlankSize = (id: string) => {
    setPlankSizes(plankSizes.filter(size => size.id !== id));
  };

  // Update the calculation functions
  const calculateSleeperVolume = () => {
    return sleeperSizes.reduce((total, size) => {
      // Convert all dimensions to meters before calculating volume
      const width = (size.width || 0) / 100;   // cm to m
      const height = (size.height || 0) / 100;  // cm to m
      const length = (size.length || 0);        // already in meters
      const quantity = size.quantity || 1;

      const volume = width * height * length * quantity;
      return total + volume;
    }, 0);
  };

  // Update the calculatePlankVolume function
  const calculatePlankVolume = () => {
    return plankSizes.reduce((total, plank) => {
      // Find the parent sleeper to get the length
      const parentSleeper = sleeperSizes.find(s => s.sequence === plank.parentSequence);
      if (!parentSleeper) return total;

      // Convert all dimensions to meters before calculating volume
      const width = (plank.width || 0) / 100;   // cm to m
      const height = (plank.height || 0) / 100;  // cm to m
      const length = parentSleeper.length;        // use parent sleeper length
      const quantity = plank.quantity || 1;

      const volume = width * height * length * quantity;
      console.log('Plank calculation:', {
        plankId: plank.sequence,
        sleeperSequence: plank.parentSequence,
        width,
        height,
        length,
        quantity,
        volume
      });
      return total + volume;
    }, 0);
  };

  const calculateWastePercentage = () => {
    const sleeperVolume = calculateSleeperVolume();
    const plankVolume = calculatePlankVolume();
    
    if (sleeperVolume === 0) return '0.00';
    
    const wasteVolume = sleeperVolume - plankVolume;
    const wastePercentage = (wasteVolume / sleeperVolume) * 100;
    
    return Math.max(0, wastePercentage).toFixed(2);
  };

  // Update the calculateWaste function
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

    // You can add more logic here if needed
    return wastePercentage;
  };

  // First, add a validation function
  const validateForm = () => {
    if (!selectedWoodType) {
      return 'Please select a wood type';
    }
    if (!serialNumber) {
      return 'Serial number is required';
    }
    if (sleeperSizes.length === 0) {
      return 'At least one sleeper size is required';
    }
    return null;
  };

  // First, let's define the allowed status types
  type OperationStatus = 'draft' | 'in_progress' | 'completed';

  // Update the handleSave function
  const handleSave = async () => {
    let attempt = 0;
    
    while (attempt < MAX_RETRIES) {
      try {
        const session = await supabase.auth.getSession();
        if (!session.data.session) {
          throw new Error('No active session');
        }

        const wastePercentage = parseFloat(calculateWastePercentage());

        // Determine status - only draft or in_progress for saves
        let status: OperationStatus;
        if (startTime) {
          status = 'in_progress';
        } else {
          status = 'draft';
        }

        // If no serial number (new operation), generate one
        if (!serialNumber) {
          setSerialNumber(generateSerialNumber());
        }

        // Save operation with appropriate status
        const operationData = {
          id: operationId || undefined,
          serial_number: serialNumber,
          wood_type_id: selectedWoodType!.id,
          user_id: session.data.session.user.id,
          start_time: startTime,
          sleeper_sizes: sleeperSizes,
          plank_sizes: plankSizes,
          status: status,
          waste_percentage: wastePercentage,
          notes: operationNotes, // Add this line
          updated_at: new Date().toISOString()
        };

        console.log('Saving operation with data:', operationData);

        const { data: savedOperation, error: saveError } = await supabase
          .from('wood_slicing_operations')
          .upsert(operationData)
          .select()
          .single();

        if (saveError) {
          console.error('Save error details:', saveError);
          throw new Error(saveError.message);
        }

        // Update the operationId if this was a new save
        if (!operationId) {
          setOperationId(savedOperation.id);
        }

        setError(null);
        return savedOperation;
      } catch (error: any) {
        console.error('Save error:', error);
        attempt++;
        if (attempt === MAX_RETRIES) {
          setError(error.message || 'Failed to save operation');
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      }
    }
  };

  const handleComplete = async () => {
    if (!operationId) {
      setError('Please save the operation first');
      return;
    }

    try {
      const wastePercentage = parseFloat(calculateWastePercentage());
      
      // Check if operation needs approval
      if (wastePercentage > 10) {
        // Check if there's a pending approval
        const { data: approvalRequests, error: approvalError } = await supabase
          .from('approval_requests')
          .select('status')
          .eq('operation_id', operationId)
          .eq('type', 'high_waste')
          .order('created_at', { ascending: false })
          .limit(1);

        if (approvalError) throw approvalError;

        const latestRequest = approvalRequests?.[0];
        
        if (!latestRequest || latestRequest.status !== 'approved') {
          // Create approval request if none exists
          if (!latestRequest) {
            const approvalData = {
              type: 'high_waste',
              operation_id: operationId,
              requestor_id: user.id, // Assuming user is from useUser() hook or similar auth context
              status: 'pending',
              notes: `Operation requires approval due to high waste percentage (${wastePercentage.toFixed(2)}%)`
            };

            await supabase.from('approval_requests').insert(approvalData);
          }
          
          setError('Cannot complete operation. Approval required for high waste percentage');
          return;
        }
      }

      // Complete the operation
      const { error: completeError } = await supabase
        .from('wood_slicing_operations')
        .update({ 
          status: 'completed',
          end_time: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', operationId);

      if (completeError) throw completeError;

      setError(null);
      // Optionally redirect or show success message
    } catch (error: any) {
      console.error('Complete error:', error);
      setError(error.message || 'Failed to complete operation');
    }
  };

  // Update fetchSavedOperations function
  const fetchSavedOperations = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('wood_slicing_operations')
        .select(`
          *,
          wood_type:wood_types(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSavedOperations(data || []);
    } catch (error) {
      console.error('Error fetching saved operations:', error);
      setError('Failed to load saved operations');
    } finally {
      setIsLoading(false);
    }
  };

  // Update the loadOperation function
  const loadOperation = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('wood_slicing_operations')
        .select(`
          *,
          wood_type:wood_types(*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      if (data) {
        setOperationId(data.id);
        setSerialNumber(data.serial_number);
        setSelectedWoodType(data.wood_type);
        setSleeperSizes(data.sleeper_sizes);
        setPlankSizes(data.plank_sizes);
        setStartTime(data.start_time);
        setOperationNotes(data.notes || ''); // Add this line
        setShowLoadDialog(false);
      }
    } catch (error) {
      console.error('Error loading operation:', error);
      setError('Failed to load operation');
    }
  };

  // Add this function to handle operation deletion
  const handleDeleteOperation = async (operationId: string) => {
    try {
      const result = await supabase
        .from('wood_slicing_operations')
        .delete()
        .eq('id', operationId)
        .select();

      if (result.error) throw result.error;

      // Update the local state to remove the deleted operation
      setSavedOperations(savedOperations.filter(op => op.id !== operationId));
    } catch (error: any) {
      console.error('Error deleting operation:', error);
      setError(error.message || 'Failed to delete operation');
    }
  };

  // Update the useEffect to fetch operations for both dialogs
  useEffect(() => {
    if (showLoadDialog || showCompletedDialog) {
      // Only fetch if we don't have any operations loaded yet
      if (savedOperations.length === 0) {
        fetchSavedOperations();
      }
    }
  }, [showLoadDialog, showCompletedDialog]);

  // Add this function to handle both start and end operations
  const handleOperationToggle = async () => {
    if (!selectedWoodType) return;

    if (!startTime) {
      // Starting operation
      setStartTime(new Date().toISOString());
      await handleSave(); // Save the operation as in_progress
    } else {
      // Show confirmation dialog before ending
      setShowEndDialog(true);
    }
  };

  // Update the EndOperationDialog component
  const EndOperationDialog = () => (
    <Dialog
      open={showEndDialog}
      onClose={() => setShowEndDialog(false)}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
        }
      }}
    >
      <DialogTitle sx={{ 
        borderBottom: `1px solid ${theme.palette.divider}`,
        px: 3,
        py: 2
      }}>
        End Operation
      </DialogTitle>
      <DialogContent sx={{ p: 3, mt: 2 }}>
        <Typography>
          Are you sure you want to end this operation? This action cannot be undone.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ 
        borderTop: `1px solid ${theme.palette.divider}`,
        px: 3,
        py: 2
      }}>
        <Button
          onClick={() => setShowEndDialog(false)}
          variant="outlined"
          size="small"
          sx={{
            borderRadius: 6,
            textTransform: 'none'
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={async () => {
            setShowEndDialog(false);
            // Call the end operation logic here
            try {
              const operationData = {
                id: operationId,
                status: 'completed',
                updated_at: new Date().toISOString()
              };

              const { error } = await supabase
                .from('wood_slicing_operations')
                .update(operationData)
                .eq('id', operationId)
                .select();

              if (error) throw error;

              // Reset the form
              setStartTime(null);
              setOperationId(null);
              setSerialNumber(generateSerialNumber());
              setSleeperSizes([defaultSleeperSize]);
              setPlankSizes([defaultPlankSize]);
              setSelectedWoodType(null);
            } catch (error: any) {
              console.error('Error ending operation:', error);
              setError(error.message || 'Failed to end operation');
            }
          }}
          variant="contained"
          color="error"
          size="small"
          sx={{
            borderRadius: 6,
            textTransform: 'none'
          }}
        >
          End Operation
        </Button>
      </DialogActions>
    </Dialog>
  );

  // Update the CompletedOperationsDialog component
  const CompletedOperationsDialog = () => (
    <Dialog
      open={showCompletedDialog}
      onClose={() => setShowCompletedDialog(false)}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle sx={{ 
        borderBottom: `1px solid ${theme.palette.divider}`,
        px: 3,
        py: 2
      }}>
        Completed Operations
      </DialogTitle>
      <DialogContent sx={{ p: 0 }}>
        {savedOperations.filter(op => op.status === 'completed').length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
            <Typography>No completed operations found</Typography>
          </Box>
        ) : (
          <List sx={{ py: 0 }}>
            {savedOperations
              .filter(op => op.status === 'completed')
              .map((operation) => {
                const { sleeperVolume } = calculateOperationVolumes(operation);
                return (
                  <ListItem
                    key={operation.id}
                    sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderBottom: `1px solid ${theme.palette.divider}`,
                      py: 2 
                    }}
                  >
                    <Box>
                      <Typography variant="subtitle1" sx={{ mb: 0.5 }}>
                        Operation #{operation.serial_number}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Wood Type: {operation.wood_type?.name} • 
                        Waste: {operation.waste_percentage?.toFixed(2)}% • 
                        Volume: {sleeperVolume} m³
                      </Typography>
                    </Box>
                    <Button
                      size="small"
                      onClick={() => setSelectedOperation(operation)}
                      sx={{
                        borderRadius: 6,
                        textTransform: 'none'
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
      <DialogActions sx={{ 
        borderTop: `1px solid ${theme.palette.divider}`,
        px: 2,
        py: 1.5,
        display: 'flex',
        justifyContent: 'space-between'
      }}>
        <Button
          onClick={() => {
            const completedOperations = savedOperations.filter(op => op.status === 'completed');
            generateCombinedReport(completedOperations);
          }}
          startIcon={<PrintIcon />}
          variant="contained"
          color="primary"
          size="small"
          sx={{ borderRadius: 6, textTransform: 'none' }}
        >
          Generate Combined Report
        </Button>
        <Button 
          onClick={() => setShowCompletedDialog(false)}
          variant="outlined"
          size="small"
          sx={{ borderRadius: 6, textTransform: 'none' }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );

  // Update the OperationDetailsDialog component
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
          sx: { 
            borderRadius: 2,
            border: 'none',
            '& .MuiDialog-paper': {
              border: 'none'
            }
          }
        }}
      >
        <DialogTitle sx={{ 
          borderBottom: `1px solid ${theme.palette.divider}`,
          px: 3,
          py: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          border: 'none'
        }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="h6">
              Operation Details
            </Typography>
            <Chip
              label={selectedOperation.serial_number}
              size="medium"
              color="primary"
            />
          </Stack>
        </DialogTitle>
        
        <DialogContent sx={{ 
          p: 3,
          border: 'none'
        }}>
          {/* Main Info Section - Single Line Boxes */}
          <Box sx={{ 
            display: 'flex', 
            gap: 2, 
            mb: 4,
            flexWrap: 'wrap'
          }}>
            {/* Wood Type Box */}
            <Paper 
              elevation={0} 
              sx={{ 
                p: 2, 
                borderRadius: 2,
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                minWidth: 200,
                flex: 1
              }}
            >
              <Typography variant="caption" color="text.secondary">
                Wood Type
              </Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 500, mt: 0.5 }}>
                {selectedOperation.wood_type?.name || 'Unknown'} 
                {selectedOperation.wood_type?.grade ? ` (Grade ${selectedOperation.wood_type.grade})` : ''}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Waste: {selectedOperation.waste_percentage?.toFixed(2)}%
              </Typography>
            </Paper>

            {/* Time Info Box */}
            <Paper 
              elevation={0} 
              sx={{ 
                p: 2, 
                borderRadius: 2,
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                minWidth: 200,
                flex: 1
              }}
            >
              <Typography variant="caption" color="text.secondary">
                Operation Time
              </Typography>
              <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                <Typography variant="body2">
                  Start: {format(new Date(selectedOperation.start_time || ''), 'PPpp')}
                </Typography>
                <Typography variant="body2">
                  End: {format(new Date(selectedOperation.updated_at), 'PPpp')}
                </Typography>
                <Typography variant="subtitle2" sx={{ color: 'primary.main', fontWeight: 500 }}>
                  Duration: {calculateDuration(selectedOperation)}
                </Typography>
              </Stack>
            </Paper>

            {/* Volume Info Box */}
            <Paper 
              elevation={0} 
              sx={{ 
                p: 2, 
                borderRadius: 2,
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                minWidth: 200,
                flex: 1
              }}
            >
              <Typography variant="caption" color="text.secondary">
                Volume Information
              </Typography>
              <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                <Typography variant="body1">
                  Total Sleeper Volume: {Number(calculateSleeperVolume()).toFixed(3)} m³
                </Typography>
                <Typography variant="body1">
                  Total Plank Volume: {Number(calculatePlankVolume()).toFixed(3)} m³
                </Typography>
                <Typography variant="subtitle2" sx={{ color: 'error.main', fontWeight: 500 }}>
                  Waste: {selectedOperation.waste_percentage?.toFixed(2)}%
                </Typography>
              </Stack>
            </Paper>
          </Box>

          {/* Sizes Tables Section */}
          <Stack spacing={3}>
            {/* Sleeper Sizes Table */}
            <Paper elevation={0} sx={{ p: 3, borderRadius: 2, bgcolor: 'background.paper' }}>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 500 }}>
                Sleeper Sizes ({selectedOperation.sleeper_sizes.length})
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>No.</TableCell>
                    <TableCell>Dimensions</TableCell>
                    <TableCell>Quantity</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {selectedOperation.sleeper_sizes.map((size, index) => (
                    <TableRow key={index}>
                      <TableCell>{size.sequence}</TableCell>
                      <TableCell>{formatSize(size)}</TableCell>
                      <TableCell>{size.quantity} pcs</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>

            {/* Plank Sizes Table */}
            <Paper elevation={0} sx={{ p: 3, borderRadius: 2, bgcolor: 'background.paper' }}>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 500 }}>
                Plank Sizes ({selectedOperation.plank_sizes.length})
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>No.</TableCell>
                    <TableCell>From Sleeper</TableCell>
                    <TableCell>Dimensions</TableCell>
                    <TableCell>Quantity</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {selectedOperation.plank_sizes.map((size, index) => (
                    <TableRow key={index}>
                      <TableCell>{size.sequence}</TableCell>
                      <TableCell>
                        {'parentSequence' in size ? `#${size.parentSequence}` : '-'}
                      </TableCell>
                      <TableCell>{formatSize(size)}</TableCell>
                      <TableCell>{size.quantity} pcs</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          </Stack>
        </DialogContent>
        
        <DialogActions sx={{ 
          borderTop: `1px solid ${theme.palette.divider}`,
          px: 3,
          py: 2,
          gap: 2
        }}>
          <Button
            onClick={handlePrint}
            startIcon={<PrintIcon />}
            variant="contained"
            size="small"
            sx={{ 
              borderRadius: 6,
              textTransform: 'none'
            }}
          >
            Generate Report
          </Button>
          
          <Button 
            onClick={() => setSelectedOperation(null)}
            variant="outlined"
            size="small"
            sx={{ 
              borderRadius: 6,
              textTransform: 'none'
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  // Update the LoadOperationDialog component
  const LoadOperationDialog = () => (
    <Dialog 
      open={showLoadDialog} 
      onClose={() => setShowLoadDialog(false)}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
        }
      }}
    >
      <DialogTitle sx={{ 
        borderBottom: `1px solid ${theme.palette.divider}`,
        px: 3,
        py: 2
      }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <FolderOpenIcon sx={{ color: theme.palette.primary.main }} />
          <Typography variant="h6">Load Saved Operation</Typography>
        </Stack>
      </DialogTitle>
      <DialogContent sx={{ p: 0 }}>
        {savedOperations.filter(op => op.status !== 'completed').length === 0 ? (
          <Box sx={{ 
            p: 4, 
            textAlign: 'center',
            color: theme.palette.text.secondary 
          }}>
            <Typography>No saved operations found</Typography>
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
                      borderBottom: `1px solid ${theme.palette.divider}`,
                      py: 2,
                      px: 2,
                      '&:hover': {
                        bgcolor: 'action.hover'
                      }
                    }}
                  >
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography variant="subtitle1" component="span" sx={{ fontWeight: 500 }}>
                          {operation.serial_number}
                        </Typography>
                        <Chip
                          label={operation.status}
                          size="small"
                          color={getStatusColor(operation.status)}
                          sx={{ textTransform: 'capitalize' }}
                        />
                      </Box>
                      
                      <Grid container spacing={2} sx={{ mt: 0.5 }}>
                        <Grid item xs={12} sm={4}>
                          <Typography variant="caption" color="text.secondary">
                            Wood Type
                          </Typography>
                          <Typography variant="body2">
                            {operation.wood_type?.name || 'Unknown'} 
                            {operation.wood_type?.grade ? `(Grade ${operation.wood_type.grade})` : ''}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <Typography variant="caption" color="text.secondary">
                            Total Sleeper Volume
                          </Typography>
                          <Typography variant="body2">
                            {sleeperVolume} m³
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <Typography variant="caption" color="text.secondary">
                            Total Plank Volume
                          </Typography>
                          <Typography variant="body2">
                            {plankVolume} m³
                          </Typography>
                        </Grid>
                      </Grid>

                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 1, 
                        mt: 1,
                        color: theme.palette.text.secondary 
                      }}>
                        <AccessTimeIcon sx={{ fontSize: '1rem' }} />
                        <Typography variant="body2">
                          {format(new Date(operation.updated_at), 'MMM d, yyyy h:mm a')}
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1, ml: 2 }}>
                      <Button
                        size="small"
                        onClick={() => loadOperation(operation.id)}
                        sx={{
                          borderRadius: 6,
                          textTransform: 'none'
                        }}
                      >
                        Load
                      </Button>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteOperation(operation.id)}
                        sx={{
                          color: theme.palette.error.main,
                          '&:hover': {
                            bgcolor: theme.palette.error.light
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
      <DialogActions sx={{ 
        borderTop: `1px solid ${theme.palette.divider}`,
        px: 2,
        py: 1.5
      }}>
        <Button 
          onClick={() => setShowLoadDialog(false)}
          variant="outlined"
          size="small"
          sx={{
            borderRadius: 6,
            textTransform: 'none'
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );

  // Add this helper function to parse Excel paste data
  const parseExcelData = (text: string): SleeperSize[] => {
    const rows = text.split('\n').filter(row => row.trim());
    return rows.map((row, index) => {
      const cells = row.split('\t');
      // Expecting format: Height(inches) Width(inches) Length(feet) Quantity
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

  // Add this component near your other components
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

    const handlePaste = () => {
      try {
        const sleepers = parseExcelData(pasteValue);
        onPaste(sleepers);
        onClose();
      } catch (error) {
        console.error('Error parsing paste data:', error);
      }
    };

    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>Paste Sleeper Data from Excel</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Format: Height(inches) Width(inches) Length(feet) Quantity
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
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
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button onClick={handlePaste} variant="contained">Import Sleepers</Button>
        </DialogActions>
      </Dialog>
    );
  };

  // Add this handler
  const handlePasteSleepers = (newSleepers: SleeperSize[]) => {
    setSleeperSizes(newSleepers);
  };

  if (isLoading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <CircularProgress />
      </Box>
    );
  }

  if (connectionError) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert 
          severity="error" 
          sx={{ 
            maxWidth: 600, 
            mx: 'auto' 
          }}
        >
          {connectionError}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      p: { xs: 2, sm: 3 },
      maxWidth: 1400,
      margin: '0 auto'
    }}>
      {/* Header Section */}
      <Paper
        elevation={0}
        sx={styles.headerPaper}
      >
        <Box sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          gap: 2
        }}>
          <Box>
            <Typography 
              variant="h5" 
              sx={{ 
                fontWeight: 600,
                color: 'white',
                mb: 0.5
              }}
            >
              Wood Slicing Operation
            </Typography>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 2,
              color: 'rgba(255, 255, 255, 0.9)'
            }}>
              <Typography variant="body2">
                Serial Number: {serialNumber}
              </Typography>
              {startTime && (
                <Chip 
                  label="In Progress"
                  size="small"
                  sx={{
                    bgcolor: 'rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    fontWeight: 500
                  }}
                />
              )}
            </Box>
          </Box>
          <Box sx={{ 
            display: 'flex', 
            gap: 1,
            alignItems: 'center' 
          }}>
            <Button
              variant="outlined"
              startIcon={<FolderOpenIcon />}
              onClick={() => {
                fetchSavedOperations();
                setShowLoadDialog(true);
              }}
              size="small"
              sx={{
                borderRadius: 6,
                textTransform: 'none',
                borderColor: 'rgba(255, 255, 255, 0.3)',
                color: 'white',
                px: 2,
                '&:hover': {
                  borderColor: 'rgba(255, 255, 255, 0.5)',
                  bgcolor: 'rgba(255, 255, 255, 0.1)'
                }
              }}
            >
              Load Operation
            </Button>
            <Button
              variant="outlined"
              onClick={() => {
                fetchSavedOperations();
                setShowCompletedDialog(true);
              }}
              size="small"
              sx={{
                borderRadius: 6,
                textTransform: 'none',
                borderColor: 'rgba(255, 255, 255, 0.3)',
                color: 'white',
                px: 2,
                '&:hover': {
                  borderColor: 'rgba(255, 255, 255, 0.5)',
                  bgcolor: 'rgba(255, 255, 255, 0.1)'
                }
              }}
            >
              Completed Operations
            </Button>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={isLoading}
              sx={{
                borderRadius: 6,
                textTransform: 'none',
                bgcolor: 'primary.main',
                px: 2,
                '&:hover': {
                  bgcolor: 'primary.dark'
                }
              }}
            >
              {operationId ? 'Update Progress' : 'Save Progress'}
            </Button>
            <Button
              variant="contained"
              color="success"
              onClick={handleComplete}
              disabled={isLoading || !operationId}
              sx={{
                borderRadius: 6,
                textTransform: 'none',
                bgcolor: 'success.main',
                px: 2,
                '&:hover': {
                  bgcolor: 'success.dark'
                }
              }}
            >
              Complete Operation
            </Button>
            <Button
              variant="contained"
              onClick={handleOperationToggle}
              size="small"
              sx={{
                borderRadius: 6,
                textTransform: 'none',
                bgcolor: startTime ? 'error.main' : 'primary.light',
                px: 2,
                '&:hover': {
                  bgcolor: startTime ? 'error.dark' : 'primary.main'
                }
              }}
            >
              {startTime ? 'End Operation' : 'Start Operation'}
            </Button>
          </Box>
        </Box>
      </Paper>

      {error && (
        <Alert 
          severity={error.includes('Approval required') ? 'warning' : 'error'} 
          sx={{ mb: 3 }}
        >
          {error}
        </Alert>
      )}

      {/* Main Content */}
      <Grid container spacing={2}>
        {/* Left Column */}
        <Grid item xs={12} lg={8}>
          {/* Wood Type Selection */}
          <Paper
            elevation={0}
            sx={{
              ...styles.contentPaper,
              mb: 2
            }}
          >
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 500 }}>
              Select Wood Type
            </Typography>
            <Autocomplete
              value={selectedWoodType}
              onChange={(_, newValue) => setSelectedWoodType(newValue)}
              options={woodTypes}
              getOptionLabel={(option) => `${option.name} (Grade ${option.grade})`}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              renderInput={(params) => (
                <TextField {...params} label="Wood Type" size="small" />
              )}
              loading={isLoading}
              sx={{ maxWidth: 400 }}
            />
          </Paper>

          {/* Sleeper and Plank Section */}
          <Paper
            elevation={0}
            sx={{
              ...styles.contentPaper,
              mb: 2
            }}
          >
            <Box sx={{ 
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 1.5
            }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                Sleepers and Planks
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  startIcon={<AddIcon />}
                  onClick={addSleeperSize}
                  variant="outlined"
                  size="small"
                >
                  Add New Sleeper
                </Button>
                <Button
                  onClick={() => setShowPasteDialog(true)}
                  variant="outlined"
                  size="small"
                >
                  Paste from Excel
                </Button>
              </Box>
            </Box>
            
            <Stack spacing={2}>
              {sleeperSizes.map((sleeper, sleeperIndex) => (
                <Paper 
                  key={sleeper.id}
                  elevation={0}
                  sx={{ 
                    p: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2
                  }}
                >
                  {/* Sleeper Section */}
                  <Box sx={{ mb: 2 }}>
                    <Typography 
                      variant="subtitle2" 
                      sx={{ 
                        mb: 1,
                        color: 'primary.main',
                        fontWeight: 500
                      }}
                    >
                      Sleeper #{sleeper.sequence}
                    </Typography>
                    <Grid container spacing={1.5}>
                      <Grid item xs={12} sm={6} md={3}>
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
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
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
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <DimensionInput
                          label="Length"
                          value={metersToFeet(sleeper.length || 0)}
                          onChange={(value) => {
                            const newSizes = [...sleeperSizes];
                            newSizes[sleeperIndex].length = feetToMeters(value);
                            setSleeperSizes(newSizes);
                            
                            // Update all associated planks with the same length
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
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <QuantityInput
                          value={sleeper.quantity}
                          onChange={(value) => {
                            const newSizes = [...sleeperSizes];
                            newSizes[sleeperIndex].quantity = value;
                            setSleeperSizes(newSizes);
                          }}
                        />
                      </Grid>
                    </Grid>
                  </Box>

                  {/* Planks Section */}
                  <Box sx={{ ml: 3, mt: 3 }}>
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      mb: 2
                    }}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Associated Planks
                      </Typography>
                      <Button
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={() => addPlankSize(sleeper.sequence)}
                      >
                        Add Plank
                      </Button>
                    </Box>
                    
                    <Stack spacing={2}>
                      {plankSizes
                        .filter(plank => plank.parentSequence === sleeper.sequence)
                        .map((plank, plankIndex) => (
                          <Box 
                            key={plank.id}
                            sx={{ 
                              p: 2,
                              borderRadius: 1,
                              bgcolor: 'grey.50',
                              position: 'relative'
                            }}
                          >
                            <Typography variant="caption" sx={{ mb: 1, display: 'block' }}>
                              Plank #{plank.sequence}
                            </Typography>
                            <Grid container spacing={1.5}>
                              <Grid item xs={12} sm={6} md={4}>
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
                              </Grid>
                              <Grid item xs={12} sm={6} md={4}>
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
                              </Grid>
                              <Grid item xs={12} sm={6} md={4}>
                                <QuantityInput
                                  value={plank.quantity}
                                  onChange={(value) => {
                                    const newSizes = [...plankSizes];
                                    const globalPlankIndex = newSizes.findIndex(p => p.id === plank.id);
                                    newSizes[globalPlankIndex].quantity = value;
                                    setPlankSizes(newSizes);
                                  }}
                                />
                              </Grid>
                              <Grid item xs={12}>
                                <Typography variant="caption" color="text.secondary">
                                  Length: {formatDimension(sleeperSizes.find(s => s.sequence === plank.parentSequence)?.length || 0, 'm')} 
                                  (inherited from Sleeper #{plank.parentSequence})
                                </Typography>
                              </Grid>
                            </Grid>
                            
                            {plankSizes.filter(p => p.parentSequence === sleeper.sequence).length > 1 && (
                              <IconButton
                                onClick={() => removePlankSize(plank.id)}
                                size="small"
                                sx={{
                                  position: 'absolute',
                                  top: -8,
                                  right: -8,
                                  width: 24,
                                  height: 24,
                                  bgcolor: 'error.main',
                                  color: 'white',
                                  '&:hover': {
                                    bgcolor: 'error.dark',
                                  },
                                  '& .MuiSvgIcon-root': {
                                    fontSize: '0.875rem'
                                  }
                                }}
                              >
                                <DeleteIcon />
                              </IconButton>
                            )}
                          </Box>
                      ))}
                    </Stack>
                  </Box>

                  {sleeperSizes.length > 1 && (
                    <IconButton
                      onClick={() => removeSleeperSize(sleeper.id)}
                      size="small"
                      sx={{
                        position: 'absolute',
                        top: -8,
                        right: -8,
                        width: 24,
                        height: 24,
                        bgcolor: 'error.main',
                        color: 'white',
                        '&:hover': {
                          bgcolor: 'error.dark',
                        },
                        '& .MuiSvgIcon-root': {
                          fontSize: '0.875rem'
                        }
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  )}
                </Paper>
              ))}
            </Stack>
          </Paper>
        </Grid>

        {/* Right Column - Results */}
        <Grid item xs={12} lg={4}>
          <Paper
            elevation={0}
            sx={styles.resultsPaper}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                Calculation Results
              </Typography>
              <Button
                variant="contained"
                onClick={calculateWaste}
                disabled={!selectedWoodType}
                sx={{
                  bgcolor: theme.palette.primary.main,
                  '&:hover': { bgcolor: theme.palette.primary.dark },
                  '&:disabled': { bgcolor: theme.palette.secondary.light }
                }}
              >
                Calculate Waste
              </Button>
            </Box>
            
            <Stack spacing={2}>
              <Paper 
                sx={{ 
                  p: 2, 
                  bgcolor: 'white',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  Total Sleeper Volume
                </Typography>
                <Typography variant="h6" sx={{ color: theme.palette.text.primary, mt: 1 }}>
                  {calculateSleeperVolume().toFixed(3)} m³
                </Typography>
              </Paper>

              <Paper 
                sx={{ 
                  p: 2, 
                  bgcolor: 'white',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  Total Plank Volume
                </Typography>
                <Typography variant="h6" sx={{ color: theme.palette.text.primary, mt: 1 }}>
                  {calculatePlankVolume().toFixed(3)} m³
                </Typography>
              </Paper>

              <Paper 
                sx={{ 
                  p: 2, 
                  bgcolor: 'white',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  Estimated Waste
                </Typography>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    color: theme.palette.error.main,
                    mt: 1,
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
      <LoadOperationDialog />
      <EndOperationDialog />
      <CompletedOperationsDialog />
      <OperationDetailsDialog />
      <Grid item xs={12}>
        {(sleeperSizes.some(size => size.height > 0 || size.width > 0 || size.length > 0) || 
          plankSizes.some(size => size.height > 0 || size.width > 0 || size.length > 0)) && (
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              mt: 2
            }}
          >
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 500 }}>
              Summary
            </Typography>
            
            <Stack spacing={3}>
              <SummarySectionTable 
                title="Sleeper Sizes Summary" 
                items={sleeperSizes} 
                type="sleeper"
                sleeperSizes={sleeperSizes}
              />
              <SummarySectionTable 
                title="Plank Sizes Summary" 
                items={plankSizes} 
                type="plank"
                sleeperSizes={sleeperSizes}
              />
            </Stack>
          </Paper>
        )}
      </Grid>
      <PasteSleeperDialog
        open={showPasteDialog}
        onClose={() => setShowPasteDialog(false)}
        onPaste={handlePasteSleepers}
      />
      {/* Add this inside the main form, before the Summary section */}
      <Paper
        elevation={0}
        sx={{
          ...styles.contentPaper,
          mb: 2
        }}
      >
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 500 }}>
          Operation Notes
        </Typography>
        <TextField
          fullWidth
          multiline
          rows={4}
          value={operationNotes}
          onChange={(e) => setOperationNotes(e.target.value)}
          placeholder="Add any notes about this operation..."
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 1,
              backgroundColor: 'background.paper',
            }
          }}
        />
      </Paper>
    </Box>
  );
};

const LoadOperationMenu = () => {
  const { savedOperations } = useWoodSlicerContext();

  if (!savedOperations.length) {
    return (
      <MenuItem disabled>
        <Typography variant="body2">No saved operations</Typography>
      </MenuItem>
    );
  }

  return savedOperations.map((operation: any) => (
    <MenuItem 
      key={operation.id} 
      onClick={(e) => {
        e.stopPropagation();
        handleLoadOperation(operation);
      }}
      sx={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        gap: 2,
        minWidth: '300px'
      }}
    >
      <Box>
        <Typography variant="body2">
          {operation.serial_number || 'No Serial'}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, color: 'text.secondary' }}>
          <Typography variant="caption">
            Sleeper: {Number(operation.total_sleeper_volume).toFixed(3)} m³
          </Typography>
          <Typography variant="caption">
            Plank: {Number(operation.total_plank_volume).toFixed(3)} m³
          </Typography>
        </Box>
        <Typography variant="caption" color="text.secondary">
          {new Date(operation.created_at).toLocaleDateString()}
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', gap: 1, ml: 2 }}>
        <Button
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onLoadOperation(operation);
          }}
          sx={{
            borderRadius: 6,
            textTransform: 'none'
          }}
        >
          Load
        </Button>
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            handleDeleteOperation(operation.id);
          }}
          sx={{
            color: 'error.main',
            '&:hover': {
              bgcolor: 'error.light'
            }
          }}
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Box>
    </MenuItem>
  ));
};

// Add this helper function to determine status chip color
const getStatusColor = (status: string): "default" | "primary" | "warning" | "success" => {
  switch (status) {
    case 'draft':
      return 'default';
    case 'in_progress':
      return 'primary';
    case 'completed':
      return 'success';
    default:
      return 'default';
  }
};

export default WoodSlicer; 