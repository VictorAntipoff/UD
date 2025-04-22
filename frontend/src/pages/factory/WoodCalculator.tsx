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
  MenuItem,
  Tooltip,
  CircularProgress,
  Chip,
  Checkbox
} from '@mui/material';
import CalculateIcon from '@mui/icons-material/Calculate';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import EditIcon from '@mui/icons-material/Edit';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { useAuth } from '../../hooks/useAuth';
import { supabase, testSupabaseConnection } from '../../config/supabase';
import { SupabaseErrorBoundary } from '../../components/SupabaseErrorBoundary';
import { useNavigate } from 'react-router-dom';
import { PDFDownloadLink, BlobProvider } from '@react-pdf/renderer';
import { WoodCalculationReport } from '../../components/reports/WoodCalculationReport';
import { MultipleWoodCalculationReport } from '../../components/reports/MultipleWoodCalculationReport';
import { useSnackbar } from 'notistack';
import type { CalculationResult, WoodType } from '../../types/calculations';
import type { PDFDownloadLinkProps as PDFProps } from '@react-pdf/renderer';

console.log('Environment Variables:', {
  url: import.meta.env.VITE_SUPABASE_URL,
  key: import.meta.env.VITE_SUPABASE_ANON_KEY
});

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

// Add this type for the render function props
// Removed unused type PDFRenderProps

const PDFDownloadButton: React.FC<{
  loading: boolean;
  text: string;
}> = ({ loading, text }) => (
  <Button
    variant="contained"
    startIcon={<PictureAsPdfIcon />}
    disabled={loading}
    sx={{
      height: '40px',
      width: '100%',
      borderRadius: '8px',
      textTransform: 'none',
      fontSize: '0.9rem',
      bgcolor: '#2c3e50',
      color: 'white',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      '&:hover': {
        bgcolor: '#34495e'
      }
    }}
  >
    {loading ? 'Generating...' : text}
  </Button>
);

interface PDFButtonWrapperProps {
  document: PDFProps['document'];
  fileName: string;
  text: string;
}

const PDFButtonWrapper: React.FC<PDFButtonWrapperProps> = ({ document, fileName, text }) => (
  <BlobProvider document={document}>
    {({ loading }) => (
      <PDFDownloadLink document={document} fileName={fileName}>
        <PDFDownloadButton loading={loading} text={text} />
      </PDFDownloadLink>
    )}
  </BlobProvider>
);

// Add these theme colors at the top
const theme = {
  colors: {
    primary: {
      main: '#dc2626', // red-600
      light: '#ef4444', // red-500
      dark: '#b91c1c', // red-700
      contrastText: '#ffffff'
    },
    secondary: {
      main: '#f1f5f9', // slate-100
      hover: '#e2e8f0' // slate-200
    },
    text: {
      primary: '#334155', // slate-700
      secondary: '#64748b' // slate-500
    },
    border: '#e2e8f0' // slate-200
  },
  transitions: {
    standard: 'all 0.3s ease-in-out'
  }
};

interface PlankDimensions {
  thickness: number;
  width: number;
  length: number;
  pricePerPlank: number;
  woodTypeId: string;
  notes: string;
  taxPercentage: number;
  isPriceWithVAT: boolean;
}

export default function WoodCalculator() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [dimensions, setDimensions] = useState<PlankDimensions>({
    thickness: 0,
    width: 0,
    length: 0,
    pricePerPlank: 0,
    woodTypeId: '',
    notes: '',
    taxPercentage: 18,
    isPriceWithVAT: false
  });

  const [result, setResult] = useState<{
    volumeM3: number;
    planksPerM3: number;
    pricePerM3: number;
    pricePerM3WithTax: number;
  } | null>(null);

  const [history, setHistory] = useState<CalculationResult[]>([]);
  const [woodTypes, setWoodTypes] = useState<WoodType[]>([]);
  const [, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { enqueueSnackbar } = useSnackbar();
  const [selectedCalculations, setSelectedCalculations] = useState<string[]>([]);

  const currentFile = import.meta.url;

  // Memoize fetchData to prevent recreation on every render
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // First fetch wood types
      const { data: woodTypesData, error: woodTypesError } = await supabase
        .from('wood_types')
        .select('*')
        .order('name') as { 
          data: WoodType[] | null; 
          error: Error | null 
        };

      if (woodTypesError) throw woodTypesError;
      setWoodTypes(woodTypesData || []);

      // Then fetch calculations with proper table name and join
      const { data, error } = await supabase
        .from('calculations') // Changed from 'wood_calculations' to 'calculations'
        .select(`
          *,
          wood_type:wood_types!wood_type_id(*)
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform the data
      const typedData: CalculationResult[] = data.map((item: any) => ({
        id: item.id,
        userId: item.user_id,
        dimensions: {
          thickness: item.thickness,
          width: item.width,
          length: item.length,
          pricePerPlank: item.price_per_plank,
          woodTypeId: item.wood_type_id,
          notes: item.notes || '',
          taxPercentage: item.tax_percentage || 0,
          isPriceWithVAT: false
        },
        volumeM3: item.volume_m3,
        planksPerM3: item.planks_per_m3,
        pricePerM3: item.price_per_m3,
        pricePerM3WithTax: item.price_per_m3 * (1 + (item.tax_percentage || 0) / 100),
        timestamp: item.created_at,
        woodType: item.wood_type || defaultWoodType,
        notes: item.notes || '',
        taxPercentage: item.tax_percentage || 0
      }));

      setHistory(typedData);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
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

      // Calculate prices based on whether input price includes VAT
      const priceWithoutVAT = dimensions.isPriceWithVAT
        ? dimensions.pricePerPlank / (1 + dimensions.taxPercentage / 100)
        : dimensions.pricePerPlank;

      const pricePerM3 = priceWithoutVAT * planksPerM3;
      const pricePerM3WithTax = pricePerM3 * (1 + dimensions.taxPercentage / 100);

      setResult({
        volumeM3,
        planksPerM3,
        pricePerM3,
        pricePerM3WithTax
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
      pricePerM3WithTax: result.pricePerM3WithTax,
      timestamp: new Date().toISOString(),
      woodType: woodTypes.find(w => w.id === dimensions.woodTypeId) || defaultWoodType,
      notes: dimensions.notes,
      id: '',
      userId: user?.id || '',
      taxPercentage: dimensions.taxPercentage
    };
  };

  const copyCalculationToClipboard = useCallback((calculation: CalculationResult) => {
    const text = `Wood Calculation Details:
Wood Type: ${calculation.woodType.name} (Grade ${calculation.woodType.grade})
Dimensions: ${calculation.dimensions.thickness}″×${calculation.dimensions.width}″×${calculation.dimensions.length}′
Price per Plank: TZS ${formatNumber(calculation.dimensions.pricePerPlank)}
Tax Rate: ${calculation.dimensions.taxPercentage}%
Volume: ${calculation.volumeM3.toFixed(4)} m³
Planks per m³: ${calculation.planksPerM3.toFixed(2)}
Price per m³ (Excl. Tax): TZS ${formatNumber(calculation.pricePerM3)}
Price per m³ (Incl. Tax): TZS ${formatNumber(calculation.pricePerM3WithTax)}
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
        enqueueSnackbar('Please fill in all required fields', { variant: 'error' });
        return;
      }

      // Calculate prices with and without VAT
      const priceWithoutVAT = dimensions.isPriceWithVAT
        ? dimensions.pricePerPlank / (1 + dimensions.taxPercentage / 100)
        : dimensions.pricePerPlank;

      const calculationData = {
        user_id: user.id,
        wood_type_id: dimensions.woodTypeId,
        thickness: dimensions.thickness,
        width: dimensions.width,
        length: dimensions.length,
        price_per_plank: priceWithoutVAT, // Always store the price without VAT
        tax_percentage: dimensions.taxPercentage, // Changed from vat_percentage to tax_percentage
        volume_m3: result.volumeM3,
        planks_per_m3: result.planksPerM3,
        price_per_m3: result.pricePerM3,
        notes: dimensions.notes || ''
      };

      const { error: saveError } = await supabase
        .from('calculations')
        .insert([calculationData]);

      if (saveError) {
        console.error('Supabase error:', saveError);
        throw new Error(saveError.message);
      }

      enqueueSnackbar('Calculation saved successfully', { variant: 'success' });
      await fetchData(); // Refresh the history
      setError(null);
    } catch (error) {
      console.error('Save error:', error);
      setError('Failed to save calculation');
      enqueueSnackbar('Failed to save calculation', { variant: 'error' });
    }
  }, [user?.id, dimensions, result, fetchData, enqueueSnackbar]);

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
      notes: item.dimensions.notes,
      taxPercentage: item.taxPercentage,
      isPriceWithVAT: true,
    });

    // Set result from history
    setResult({
      volumeM3: item.volumeM3,
      planksPerM3: item.planksPerM3,
      pricePerM3: item.pricePerM3,
      pricePerM3WithTax: item.pricePerM3
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
      <Container maxWidth="lg" sx={{ 
        py: 4,
        px: { xs: 2, sm: 3 },
        '& .MuiPaper-root': {
          transition: theme.transitions.standard
        }
      }}>
        {/* Header Section */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          mb: 4 
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography 
              variant="h4" 
              sx={{ 
                fontSize: { xs: '1.5rem', sm: '1.75rem' },
                fontWeight: 600,
                color: theme.colors.primary.main,
                transition: theme.transitions.standard
              }}
            >
              Wood Calculator
            </Typography>
            {import.meta.env.DEV && (
              <Tooltip title={`File: ${currentFile.split('/src/')[1]}`}>
                <Chip
                  label="Development"
                  size="small"
                  sx={{
                    bgcolor: 'warning.light',
                    color: 'warning.dark',
                    fontWeight: 600
                  }}
                />
              </Tooltip>
            )}
          </Box>
        </Box>

        {/* Calculator Section */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={7}>
            <Paper 
              elevation={0} 
              sx={{ 
                p: 3,
                height: '100%',
                border: '1px solid',
                borderColor: theme.colors.border,
                borderRadius: 2,
                bgcolor: 'background.paper',
                '&:hover': {
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                  borderColor: theme.colors.primary.light
                },
                transition: theme.transitions.standard
              }}
            >
              {/* Input Fields Section */}
              <Typography 
                variant="h6" 
                sx={{ 
                  mb: 3,
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  color: 'text.primary'
                }}
              >
                Plank Details
              </Typography>

              <TextField
                select
                fullWidth
                label="Wood Type"
                value={dimensions.woodTypeId}
                onChange={(e) => setDimensions(prev => ({
                  ...prev,
                  woodTypeId: e.target.value as string
                }))}
                size="small"
                sx={{ 
                  mb: 3,
                  '& .MuiInputLabel-root': {
                    fontSize: '0.85rem'
                  },
                  '& .MuiInputBase-input': {
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
              </TextField>

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

              <Box sx={{ mb: 3 }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={4}>
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
                      select
                      fullWidth
                      label="Price Type"
                      value={dimensions.isPriceWithVAT}
                      onChange={(e) => setDimensions((prev: PlankDimensions) => ({
                        ...prev,
                        isPriceWithVAT: e.target.value === 'true'
                      }))}
                      size="small"
                      sx={{ 
                        '& .MuiInputLabel-root': {
                          fontSize: '0.85rem'
                        },
                        '& .MuiInputBase-input': {
                          fontSize: '0.85rem'
                        }
                      }}
                    >
                      <MenuItem value="false" sx={{ fontSize: '0.85rem' }}>Price without VAT</MenuItem>
                      <MenuItem value="true" sx={{ fontSize: '0.85rem' }}>Price with VAT</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="VAT Percentage"
                      type="number"
                      value={dimensions.taxPercentage}
                      onChange={(e) => setDimensions(prev => ({
                        ...prev,
                        taxPercentage: parseFloat(e.target.value) || 0
                      }))}
                      size="small"
                      InputProps={{
                        endAdornment: <InputAdornment position="end">%</InputAdornment>
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
              </Box>

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
                sx={{
                  height: '40px',
                  borderRadius: '8px',
                  textTransform: 'none',
                  fontSize: '0.9rem',
                  bgcolor: theme.colors.primary.main,
                  '&:hover': {
                    bgcolor: theme.colors.primary.dark
                  },
                  transition: theme.transitions.standard
                }}
              >
                Calculate
              </Button>
            </Paper>
          </Grid>

          <Grid item xs={12} md={5}>
            <Paper 
              elevation={0} 
              sx={{ 
                p: 3,
                height: '100%',
                border: '1px solid',
                borderColor: theme.colors.border,
                borderRadius: 2,
                bgcolor: 'background.paper',
                '&:hover': {
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                  borderColor: theme.colors.primary.light
                },
                transition: theme.transitions.standard
              }}
            >
              {/* Results Section */}
              <Typography 
                variant="h6" 
                sx={{ 
                  mb: 3,
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  color: 'text.primary'
                }}
              >
                Results
              </Typography>

              {result ? (
                <Grid container spacing={1.5}>
                  <Grid item xs={12}>
                    <Paper elevation={0} sx={{ 
                      p: 1.5,
                      bgcolor: theme.colors.secondary.main,
                      border: `1px solid ${theme.colors.border}`,
                      borderRadius: 2,
                      '&:hover': {
                        bgcolor: theme.colors.secondary.hover,
                        transform: 'translateY(-2px)'
                      },
                      transition: theme.transitions.standard
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
                      bgcolor: theme.colors.secondary.main,
                      border: `1px solid ${theme.colors.border}`,
                      borderRadius: 2,
                      '&:hover': {
                        bgcolor: theme.colors.secondary.hover,
                        transform: 'translateY(-2px)'
                      },
                      transition: theme.transitions.standard
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
                      bgcolor: theme.colors.secondary.main,
                      border: `1px solid ${theme.colors.border}`,
                      borderRadius: 2,
                      '&:hover': {
                        bgcolor: theme.colors.secondary.hover,
                        transform: 'translateY(-2px)'
                      },
                      transition: theme.transitions.standard
                    }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                          Price per Cubic Meter (Excl. Tax)
                        </Typography>
                        <Typography variant="body1" sx={{ 
                          color: '#2c3e50', 
                          fontWeight: 500,
                          fontSize: '0.85rem'
                        }}>
                          TZS {formatNumber(result.pricePerM3)}/m³
                        </Typography>
                      </Box>
                    </Paper>
                  </Grid>
                  <Grid item xs={12}>
                    <Paper elevation={0} sx={{ 
                      p: 1.5,
                      bgcolor: theme.colors.secondary.main,
                      border: `1px solid ${theme.colors.border}`,
                      borderRadius: 2,
                      borderLeft: '4px solid #e74c3c',
                      '&:hover': {
                        bgcolor: theme.colors.secondary.hover,
                        transform: 'translateY(-2px)'
                      },
                      transition: theme.transitions.standard
                    }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                          Price per Cubic Meter (Incl. {dimensions.taxPercentage}% Tax)
                        </Typography>
                        <Typography variant="body1" sx={{ 
                          color: '#e74c3c', 
                          fontWeight: 500,
                          fontSize: '0.85rem'
                        }}>
                          TZS {formatNumber(result.pricePerM3WithTax)}/m³
                        </Typography>
                      </Box>
                    </Paper>
                  </Grid>
                  <Grid item xs={12}>
                    <Paper elevation={0} sx={{ 
                      p: 1.5,
                      bgcolor: theme.colors.secondary.main,
                      border: `1px solid ${theme.colors.border}`,
                      borderRadius: 2,
                      '&:hover': {
                        bgcolor: theme.colors.secondary.hover,
                        transform: 'translateY(-2px)'
                      },
                      transition: theme.transitions.standard
                    }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                            Price per Plank
                          </Typography>
                          <Box sx={{ textAlign: 'right' }}>
                            <Typography variant="body2" sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                              Without VAT: TZS {formatNumber(dimensions.isPriceWithVAT 
                                ? dimensions.pricePerPlank / (1 + dimensions.taxPercentage / 100)
                                : dimensions.pricePerPlank
                              )}
                            </Typography>
                            <Typography variant="body2" sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                              With VAT: TZS {formatNumber(dimensions.isPriceWithVAT 
                                ? dimensions.pricePerPlank
                                : dimensions.pricePerPlank * (1 + dimensions.taxPercentage / 100)
                              )}
                            </Typography>
                          </Box>
                        </Box>
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

              {/* Action Buttons */}
              <Box sx={{ 
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                mt: 3,
                width: '100%'
              }}>
                {result && getCalculationData() && (
                  <>
                    <Box sx={{ 
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: 2,
                      width: '100%'
                    }}>
                      <Button
                        variant="outlined"
                        startIcon={<ContentCopyIcon />}
                        onClick={() => copyCalculationToClipboard(getCalculationData()!)}
                        sx={{
                          height: '40px',
                          borderRadius: '8px',
                          textTransform: 'none',
                          fontSize: '0.9rem',
                          borderColor: theme.colors.border,
                          color: theme.colors.text.primary,
                          bgcolor: 'white',
                          '&:hover': {
                            borderColor: theme.colors.primary.light,
                            bgcolor: theme.colors.secondary.main
                          }
                        }}
                      >
                        Copy Details
                      </Button>

                      <Button
                        variant="contained"
                        onClick={saveCalculation}
                        disabled={!result || !user?.id}
                        sx={{
                          height: '40px',
                          borderRadius: '8px',
                          textTransform: 'none',
                          fontSize: '0.9rem',
                          bgcolor: theme.colors.primary.main,
                          color: 'white',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                          '&:hover': {
                            bgcolor: theme.colors.primary.dark
                          }
                        }}
                      >
                        Save Calculation
                      </Button>
                    </Box>

                    <PDFButtonWrapper
                      document={
                        <WoodCalculationReport
                          calculation={getCalculationData()!}
                          timestamp={new Date().toISOString()}
                          user={{
                            email: user?.email || '',
                            name: user?.user_metadata?.full_name || ''
                          }}
                        />
                      }
                      fileName={`wood-calculation-${new Date().toISOString().split('T')[0]}.pdf`}
                      text="Download Report"
                    />
                  </>
                )}
              </Box>
            </Paper>
          </Grid>
        </Grid>

        {/* History Section */}
        <Paper 
          elevation={0} 
          sx={{ 
            mt: 4,
            p: 3,
            border: '1px solid',
            borderColor: theme.colors.border,
            borderRadius: 2,
            bgcolor: 'background.paper',
            '&:hover': {
              boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
              borderColor: theme.colors.primary.light
            },
            transition: theme.transitions.standard
          }}
        >
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
                whiteSpace: 'nowrap',
                transition: theme.transitions.standard
              },
              '& .MuiTableCell-head': {
                fontWeight: 600,
                backgroundColor: theme.colors.secondary.main,
                color: theme.colors.text.primary
              },
              '& .MuiTableRow-root': {
                transition: theme.transitions.standard,
                '&:hover': {
                  backgroundColor: theme.colors.secondary.main
                }
              },
              '& .MuiIconButton-root': {
                transition: theme.transitions.standard,
                '&:hover': {
                  transform: 'scale(1.1)'
                }
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
            <PDFButtonWrapper
              document={
                <MultipleWoodCalculationReport
                  calculations={getSelectedCalculations()}
                  timestamp={new Date().toISOString()}
                  user={{
                    email: user?.email || '',
                    name: user?.user_metadata?.full_name || ''
                  }}
                />
              }
              fileName={`wood-calculations-${new Date().toISOString().split('T')[0]}.pdf`}
              text={`Generate Combined Report (${selectedCalculations.length})`}
            />
          </Box>
        )}
      </Container>
    </SupabaseErrorBoundary>
  );
} 