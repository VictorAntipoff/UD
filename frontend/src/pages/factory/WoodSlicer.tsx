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
  TableRow
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { supabase } from '../../config/supabase';
import { useTheme, Theme } from '@mui/material/styles';
import { format } from 'date-fns';

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
  width: number;
  height: number;
  length: number;
  quantity: number;
}

interface PlankSize {
  id: string;
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
}

// First, add the conversion utilities at the top of the file after imports
const inchesToCm = (inches: number) => inches * 2.54;
const feetToMeters = (feet: number) => feet * 0.3048;
const cmToInches = (cm: number) => cm / 2.54;
const metersToFeet = (m: number) => m / 0.3048;

const defaultSleeperSize: SleeperSize = {
  id: crypto.randomUUID(),
  width: 0,
  height: 0,
  length: 0,
  quantity: 1
};

const defaultPlankSize: PlankSize = {
  id: crypto.randomUUID(),
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

// Add this component for the summary section
const SummarySectionTable = ({ 
  title, 
  items 
}: { 
  title: string;
  items: (SleeperSize | PlankSize)[];
}) => {
  const combinedItems = combineMatchingSizes(items);

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        borderRadius: 1,
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 500 }}>
        {title}
      </Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Height (in)</TableCell>
            <TableCell>Width (in)</TableCell>
            <TableCell>Length (ft)</TableCell>
            <TableCell align="right">Quantity</TableCell>
            <TableCell>Metric</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {combinedItems.map((item, index) => (
            <TableRow key={index}>
              <TableCell>{cmToInches(item.height).toFixed(2)}</TableCell>
              <TableCell>{cmToInches(item.width).toFixed(2)}</TableCell>
              <TableCell>{metersToFeet(item.length).toFixed(2)}</TableCell>
              <TableCell align="right">{item.totalQuantity}</TableCell>
              <TableCell>
                <Typography variant="caption" color="text.secondary">
                  {item.height}cm × {item.width}cm × {item.length}m
                </Typography>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
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
    generateSerialNumber();
    checkConnection();
  }, []);

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

  const generateSerialNumber = () => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
    setSerialNumber(`UDS-${year}${month}${day}-${random}`);
  };

  // Handlers for adding/removing sizes
  const addSleeperSize = () => {
    setSleeperSizes([...sleeperSizes, { ...defaultSleeperSize, id: crypto.randomUUID() }]);
  };

  const removeSleeperSize = (id: string) => {
    setSleeperSizes(sleeperSizes.filter(size => size.id !== id));
  };

  const addPlankSize = () => {
    setPlankSizes([...plankSizes, { ...defaultPlankSize, id: crypto.randomUUID() }]);
  };

  const removePlankSize = (id: string) => {
    setPlankSizes(plankSizes.filter(size => size.id !== id));
  };

  // Handler for starting the operation
  const handleStart = () => {
    setStartTime(new Date().toISOString());
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
    }, 0).toFixed(3);
  };

  const calculatePlankVolume = () => {
    return plankSizes.reduce((total, size) => {
      // Convert all dimensions to meters before calculating volume
      const width = (size.width || 0) / 100;   // cm to m
      const height = (size.height || 0) / 100;  // cm to m
      const length = (size.length || 0);        // already in meters
      const quantity = size.quantity || 1;

      const volume = width * height * length * quantity;
      return total + volume;
    }, 0).toFixed(3);
  };

  const calculateWastePercentage = () => {
    const sleeperVolume = parseFloat(calculateSleeperVolume());
    const plankVolume = parseFloat(calculatePlankVolume());
    
    if (sleeperVolume === 0) return '0.00';
    
    const wasteVolume = sleeperVolume - plankVolume;
    const wastePercentage = (wasteVolume / sleeperVolume) * 100;
    
    return Math.max(0, wastePercentage).toFixed(2);
  };

  // Update the calculateWaste function
  const calculateWaste = () => {
    if (!selectedWoodType || !startTime) return;

    const wastePercentage = parseFloat(calculateWastePercentage());
    const sleeperVolume = parseFloat(calculateSleeperVolume());
    const plankVolume = parseFloat(calculatePlankVolume());

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

  // Update the handleSave function
  const handleSave = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    let attempt = 0;

    while (attempt < MAX_RETRIES) {
      try {
        // Check connection first
        const isConnected = await checkConnection();
        if (!isConnected) {
          throw new Error('No connection to server');
        }

        // Get current session with timeout
        const sessionResult = await withTimeout(
          supabase.auth.getSession(),
          TIMEOUT_DURATION
        );

        const { data: { session }, error: sessionError } = sessionResult;
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          throw new Error('Authentication error');
        }

        if (!session) {
          throw new Error('Please sign in to save operations');
        }

        const operationData = {
          id: operationId || undefined,
          serial_number: serialNumber,
          wood_type_id: selectedWoodType!.id,
          user_id: session.user.id,
          start_time: startTime,
          sleeper_sizes: sleeperSizes,
          plank_sizes: plankSizes,
          status: startTime ? 'in_progress' : 'draft',
          waste_percentage: parseFloat(calculateWastePercentage()),
          updated_at: new Date().toISOString()
        };

        // Save with timeout
        const { error: saveError } = await withTimeout(
          supabase
            .from('wood_slicing_operations')
            .upsert(operationData)
            .select(),
          TIMEOUT_DURATION
        );

        if (saveError) {
          console.error('Save error:', saveError);
          throw saveError;
        }

        setError(null);
        return;

      } catch (error: any) {
        attempt++;
        console.error(`Save attempt ${attempt} failed:`, error);

        if (error.message === 'Request timed out') {
          setError('Connection timed out. Please check your internet connection.');
        } else if (attempt === MAX_RETRIES) {
          setError(
            error.message === 'Authentication error' 
              ? 'Please sign in again to continue'
              : error.message || 'Failed to save operation'
          );
        } else {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt));
        }
      }
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
      setShowLoadDialog(true);
    } catch (error) {
      console.error('Error fetching saved operations:', error);
      setError('Failed to load saved operations');
    } finally {
      setIsLoading(false);
    }
  };

  // Update loadOperation function
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

  // Add this useEffect to fetch operations when dialog opens
  useEffect(() => {
    if (showLoadDialog) {
      fetchSavedOperations();
    }
  }, [showLoadDialog]);

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
        {savedOperations.length === 0 ? (
          <Box sx={{ 
            p: 4, 
            textAlign: 'center',
            color: theme.palette.text.secondary 
          }}>
            <Typography>No saved operations found</Typography>
          </Box>
        ) : (
          <List sx={{ py: 0 }}>
            {savedOperations.map((operation) => {
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
                        color={
                          operation.status === 'completed' 
                            ? 'success'
                            : operation.status === 'in_progress'
                              ? 'warning'
                              : 'default'
                        }
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
              onClick={fetchSavedOperations}
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
              onClick={handleSave}
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
              Save Progress
            </Button>
            <Button
              variant="contained"
              onClick={handleStart}
              size="small"
              sx={{
                borderRadius: 6,
                textTransform: 'none',
                bgcolor: 'primary.light',
                px: 2,
                '&:hover': {
                  bgcolor: 'primary.main'
                }
              }}
            >
              Start Operation
            </Button>
          </Box>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
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

          {/* Sleeper Sizes Section */}
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
                Sleeper Sizes
              </Typography>
              <Button
                startIcon={<AddIcon />}
                onClick={addSleeperSize}
                variant="outlined"
                size="small"
                sx={{
                  py: 0.5,
                  fontSize: '0.75rem',
                  '& .MuiSvgIcon-root': {
                    fontSize: '1rem'
                  }
                }}
              >
                Add Size
              </Button>
            </Box>
            
            <Stack spacing={1}>
              {sleeperSizes.map((size, index) => (
                <Box 
                  key={size.id}
                  sx={{ 
                    position: 'relative',
                    p: 1.5,
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      borderColor: 'primary.main',
                      bgcolor: 'action.hover'
                    }
                  }}
                >
                  <Grid container spacing={1.5}>
                    <Grid item xs={12} sm={6} md={3}>
                      <DimensionInput
                        label="Height"
                        value={cmToInches(size.height || 0)}
                        onChange={(value) => {
                          const newSizes = [...sleeperSizes];
                          newSizes[index].height = inchesToCm(value);
                          setSleeperSizes(newSizes);
                        }}
                        unit="in"
                        convertedValue={size.height?.toFixed(1)}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <DimensionInput
                        label="Width"
                        value={cmToInches(size.width || 0)}
                        onChange={(value) => {
                          const newSizes = [...sleeperSizes];
                          newSizes[index].width = inchesToCm(value);
                          setSleeperSizes(newSizes);
                        }}
                        unit="in"
                        convertedValue={size.width?.toFixed(1)}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <DimensionInput
                        label="Length"
                        value={metersToFeet(size.length || 0)}
                        onChange={(value) => {
                          const newSizes = [...sleeperSizes];
                          newSizes[index].length = feetToMeters(value);
                          setSleeperSizes(newSizes);
                        }}
                        unit="feet"
                        convertedValue={size.length?.toFixed(2)}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <QuantityInput
                        value={size.quantity}
                        onChange={(value) => {
                          const newSizes = [...sleeperSizes];
                          newSizes[index].quantity = value;
                          setSleeperSizes(newSizes);
                        }}
                      />
                    </Grid>
                  </Grid>
                  
                  {sleeperSizes.length > 1 && (
                    <IconButton
                      onClick={() => removeSleeperSize(size.id)}
                      size="small"
                      sx={{
                        position: 'absolute',
                        top: -8,
                        right: -8,
                        width: 20,
                        height: 20,
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
          </Paper>

          {/* Plank Sizes Section */}
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
              mb: 2
            }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                Plank Sizes
              </Typography>
              <Button
                startIcon={<AddIcon />}
                onClick={addPlankSize}
                variant="outlined"
                size="small"
              >
                Add Plank Size
              </Button>
            </Box>
            
            <Stack spacing={0.5}>
              {plankSizes.map((size, index) => (
                <Box 
                  key={size.id}
                  sx={{ 
                    position: 'relative',
                    p: 2,
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      borderColor: 'primary.main',
                    }
                  }}
                >
                  <Grid container spacing={1.5}>
                    <Grid item xs={12} sm={6} md={3}>
                      <DimensionInput
                        label="Height"
                        value={cmToInches(size.height || 0)}
                        onChange={(value) => {
                          const newSizes = [...plankSizes];
                          newSizes[index].height = inchesToCm(value);
                          setPlankSizes(newSizes);
                        }}
                        unit="in"
                        convertedValue={size.height?.toFixed(1)}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <DimensionInput
                        label="Width"
                        value={cmToInches(size.width || 0)}
                        onChange={(value) => {
                          const newSizes = [...plankSizes];
                          newSizes[index].width = inchesToCm(value);
                          setPlankSizes(newSizes);
                        }}
                        unit="in"
                        convertedValue={size.width?.toFixed(1)}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <DimensionInput
                        label="Length"
                        value={metersToFeet(size.length || 0)}
                        onChange={(value) => {
                          const newSizes = [...plankSizes];
                          newSizes[index].length = feetToMeters(value);
                          setPlankSizes(newSizes);
                        }}
                        unit="feet"
                        convertedValue={size.length?.toFixed(2)}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <QuantityInput
                        value={size.quantity}
                        onChange={(value) => {
                          const newSizes = [...plankSizes];
                          newSizes[index].quantity = value;
                          setPlankSizes(newSizes);
                        }}
                      />
                    </Grid>
                  </Grid>
                  
                  {plankSizes.length > 1 && (
                    <IconButton
                      onClick={() => removePlankSize(size.id)}
                      sx={{
                        position: 'absolute',
                        top: -12,
                        right: -12,
                        bgcolor: 'error.main',
                        color: 'white',
                        width: 24,
                        height: 24,
                        '&:hover': {
                          bgcolor: 'error.dark',
                        },
                        '& .MuiSvgIcon-root': {
                          fontSize: '1rem'
                        }
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  )}
                </Box>
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
                disabled={!selectedWoodType || !startTime}
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
                  {calculateSleeperVolume()} m³
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
                  {calculatePlankVolume()} m³
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
      <Grid item xs={12}>
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
            />
            <SummarySectionTable 
              title="Plank Sizes Summary" 
              items={plankSizes} 
            />
          </Stack>
        </Paper>
      </Grid>
    </Box>
  );
};

export default WoodSlicer; 