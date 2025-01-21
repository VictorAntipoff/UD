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
  CircularProgress,
} from '@mui/material';
import { SectionLabel } from '../../components/SectionLabel';
import CalculateIcon from '@mui/icons-material/Calculate';
import DeleteIcon from '@mui/icons-material/Delete';
import PrintIcon from '@mui/icons-material/Print';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useAuth } from '../../hooks/useAuth';
import { supabase, testSupabaseConnection } from '../../config/supabase';
import { SupabaseErrorBoundary } from '../../components/SupabaseErrorBoundary';

console.log('Environment Variables:', {
  url: import.meta.env.VITE_SUPABASE_URL,
  key: import.meta.env.VITE_SUPABASE_ANON_KEY,
  password: import.meta.env.VITE_SUPABASE_USER_PASSWORD
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

// Add this helper function for formatting numbers with commas
const formatNumber = (num: number): string => {
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
  const { user, isAuthenticated } = useAuth();
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dbConnected, setDbConnected] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      window.location.href = '/login';
      return;
    }

    const checkConnection = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Check Supabase session
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          // Try to sign in with stored credentials
          const { error } = await supabase.auth.signInWithPassword({
            email: 'admin@example.com',
            password: import.meta.env.VITE_SUPABASE_USER_PASSWORD || 'Admin123'
          });
          if (error) {
            console.error('Supabase auth error:', error);
            setError('Authentication failed. Please log in again.');
            window.location.href = '/login';
            return;
          }
        }
        
        const isConnected = await testSupabaseConnection();
        setDbConnected(isConnected);
        if (!isConnected) {
          setError('Database connection failed. Please try again later.');
        }
      } catch (error) {
        console.error('Connection test failed:', error);
        setError('Database connection failed. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    checkConnection();
  }, [isAuthenticated]);

  // Update the data fetch useEffect
  useEffect(() => {
    const fetchData = async () => {
      if (!dbConnected || !user?.id) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // First fetch wood types
        const { data: woodTypesData, error: woodTypesError } = await supabase
          .from('wood_types')
          .select('*')
          .order('name');

        if (woodTypesError) {
          console.error('Wood types error:', woodTypesError);
          throw woodTypesError;
        }

        console.log('Wood types loaded:', woodTypesData);
        setWoodTypes(woodTypesData || []);

        // Then fetch calculations
        const { data: calculationsData, error: calculationsError } = await supabase
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
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (calculationsError) {
          console.error('Calculations error:', calculationsError);
          throw calculationsError;
        }

        console.log('Calculations loaded:', calculationsData);

        // Transform the data to match your interface
        const transformedCalculations: CalculationResult[] = (calculationsData || []).map(calc => ({
          id: calc.id,
          userId: calc.user_id,
          dimensions: {
            thickness: calc.thickness,
            width: calc.width,
            length: calc.length,
            pricePerPlank: calc.price_per_plank,
            woodTypeId: calc.wood_type_id,
            notes: calc.notes || ''
          },
          volumeM3: calc.volume_m3,
          planksPerM3: calc.planks_per_m3,
          pricePerM3: calc.price_per_m3,
          timestamp: new Date(calc.created_at).toLocaleString(),
          woodType: calc.wood_type || defaultWoodType,
          notes: calc.notes || ''
        }));

        setHistory(transformedCalculations);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (user && dbConnected) {
      fetchData();
    }
  }, [user, dbConnected]);

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
    // Remove commas and any non-numeric characters except decimal point
    const rawValue = event.target.value.replace(/,/g, '').replace(/[^\d.]/g, '');
    const numericValue = parseFloat(rawValue) || 0;
    setDimensions(prev => ({
      ...prev,
      pricePerPlank: numericValue
    }));
  };

  const calculateVolume = () => {
    const { width, thickness, length, pricePerPlank } = dimensions;
    
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

    // Update history with proper typing
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

  // Format price for display - move this closer to where it's used
  const formatPriceInput = (value: number): string => {
    if (value === 0) return '';
    return value.toLocaleString('en-US', {
      maximumFractionDigits: 0 // No decimal places for the input
    });
  };

  const displayPrice = formatPriceInput(dimensions.pricePerPlank);

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
    if (!result || !user?.id) return;

    try {
      const { error } = await supabase
        .from('calculations')
        .insert({
          user_id: user.id,
          wood_type_id: dimensions.woodTypeId,
          thickness: dimensions.thickness,
          width: dimensions.width,
          length: dimensions.length,
          price_per_plank: dimensions.pricePerPlank,
          volume_m3: result.volumeM3,
          planks_per_m3: result.planksPerM3,
          price_per_m3: result.pricePerM3,
          notes: dimensions.notes
        });

      if (error) throw error;

      // Refresh the history
      const { data: newHistory, error: fetchError } = await supabase
        .from('calculations')
        .select(`
          *,
          wood_type:wood_types(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setHistory(newHistory || []);

    } catch (error) {
      console.error('Error saving calculation:', error);
      setError('Failed to save calculation. Please try again.');
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

  return (
    <SupabaseErrorBoundary>
      <Container maxWidth="md">
        <Box sx={{ py: 3 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Box sx={{ 
              textAlign: 'center', 
              color: 'error.main',
              p: 4 
            }}>
              <Typography>{error}</Typography>
            </Box>
          ) : (
            <SectionLabel text="@WoodCalculator" color="error.light" position="top-left" />
          )}
          
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: 3,
            bgcolor: '#f8f9fa',
            borderRadius: 2,
            p: 3,
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
          }}>
            <Typography variant="h5" sx={{ 
              fontWeight: 600,
              color: '#2c3e50',
              borderBottom: '2px solid #e74c3c',
              pb: 1,
              display: 'inline-block',
              alignSelf: 'flex-start'
            }}>
              Wood Calculator
            </Typography>

            <Grid container spacing={3}>
              {/* Input Section */}
              <Grid item xs={12} md={6}>
                <Paper elevation={0} sx={{ 
                  p: 2.5, 
                  bgcolor: 'white',
                  borderRadius: 2,
                  border: '1px solid #e1e8ed'
                }}>
                  <Typography variant="subtitle1" gutterBottom sx={{ color: '#34495e', mb: 2 }}>
                    Plank Dimensions
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField
                      label="Thickness"
                      type="number"
                      value={dimensions.thickness || ''}
                      onChange={handleInputChange('thickness')}
                      InputProps={{
                        endAdornment: <InputAdornment position="end">inches</InputAdornment>
                      }}
                      variant="outlined"
                      fullWidth
                      size="small"
                      inputProps={{ step: "0.01", min: "0" }}
                    />
                    <TextField
                      label="Width"
                      type="number"
                      value={dimensions.width || ''}
                      onChange={handleInputChange('width')}
                      InputProps={{
                        endAdornment: <InputAdornment position="end">inches</InputAdornment>
                      }}
                      variant="outlined"
                      fullWidth
                      size="small"
                      inputProps={{ step: "0.01", min: "0" }}
                    />
                    <TextField
                      label="Length"
                      type="number"
                      value={dimensions.length || ''}
                      onChange={handleInputChange('length')}
                      InputProps={{
                        endAdornment: <InputAdornment position="end">feet</InputAdornment>
                      }}
                      variant="outlined"
                      fullWidth
                      size="small"
                      inputProps={{ step: "0.01", min: "0" }}
                    />
                    <TextField
                      label="Price per Plank"
                      value={displayPrice}
                      onChange={handlePriceChange}
                      InputProps={{
                        startAdornment: <InputAdornment position="start">TZS</InputAdornment>
                      }}
                      variant="outlined"
                      fullWidth
                      size="small"
                      inputProps={{ 
                        inputMode: 'numeric',
                        style: { textAlign: 'right' } // Right align the numbers
                      }}
                    />
                    <Button
                      variant="contained"
                      onClick={calculateVolume}
                      startIcon={<CalculateIcon />}
                      size="medium"
                      sx={{
                        mt: 1,
                        py: 1,
                        bgcolor: '#e74c3c',
                        '&:hover': {
                          bgcolor: '#c0392b',
                        }
                      }}
                    >
                      Calculate
                    </Button>
                  </Box>
                </Paper>
              </Grid>

              {/* Results Section */}
              <Grid item xs={12} md={6}>
                <Paper elevation={0} sx={{ 
                  p: 2,
                  bgcolor: 'white',
                  borderRadius: 2,
                  border: '1px solid #e1e8ed',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  <Typography variant="subtitle1" gutterBottom sx={{ color: '#34495e', mb: 1 }}>
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
                            <Typography variant="body2" color="text.secondary">
                              Volume per Plank
                            </Typography>
                            <Typography variant="body1" sx={{ color: '#2c3e50', fontWeight: 500 }}>
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
                            <Typography variant="body2" color="text.secondary">
                              Planks per Cubic Meter
                            </Typography>
                            <Typography variant="body1" sx={{ color: '#2c3e50', fontWeight: 500 }}>
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
                            <Typography variant="body2" color="text.secondary">
                              Price per Cubic Meter
                            </Typography>
                            <Typography variant="body1" sx={{ color: '#e74c3c', fontWeight: 500 }}>
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
              </Grid>
            </Grid>
          </Box>

          {/* Add Wood Type Selection and Notes */}
          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>Wood Type</InputLabel>
            <Select
              value={dimensions.woodTypeId}
              onChange={(e) => setDimensions(prev => ({ 
                ...prev, 
                woodTypeId: e.target.value as string 
              }))}
              label="Wood Type"
            >
              <MenuItem value="">
                <em>Select a wood type</em>
              </MenuItem>
              {woodTypes?.map(type => (
                <MenuItem key={type.id} value={type.id}>
                  {type.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            multiline
            rows={2}
            label="Notes (Optional)"
            value={dimensions.notes}
            onChange={(e) => setDimensions(prev => ({ ...prev, notes: e.target.value }))}
            size="small"
            sx={{ mb: 2 }}
          />

          {/* Add Print and Save buttons */}
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <Button
              variant="outlined"
              onClick={handlePrintCalculation}
              startIcon={<PrintIcon />}
              disabled={!result}
            >
              Print
            </Button>
            <Button
              variant="outlined"
              onClick={saveCalculation}
              disabled={!result}
            >
              Save
            </Button>
          </Box>

          {/* History Table */}
          <Paper elevation={0} sx={{ 
            mt: 3, 
            p: 2,
            border: '1px solid #e1e8ed',
            borderRadius: 2
          }}>
            <Typography variant="subtitle1" gutterBottom sx={{ color: '#34495e' }}>
              Calculation History
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Time</TableCell>
                    <TableCell>Dimensions (T×W×L)</TableCell>
                    <TableCell>Price/Plank</TableCell>
                    <TableCell>Volume</TableCell>
                    <TableCell>Planks/m³</TableCell>
                    <TableCell>Price/m³</TableCell>
                    <TableCell align="right">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {history.map((item, index) => (
                    <TableRow key={index} hover>
                      <TableCell>{item.timestamp}</TableCell>
                      <TableCell>
                        {`${item.dimensions.thickness}"×${item.dimensions.width}"×${item.dimensions.length}'`}
                      </TableCell>
                      <TableCell>TZS {formatNumber(item.dimensions.pricePerPlank)}</TableCell>
                      <TableCell>{item.volumeM3.toFixed(4)} m³</TableCell>
                      <TableCell>{item.planksPerM3.toFixed(2)}</TableCell>
                      <TableCell>TZS {formatNumber(item.pricePerM3)}</TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                          <Tooltip title="Copy calculation">
                            <IconButton 
                              size="small" 
                              onClick={() => handleCopyCalculation(item)}
                              sx={{ color: 'primary.main' }}
                            >
                              <ContentCopyIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton 
                              size="small" 
                              onClick={() => deleteCalculation(item.id)}
                              sx={{ color: '#e74c3c' }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                  {history.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 3, color: '#95a5a6' }}>
                        No calculations yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
      </Container>
    </SupabaseErrorBoundary>
  );
} 