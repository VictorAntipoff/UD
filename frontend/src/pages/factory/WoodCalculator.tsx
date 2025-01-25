import { useState, useEffect, useCallback } from 'react';
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
  Chip,
  Checkbox
} from '@mui/material';
import CalculateIcon from '@mui/icons-material/Calculate';
import DeleteIcon from '@mui/icons-material/Delete';
import PrintIcon from '@mui/icons-material/Print';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import EditIcon from '@mui/icons-material/Edit';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { useAuth } from '../../hooks/useAuth';
import { supabase, testSupabaseConnection, checkTableExists } from '../../config/supabase';
import { SupabaseErrorBoundary } from '../../components/SupabaseErrorBoundary';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { WoodCalculationReport } from '../../components/reports/WoodCalculationReport';
import { MultipleWoodCalculationReport } from '../../components/reports/MultipleWoodCalculationReport';
import { useSnackbar } from 'notistack';

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
  const { enqueueSnackbar } = useSnackbar();
  const [selectedCalculations, setSelectedCalculations] = useState<string[]>([]);

  const currentFile = import.meta.url;

  // Memoize fetchData to prevent recreation on every render
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Fetch wood types
      const { data: woodTypesData, error: woodTypesError } = await supabase
        .from('wood_types')
        .select('*')
        .order('name');

      if (woodTypesError) throw woodTypesError;
      setWoodTypes(woodTypesData || []);

      // Fetch calculations
      const { data: historyData, error: historyError } = await supabase
        .from('calculations')
        .select(`
          id,
          user_id,
          wood_type_id,
          thickness,
          width,
          length,
          price_per_plank,
          volume_m3,
          planks_per_m3,
          price_per_m3,
          notes,
          created_at,
          wood_type:wood_types(*)
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (historyError) throw historyError;

      // Transform the data to match CalculationResult interface
      const transformedHistory = (historyData || []).map(calc => ({
        id: calc.id,
        userId: calc.user_id,
        dimensions: {
          thickness: calc.thickness || 0,
          width: calc.width || 0,
          length: calc.length || 0,
          pricePerPlank: calc.price_per_plank || 0,
          woodTypeId: calc.wood_type_id,
          notes: calc.notes || ''
        },
        volumeM3: calc.volume_m3 || 0,
        planksPerM3: calc.planks_per_m3 || 0,
        pricePerM3: calc.price_per_m3 || 0,
        timestamp: calc.created_at,
        woodType: calc.wood_type || defaultWoodType,
        notes: calc.notes || ''
      }));

      setHistory(transformedHistory);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Initial auth check and data fetch
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
      }
    };

    checkAuth();
  }, [navigate, fetchData]); // Remove woodTypes.length and history.length dependencies

  // Health check effect
  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();

    const checkHealth = async () => {
      try {
        const response = await axios.get('/api/health', {
          timeout: 5000,
          signal: controller.signal,
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        
        if (mounted && response.data?.uptime) {
          setUptime(response.data.uptime);
        }
      } catch (error) {
        if (mounted) {
          console.error('Health check failed:', error);
          setUptime('API Error');
        }
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Increased interval to 30 seconds

    return () => {
      mounted = false;
      controller.abort();
      clearInterval(interval);
    };
  }, []); // Empty dependency array

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

  const calculateVolume = useCallback(async () => {
    try {
      if (!dimensions.woodTypeId) {
        setError('Please select a wood type');
        return;
      }

      if (!dimensions.thickness || !dimensions.width || !dimensions.length) {
        setError('Please enter all dimensions');
        return;
      }

      if (!dimensions.pricePerPlank) {
        setError('Please enter price per plank');
        return;
      }

      // Convert dimensions to meters
      const thicknessM = dimensions.thickness * 0.0254; // inches to meters
      const widthM = dimensions.width * 0.0254;         // inches to meters
      const lengthM = dimensions.length * 0.3048;       // feet to meters

      // Calculate volume in cubic meters
      const volumeM3 = thicknessM * widthM * lengthM;

      // Calculate planks per cubic meter
      const planksPerM3 = 1 / volumeM3;

      // Calculate price per cubic meter
      const pricePerM3 = dimensions.pricePerPlank * planksPerM3;

      setResult({
        volumeM3,
        planksPerM3,
        pricePerM3
      });

      setError(null);
    } catch (error) {
      console.error('Calculation error:', error);
      setError('Failed to calculate. Please check your inputs.');
    }
  }, [dimensions]);

  const getCalculationData = (): CalculationResult | null => {
    if (!result || !dimensions.woodTypeId) return null;
    
    return {
      dimensions,
      volumeM3: result.volumeM3,
      planksPerM3: result.planksPerM3,
      pricePerM3: result.pricePerM3,
      timestamp: new Date().toISOString(),
      woodType: woodTypes.find(w => w.id === dimensions.woodTypeId) || defaultWoodType,
      notes: dimensions.notes,
      id: '',
      userId: user?.id || ''
    };
  };

  const copyCalculationToClipboard = useCallback((calculation: CalculationResult) => {
    const text = `Wood Calculation Details:
Wood Type: ${calculation.woodType.name} (Grade ${calculation.woodType.grade})
Dimensions: ${calculation.dimensions.thickness}″×${calculation.dimensions.width}″×${calculation.dimensions.length}′
Price per Plank: TZS ${formatNumber(calculation.dimensions.pricePerPlank)}
Volume: ${calculation.volumeM3.toFixed(4)} m³
Planks per m³: ${calculation.planksPerM3.toFixed(2)}
Price per m³: TZS ${formatNumber(calculation.pricePerM3)}
${calculation.notes ? `\nNotes: ${calculation.notes}` : ''}
Generated on: ${new Date().toLocaleString()}`;

    navigator.clipboard.writeText(text)
      .then(() => {
        enqueueSnackbar('Calculation copied to clipboard', { variant: 'success' });
      })
      .catch(() => {
        enqueueSnackbar('Failed to copy calculation', { variant: 'error' });
      });
  }, [enqueueSnackbar]);

  const saveCalculation = useCallback(async () => {
    try {
      if (!user?.id || !result || !dimensions.woodTypeId) {
        setError('Missing required data for saving');
        return;
      }

      const calculationData = {
        user_id: user.id,
        wood_type_id: dimensions.woodTypeId,
        thickness: dimensions.thickness,
        width: dimensions.width,
        length: dimensions.length,
        price_per_plank: dimensions.pricePerPlank,
        volume_m3: result.volumeM3,
        planks_per_m3: result.planksPerM3,
        price_per_m3: result.pricePerM3,
        notes: dimensions.notes || null
      };

      const { error: saveError } = await supabase
        .from('calculations')
        .insert([calculationData]);

      if (saveError) throw saveError;

      // Refresh data after saving
      await fetchData();
      setError(null);
    } catch (error) {
      console.error('Save error:', error);
      setError('Failed to save calculation');
    }
  }, [user?.id, dimensions, result, fetchData]);

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

  const loadCalculationFromHistory = useCallback((item: CalculationResult) => {
    // Set dimensions from history
    setDimensions({
      thickness: item.dimensions.thickness,
      width: item.dimensions.width,
      length: item.dimensions.length,
      pricePerPlank: item.dimensions.pricePerPlank,
      woodTypeId: item.woodType.id,
      notes: item.dimensions.notes
    });

    // Set result from history
    setResult({
      volumeM3: item.volumeM3,
      planksPerM3: item.planksPerM3,
      pricePerM3: item.pricePerM3
    });

    // Scroll to top of the calculator
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Show notification
    enqueueSnackbar('Calculation loaded from history', { 
      variant: 'success',
      autoHideDuration: 2000
    });
  }, [enqueueSnackbar]);

  const handleSelectCalculation = (id: string) => {
    setSelectedCalculations(prev => 
      prev.includes(id) 
        ? prev.filter(calcId => calcId !== id)
        : [...prev, id]
    );
  };

  const getSelectedCalculations = () => {
    return history.filter(calc => selectedCalculations.includes(calc.id));
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

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
            {result && getCalculationData() && (
              <>
                <PDFDownloadLink
                  document={
                    <WoodCalculationReport 
                      calculation={getCalculationData()!} 
                      timestamp={new Date().toISOString()}
                      user={{
                        email: user?.email || '',
                        name: user?.user_metadata?.full_name
                      }}
                    />
                  }
                  fileName={`wood-calculation-${new Date().toISOString().split('T')[0]}.pdf`}
                >
                  {({ loading, error }) => (
                    <Button
                      variant="outlined"
                      startIcon={<PrintIcon />}
                      disabled={loading || !result}
                      sx={{
                        borderColor: '#e1e8ed',
                        color: '#2c3e50',
                        '&:hover': {
                          borderColor: '#bdc3c7',
                          backgroundColor: '#f8f9fa'
                        }
                      }}
                    >
                      {loading ? 'Preparing PDF...' : 'Download PDF'}
                    </Button>
                  )}
                </PDFDownloadLink>

                <Button
                  variant="outlined"
                  startIcon={<ContentCopyIcon />}
                  onClick={() => copyCalculationToClipboard(getCalculationData()!)}
                  sx={{
                    borderColor: '#e1e8ed',
                    color: '#2c3e50',
                    '&:hover': {
                      borderColor: '#bdc3c7',
                      backgroundColor: '#f8f9fa'
                    }
                  }}
                >
                  Copy Details
                </Button>
              </>
            )}

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
                    <TableCell padding="checkbox">
                      <Checkbox
                        indeterminate={selectedCalculations.length > 0 && selectedCalculations.length < history.length}
                        checked={selectedCalculations.length === history.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedCalculations(history.map(calc => calc.id));
                          } else {
                            setSelectedCalculations([]);
                          }
                        }}
                      />
                    </TableCell>
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
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedCalculations.includes(item.id)}
                          onChange={() => handleSelectCalculation(item.id)}
                        />
                      </TableCell>
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
                          <Tooltip title="Load">
                            <IconButton 
                              size="small" 
                              onClick={() => loadCalculationFromHistory(item)}
                              sx={{ 
                                padding: 0.5,
                                '&:hover': {
                                  backgroundColor: '#e8f5e9',
                                  color: '#2e7d32'
                                }
                              }}
                            >
                              <EditIcon sx={{ fontSize: '1rem' }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Copy">
                            <IconButton 
                              size="small" 
                              onClick={() => copyCalculationToClipboard(item)}
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

          {selectedCalculations.length > 0 && (
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <PDFDownloadLink
                document={
                  <MultipleWoodCalculationReport
                    calculations={getSelectedCalculations()}
                    timestamp={new Date().toISOString()}
                    user={{
                      email: user?.email || '',
                      name: user?.user_metadata?.full_name
                    }}
                  />
                }
                fileName={`wood-calculations-${new Date().toISOString().split('T')[0]}.pdf`}
              >
                {({ loading }) => (
                  <Button
                    variant="contained"
                    startIcon={<PictureAsPdfIcon />}
                    disabled={loading}
                    sx={{
                      backgroundColor: '#2c3e50',
                      '&:hover': {
                        backgroundColor: '#34495e'
                      }
                    }}
                  >
                    Generate Combined Report ({selectedCalculations.length})
                  </Button>
                )}
              </PDFDownloadLink>
            </Box>
          )}

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Uptime: {uptime || 'Calculating...'}
            </Typography>
          </Box>
        </Box>
      </Container>
    </SupabaseErrorBoundary>
  );
} 