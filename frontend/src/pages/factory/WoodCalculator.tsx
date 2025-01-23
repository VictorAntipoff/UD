import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  TextField,
  Grid,
  Button,
  InputAdornment,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tooltip,
  Alert,
  CircularProgress,
  Chip
} from '@mui/material';
import CalculateIcon from '@mui/icons-material/Calculate';
import DeleteIcon from '@mui/icons-material/Delete';
import PrintIcon from '@mui/icons-material/Print';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useAuth } from '../../hooks/useAuth';
import { supabase, testSupabaseConnection, checkTableExists } from '../../config/supabase';
import { SupabaseErrorBoundary } from '../../components/SupabaseErrorBoundary';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

console.log('Environment Variables:', {
  url: import.meta.env.VITE_SUPABASE_URL,
  key: import.meta.env.VITE_SUPABASE_ANON_KEY
});

interface WoodType {
  id: string;
  name: string;
  description: string | null;
  density: number | null;
  grade: 'A' | 'B' | 'C' | 'D';
  origin: string | null;
}

interface PlankDimensions {
  thickness: number;
  width: number;
  length: number;
  pricePerPlank: number;
  woodTypeId: string;
  notes: string;
}

interface Calculation {
  id: string;
  user_id: string;
  wood_type_id: string;
  thickness: number;
  width: number;
  length: number;
  price_per_plank: number;
  volume_m3: number;
  planks_per_m3: number;
  price_per_m3: number;
  notes: string | null;
  created_at: string;
  wood_type: WoodType;
}

interface CalculationResult {
  dimensions: PlankDimensions;
  volumeM3: number;
  planksPerM3: number;
  pricePerM3: number;
  timestamp: string;
  woodType: WoodType;
  notes: string;
  id: string;
  userId: string;
}

// Update the formatNumber function to handle undefined/null values
const formatNumber = (num: number | null | undefined): string => {
  if (num === null || num === undefined) return '-';
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

// Update the default wood type to match the interface
const defaultWoodType: WoodType = {
  id: '',
  name: 'N/A',
  description: null,
  density: null,
  grade: 'A', // Using 'A' as default since grade is an enum
  origin: null
};

export default function WoodCalculator() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [dimensions, setDimensions] = useState<PlankDimensions>({
    thickness: 0,
    width: 0,
    length: 0,
    pricePerPlank: 0,
    woodTypeId: '',
    notes: ''
  });

  const [result, setResult] = useState<{
    volumeM3: number;
    planksPerM3: number;
    pricePerM3: number;
  } | null>(null);

  const [history, setHistory] = useState<CalculationResult[]>([]);
  const [woodTypes, setWoodTypes] = useState<WoodType[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dbConnected, setDbConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [uptime, setUptime] = useState<string>('');

  const currentFile = import.meta.url;

  const fetchData = async () => {
    try {
      // Check auth first
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        console.error('No valid session');
        setError('Please log in again');
        return;
      }

      setIsLoading(true);

      // Check if table exists
      const tableExists = await checkTableExists('wood_types');
      if (!tableExists) {
        console.error('wood_types table does not exist');
        setError('Database setup incomplete. Please contact support.');
        return;
      }

      // Try a simple query first
      const { error: testError } = await supabase
        .from('wood_types')
        .select('id')
        .limit(1)
        .single();

      if (testError) {
        console.error('Test query failed:', testError);
        setError('Database connection error. Please try again later.');
        return;
      }

      // Then fetch wood types
      const { data: woodTypesData, error: woodTypesError } = await supabase
        .from('wood_types')
        .select('*')
        .order('name');

      if (woodTypesError) {
        console.error('Error fetching wood types:', woodTypesError);
        setError('Failed to load wood types');
        return;
      }

      setWoodTypes(woodTypesData || []);

      // Then fetch calculations
      const { data: calculationsData, error: calculationsError } = await supabase
        .from('calculations')
        .select(`
          *,
          wood_type:wood_types(*)
        `)
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (calculationsError) {
        console.error('Error fetching calculations:', calculationsError);
        setError('Failed to load calculations');
        return;
      }

      setHistory(calculationsData.map(mapCalculationFromDB));
      setError(null);

    } catch (error) {
      console.error('Error in fetchData:', error);
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          const currentUrl = window.location.pathname + window.location.search;
          sessionStorage.setItem('redirectUrl', currentUrl);
          navigate('/login', { replace: true });
          return;
        }

        setIsLoading(true);

        const isConnected = await testSupabaseConnection();
        setDbConnected(isConnected);
        
        if (!isConnected) {
          setError('Unable to connect to database. Please try again later.');
          return;
        }

        await fetchData();

      } catch (error) {
        console.error('Auth check failed:', error);
        setError('Authentication failed. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    if (!woodTypes.length || !history.length) {
      checkAuth();
    }
  }, [navigate, woodTypes.length, history.length]);

  useEffect(() => {
    if (user && dbConnected) {
      fetchData();
    }
  }, [user, dbConnected]);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await axios.get('/api/health', {
          timeout: 5000,  // 5 second timeout
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        
        if (response.data && response.data.uptime) {
          setUptime(response.data.uptime);
        }
      } catch (error) {
        console.error('Health check failed:', error);
        setUptime('API Error');
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleInputChange = (field: keyof PlankDimensions) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.value;
    setDimensions(prev => ({
      ...prev,
      [field]: value === '' ? 0 : parseFloat(value)
    }));
  };

  const handlePriceChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = event.target.value.replace(/,/g, '').replace(/[^\d.]/g, '');
    const numericValue = parseFloat(rawValue) || 0;
    setDimensions(prev => ({
      ...prev,
      pricePerPlank: numericValue
    }));
  };

  const calculateVolume = () => {
    const { width, thickness, length, pricePerPlank } = dimensions;
    
    if (!width || !thickness || !length || !pricePerPlank) {
      setError('Please fill in all dimensions and price');
      return;
    }
    
    const widthMeters = width * 0.0254;
    const thicknessMeters = thickness * 0.0254;
    const lengthMeters = length * 0.3048;
    
    const plankVolumeM3 = widthMeters * thicknessMeters * lengthMeters;
    const planksPerM3 = plankVolumeM3 > 0 ? (1 / plankVolumeM3) : 0;
    const pricePerM3 = planksPerM3 * pricePerPlank;

    const newResult = {
      volumeM3: plankVolumeM3,
      planksPerM3: planksPerM3,
      pricePerM3: pricePerM3
    };

    setResult(newResult);
    setError(null);

    setHistory(prev => [{
      dimensions: { ...dimensions },
      ...newResult,
      timestamp: new Date().toLocaleString(),
      woodType: woodTypes.find(w => w.id === dimensions.woodTypeId) || defaultWoodType,
      notes: dimensions.notes,
      id: '',
      userId: user?.id || ''
    }, ...prev]);
  };

  const handlePrintCalculation = () => {
    if (!result) return;
    
    const printContent = `
      Wood Calculator Results
      ----------------------
      Dimensions: ${dimensions.thickness}"×${dimensions.width}"×${dimensions.length}'
      Wood Type: ${woodTypes.find(w => w.id === dimensions.woodTypeId)?.name || 'N/A'}
      Price per Plank: TZS ${formatNumber(dimensions.pricePerPlank)}
      Volume: ${result.volumeM3.toFixed(4)} m³
      Planks per m³: ${result.planksPerM3.toFixed(2)}
      Price per m³: TZS ${formatNumber(result.pricePerM3)}
      Notes: ${dimensions.notes}
      ----------------------
      Calculated on: ${new Date().toLocaleString()}
    `;

    const printWindow = window.open('', '', 'height=600,width=800');
    if (printWindow) {
      printWindow.document.write(`<pre>${printContent}</pre>`);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleCopyCalculation = (item: CalculationResult) => {
    setDimensions({
      thickness: item.dimensions.thickness,
      width: item.dimensions.width,
      length: item.dimensions.length,
      pricePerPlank: item.dimensions.pricePerPlank,
      woodTypeId: item.dimensions.woodTypeId,
      notes: item.dimensions.notes
    });
  };

  const saveCalculation = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        setError('Please log in again');
        return;
      }

      if (!result || !dimensions.woodTypeId) {
        setError('Missing required data');
        return;
      }

      const calculationData = {
        user_id: session.user.id,
        wood_type_id: dimensions.woodTypeId,
        thickness: Number(dimensions.thickness),
        width: Number(dimensions.width),
        length: Number(dimensions.length),
        price_per_plank: Number(dimensions.pricePerPlank),
        volume_m3: Number(result.volumeM3),
        planks_per_m3: Number(result.planksPerM3),
        price_per_m3: Number(result.pricePerM3),
        notes: dimensions.notes || null
      };

      const { error } = await supabase
        .from('calculations')
        .insert([calculationData])
        .select();

      if (error) throw error;

      await fetchData();
      setError('');

    } catch (error) {
      console.error('Error saving calculation:', error);
      setError('Failed to save calculation');
    }
  };

  const deleteCalculation = async (id: string) => {
    try {
      const { error } = await supabase
        .from('calculations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setHistory(prev => prev.filter(item => item.id !== id));
    } catch (error) {
      console.error('Error deleting calculation:', error);
    }
  };

  const mapCalculationFromDB = (item: Calculation): CalculationResult => ({
    id: item.id,
    userId: item.user_id,
    dimensions: {
      thickness: item.thickness,
      width: item.width,
      length: item.length,
      pricePerPlank: item.price_per_plank,
      woodTypeId: item.wood_type_id,
      notes: item.notes || ''
    },
    volumeM3: item.volume_m3,
    planksPerM3: item.planks_per_m3,
    pricePerM3: item.price_per_m3,
    timestamp: item.created_at,
    woodType: item.wood_type,
    notes: item.notes || ''
  });

  return (
    <SupabaseErrorBoundary>
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
          <Typography 
            variant="h5" 
            sx={{ 
              color: '#2c3e50',
              fontWeight: 500
            }}
          >
            Wood Calculator
          </Typography>
          {import.meta.env.DEV && (
            <Tooltip 
              title={`File: ${currentFile.split('/src/')[1]}`}
              arrow
            >
              <Chip
                label="Development"
                size="small"
                sx={{
                  backgroundColor: '#fbbf24',
                  color: '#78350f',
                  '& .MuiChip-label': {
                    fontWeight: 600
                  },
                  cursor: 'help'
                }}
              />
            </Tooltip>
          )}
        </Box>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={24} />
          </Box>
        ) : (
          <Box sx={{ py: 3 }}>
            <Typography 
              variant="h5"
              component="h1" 
              gutterBottom
              sx={{ 
                fontSize: '1.1rem',
                fontWeight: 500,
                color: '#2c3e50',
                mb: 2 
              }}
            >
              Wood Calculator
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Paper elevation={0} sx={{ 
              p: 3, 
              mb: 3,
              border: '1px solid #e1e8ed',
              borderRadius: 2
            }}>
              <Typography 
                variant="h6" 
                gutterBottom
                sx={{ 
                  fontSize: '0.95rem',
                  fontWeight: 500,
                  color: '#34495e',
                  mb: 2 
                }}
              >
                Plank Details
              </Typography>

              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Wood Type</InputLabel>
                <Select
                  value={dimensions.woodTypeId}
                  label="Wood Type"
                  onChange={(e) => setDimensions(prev => ({
                    ...prev,
                    woodTypeId: e.target.value as string
                  }))}
                  size="small"
                  sx={{
                    '& .MuiSelect-select': {
                      fontSize: '0.85rem'
                    }
                  }}
                >
                  {woodTypes.map((type) => (
                    <MenuItem 
                      key={type.id} 
                      value={type.id}
                      sx={{ fontSize: '0.85rem' }}
                    >
                      {type.name} - Grade {type.grade}
                      {type.origin && ` (${type.origin})`}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Thickness (inches)"
                    type="number"
                    value={dimensions.thickness || ''}
                    onChange={handleInputChange('thickness')}
                    size="small"
                    InputProps={{
                      endAdornment: <InputAdornment position="end">"</InputAdornment>
                    }}
                    sx={{ 
                      '& .MuiInputLabel-root': {
                        fontSize: '0.85rem'
                      },
                      '& .MuiInputBase-input': {
                        fontSize: '0.85rem'
                      }
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Width (inches)"
                    type="number"
                    value={dimensions.width || ''}
                    onChange={handleInputChange('width')}
                    size="small"
                    InputProps={{
                      endAdornment: <InputAdornment position="end">"</InputAdornment>
                    }}
                    sx={{ 
                      '& .MuiInputLabel-root': {
                        fontSize: '0.85rem'
                      },
                      '& .MuiInputBase-input': {
                        fontSize: '0.85rem'
                      }
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Length (feet)"
                    type="number"
                    value={dimensions.length || ''}
                    onChange={handleInputChange('length')}
                    size="small"
                    InputProps={{
                      endAdornment: <InputAdornment position="end">'</InputAdornment>
                    }}
                    sx={{ 
                      '& .MuiInputLabel-root': {
                        fontSize: '0.85rem'
                      },
                      '& .MuiInputBase-input': {
                        fontSize: '0.85rem'
                      }
                    }}
                  />
                </Grid>
              </Grid>

              <TextField
                fullWidth
                label="Price per Plank (TZS)"
                value={dimensions.pricePerPlank.toLocaleString()}
                onChange={handlePriceChange}
                size="small"
                InputProps={{
                  startAdornment: <InputAdornment position="start">TZS</InputAdornment>
                }}
                sx={{ 
                  mb: 3,
                  '& .MuiInputLabel-root': {
                    fontSize: '0.85rem'
                  },
                  '& .MuiInputBase-input': {
                    fontSize: '0.85rem'
                  }
                }}
              />

              <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Notes"
                  value={dimensions.notes}
                  onChange={(e) => setDimensions(prev => ({ 
                    ...prev, 
                    notes: e.target.value 
                  }))}
                  size="small"
                  placeholder="Add any additional notes here..."
                  sx={{ 
                    '& .MuiInputLabel-root': {
                      fontSize: '0.85rem'
                    },
                    '& .MuiInputBase-input': {
                      fontSize: '0.85rem'
                    }
                  }}
                />
              </Paper>

              <Button
                variant="contained"
                onClick={calculateVolume}
                startIcon={<CalculateIcon />}
                fullWidth
              >
                Calculate
              </Button>
            </Paper>

            <Paper elevation={0} sx={{ 
              p: 2,
              bgcolor: 'white',
              borderRadius: 2,
              border: '1px solid #e1e8ed',
              height: '100%',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <Typography 
                variant="subtitle1" 
                gutterBottom 
                sx={{ 
                  fontSize: '0.95rem',
                  fontWeight: 500,
                  color: '#34495e', 
                  mb: 1 
                }}
              >
                Results
              </Typography>
              
              {result ? (
                <Grid container spacing={1.5}>
                  <Grid item xs={12}>
                    <Paper elevation={0} sx={{ 
                      p: 1.5,
                      bgcolor: '#f8f9fa',
                      border: '1px solid #e1e8ed',
                      borderRadius: 2
                    }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                          Volume per Plank
                        </Typography>
                        <Typography variant="body1" sx={{ 
                          color: '#2c3e50', 
                          fontWeight: 500,
                          fontSize: '0.85rem'
                        }}>
                          {result.volumeM3.toFixed(4)} m³
                        </Typography>
                      </Box>
                    </Paper>
                  </Grid>
                  <Grid item xs={12}>
                    <Paper elevation={0} sx={{ 
                      p: 1.5,
                      bgcolor: '#f8f9fa',
                      border: '1px solid #e1e8ed',
                      borderRadius: 2
                    }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                          Planks per Cubic Meter
                        </Typography>
                        <Typography variant="body1" sx={{ 
                          color: '#2c3e50', 
                          fontWeight: 500,
                          fontSize: '0.85rem'
                        }}>
                          {result.planksPerM3.toFixed(2)} planks/m³
                        </Typography>
                      </Box>
                    </Paper>
                  </Grid>
                  <Grid item xs={12}>
                    <Paper elevation={0} sx={{ 
                      p: 1.5,
                      bgcolor: '#f8f9fa',
                      border: '1px solid #e1e8ed',
                      borderRadius: 2,
                      borderLeft: '4px solid #e74c3c'
                    }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                          Price per Cubic Meter
                        </Typography>
                        <Typography variant="body1" sx={{ 
                          color: '#e74c3c', 
                          fontWeight: 500,
                          fontSize: '0.85rem'
                        }}>
                          TZS {formatNumber(result.pricePerM3)}/m³
                        </Typography>
                      </Box>
                    </Paper>
                  </Grid>
                </Grid>
              ) : (
                <Box sx={{ 
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#95a5a6',
                  p: 2
                }}>
                  <Typography variant="body2">
                    Enter dimensions and price to see calculations
                  </Typography>
                </Box>
              )}
            </Paper>

            <Box sx={{ 
              display: 'flex', 
              gap: 2, 
              mt: 2,
              mb: 2,
              '& .MuiButton-root': {
                minWidth: 110,
                height: 36,
                textTransform: 'none',
                fontSize: '0.85rem'
              }
            }}>
              <Button
                variant="outlined"
                onClick={handlePrintCalculation}
                startIcon={<PrintIcon />}
                disabled={!result}
                sx={{
                  borderColor: '#e1e8ed',
                  color: '#2c3e50',
                  '&:hover': {
                    borderColor: '#bdc3c7',
                    backgroundColor: '#f8f9fa'
                  }
                }}
              >
                Print
              </Button>
              <Button
                variant="contained"
                onClick={saveCalculation}
                disabled={!result || !user?.id}
                sx={{
                  backgroundColor: '#2c3e50',
                  '&:hover': {
                    backgroundColor: '#34495e'
                  }
                }}
              >
                Save Calculation
              </Button>
            </Box>

            <Paper elevation={0} sx={{ 
              mt: 3, 
              p: 2,
              border: '1px solid #e1e8ed',
              borderRadius: 2
            }}>
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                mb: 2 
              }}>
                <Typography 
                  variant="subtitle1" 
                  sx={{ 
                    color: '#34495e',
                    fontSize: '0.95rem',
                    fontWeight: 500
                  }}
                >
                  Calculation History
                </Typography>
              </Box>

              <TableContainer>
                <Table size="small" sx={{
                  '& .MuiTableCell-root': {
                    fontSize: '0.8rem',
                    py: 1,
                    px: 1.5,
                    whiteSpace: 'nowrap'
                  },
                  '& .MuiTableCell-head': {
                    fontWeight: 600,
                    backgroundColor: '#f8f9fa',
                    color: '#2c3e50'
                  },
                  '& .MuiTableRow-root:hover': {
                    backgroundColor: '#f8f9fa'
                  },
                  '& .MuiTableBody-root .MuiTableRow-root:last-child .MuiTableCell-root': {
                    borderBottom: 'none'
                  }
                }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Time</TableCell>
                      <TableCell>Wood Type</TableCell>
                      <TableCell>Dimensions</TableCell>
                      <TableCell align="right">Price/Plank</TableCell>
                      <TableCell align="right">Volume</TableCell>
                      <TableCell align="right">Planks/m³</TableCell>
                      <TableCell align="right">Price/m³</TableCell>
                      <TableCell align="right" sx={{ width: '80px' }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {history.map((item) => (
                      <TableRow key={item.id} hover>
                        <TableCell>
                          {item.timestamp 
                            ? new Date(item.timestamp).toLocaleString(undefined, {
                                year: '2-digit',
                                month: 'numeric',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : '-'}
                        </TableCell>
                        <TableCell>
                          {item.woodType 
                            ? `${item.woodType.name} (${item.woodType.grade})`
                            : '-'}
                        </TableCell>
                        <TableCell>
                          {item.dimensions.thickness && item.dimensions.width && item.dimensions.length
                            ? `${item.dimensions.thickness}″×${item.dimensions.width}″×${item.dimensions.length}′`
                            : '-'}
                        </TableCell>
                        <TableCell align="right">
                          {item.dimensions.pricePerPlank 
                            ? `TZS ${formatNumber(item.dimensions.pricePerPlank)}`
                            : '-'}
                        </TableCell>
                        <TableCell align="right">
                          {item.volumeM3 
                            ? `${item.volumeM3.toFixed(4)}`
                            : '-'}
                        </TableCell>
                        <TableCell align="right">
                          {item.planksPerM3 
                            ? item.planksPerM3.toFixed(2)
                            : '-'}
                        </TableCell>
                        <TableCell align="right">
                          {item.pricePerM3 
                            ? `TZS ${formatNumber(item.pricePerM3)}`
                            : '-'}
                        </TableCell>
                        <TableCell align="right">
                          <Box sx={{ 
                            display: 'flex', 
                            justifyContent: 'flex-end', 
                            gap: 0.5 
                          }}>
                            <Tooltip title="Copy">
                              <IconButton 
                                size="small" 
                                onClick={() => handleCopyCalculation(item)}
                                sx={{ 
                                  padding: 0.5,
                                  '&:hover': {
                                    backgroundColor: '#f0f2f5'
                                  }
                                }}
                              >
                                <ContentCopyIcon sx={{ fontSize: '1rem' }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton 
                                size="small"
                                onClick={() => deleteCalculation(item.id)}
                                sx={{ 
                                  padding: 0.5,
                                  '&:hover': {
                                    backgroundColor: '#fee2e2',
                                    color: '#ef4444'
                                  }
                                }}
                              >
                                <DeleteIcon sx={{ fontSize: '1rem' }} />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                    {history.length === 0 && (
                      <TableRow>
                        <TableCell 
                          colSpan={8} 
                          align="center" 
                          sx={{ 
                            py: 4,
                            color: '#94a3b8',
                            fontSize: '0.875rem'
                          }}
                        >
                          No calculations yet
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Uptime: {uptime || 'Calculating...'}
              </Typography>
            </Box>
          </Box>
        )}
      </Container>
    </SupabaseErrorBoundary>
  );
} 