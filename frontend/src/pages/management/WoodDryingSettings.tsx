import { useState, useEffect, type FC } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Container,
  Grid,
  InputAdornment,
  Divider,
  Card,
  CardContent,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import ElectricBoltIcon from '@mui/icons-material/ElectricBolt';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import { alpha } from '@mui/material/styles';
import api from '../../lib/api';
import colors from '../../styles/colors';

interface DryingSettings {
  ovenPurchasePrice: string;
  ovenDepreciationRate: string;
  ovenLifespanYears: string;
  targetWoodHumidity: string;
  maintenanceCostPerYear: string;
  laborCostPerHour: string;
}

const defaultSettings: DryingSettings = {
  ovenPurchasePrice: '0',
  ovenDepreciationRate: '10',
  ovenLifespanYears: '10',
  targetWoodHumidity: '12',
  maintenanceCostPerYear: '0',
  laborCostPerHour: '0'
};

interface ElectricityStatistics {
  totalPaid: number;
  totalKwh: number;
  averagePricePerKwh: number;
  rechargeCount: number;
}

const WoodDryingSettings: FC = () => {
  const [settings, setSettings] = useState<DryingSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [electricityStats, setElectricityStats] = useState<ElectricityStatistics | null>(null);

  useEffect(() => {
    loadSettings();
    loadElectricityStats();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all settings
      const settingsToFetch = [
        'ovenPurchasePrice',
        'ovenDepreciationRate',
        'ovenLifespanYears',
        'targetWoodHumidity',
        'maintenanceCostPerYear',
        'laborCostPerHour'
      ];

      const loadedSettings: DryingSettings = { ...defaultSettings };

      await Promise.all(
        settingsToFetch.map(async (key) => {
          try {
            const response = await api.get(`/settings/${key}`);
            if (response.data && response.data.value) {
              loadedSettings[key as keyof DryingSettings] = response.data.value;
            }
          } catch (err) {
            // Setting doesn't exist yet, use default
            console.log(`Setting ${key} not found, using default`);
          }
        })
      );

      setSettings(loadedSettings);
    } catch (err) {
      console.error('Error loading settings:', err);
      setError('Failed to load drying settings');
    } finally {
      setLoading(false);
    }
  };

  const loadElectricityStats = async () => {
    try {
      const response = await api.get('/electricity/statistics');
      setElectricityStats(response.data);
    } catch (err) {
      console.log('No electricity statistics available yet');
    }
  };

  const handleChange = (field: keyof DryingSettings) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setSettings({
      ...settings,
      [field]: event.target.value
    });
    setSuccess(false);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      // Save all settings
      await Promise.all(
        Object.entries(settings).map(async ([key, value]) => {
          await api.put(`/settings/${key}`, { value });
        })
      );

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving settings:', err);
      setError('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const calculateDepreciation = () => {
    const purchasePrice = parseFloat(settings.ovenPurchasePrice) || 0;
    const lifespan = parseFloat(settings.ovenLifespanYears) || 1;
    return (purchasePrice / lifespan).toFixed(2);
  };

  const calculateMonthlyDepreciation = () => {
    const annual = parseFloat(calculateDepreciation());
    return (annual / 12).toFixed(2);
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box
          display="flex"
          flexDirection="column"
          justifyContent="center"
          alignItems="center"
          minHeight="400px"
          gap={2}
        >
          <CircularProgress size={50} sx={{ color: '#dc2626' }} />
          <Typography variant="body1" color="text.secondary">
            Loading drying settings...
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 2, mb: 2 }}>
      {/* Header Section */}
      <Box
        sx={{
          mb: 2,
          p: 1.5,
          background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
          borderRadius: 1.5,
          boxShadow: '0 1px 3px rgba(220, 38, 38, 0.1)'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Box
            sx={{
              bgcolor: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '4px',
              p: 0.75,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mr: 1.5
            }}
          >
            <LocalFireDepartmentIcon sx={{ fontSize: 20, color: 'white' }} />
          </Box>
          <Box>
            <Typography variant="body1" component="h1" fontWeight="600" color="white" sx={{ fontSize: '1rem' }}>
              Wood Drying Settings
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '0.75rem' }}>
              Configure oven costs, depreciation, and operating expenses
            </Typography>
          </Box>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(false)}>
          Settings saved successfully!
        </Alert>
      )}

      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 2,
          borderRadius: 1.5,
          border: '1px solid',
          borderColor: 'divider',
          backgroundColor: colors.white
        }}
      >
        <Grid container spacing={2}>
          {/* Oven Cost Section */}
          <Grid item xs={12}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                mb: 1,
                p: 1,
                bgcolor: alpha('#dc2626', 0.05),
                borderRadius: 1,
                border: '1px solid',
                borderColor: alpha('#dc2626', 0.1)
              }}
            >
              <Box
                sx={{
                  bgcolor: '#dc2626',
                  borderRadius: '3px',
                  p: 0.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mr: 1
                }}
              >
                <LocalFireDepartmentIcon sx={{ color: 'white', fontSize: 16 }} />
              </Box>
              <Typography variant="body2" fontWeight="600" sx={{ color: '#dc2626', fontSize: '0.875rem' }}>
                Oven Costs
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Oven Purchase Price"
              type="number"
              value={settings.ovenPurchasePrice}
              onChange={handleChange('ovenPurchasePrice')}
              InputProps={{
                startAdornment: <InputAdornment position="start">TZS</InputAdornment>,
              }}
              helperText="Total cost of the drying oven"
              sx={{
                '& .MuiOutlinedInput-root': {
                  '&:hover fieldset': {
                    borderColor: '#dc2626',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#dc2626',
                  }
                },
                '& .MuiInputLabel-root.Mui-focused': {
                  color: '#dc2626',
                }
              }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Oven Lifespan"
              type="number"
              value={settings.ovenLifespanYears}
              onChange={handleChange('ovenLifespanYears')}
              InputProps={{
                endAdornment: <InputAdornment position="end">years</InputAdornment>,
              }}
              helperText="Expected lifespan of the oven"
              sx={{
                '& .MuiOutlinedInput-root': {
                  '&:hover fieldset': {
                    borderColor: '#dc2626',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#dc2626',
                  }
                },
                '& .MuiInputLabel-root.Mui-focused': {
                  color: '#dc2626',
                }
              }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Depreciation Rate"
              type="number"
              value={settings.ovenDepreciationRate}
              onChange={handleChange('ovenDepreciationRate')}
              InputProps={{
                endAdornment: <InputAdornment position="end">%</InputAdornment>,
              }}
              helperText="Annual depreciation percentage"
              sx={{
                '& .MuiOutlinedInput-root': {
                  '&:hover fieldset': {
                    borderColor: '#dc2626',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#dc2626',
                  }
                },
                '& .MuiInputLabel-root.Mui-focused': {
                  color: '#dc2626',
                }
              }}
            />
          </Grid>

          {/* Operating Costs Section */}
          <Grid item xs={12}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                mb: 1,
                mt: 1,
                p: 1,
                bgcolor: alpha('#dc2626', 0.05),
                borderRadius: 1,
                border: '1px solid',
                borderColor: alpha('#dc2626', 0.1)
              }}
            >
              <Box
                sx={{
                  bgcolor: '#dc2626',
                  borderRadius: '3px',
                  p: 0.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mr: 1
                }}
              >
                <AttachMoneyIcon sx={{ color: 'white', fontSize: 16 }} />
              </Box>
              <Typography variant="body2" fontWeight="600" sx={{ color: '#dc2626', fontSize: '0.875rem' }}>
                Operating Costs
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Maintenance Cost per Year"
              type="number"
              value={settings.maintenanceCostPerYear}
              onChange={handleChange('maintenanceCostPerYear')}
              InputProps={{
                startAdornment: <InputAdornment position="start">TZS</InputAdornment>,
                endAdornment: <InputAdornment position="end">/year</InputAdornment>,
              }}
              helperText="Annual maintenance and repair costs"
              sx={{
                '& .MuiOutlinedInput-root': {
                  '&:hover fieldset': {
                    borderColor: '#dc2626',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#dc2626',
                  }
                },
                '& .MuiInputLabel-root.Mui-focused': {
                  color: '#dc2626',
                }
              }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Labor Cost per Hour"
              type="number"
              value={settings.laborCostPerHour}
              onChange={handleChange('laborCostPerHour')}
              InputProps={{
                startAdornment: <InputAdornment position="start">TZS</InputAdornment>,
                endAdornment: <InputAdornment position="end">/hour</InputAdornment>,
              }}
              helperText="Hourly labor cost for operating the oven"
              sx={{
                '& .MuiOutlinedInput-root': {
                  '&:hover fieldset': {
                    borderColor: '#dc2626',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#dc2626',
                  }
                },
                '& .MuiInputLabel-root.Mui-focused': {
                  color: '#dc2626',
                }
              }}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Cost Summary Card */}
      <Card
        elevation={0}
        sx={{
          mb: 2,
          background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
          borderRadius: 1.5,
          boxShadow: '0 1px 3px rgba(220, 38, 38, 0.1)'
        }}
      >
        <CardContent sx={{ p: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
            <Box
              sx={{
                bgcolor: 'rgba(255, 255, 255, 0.2)',
                borderRadius: '4px',
                p: 0.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mr: 1
              }}
            >
              <TrendingDownIcon sx={{ color: 'white', fontSize: 16 }} />
            </Box>
            <Typography variant="body2" fontWeight="600" color="white" sx={{ fontSize: '0.875rem' }}>
              Calculated Values
            </Typography>
          </Box>
          <Grid container spacing={1.5}>
            <Grid item xs={12} md={6}>
              <Box
                sx={{
                  p: 1.5,
                  bgcolor: 'rgba(255, 255, 255, 0.15)',
                  borderRadius: 1,
                  border: '1px solid rgba(255, 255, 255, 0.2)'
                }}
              >
                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.9)', mb: 0.5, display: 'block', fontSize: '0.7rem' }}>
                  Annual Depreciation
                </Typography>
                <Typography variant="body1" fontWeight="700" color="white" sx={{ fontSize: '1.1rem' }}>
                  TZS {parseFloat(calculateDepreciation()).toLocaleString()}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box
                sx={{
                  p: 1.5,
                  bgcolor: 'rgba(255, 255, 255, 0.15)',
                  borderRadius: 1,
                  border: '1px solid rgba(255, 255, 255, 0.2)'
                }}
              >
                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.9)', mb: 0.5, display: 'block', fontSize: '0.7rem' }}>
                  Monthly Depreciation
                </Typography>
                <Typography variant="body1" fontWeight="700" color="white" sx={{ fontSize: '1.1rem' }}>
                  TZS {parseFloat(calculateMonthlyDepreciation()).toLocaleString()}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Save Button */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        <Button
          variant="contained"
          size="medium"
          startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
          onClick={handleSave}
          disabled={saving}
          sx={{
            bgcolor: '#dc2626',
            px: 3,
            py: 1,
            borderRadius: 1,
            fontSize: '0.875rem',
            fontWeight: 600,
            textTransform: 'none',
            boxShadow: '0 1px 3px rgba(220, 38, 38, 0.2)',
            '&:hover': {
              bgcolor: '#b91c1c',
              boxShadow: '0 2px 6px rgba(220, 38, 38, 0.3)'
            },
            '&:disabled': {
              bgcolor: alpha('#dc2626', 0.5),
              color: 'white'
            }
          }}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </Box>
    </Container>
  );
};

export default WoodDryingSettings;
