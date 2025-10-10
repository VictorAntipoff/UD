import {
  Container,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Stack,
  MenuItem,
  CircularProgress,
  Card,
  CardContent,
  Divider,
  ToggleButtonGroup,
  ToggleButton,
  InputAdornment,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert
} from '@mui/material';
import { useState, useEffect } from 'react';
import { styled, alpha } from '@mui/material/styles';
import DryIcon from '@mui/icons-material/Dry';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import AssessmentIcon from '@mui/icons-material/Assessment';
import ElectricBoltIcon from '@mui/icons-material/ElectricBolt';
import OpacityIcon from '@mui/icons-material/Opacity';
import ThermostatIcon from '@mui/icons-material/Thermostat';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import TimelineIcon from '@mui/icons-material/Timeline';
import api from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';

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

interface WoodType {
  id: string;
  name: string;
  description?: string;
  grade: string;
}

interface DryingReading {
  id: string;
  dryingProcessId: string;
  readingTime: string;
  electricityMeter: number;
  humidity: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface DryingProcess {
  id: string;
  batchNumber: string;
  woodTypeId: string;
  woodType: WoodType;
  thickness: number;
  thicknessUnit?: string;
  pieceCount: number;
  startingHumidity?: number;
  startingElectricityUnits?: number;
  startTime: string;
  endTime?: string;
  status: string;
  totalCost?: number;
  notes?: string;
  readings: DryingReading[];
  createdAt: string;
  updatedAt: string;
}

export default function DryingProcess() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [processes, setProcesses] = useState<DryingProcess[]>([]);
  const [woodTypes, setWoodTypes] = useState<WoodType[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [readingDialogOpen, setReadingDialogOpen] = useState(false);
  const [selectedProcess, setSelectedProcess] = useState<DryingProcess | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const [newProcess, setNewProcess] = useState({
    woodTypeId: '',
    thickness: '',
    pieceCount: '',
    startingHumidity: '',
    startingElectricityUnits: '',
    startTime: new Date().toISOString().slice(0, 16),
    notes: ''
  });

  const [thicknessUnit, setThicknessUnit] = useState<'mm' | 'inch'>('mm');
  const [editThicknessUnit, setEditThicknessUnit] = useState<'mm' | 'inch'>('mm');

  const [editData, setEditData] = useState({
    woodTypeId: '',
    thickness: '',
    pieceCount: '',
    startingHumidity: '',
    startingElectricityUnits: '',
    startTime: '',
    notes: ''
  });

  const [newReading, setNewReading] = useState({
    electricityMeter: '',
    humidity: '',
    readingTime: new Date().toISOString().slice(0, 16),
    notes: ''
  });

  const [lukuSms, setLukuSms] = useState('');
  const [lukuError, setLukuError] = useState<string | null>(null);
  const [lukuSuccess, setLukuSuccess] = useState(false);
  const [annualDepreciation, setAnnualDepreciation] = useState<number>(0);

  useEffect(() => {
    fetchData();
    fetchOvenSettings();
  }, []);

  const fetchOvenSettings = async () => {
    try {
      // Fetch oven purchase price and lifespan to calculate annual depreciation
      const [purchasePriceRes, lifespanRes] = await Promise.all([
        api.get('/settings/ovenPurchasePrice').catch(() => ({ data: { value: '0' } })),
        api.get('/settings/ovenLifespanYears').catch(() => ({ data: { value: '10' } }))
      ]);

      const purchasePrice = parseFloat(purchasePriceRes.data?.value || '0');
      const lifespan = parseFloat(lifespanRes.data?.value || '10');
      const annualDep = purchasePrice / lifespan;

      setAnnualDepreciation(annualDep);
    } catch (error) {
      console.error('Error fetching oven settings:', error);
      setAnnualDepreciation(0);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [processesRes, woodTypesRes] = await Promise.all([
        api.get('/factory/drying-processes'),
        api.get('/factory/wood-types')
      ]);
      setProcesses(processesRes.data || []);
      setWoodTypes(woodTypesRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const convertToMm = (value: number, unit: 'mm' | 'inch'): number => {
    if (unit === 'inch') {
      return value * 25.4; // 1 inch = 25.4mm
    }
    return value;
  };

  const handleCreateProcess = async () => {
    try {
      const thicknessInMm = convertToMm(parseFloat(newProcess.thickness), thicknessUnit);

      const response = await api.post('/factory/drying-processes', {
        woodTypeId: newProcess.woodTypeId,
        thickness: thicknessInMm,
        thicknessUnit: thicknessUnit,
        pieceCount: parseInt(newProcess.pieceCount),
        startingHumidity: newProcess.startingHumidity ? parseFloat(newProcess.startingHumidity) : undefined,
        startingElectricityUnits: newProcess.startingElectricityUnits ? parseFloat(newProcess.startingElectricityUnits) : undefined,
        startTime: newProcess.startTime,
        notes: newProcess.notes
      });

      setProcesses([response.data, ...processes]);
      setCreateDialogOpen(false);
      setNewProcess({
        woodTypeId: '',
        thickness: '',
        pieceCount: '',
        startingHumidity: '',
        startingElectricityUnits: '',
        startTime: new Date().toISOString().slice(0, 16),
        notes: ''
      });
      setThicknessUnit('mm');
    } catch (error) {
      console.error('Error creating process:', error);
    }
  };

  const handleAddLuku = async () => {
    try {
      setLukuError(null);
      await api.post('/electricity/recharges/parse-sms', {
        smsText: lukuSms
      });
      setLukuSuccess(true);
      setLukuSms('');
      setTimeout(() => setLukuSuccess(false), 3000);
    } catch (error: any) {
      console.error('Error parsing luku SMS:', error);
      setLukuError(error.response?.data?.error || 'Failed to parse SMS. Please check the format.');
    }
  };

  const handleAddReading = async () => {
    if (!selectedProcess) return;

    try {
      await api.post(`/factory/drying-processes/${selectedProcess.id}/readings`, {
        electricityMeter: parseFloat(newReading.electricityMeter),
        humidity: parseFloat(newReading.humidity),
        readingTime: newReading.readingTime,
        notes: newReading.notes
      });

      // Refresh the process data
      await fetchData();
      setReadingDialogOpen(false);
      setNewReading({
        electricityMeter: '',
        humidity: '',
        readingTime: new Date().toISOString().slice(0, 16),
        notes: ''
      });
      setLukuSms('');
      setLukuError(null);
      setLukuSuccess(false);
    } catch (error) {
      console.error('Error adding reading:', error);
    }
  };

  const handleCompleteProcess = async (process: DryingProcess) => {
    try {
      // Check if we have enough readings
      const readings = process.readings;
      if (readings.length < 2) {
        alert('Need at least 2 readings to complete process');
        return;
      }

      await api.put(`/factory/drying-processes/${process.id}`, {
        status: 'COMPLETED',
        endTime: new Date().toISOString()
      });

      await fetchData();
    } catch (error) {
      console.error('Error completing process:', error);
    }
  };

  const handleDeleteProcess = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this drying process?')) {
      return;
    }

    try {
      await api.delete(`/factory/drying-processes/${id}`);
      setProcesses(processes.filter(p => p.id !== id));
    } catch (error) {
      console.error('Error deleting process:', error);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: any = {
      'IN_PROGRESS': '#3b82f6',
      'COMPLETED': '#10b981',
      'CANCELLED': '#ef4444'
    };
    return colors[status] || '#64748b';
  };

  const getStatusLabel = (status: string) => {
    const labels: any = {
      'IN_PROGRESS': 'In Progress',
      'COMPLETED': 'Completed',
      'CANCELLED': 'Cancelled'
    };
    return labels[status] || status;
  };

  const calculateElectricityUsed = (process: DryingProcess) => {
    if (!process.readings || process.readings.length === 0) return 0;

    // If we have starting electricity units, use that as baseline
    if (process.startingElectricityUnits) {
      const lastReading = process.readings[process.readings.length - 1].electricityMeter;
      return lastReading - process.startingElectricityUnits;
    }

    // Otherwise, use the difference between first and last reading
    if (process.readings.length < 2) return 0;
    const first = process.readings[0].electricityMeter;
    const last = process.readings[process.readings.length - 1].electricityMeter;
    return last - first;
  };

  // AI estimation algorithm - predicts completion time based on humidity trend
  const estimateCompletion = (process: DryingProcess) => {
    if (!process.readings || process.readings.length < 2) {
      return null;
    }

    const TARGET_HUMIDITY = 12; // Target humidity percentage
    const readings = process.readings;

    // Get humidity values with timestamps
    const dataPoints = [
      {
        time: new Date(process.startTime).getTime(),
        humidity: process.startingHumidity || readings[0].humidity,
        label: 'Initial'
      },
      ...readings.map(r => ({
        time: new Date(r.readingTime).getTime(),
        humidity: r.humidity,
        label: new Date(r.readingTime).toLocaleDateString()
      }))
    ];

    // Calculate linear regression for humidity decline
    const n = dataPoints.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

    dataPoints.forEach((point, i) => {
      sumX += i;
      sumY += point.humidity;
      sumXY += i * point.humidity;
      sumX2 += i * i;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // If humidity is increasing or not decreasing, can't estimate
    if (slope >= 0) {
      return {
        estimatedDays: null,
        estimatedDate: null,
        chartData: dataPoints.map((p, i) => ({
          index: i,
          actual: p.humidity,
          predicted: null,
          label: p.label
        })),
        message: 'Humidity not decreasing - unable to estimate'
      };
    }

    // Calculate when humidity will reach target
    const currentHumidity = readings[readings.length - 1].humidity;
    if (currentHumidity <= TARGET_HUMIDITY) {
      return {
        estimatedDays: 0,
        estimatedDate: new Date(),
        chartData: dataPoints.map((p, i) => ({
          index: i,
          actual: p.humidity,
          predicted: slope * i + intercept,
          label: p.label
        })),
        message: 'Target humidity reached!'
      };
    }

    // Predict future points
    const stepsToTarget = Math.ceil((currentHumidity - TARGET_HUMIDITY) / Math.abs(slope));
    const futurePoints = [];

    for (let i = n; i < n + stepsToTarget + 2; i++) {
      const predictedHumidity = slope * i + intercept;
      futurePoints.push({
        index: i,
        actual: null,
        predicted: Math.max(predictedHumidity, TARGET_HUMIDITY),
        label: 'Predicted'
      });
    }

    // Calculate estimated completion date
    const lastReadingTime = new Date(readings[readings.length - 1].readingTime).getTime();
    const avgTimeBetweenReadings = (lastReadingTime - new Date(process.startTime).getTime()) / (readings.length);
    const estimatedCompletionTime = lastReadingTime + (stepsToTarget * avgTimeBetweenReadings);
    const estimatedDate = new Date(estimatedCompletionTime);
    const daysFromNow = (estimatedCompletionTime - Date.now()) / (1000 * 60 * 60 * 24);

    return {
      estimatedDays: Math.max(0, daysFromNow),
      estimatedDate: estimatedDate,
      chartData: [
        ...dataPoints.map((p, i) => ({
          index: i,
          actual: p.humidity,
          predicted: slope * i + intercept,
          label: p.label
        })),
        ...futurePoints
      ],
      currentRate: Math.abs(slope).toFixed(2),
      targetHumidity: TARGET_HUMIDITY
    };
  };

  const openDetailsDialog = (process: DryingProcess) => {
    setSelectedProcess(process);
    setDetailsDialogOpen(true);
  };

  const openEditDialog = (process: DryingProcess) => {
    setSelectedProcess(process);
    setEditData({
      woodTypeId: process.woodTypeId,
      thickness: process.thickness.toString(),
      pieceCount: process.pieceCount.toString(),
      startingHumidity: process.startingHumidity?.toString() || '',
      startingElectricityUnits: process.startingElectricityUnits?.toString() || '',
      startTime: new Date(process.startTime).toISOString().slice(0, 16),
      notes: process.notes || ''
    });
    setEditThicknessUnit('mm'); // Always show stored value in mm
    setEditDialogOpen(true);
  };

  const handleUpdateProcess = async () => {
    if (!selectedProcess) return;

    try {
      const thicknessInMm = convertToMm(parseFloat(editData.thickness), editThicknessUnit);

      await api.put(`/factory/drying-processes/${selectedProcess.id}`, {
        woodTypeId: editData.woodTypeId,
        thickness: thicknessInMm,
        thicknessUnit: editThicknessUnit,
        pieceCount: parseInt(editData.pieceCount),
        startingHumidity: editData.startingHumidity ? parseFloat(editData.startingHumidity) : undefined,
        startingElectricityUnits: editData.startingElectricityUnits ? parseFloat(editData.startingElectricityUnits) : undefined,
        startTime: editData.startTime,
        notes: editData.notes
      });

      await fetchData();
      setEditDialogOpen(false);
    } catch (error) {
      console.error('Error updating process:', error);
    }
  };

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
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
              <DryIcon sx={{ fontSize: 28, color: 'white' }} />
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
                Drying Process Management
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontSize: '0.875rem',
                  mt: 0.5,
                }}
              >
                HF Vacuum Dryer Operations & Cost Tracking
              </Typography>
            </Box>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
            sx={{
              backgroundColor: 'white',
              color: '#dc2626',
              fontWeight: 600,
              fontSize: '0.875rem',
              textTransform: 'none',
              px: 3,
              py: 1,
              borderRadius: 2,
              boxShadow: 'none',
              '&:hover': {
                backgroundColor: '#f8fafc',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                transform: 'translateY(-2px)',
              },
              transition: 'all 0.2s ease',
            }}
          >
            New Drying Process
          </Button>
        </Box>
      </Paper>

      {/* Process List */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress sx={{ color: '#dc2626' }} />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {processes.map((process) => {
            const electricityUsed = calculateElectricityUsed(process);
            const currentHumidity = process.readings.length > 0
              ? process.readings[process.readings.length - 1].humidity
              : 0;

            return (
              <Grid item xs={12} key={process.id}>
                <Paper
                  elevation={0}
                  sx={{
                    borderRadius: 2,
                    border: '1px solid #e2e8f0',
                    overflow: 'hidden',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      boxShadow: '0 4px 12px rgba(220, 38, 38, 0.1)',
                      borderColor: '#dc2626',
                    }
                  }}
                >
                  {/* Process Header */}
                  <Box sx={{ p: 3, borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box
                          sx={{
                            backgroundColor: '#dc2626',
                            color: '#fff',
                            px: 2,
                            py: 1,
                            borderRadius: 1,
                            fontWeight: 700,
                            fontSize: '0.875rem'
                          }}
                        >
                          {process.batchNumber}
                        </Box>
                        <Chip
                          label={getStatusLabel(process.status)}
                          size="small"
                          sx={{
                            backgroundColor: getStatusColor(process.status),
                            color: '#fff',
                            fontWeight: 700,
                            fontSize: '0.75rem'
                          }}
                        />
                        <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.875rem' }}>
                          {process.woodType.name} • {process.thickness}mm • {process.pieceCount} pieces
                          {process.startingHumidity && ` • Initial humidity: ${process.startingHumidity}%`}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={1}>
                        <Button
                          size="small"
                          startIcon={<AddIcon />}
                          onClick={() => {
                            setSelectedProcess(process);
                            setReadingDialogOpen(true);
                          }}
                          sx={{
                            color: '#dc2626',
                            borderColor: '#dc2626',
                            fontSize: '0.75rem',
                            textTransform: 'none',
                            '&:hover': {
                              borderColor: '#b91c1c',
                              backgroundColor: alpha('#dc2626', 0.04),
                            }
                          }}
                          variant="outlined"
                        >
                          Add Reading
                        </Button>
                        {process.status === 'IN_PROGRESS' && (
                          <Button
                            size="small"
                            startIcon={<CheckCircleIcon />}
                            onClick={() => handleCompleteProcess(process)}
                            sx={{
                              color: '#10b981',
                              borderColor: '#10b981',
                              fontSize: '0.75rem',
                              textTransform: 'none',
                              '&:hover': {
                                borderColor: '#059669',
                                backgroundColor: alpha('#10b981', 0.04),
                              }
                            }}
                            variant="outlined"
                          >
                            Complete
                          </Button>
                        )}
                        <Button
                          size="small"
                          onClick={() => openDetailsDialog(process)}
                          sx={{
                            color: '#3b82f6',
                            borderColor: '#3b82f6',
                            fontSize: '0.75rem',
                            textTransform: 'none',
                            '&:hover': {
                              borderColor: '#2563eb',
                              backgroundColor: alpha('#3b82f6', 0.04),
                            }
                          }}
                          variant="outlined"
                        >
                          View Details
                        </Button>
                        {isAdmin && (
                          <IconButton
                            size="small"
                            onClick={() => openEditDialog(process)}
                            sx={{
                              color: '#f59e0b',
                              '&:hover': {
                                backgroundColor: alpha('#f59e0b', 0.1)
                              }
                            }}
                            title="Edit initial data (Admin only)"
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        )}
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteProcess(process.id)}
                          sx={{
                            color: '#ef4444',
                            '&:hover': {
                              backgroundColor: alpha('#ef4444', 0.1)
                            }
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </Box>
                  </Box>

                  {/* Process Stats */}
                  <Box sx={{ p: 3 }}>
                    <Grid container spacing={2}>
                      {process.startingHumidity && (
                        <Grid item xs={12} sm={6} md={3}>
                          <Card elevation={0} sx={{ backgroundColor: '#fef3c7', border: '1px solid #fde68a' }}>
                            <CardContent sx={{ p: 2 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                <OpacityIcon sx={{ fontSize: 20, color: '#f59e0b' }} />
                                <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>
                                  Starting Humidity
                                </Typography>
                              </Box>
                              <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b', fontSize: '1.25rem' }}>
                                {process.startingHumidity.toFixed(1)}%
                              </Typography>
                            </CardContent>
                          </Card>
                        </Grid>
                      )}

                      {process.readings && process.readings.length > 0 && (
                        <Grid item xs={12} sm={6} md={3}>
                          <Card elevation={0} sx={{ backgroundColor: '#fef3c7', border: '1px solid #fde68a' }}>
                            <CardContent sx={{ p: 2 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                <ElectricBoltIcon sx={{ fontSize: 20, color: '#f59e0b' }} />
                                <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>
                                  Current Electricity
                                </Typography>
                              </Box>
                              <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b', fontSize: '1.25rem' }}>
                                {process.readings[process.readings.length - 1].electricityMeter.toFixed(2)} Unit
                              </Typography>
                            </CardContent>
                          </Card>
                        </Grid>
                      )}

                      <Grid item xs={12} sm={6} md={3}>
                        <Card elevation={0} sx={{ backgroundColor: '#dcfce7', border: '1px solid #bbf7d0' }}>
                          <CardContent sx={{ p: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                              <ElectricBoltIcon sx={{ fontSize: 20, color: '#16a34a' }} />
                              <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>
                                Electricity Used
                              </Typography>
                            </Box>
                            <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b', fontSize: '1.25rem' }}>
                              {Math.abs(electricityUsed).toFixed(2)} Unit
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>

                      <Grid item xs={12} sm={6} md={3}>
                        <Card elevation={0} sx={{ backgroundColor: '#eff6ff', border: '1px solid #dbeafe' }}>
                          <CardContent sx={{ p: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                              <OpacityIcon sx={{ fontSize: 20, color: '#3b82f6' }} />
                              <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>
                                Current Humidity
                              </Typography>
                            </Box>
                            <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b', fontSize: '1.25rem' }}>
                              {currentHumidity.toFixed(1)}%
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>

                    </Grid>
                  </Box>

                  {/* Reading History - Collapsible */}
                  <Box sx={{ px: 3, pb: 3 }}>
                    <Accordion
                      elevation={0}
                      sx={{
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px !important',
                        '&:before': { display: 'none' }
                      }}
                    >
                      <AccordionSummary
                        expandIcon={<ExpandMoreIcon />}
                        sx={{
                          '& .MuiAccordionSummary-content': {
                            my: 1.5
                          }
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <AssessmentIcon sx={{ fontSize: 20, color: '#dc2626' }} />
                          <Typography variant="body1" sx={{ fontWeight: 600, color: '#1e293b' }}>
                            Reading History ({(process.readings?.length || 0) + 1} entries)
                          </Typography>
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails sx={{ pt: 0 }}>
                        <TableContainer>
                          <Table size="small">
                            <TableHead>
                              <TableRow sx={{ backgroundColor: '#f8fafc' }}>
                                <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#64748b' }}>Date & Time</TableCell>
                                <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#64748b' }}>Electricity (Unit)</TableCell>
                                <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#64748b' }}>Humidity (%)</TableCell>
                                <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#64748b' }}>Notes</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {/* Regular readings - reversed (newest first) */}
                              {process.readings && [...process.readings].reverse().map((reading, reverseIndex) => {
                                const index = process.readings.length - 1 - reverseIndex;
                                return (
                                  <TableRow
                                    key={reading.id}
                                    sx={{
                                      '&:hover': { backgroundColor: '#f8fafc' },
                                      '&:last-child td': { borderBottom: 0 }
                                    }}
                                  >
                                    <TableCell sx={{ fontSize: '0.813rem' }}>
                                      <Typography variant="body2" sx={{ fontWeight: 500, color: '#1e293b' }}>
                                        {new Date(reading.readingTime).toLocaleDateString('en-US', {
                                          year: 'numeric',
                                          month: '2-digit',
                                          day: '2-digit'
                                        })}
                                      </Typography>
                                      <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mt: 0.25 }}>
                                        {new Date(reading.readingTime).toLocaleTimeString('en-US', {
                                          hour: '2-digit',
                                          minute: '2-digit',
                                          second: '2-digit',
                                          hour12: false
                                        })}
                                      </Typography>
                                    </TableCell>
                                    <TableCell sx={{ fontSize: '0.813rem' }}>
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <ElectricBoltIcon sx={{ fontSize: 14, color: '#16a34a' }} />
                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                          {reading.electricityMeter.toFixed(2)}
                                        </Typography>
                                        {(() => {
                                          let prevReading = 0;
                                          if (index > 0) {
                                            prevReading = process.readings[index - 1].electricityMeter;
                                          } else if (process.startingElectricityUnits) {
                                            prevReading = process.startingElectricityUnits;
                                          }

                                          if (prevReading > 0) {
                                            return (
                                              <Chip
                                                label={`${(reading.electricityMeter - prevReading).toFixed(2)}`}
                                                size="small"
                                                sx={{
                                                  height: 18,
                                                  fontSize: '0.65rem',
                                                  backgroundColor: '#dcfce7',
                                                  color: '#16a34a',
                                                  fontWeight: 600,
                                                  ml: 0.5
                                                }}
                                              />
                                            );
                                          }
                                          return null;
                                        })()}
                                      </Box>
                                    </TableCell>
                                    <TableCell sx={{ fontSize: '0.813rem' }}>
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <OpacityIcon sx={{ fontSize: 14, color: '#3b82f6' }} />
                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                          {reading.humidity.toFixed(1)}%
                                        </Typography>
                                      </Box>
                                    </TableCell>
                                    <TableCell sx={{ fontSize: '0.813rem' }}>
                                      <Typography variant="body2" sx={{ color: '#64748b', fontStyle: reading.notes ? 'normal' : 'italic' }}>
                                        {reading.notes || 'No notes'}
                                      </Typography>
                                    </TableCell>
                                  </TableRow>
                                  );
                                })}

                              {/* Initial data row at bottom */}
                              <TableRow
                                sx={{
                                  '&:hover': { backgroundColor: '#f8fafc' },
                                  backgroundColor: '#fef3c7'
                                }}
                              >
                                <TableCell sx={{ fontSize: '0.813rem' }}>
                                  <Typography variant="body2" sx={{ fontWeight: 500, color: '#1e293b' }}>
                                    {new Date(process.startTime).toLocaleDateString('en-US', {
                                      year: 'numeric',
                                      month: '2-digit',
                                      day: '2-digit'
                                    })}
                                  </Typography>
                                  <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mt: 0.25 }}>
                                    {new Date(process.startTime).toLocaleTimeString('en-US', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                      second: '2-digit',
                                      hour12: false
                                    })}
                                  </Typography>
                                </TableCell>
                                <TableCell sx={{ fontSize: '0.813rem' }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <ElectricBoltIcon sx={{ fontSize: 14, color: '#f59e0b' }} />
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                      {process.startingElectricityUnits ? process.startingElectricityUnits.toFixed(2) : '-'}
                                    </Typography>
                                    <Chip
                                      label="Initial"
                                      size="small"
                                      sx={{
                                        height: 18,
                                        fontSize: '0.65rem',
                                        backgroundColor: '#fef3c7',
                                        color: '#f59e0b',
                                        fontWeight: 600,
                                        ml: 0.5
                                      }}
                                    />
                                  </Box>
                                </TableCell>
                                <TableCell sx={{ fontSize: '0.813rem' }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <OpacityIcon sx={{ fontSize: 14, color: '#3b82f6' }} />
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                      {process.startingHumidity ? process.startingHumidity.toFixed(1) : '-'}%
                                    </Typography>
                                  </Box>
                                </TableCell>
                                <TableCell sx={{ fontSize: '0.813rem' }}>
                                  <Typography variant="body2" sx={{ color: '#64748b', fontStyle: 'italic' }}>
                                    Initial data
                                  </Typography>
                                </TableCell>
                              </TableRow>
                              </TableBody>
                            </Table>
                          </TableContainer>
                        </AccordionDetails>
                      </Accordion>
                    </Box>

                  {/* AI Completion Estimation */}
                  {process.status === 'IN_PROGRESS' && process.readings && process.readings.length >= 2 && (
                    <Box sx={{ px: 3, pb: 3 }}>
                      {(() => {
                        const estimation = estimateCompletion(process);
                        if (!estimation) return null;

                        return (
                          <Accordion
                            elevation={0}
                            sx={{
                              border: '1px solid #e2e8f0',
                              borderRadius: '8px !important',
                              '&:before': { display: 'none' }
                            }}
                          >
                            <AccordionSummary
                              expandIcon={<ExpandMoreIcon />}
                              sx={{
                                '& .MuiAccordionSummary-content': {
                                  my: 1.5
                                }
                              }}
                            >
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <TimelineIcon sx={{ fontSize: 20, color: '#3b82f6' }} />
                                <Box>
                                  <Typography variant="body1" sx={{ fontWeight: 600, color: '#1e293b' }}>
                                    Completion Estimation
                                  </Typography>
                                  {estimation.estimatedDate && (
                                    <Typography variant="caption" sx={{ color: '#3b82f6', fontWeight: 600 }}>
                                      Expected: {estimation.estimatedDate.toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric'
                                      })} at {estimation.estimatedDate.toLocaleTimeString('en-US', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        hour12: true
                                      })}
                                    </Typography>
                                  )}
                                </Box>
                              </Box>
                            </AccordionSummary>
                            <AccordionDetails sx={{ pt: 0 }}>
                              {estimation.message ? (
                                <Alert severity="info" sx={{ mb: 2 }}>
                                  {estimation.message}
                                </Alert>
                              ) : (
                                <>
                                  <Grid container spacing={2} sx={{ mb: 3 }}>
                                    <Grid item xs={12} sm={4}>
                                      <Card elevation={0} sx={{ backgroundColor: '#eff6ff', border: '1px solid #dbeafe' }}>
                                        <CardContent sx={{ p: 2 }}>
                                          <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 0.5 }}>
                                            Estimated Completion
                                          </Typography>
                                          <Typography variant="h6" sx={{ fontWeight: 700, color: '#3b82f6', fontSize: '1rem' }}>
                                            {estimation.estimatedDate?.toLocaleDateString('en-US', {
                                              month: 'short',
                                              day: 'numeric',
                                              year: 'numeric'
                                            })}
                                          </Typography>
                                          <Typography variant="caption" sx={{ color: '#3b82f6', fontWeight: 600, display: 'block' }}>
                                            {estimation.estimatedDate?.toLocaleTimeString('en-US', {
                                              hour: '2-digit',
                                              minute: '2-digit',
                                              hour12: true
                                            })}
                                          </Typography>
                                          <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mt: 0.5 }}>
                                            {estimation.estimatedDays !== null && estimation.estimatedDays > 0
                                              ? `~${estimation.estimatedDays.toFixed(1)} days remaining`
                                              : 'Target reached!'}
                                          </Typography>
                                        </CardContent>
                                      </Card>
                                    </Grid>
                                    <Grid item xs={12} sm={4}>
                                      <Card elevation={0} sx={{ backgroundColor: '#f0fdf4', border: '1px solid #dcfce7' }}>
                                        <CardContent sx={{ p: 2 }}>
                                          <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 0.5 }}>
                                            Drying Rate
                                          </Typography>
                                          <Typography variant="h6" sx={{ fontWeight: 700, color: '#16a34a', fontSize: '1rem' }}>
                                            {estimation.currentRate}% per reading
                                          </Typography>
                                          <Typography variant="caption" sx={{ color: '#64748b' }}>
                                            Humidity decrease
                                          </Typography>
                                        </CardContent>
                                      </Card>
                                    </Grid>
                                    <Grid item xs={12} sm={4}>
                                      <Card elevation={0} sx={{ backgroundColor: '#fef3c7', border: '1px solid #fde68a' }}>
                                        <CardContent sx={{ p: 2 }}>
                                          <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 0.5 }}>
                                            Target Humidity
                                          </Typography>
                                          <Typography variant="h6" sx={{ fontWeight: 700, color: '#f59e0b', fontSize: '1rem' }}>
                                            {estimation.targetHumidity}%
                                          </Typography>
                                          <Typography variant="caption" sx={{ color: '#64748b' }}>
                                            Goal
                                          </Typography>
                                        </CardContent>
                                      </Card>
                                    </Grid>
                                  </Grid>

                                  {/* Chart */}
                                  <Box sx={{ width: '100%', height: 450, mb: 2 }}>
                                    <ResponsiveContainer>
                                      <LineChart
                                        data={estimation.chartData}
                                        margin={{ top: 30, right: 50, left: 20, bottom: 50 }}
                                      >
                                        <defs>
                                          <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05}/>
                                          </linearGradient>
                                          <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                                            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.3"/>
                                          </filter>
                                        </defs>
                                        <CartesianGrid
                                          strokeDasharray="3 3"
                                          stroke="#f0f0f0"
                                          strokeWidth={1}
                                          horizontal={true}
                                          vertical={false}
                                        />
                                        <XAxis
                                          dataKey="index"
                                          tick={{ fontSize: 13, fill: '#6b7280', fontWeight: 500 }}
                                          axisLine={{ stroke: '#e5e7eb', strokeWidth: 1 }}
                                          tickLine={false}
                                          height={60}
                                        />
                                        <YAxis
                                          tick={{ fontSize: 13, fill: '#6b7280', fontWeight: 500 }}
                                          axisLine={{ stroke: '#e5e7eb', strokeWidth: 1 }}
                                          tickLine={false}
                                          width={70}
                                          domain={[0, 'auto']}
                                          label={{
                                            value: 'Humidity (%)',
                                            angle: -90,
                                            position: 'insideLeft',
                                            offset: 0,
                                            style: { fontSize: 14, fontWeight: 700, fill: '#374151' }
                                          }}
                                        />
                                        <Tooltip
                                          contentStyle={{
                                            backgroundColor: '#ffffff',
                                            border: 'none',
                                            borderRadius: 10,
                                            padding: 15,
                                            boxShadow: '0 8px 16px rgba(0,0,0,0.15)'
                                          }}
                                          formatter={(value: any, name: string) => {
                                            if (value === null) return ['', ''];
                                            const color = name === 'Actual Humidity' ? '#3b82f6' : '#16a34a';
                                            return [
                                              <span style={{ fontWeight: 700, color, fontSize: 15 }}>
                                                {Number(value).toFixed(1)}%
                                              </span>,
                                              <span style={{ color: '#6b7280', fontSize: 13, fontWeight: 600 }}>{name}</span>
                                            ];
                                          }}
                                          labelFormatter={(label) => (
                                            <span style={{ fontWeight: 700, color: '#111827', fontSize: 14 }}>Reading #{label}</span>
                                          )}
                                          cursor={{ stroke: '#e5e7eb', strokeWidth: 2, strokeDasharray: '5 5' }}
                                        />
                                        <Legend
                                          wrapperStyle={{
                                            paddingTop: 20
                                          }}
                                          iconType="plainline"
                                          iconSize={20}
                                          formatter={(value) => (
                                            <span style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginLeft: 8 }}>
                                              {value}
                                            </span>
                                          )}
                                        />
                                        <ReferenceLine
                                          y={estimation.targetHumidity || 12}
                                          stroke="#f59e0b"
                                          strokeWidth={3}
                                          strokeDasharray="10 5"
                                          label={{
                                            value: `Target ${estimation.targetHumidity}%`,
                                            position: 'insideTopRight',
                                            fill: '#f59e0b',
                                            fontSize: 13,
                                            fontWeight: 700,
                                            offset: 15
                                          }}
                                        />
                                        <Line
                                          type="natural"
                                          dataKey="actual"
                                          stroke="#3b82f6"
                                          strokeWidth={2}
                                          dot={{
                                            fill: '#3b82f6',
                                            stroke: '#ffffff',
                                            strokeWidth: 2,
                                            r: 5
                                          }}
                                          activeDot={{
                                            r: 7,
                                            stroke: '#3b82f6',
                                            strokeWidth: 2,
                                            fill: '#ffffff'
                                          }}
                                          name="Actual Humidity"
                                          connectNulls={false}
                                        />
                                        <Line
                                          type="natural"
                                          dataKey="predicted"
                                          stroke="#16a34a"
                                          strokeWidth={2}
                                          strokeDasharray="8 4"
                                          dot={{
                                            fill: '#16a34a',
                                            stroke: '#ffffff',
                                            strokeWidth: 2,
                                            r: 4
                                          }}
                                          activeDot={{
                                            r: 6,
                                            stroke: '#16a34a',
                                            strokeWidth: 2,
                                            fill: '#ffffff'
                                          }}
                                          name="Predicted Trend"
                                          connectNulls={true}
                                        />
                                      </LineChart>
                                    </ResponsiveContainer>
                                  </Box>

                                  <Alert severity="info" icon={false} sx={{ mt: 2, backgroundColor: '#f0f9ff', border: '1px solid #bae6fd' }}>
                                    <Typography variant="caption" sx={{ color: '#0369a1', fontWeight: 500 }}>
                                      📊 Estimation uses linear regression to analyze humidity decline patterns and predict completion time
                                    </Typography>
                                  </Alert>
                                </>
                              )}
                            </AccordionDetails>
                          </Accordion>
                        );
                      })()}
                    </Box>
                  )}
                </Paper>
              </Grid>
            );
          })}

          {processes.length === 0 && (
            <Grid item xs={12}>
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <DryIcon sx={{ fontSize: 64, color: '#cbd5e1', mb: 2 }} />
                <Typography variant="h6" sx={{ color: '#64748b', mb: 1 }}>
                  No Drying Processes Yet
                </Typography>
                <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                  Create your first drying process to start tracking operations
                </Typography>
              </Box>
            </Grid>
          )}
        </Grid>
      )}

      {/* Create Process Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        disableRestoreFocus
        PaperProps={{
          sx: {
            borderRadius: 3,
          }
        }}
      >
        <DialogTitle sx={{ pb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <DryIcon sx={{ color: '#dc2626', fontSize: 28 }} />
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
              New Drying Process
            </Typography>
          </Box>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 3 }}>
          <Stack spacing={2.5}>
            <TextField
              select
              fullWidth
              label="Wood Type"
              value={newProcess.woodTypeId}
              onChange={(e) => setNewProcess({ ...newProcess, woodTypeId: e.target.value })}
              size="small"
              sx={textFieldSx}
            >
              {woodTypes.map((type) => (
                <MenuItem key={type.id} value={type.id}>
                  {type.name} ({type.grade})
                </MenuItem>
              ))}
            </TextField>

            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.875rem', fontWeight: 500 }}>
                  Thickness
                </Typography>
                <ToggleButtonGroup
                  value={thicknessUnit}
                  exclusive
                  onChange={(e, newUnit) => {
                    if (newUnit !== null) {
                      setThicknessUnit(newUnit);
                    }
                  }}
                  size="small"
                  sx={{
                    '& .MuiToggleButton-root': {
                      px: 2,
                      py: 0.5,
                      fontSize: '0.75rem',
                      textTransform: 'none',
                      border: '1px solid #e2e8f0',
                      '&.Mui-selected': {
                        backgroundColor: '#dc2626',
                        color: 'white',
                        '&:hover': {
                          backgroundColor: '#b91c1c',
                        }
                      }
                    }
                  }}
                >
                  <ToggleButton value="mm">mm</ToggleButton>
                  <ToggleButton value="inch">inch</ToggleButton>
                </ToggleButtonGroup>
              </Box>
              <TextField
                fullWidth
                type="number"
                value={newProcess.thickness}
                onChange={(e) => setNewProcess({ ...newProcess, thickness: e.target.value })}
                size="small"
                placeholder={thicknessUnit === 'mm' ? 'Enter thickness in mm' : 'Enter thickness in inches'}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.75rem' }}>
                        {thicknessUnit}
                      </Typography>
                    </InputAdornment>
                  )
                }}
                sx={textFieldSx}
                inputProps={{ step: thicknessUnit === 'inch' ? 0.125 : 1 }}
              />
            </Box>

            <TextField
              fullWidth
              label="Number of Pieces"
              type="number"
              value={newProcess.pieceCount}
              onChange={(e) => setNewProcess({ ...newProcess, pieceCount: e.target.value })}
              size="small"
              sx={textFieldSx}
            />

            <TextField
              fullWidth
              label="Starting Humidity (%)"
              type="number"
              value={newProcess.startingHumidity}
              onChange={(e) => setNewProcess({ ...newProcess, startingHumidity: e.target.value })}
              size="small"
              placeholder="Initial wood humidity percentage"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.75rem' }}>
                      %
                    </Typography>
                  </InputAdornment>
                )
              }}
              sx={textFieldSx}
              inputProps={{ step: 0.1, min: 0, max: 100 }}
            />

            <TextField
              fullWidth
              label="Starting Electricity Unit"
              type="number"
              value={newProcess.startingElectricityUnits}
              onChange={(e) => setNewProcess({ ...newProcess, startingElectricityUnits: e.target.value })}
              size="small"
              placeholder="Initial meter reading when starting"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <ElectricBoltIcon sx={{ fontSize: 16, color: '#dc2626' }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.75rem' }}>
                      Unit
                    </Typography>
                  </InputAdornment>
                )
              }}
              sx={textFieldSx}
              inputProps={{ step: 0.01, min: 0 }}
            />

            <TextField
              fullWidth
              label="Start Time"
              type="datetime-local"
              value={newProcess.startTime}
              onChange={(e) => setNewProcess({ ...newProcess, startTime: e.target.value })}
              size="small"
              sx={textFieldSx}
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              fullWidth
              label="Notes"
              multiline
              rows={3}
              value={newProcess.notes}
              onChange={(e) => setNewProcess({ ...newProcess, notes: e.target.value })}
              size="small"
              sx={textFieldSx}
            />
          </Stack>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ p: 2.5 }}>
          <Button
            onClick={() => setCreateDialogOpen(false)}
            sx={{
              color: '#64748b',
              textTransform: 'none',
              fontWeight: 600,
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateProcess}
            variant="contained"
            disabled={!newProcess.woodTypeId || !newProcess.thickness || !newProcess.pieceCount}
            sx={{
              backgroundColor: '#dc2626',
              textTransform: 'none',
              fontWeight: 600,
              px: 3,
              '&:hover': {
                backgroundColor: '#b91c1c',
              }
            }}
          >
            Create Process
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Reading Dialog */}
      <Dialog
        open={readingDialogOpen}
        onClose={() => setReadingDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        disableRestoreFocus
        PaperProps={{
          sx: {
            borderRadius: 3,
          }
        }}
      >
        <DialogTitle sx={{ pb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <ThermostatIcon sx={{ color: '#dc2626', fontSize: 28 }} />
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
              Add Reading - {selectedProcess?.batchNumber}
            </Typography>
          </Box>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 3 }}>
          <Stack spacing={2.5}>
            <TextField
              fullWidth
              label="Electricity Meter Reading (Unit)"
              type="number"
              value={newReading.electricityMeter}
              onChange={(e) => setNewReading({ ...newReading, electricityMeter: e.target.value })}
              size="small"
              sx={textFieldSx}
              inputProps={{ step: 0.01 }}
            />

            <TextField
              fullWidth
              label="Humidity (%)"
              type="number"
              value={newReading.humidity}
              onChange={(e) => setNewReading({ ...newReading, humidity: e.target.value })}
              size="small"
              sx={textFieldSx}
              inputProps={{ step: 0.1, min: 0, max: 100 }}
            />

            <TextField
              fullWidth
              label="Reading Time"
              type="datetime-local"
              value={newReading.readingTime}
              onChange={(e) => setNewReading({ ...newReading, readingTime: e.target.value })}
              size="small"
              sx={textFieldSx}
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              fullWidth
              label="Notes"
              multiline
              rows={2}
              value={newReading.notes}
              onChange={(e) => setNewReading({ ...newReading, notes: e.target.value })}
              size="small"
              sx={textFieldSx}
            />

            <Divider sx={{ my: 1 }} />

            {/* Luku (Electricity Recharge) Section */}
            <Accordion elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 1 }}>
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{
                  '&:hover': {
                    backgroundColor: alpha('#dc2626', 0.02)
                  }
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ElectricBoltIcon sx={{ fontSize: 20, color: '#dc2626' }} />
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                    Add Luku (Optional)
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={2}>
                  <Typography variant="caption" sx={{ color: '#64748b' }}>
                    Paste the SMS from your electricity provider to record the recharge
                  </Typography>

                  {lukuSuccess && (
                    <Alert severity="success" sx={{ fontSize: '0.75rem' }}>
                      Luku added successfully!
                    </Alert>
                  )}

                  {lukuError && (
                    <Alert severity="error" sx={{ fontSize: '0.75rem' }}>
                      {lukuError}
                    </Alert>
                  )}

                  <TextField
                    fullWidth
                    label="Paste SMS Here"
                    multiline
                    rows={4}
                    value={lukuSms}
                    onChange={(e) => setLukuSms(e.target.value)}
                    placeholder="Malipo yamekamilika... TOKEN 5375 8923... 1399.3KWH Cost 408606.56..."
                    size="small"
                    sx={textFieldSx}
                  />

                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleAddLuku}
                    disabled={!lukuSms.trim()}
                    sx={{
                      color: '#dc2626',
                      borderColor: '#dc2626',
                      textTransform: 'none',
                      fontWeight: 600,
                      '&:hover': {
                        borderColor: '#b91c1c',
                        backgroundColor: alpha('#dc2626', 0.04),
                      }
                    }}
                  >
                    Parse & Save Luku
                  </Button>
                </Stack>
              </AccordionDetails>
            </Accordion>
          </Stack>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ p: 2.5 }}>
          <Button
            onClick={() => setReadingDialogOpen(false)}
            sx={{
              color: '#64748b',
              textTransform: 'none',
              fontWeight: 600,
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAddReading}
            variant="contained"
            disabled={!newReading.electricityMeter || !newReading.humidity}
            sx={{
              backgroundColor: '#dc2626',
              textTransform: 'none',
              fontWeight: 600,
              px: 3,
              '&:hover': {
                backgroundColor: '#b91c1c',
              }
            }}
          >
            Add Reading
          </Button>
        </DialogActions>
      </Dialog>

      {/* Details Dialog */}
      <Dialog
        open={detailsDialogOpen}
        onClose={() => setDetailsDialogOpen(false)}
        maxWidth="md"
        fullWidth
        disableRestoreFocus
        PaperProps={{
          sx: {
            borderRadius: 3,
          }
        }}
      >
        <DialogTitle sx={{ pb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <AssessmentIcon sx={{ color: '#dc2626', fontSize: 28 }} />
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
              Process Details - {selectedProcess?.batchNumber}
            </Typography>
          </Box>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 3 }}>
          {selectedProcess && (
            <Stack spacing={3}>
              {/* Process Info */}
              <Box>
                <Typography variant="subtitle2" sx={{ color: '#64748b', mb: 1.5, fontWeight: 600 }}>
                  Process Information
                </Typography>
                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.75rem' }}>
                      Wood Type:
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {selectedProcess.woodType.name}
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ color: '#e2e8f0' }}>•</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.75rem' }}>
                      Thickness:
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {selectedProcess.thicknessUnit === 'inch'
                        ? `${(selectedProcess.thickness / 25.4).toFixed(2)}inch`
                        : `${selectedProcess.thickness}mm`}
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ color: '#e2e8f0' }}>•</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.75rem' }}>
                      Pieces:
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {selectedProcess.pieceCount}
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ color: '#e2e8f0' }}>•</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.75rem' }}>
                      Status:
                    </Typography>
                    <Chip
                      label={getStatusLabel(selectedProcess.status)}
                      size="small"
                      sx={{
                        backgroundColor: getStatusColor(selectedProcess.status),
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: '0.7rem',
                        height: 20
                      }}
                    />
                  </Box>
                  {selectedProcess.startingHumidity && (
                    <>
                      <Typography variant="body2" sx={{ color: '#e2e8f0' }}>•</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.75rem' }}>
                          Starting Humidity:
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {selectedProcess.startingHumidity.toFixed(1)}%
                        </Typography>
                      </Box>
                    </>
                  )}
                  {selectedProcess.startingElectricityUnits && (
                    <>
                      <Typography variant="body2" sx={{ color: '#e2e8f0' }}>•</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.75rem' }}>
                          Starting Electricity:
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {selectedProcess.startingElectricityUnits.toFixed(2)} Unit
                        </Typography>
                      </Box>
                    </>
                  )}
                </Box>

                {/* Stats Cards */}
                <Grid container spacing={2}>
                  {(() => {
                    const electricityUsed = calculateElectricityUsed(selectedProcess);
                    const electricityCost = Math.abs(electricityUsed) * 292; // TZS per unit (approximate rate)
                    const currentHumidity = selectedProcess.readings.length > 0
                      ? selectedProcess.readings[selectedProcess.readings.length - 1].humidity
                      : 0;

                    // Calculate running hours for depreciation
                    const startTime = new Date(selectedProcess.startTime).getTime();
                    const endTime = selectedProcess.endTime
                      ? new Date(selectedProcess.endTime).getTime()
                      : Date.now();
                    const runningHours = (endTime - startTime) / (1000 * 60 * 60); // Convert ms to hours

                    // Calculate depreciation cost based on actual settings
                    const depreciationPerHour = annualDepreciation / 8760; // hours in a year (365 * 24)
                    const depreciationCost = runningHours * depreciationPerHour;

                    return (
                      <>
                        <Grid item xs={12} sm={6} md={3}>
                          <Card elevation={0} sx={{ backgroundColor: '#dcfce7', border: '1px solid #bbf7d0' }}>
                            <CardContent sx={{ p: 1.5 }}>
                              <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.7rem', display: 'block', mb: 0.5 }}>
                                Electricity Used
                              </Typography>
                              <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
                                {Math.abs(electricityUsed).toFixed(2)} Unit
                              </Typography>
                            </CardContent>
                          </Card>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                          <Card elevation={0} sx={{ backgroundColor: '#fef3c7', border: '1px solid #fde68a' }}>
                            <CardContent sx={{ p: 1.5 }}>
                              <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.7rem', display: 'block', mb: 0.5 }}>
                                Electricity Cost
                              </Typography>
                              <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
                                TZS {electricityCost.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                              </Typography>
                            </CardContent>
                          </Card>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                          <Card elevation={0} sx={{ backgroundColor: '#fce7f3', border: '1px solid #fbcfe8' }}>
                            <CardContent sx={{ p: 1.5 }}>
                              <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.7rem', display: 'block', mb: 0.5 }}>
                                Depreciation Cost
                              </Typography>
                              <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
                                TZS {depreciationCost.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#9ca3af', fontSize: '0.65rem' }}>
                                {runningHours.toFixed(1)} hours
                              </Typography>
                            </CardContent>
                          </Card>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                          <Card elevation={0} sx={{ backgroundColor: '#eff6ff', border: '1px solid #dbeafe' }}>
                            <CardContent sx={{ p: 1.5 }}>
                              <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.7rem', display: 'block', mb: 0.5 }}>
                                Current Humidity
                              </Typography>
                              <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
                                {currentHumidity.toFixed(1)}%
                              </Typography>
                            </CardContent>
                          </Card>
                        </Grid>
                      </>
                    );
                  })()}
                </Grid>
              </Box>

              <Divider />

              {/* Readings Table */}
              <Box>
                <Typography variant="subtitle2" sx={{ color: '#64748b', mb: 1.5, fontWeight: 600 }}>
                  Readings History ({selectedProcess.readings.length})
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ backgroundColor: '#f8fafc' }}>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>Time</TableCell>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>Electricity (Unit)</TableCell>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>Humidity (%)</TableCell>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>Notes</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedProcess.readings.map((reading) => (
                        <TableRow key={reading.id} sx={{ '&:hover': { backgroundColor: '#fef2f2' } }}>
                          <TableCell sx={{ fontSize: '0.75rem' }}>
                            {new Date(reading.readingTime).toLocaleString()}
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
                            {reading.electricityMeter.toFixed(2)}
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
                            {reading.humidity.toFixed(1)}
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.75rem' }}>
                            {reading.notes || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                      {selectedProcess.readings.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                            <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                              No readings yet
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <Divider />
        <DialogActions sx={{ p: 2.5 }}>
          <Button
            onClick={() => setDetailsDialogOpen(false)}
            sx={{
              color: '#64748b',
              textTransform: 'none',
              fontWeight: 600,
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Process Dialog (Admin Only) */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        disableRestoreFocus
        PaperProps={{
          sx: {
            borderRadius: 3,
          }
        }}
      >
        <DialogTitle sx={{ pb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <EditIcon sx={{ color: '#f59e0b', fontSize: 28 }} />
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
              Edit Process - {selectedProcess?.batchNumber}
            </Typography>
          </Box>
          <Typography variant="caption" sx={{ color: '#94a3b8', mt: 0.5 }}>
            Admin only: Edit initial process data
          </Typography>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 3 }}>
          <Stack spacing={2.5}>
            <TextField
              select
              fullWidth
              label="Wood Type"
              value={editData.woodTypeId}
              onChange={(e) => setEditData({ ...editData, woodTypeId: e.target.value })}
              size="small"
              sx={textFieldSx}
            >
              {woodTypes.map((type) => (
                <MenuItem key={type.id} value={type.id}>
                  {type.name} ({type.grade})
                </MenuItem>
              ))}
            </TextField>

            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.875rem', fontWeight: 500 }}>
                  Thickness
                </Typography>
                <ToggleButtonGroup
                  value={editThicknessUnit}
                  exclusive
                  onChange={(e, newUnit) => {
                    if (newUnit !== null) {
                      // Convert the current value when switching units
                      const currentValue = parseFloat(editData.thickness);
                      if (!isNaN(currentValue)) {
                        if (editThicknessUnit === 'mm' && newUnit === 'inch') {
                          // Convert mm to inch
                          setEditData({ ...editData, thickness: (currentValue / 25.4).toFixed(3) });
                        } else if (editThicknessUnit === 'inch' && newUnit === 'mm') {
                          // Convert inch to mm
                          setEditData({ ...editData, thickness: (currentValue * 25.4).toFixed(1) });
                        }
                      }
                      setEditThicknessUnit(newUnit);
                    }
                  }}
                  size="small"
                  sx={{
                    '& .MuiToggleButton-root': {
                      px: 2,
                      py: 0.5,
                      fontSize: '0.75rem',
                      textTransform: 'none',
                      border: '1px solid #e2e8f0',
                      '&.Mui-selected': {
                        backgroundColor: '#f59e0b',
                        color: 'white',
                        '&:hover': {
                          backgroundColor: '#d97706',
                        }
                      }
                    }
                  }}
                >
                  <ToggleButton value="mm">mm</ToggleButton>
                  <ToggleButton value="inch">inch</ToggleButton>
                </ToggleButtonGroup>
              </Box>
              <TextField
                fullWidth
                type="number"
                value={editData.thickness}
                onChange={(e) => setEditData({ ...editData, thickness: e.target.value })}
                size="small"
                placeholder={editThicknessUnit === 'mm' ? 'Enter thickness in mm' : 'Enter thickness in inches'}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.75rem' }}>
                        {editThicknessUnit}
                      </Typography>
                    </InputAdornment>
                  )
                }}
                sx={textFieldSx}
                inputProps={{ step: editThicknessUnit === 'inch' ? 0.125 : 1 }}
              />
            </Box>

            <TextField
              fullWidth
              label="Number of Pieces"
              type="number"
              value={editData.pieceCount}
              onChange={(e) => setEditData({ ...editData, pieceCount: e.target.value })}
              size="small"
              sx={textFieldSx}
            />

            <TextField
              fullWidth
              label="Starting Humidity (%)"
              type="number"
              value={editData.startingHumidity}
              onChange={(e) => setEditData({ ...editData, startingHumidity: e.target.value })}
              size="small"
              placeholder="Initial wood humidity percentage"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.75rem' }}>
                      %
                    </Typography>
                  </InputAdornment>
                )
              }}
              sx={textFieldSx}
              inputProps={{ step: 0.1, min: 0, max: 100 }}
            />

            <TextField
              fullWidth
              label="Starting Electricity Unit"
              type="number"
              value={editData.startingElectricityUnits}
              onChange={(e) => setEditData({ ...editData, startingElectricityUnits: e.target.value })}
              size="small"
              placeholder="Initial meter reading when starting"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <ElectricBoltIcon sx={{ fontSize: 16, color: '#f59e0b' }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.75rem' }}>
                      Unit
                    </Typography>
                  </InputAdornment>
                )
              }}
              sx={textFieldSx}
              inputProps={{ step: 0.01, min: 0 }}
            />

            <TextField
              fullWidth
              label="Start Time"
              type="datetime-local"
              value={editData.startTime}
              onChange={(e) => setEditData({ ...editData, startTime: e.target.value })}
              size="small"
              sx={textFieldSx}
              InputLabelProps={{
                shrink: true
              }}
            />

            <TextField
              fullWidth
              label="Notes"
              multiline
              rows={3}
              value={editData.notes}
              onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
              size="small"
              sx={textFieldSx}
            />
          </Stack>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ p: 2.5 }}>
          <Button
            onClick={() => setEditDialogOpen(false)}
            sx={{
              color: '#64748b',
              textTransform: 'none',
              fontWeight: 600,
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpdateProcess}
            variant="contained"
            disabled={!editData.woodTypeId || !editData.thickness || !editData.pieceCount}
            sx={{
              backgroundColor: '#f59e0b',
              textTransform: 'none',
              fontWeight: 600,
              px: 3,
              '&:hover': {
                backgroundColor: '#d97706',
              }
            }}
          >
            Update Process
          </Button>
        </DialogActions>
      </Dialog>
    </StyledContainer>
  );
} 