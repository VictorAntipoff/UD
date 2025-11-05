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
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import SearchIcon from '@mui/icons-material/Search';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { DryingProcessReport } from '../../components/reports/DryingProcessReport';
import api from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { useTimezone } from '../../contexts/TimezoneContext';
import { formatDateInTimezone, parseLocalToUTC, formatForDateTimeInput, formatAsLocalTime } from '../../utils/timezone';
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

// Helper function to get current local datetime in YYYY-MM-DDTHH:MM format
const getCurrentLocalDatetime = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

// Helper function to format UTC datetime to local timezone for display
const formatLocalDatetime = (utcDatetime: string) => {
  const date = new Date(utcDatetime);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

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

interface Warehouse {
  id: string;
  code: string;
  name: string;
  stockControlEnabled: boolean;
}

interface Stock {
  id: string;
  warehouseId: string;
  woodTypeId: string;
  thickness: string;
  statusNotDried: number;
  statusUnderDrying: number;
  statusDried: number;
  statusDamaged: number;
  woodType: WoodType;
  warehouse: Warehouse;
}

interface DryingReading {
  id: string;
  dryingProcessId: string;
  readingTime: string;
  electricityMeter: number;
  humidity: number;
  notes?: string;
  createdById?: string;
  createdByName?: string;
  updatedById?: string;
  updatedByName?: string;
  createdAt: string;
  updatedAt: string;
}

interface DryingProcessItem {
  id: string;
  woodTypeId: string;
  woodType: WoodType;
  thickness: string;
  pieceCount: number;
  sourceWarehouseId: string;
  sourceWarehouse: Warehouse;
}

interface DryingProcess {
  id: string;
  batchNumber: string;
  woodTypeId?: string | null;
  woodType?: WoodType | null;
  thickness?: number | null;
  thicknessUnit?: string;
  pieceCount?: number | null;
  startingHumidity?: number;
  startingElectricityUnits?: number;
  startTime: string;
  endTime?: string;
  status: string;
  totalCost?: number;
  notes?: string;
  createdById?: string;
  createdByName?: string;
  readings: DryingReading[];
  items?: DryingProcessItem[]; // Multi-wood support
  createdAt: string;
  updatedAt: string;
}

export default function DryingProcess() {
  const { user } = useAuth();
  const { timezone } = useTimezone();
  const isAdmin = user?.role === 'ADMIN';

  const [processes, setProcesses] = useState<DryingProcess[]>([]);
  const [woodTypes, setWoodTypes] = useState<WoodType[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [availableStock, setAvailableStock] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [addingReading, setAddingReading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [readingDialogOpen, setReadingDialogOpen] = useState(false);
  const [selectedProcess, setSelectedProcess] = useState<DryingProcess | null>(null);
  const [expandedProcesses, setExpandedProcesses] = useState<string[]>([]);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const [newProcess, setNewProcess] = useState({
    warehouseId: '',
    startingHumidity: '',
    startingElectricityUnits: '',
    startTime: new Date().toISOString().slice(0, 16),
    notes: ''
  });

  // Multi-wood support: array of wood items
  const [woodItems, setWoodItems] = useState<Array<{
    id: string;
    woodTypeId: string;
    thickness: string;
    pieceCount: string;
  }>>([{
    id: Math.random().toString(),
    woodTypeId: '',
    thickness: '',
    pieceCount: ''
  }]);

  const [thicknessUnit, setThicknessUnit] = useState<'mm' | 'inch'>('mm');
  const [editThicknessUnit, setEditThicknessUnit] = useState<'mm' | 'inch'>('mm');

  // Completed table states
  const [completedSearchTerm, setCompletedSearchTerm] = useState('');
  const [completedSortField, setCompletedSortField] = useState<'batchNumber' | 'woodType' | 'completedDate' | 'finalHumidity'>('completedDate');
  const [completedSortOrder, setCompletedSortOrder] = useState<'asc' | 'desc'>('desc');

  const [editData, setEditData] = useState({
    woodTypeId: '',
    thickness: '',
    pieceCount: '',
    startingHumidity: '',
    startingElectricityUnits: '',
    startTime: '',
    notes: ''
  });

  // Edit wood items for multi-wood processes
  const [editWoodItems, setEditWoodItems] = useState<Array<{
    id: string;
    woodTypeId: string;
    thickness: string;
    pieceCount: string;
  }>>([]);

  const [newReading, setNewReading] = useState({
    electricityMeter: '',
    humidity: '',
    readingTime: getCurrentLocalDatetime(),
    notes: ''
  });

  const [lukuSms, setLukuSms] = useState('');
  const [lukuError, setLukuError] = useState<string | null>(null);
  const [lukuSuccess, setLukuSuccess] = useState(false);
  const [annualDepreciation, setAnnualDepreciation] = useState<number>(0);
  const [electricityRatePerKwh, setElectricityRatePerKwh] = useState<number>(292); // Default fallback rate

  // Edit reading state
  const [editReadingDialogOpen, setEditReadingDialogOpen] = useState(false);
  const [editingReading, setEditingReading] = useState<any>(null);
  const [editReadingData, setEditReadingData] = useState({
    electricityMeter: '',
    humidity: '',
    readingTime: '',
    notes: '',
    lukuSms: ''
  });

  useEffect(() => {
    fetchData();
    fetchOvenSettings();
    fetchElectricityRate();
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

  const fetchElectricityRate = async () => {
    try {
      // Fetch the latest electricity recharge to calculate the actual rate per kWh
      const response = await api.get('/electricity/recharges');
      const recharges = response.data || [];

      if (recharges.length > 0) {
        // Get the most recent recharge
        const latestRecharge = recharges[0];

        // Calculate rate: totalPaid / kwhAmount
        if (latestRecharge.kwhAmount && latestRecharge.kwhAmount > 0) {
          const rate = latestRecharge.totalPaid / latestRecharge.kwhAmount;
          setElectricityRatePerKwh(rate);
          console.log(`Using actual electricity rate: ${rate.toFixed(2)} TZS/kWh (from latest recharge)`);
        }
      }
    } catch (error) {
      console.error('Error fetching electricity rate:', error);
      // Keep using the default fallback rate (292)
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [processesRes, woodTypesRes, warehousesRes] = await Promise.all([
        api.get('/factory/drying-processes'),
        api.get('/factory/wood-types'),
        api.get('/management/warehouses')
      ]);
      setProcesses(processesRes.data || []);
      setWoodTypes(woodTypesRes.data || []);
      const stockControlWarehouses = (warehousesRes.data || []).filter(
        (w: Warehouse) => w.stockControlEnabled && w.status === 'ACTIVE'
      );
      setWarehouses(stockControlWarehouses);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWarehouseStock = async (warehouseId: string) => {
    if (!warehouseId) {
      setAvailableStock([]);
      return;
    }
    try {
      const response = await api.get(`/management/warehouses/${warehouseId}/stock`);
      setAvailableStock(response.data || []);
    } catch (error) {
      console.error('Error fetching warehouse stock:', error);
      setAvailableStock([]);
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
      // Validate warehouse selected
      if (!newProcess.warehouseId) {
        alert('Please select a warehouse');
        return;
      }

      // Validate at least one wood item
      if (woodItems.length === 0 || !woodItems[0].woodTypeId) {
        alert('Please add at least one wood type');
        return;
      }

      // Validate all wood items
      const items = [];
      for (const item of woodItems) {
        if (!item.woodTypeId || !item.thickness || !item.pieceCount) {
          alert('Please fill in all fields for each wood type');
          return;
        }

        // Find the stock for validation
        const stock = availableStock.find(
          s => s.woodTypeId === item.woodTypeId && s.thickness === item.thickness
        );

        if (!stock) {
          alert('Selected stock not found for one of the wood types');
          return;
        }

        const requestedQuantity = parseInt(item.pieceCount);
        if (requestedQuantity > stock.statusNotDried) {
          const woodType = woodTypes.find(w => w.id === item.woodTypeId);
          alert(`Cannot dry ${requestedQuantity} pieces of ${woodType?.name} ${item.thickness}. Only ${stock.statusNotDried} not dried pieces available.`);
          return;
        }

        if (requestedQuantity <= 0) {
          alert('Please enter a valid number of pieces (minimum 1) for all wood types');
          return;
        }

        items.push({
          woodTypeId: item.woodTypeId,
          thickness: item.thickness,
          pieceCount: requestedQuantity,
          warehouseId: newProcess.warehouseId
        });
      }

      // Create process with multiple items
      const response = await api.post('/factory/drying-processes', {
        items: items,
        startingHumidity: newProcess.startingHumidity ? parseFloat(newProcess.startingHumidity) : undefined,
        startingElectricityUnits: newProcess.startingElectricityUnits ? parseFloat(newProcess.startingElectricityUnits) : undefined,
        startTime: newProcess.startTime,
        notes: newProcess.notes
      });

      setProcesses([response.data, ...processes]);
      setCreateDialogOpen(false);

      // Reset form
      setNewProcess({
        warehouseId: '',
        startingHumidity: '',
        startingElectricityUnits: '',
        startTime: new Date().toISOString().slice(0, 16),
        notes: ''
      });
      setWoodItems([{
        id: Math.random().toString(),
        woodTypeId: '',
        thickness: '',
        pieceCount: ''
      }]);
      setAvailableStock([]);
    } catch (error: any) {
      console.error('Error creating process:', error);
      alert(error.response?.data?.error || 'Failed to create drying process');
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
    if (!selectedProcess || addingReading) return;

    try {
      setAddingReading(true);

      // Convert the manually entered time (in local timezone) to UTC for storage
      const readingTimeUTC = parseLocalToUTC(newReading.readingTime, timezone);

      await api.post(`/factory/drying-processes/${selectedProcess.id}/readings`, {
        electricityMeter: parseFloat(newReading.electricityMeter),
        humidity: parseFloat(newReading.humidity),
        readingTime: readingTimeUTC, // Send UTC time to backend
        notes: newReading.notes,
        lukuSms: lukuSms.trim() || null // Include Luku SMS if provided
      });

      // Refresh the process data
      await fetchData();
      setReadingDialogOpen(false);
      setNewReading({
        electricityMeter: '',
        humidity: '',
        readingTime: getCurrentLocalDatetime(),
        notes: ''
      });
      setLukuSms('');
      setLukuError(null);
      setLukuSuccess(false);
    } catch (error: any) {
      console.error('Error adding reading:', error);
      alert(error.response?.data?.error || 'Failed to add reading. Please try again.');
    } finally {
      setAddingReading(false);
    }
  };

  const handleEditReading = async () => {
    if (!editingReading) return;

    try {
      // Convert the manually entered time (in local timezone) to UTC for storage
      const readingTimeUTC = parseLocalToUTC(editReadingData.readingTime, timezone);

      await api.put(`/factory/drying-readings/${editingReading.id}`, {
        electricityMeter: parseFloat(editReadingData.electricityMeter),
        humidity: parseFloat(editReadingData.humidity),
        readingTime: readingTimeUTC, // Send UTC time to backend
        notes: editReadingData.notes,
        lukuSms: editReadingData.lukuSms.trim() || null
      });

      // Refresh the process data
      await fetchData();
      setEditReadingDialogOpen(false);
      setEditingReading(null);
      setEditReadingData({
        electricityMeter: '',
        humidity: '',
        readingTime: '',
        notes: '',
        lukuSms: ''
      });
    } catch (error) {
      console.error('Error updating reading:', error);
    }
  };

  const openEditReadingDialog = (reading: any) => {
    setEditingReading(reading);
    // Convert UTC time from database to local timezone for the input field
    const readingTimeValue = formatForDateTimeInput(reading.readingTime, timezone);
    setEditReadingData({
      electricityMeter: reading.electricityMeter.toString(),
      humidity: reading.humidity.toString(),
      readingTime: readingTimeValue,
      notes: reading.notes || '',
      lukuSms: reading.lukuSms || ''
    });
    setEditReadingDialogOpen(true);
  };

  const toggleProcessExpanded = (processId: string) => {
    setExpandedProcesses(prev =>
      prev.includes(processId)
        ? prev.filter(id => id !== processId)
        : [...prev, processId]
    );
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

    const readings = process.readings;
    let totalUsed = 0;

    // Calculate usage from consecutive readings
    for (let i = 1; i < readings.length; i++) {
      const prevReading = readings[i - 1].electricityMeter;
      const currReading = readings[i].electricityMeter;
      const diff = currReading - prevReading;

      // If meter went down, it's normal usage (prepaid meter counting down)
      // If meter went up significantly (>100), it's a recharge - ignore it
      if (diff < 0) {
        totalUsed += Math.abs(diff);
      } else if (diff <= 100) {
        // Small positive change might be usage on regular meter
        totalUsed += diff;
      }
    }

    // Also account for usage from starting point to first reading
    if (process.startingElectricityUnits && readings.length > 0) {
      const firstReading = readings[0].electricityMeter;
      const diff = firstReading - process.startingElectricityUnits;
      if (diff < 0) {
        totalUsed += Math.abs(diff);
      } else if (diff <= 100) {
        totalUsed += diff;
      }
    }

    return totalUsed;
  };

  // Filter and sort completed processes
  const getFilteredAndSortedCompletedProcesses = () => {
    let filtered = processes.filter(p => p.status === 'COMPLETED');

    // Apply search filter
    if (completedSearchTerm) {
      const searchLower = completedSearchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        p.batchNumber.toLowerCase().includes(searchLower) ||
        (p.woodType && p.woodType.name.toLowerCase().includes(searchLower))
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let compareValue = 0;

      switch (completedSortField) {
        case 'batchNumber':
          compareValue = a.batchNumber.localeCompare(b.batchNumber);
          break;
        case 'woodType':
          const nameA = a.woodType?.name || '';
          const nameB = b.woodType?.name || '';
          compareValue = nameA.localeCompare(nameB);
          break;
        case 'completedDate':
          const dateA = a.endTime ? new Date(a.endTime).getTime() : 0;
          const dateB = b.endTime ? new Date(b.endTime).getTime() : 0;
          compareValue = dateA - dateB;
          break;
        case 'finalHumidity':
          const humidityA = a.readings.length > 0 ? a.readings[a.readings.length - 1].humidity : 0;
          const humidityB = b.readings.length > 0 ? b.readings[b.readings.length - 1].humidity : 0;
          compareValue = humidityA - humidityB;
          break;
      }

      return completedSortOrder === 'asc' ? compareValue : -compareValue;
    });

    return filtered;
  };

  const handleCompletedSort = (field: typeof completedSortField) => {
    if (completedSortField === field) {
      setCompletedSortOrder(completedSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setCompletedSortField(field);
      setCompletedSortOrder('asc');
    }
  };

  // AI estimation algorithm - predicts completion time based on humidity trend
  const estimateCompletion = (process: DryingProcess) => {
    const TARGET_HUMIDITY = 12; // Target humidity percentage
    const readings = process.readings || [];

    // Handle case with no readings or only 1 reading - show basic chart
    if (readings.length < 2) {
      const dataPoints = [
        {
          time: new Date(process.startTime).getTime(),
          humidity: process.startingHumidity || 42,
          label: 'Initial'
        },
        ...(readings.length === 1 ? [{
          time: new Date(readings[0].readingTime).getTime(),
          humidity: readings[0].humidity,
          label: readings[0].readingTime.split('T')[0]
        }] : [])
      ];

      return {
        estimatedDays: null,
        estimatedDate: null,
        chartData: dataPoints.map((p, i) => ({
          index: i,
          actual: p.humidity,
          predicted: null,
          label: p.label
        })),
        currentRate: null,
        targetHumidity: TARGET_HUMIDITY,
        message: readings.length === 0 ? 'No readings yet - add readings to see estimation' : 'Need at least 2 readings to calculate trend'
      };
    }

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
        label: r.readingTime.split('T')[0]
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

    // Check if multi-wood or single-wood process
    if (process.items && process.items.length > 0) {
      // Multi-wood process
      setEditWoodItems(process.items.map(item => ({
        id: item.id,
        woodTypeId: item.woodTypeId,
        thickness: item.thickness,
        pieceCount: item.pieceCount.toString()
      })));

      // Set common fields
      setEditData({
        woodTypeId: '', // Not used for multi-wood
        thickness: '', // Not used for multi-wood
        pieceCount: '', // Not used for multi-wood
        startingHumidity: process.startingHumidity?.toString() || '',
        startingElectricityUnits: process.startingElectricityUnits?.toString() || '',
        startTime: new Date(process.startTime).toISOString().slice(0, 16),
        notes: process.notes || ''
      });
    } else if (process.woodTypeId && process.thickness !== null && process.pieceCount !== null) {
      // Legacy single-wood process
      setEditWoodItems([]); // Clear multi-wood items
      setEditData({
        woodTypeId: process.woodTypeId,
        thickness: process.thickness.toString(),
        pieceCount: process.pieceCount.toString(),
        startingHumidity: process.startingHumidity?.toString() || '',
        startingElectricityUnits: process.startingElectricityUnits?.toString() || '',
        startTime: new Date(process.startTime).toISOString().slice(0, 16),
        notes: process.notes || ''
      });
    } else {
      alert('Cannot edit this process. Missing required fields.');
      return;
    }

    setEditThicknessUnit('mm'); // Always show stored value in mm
    setEditDialogOpen(true);
  };


  const handleUpdateProcess = async () => {
    if (!selectedProcess || updating) return;

    try {
      setUpdating(true);

      // For single-wood processes, include wood-specific fields
      const updateData: any = {
        startingHumidity: editData.startingHumidity ? parseFloat(editData.startingHumidity) : undefined,
        startingElectricityUnits: editData.startingElectricityUnits ? parseFloat(editData.startingElectricityUnits) : undefined,
        startTime: editData.startTime,
        notes: editData.notes
      };

      // Only include wood-specific fields for single-wood processes
      if (editWoodItems.length === 0) {
        const thicknessInMm = convertToMm(parseFloat(editData.thickness), editThicknessUnit);
        updateData.woodTypeId = editData.woodTypeId;
        updateData.thickness = thicknessInMm;
        updateData.thicknessUnit = editThicknessUnit;
        updateData.pieceCount = parseInt(editData.pieceCount);
      }

      await api.put(`/factory/drying-processes/${selectedProcess.id}`, updateData);

      await fetchData();
      setEditDialogOpen(false);
    } catch (error) {
      console.error('Error updating process:', error);
      alert('Failed to update process. Please try again.');
    } finally {
      setUpdating(false);
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
        <>
          {/* In Progress Section */}
          {processes.filter(p => p.status === 'IN_PROGRESS').length > 0 && (
            <Box sx={{ mb: 4 }}>
              <Typography
                variant="h6"
                sx={{
                  color: '#1e293b',
                  fontWeight: 700,
                  fontSize: '1.125rem',
                  mb: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}
              >
                <DryIcon sx={{ fontSize: 24, color: '#3b82f6' }} />
                Drying in Progress
                <Chip
                  label={processes.filter(p => p.status === 'IN_PROGRESS').length}
                  size="small"
                  sx={{
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    fontWeight: 700,
                    fontSize: '0.75rem'
                  }}
                />
              </Typography>
              <Grid container spacing={3}>
                {processes.filter(p => p.status === 'IN_PROGRESS').map((process) => {
                  const electricityUsed = calculateElectricityUsed(process);
                  const currentHumidity = process.readings.length > 0
                    ? process.readings[process.readings.length - 1].humidity
                    : 0;

                  return (
              <Grid item xs={12} key={process.id}>
                <Accordion
                  expanded={expandedProcesses.includes(process.id)}
                  onChange={() => toggleProcessExpanded(process.id)}
                  elevation={0}
                  sx={{
                    borderRadius: 2,
                    border: '1px solid #e2e8f0',
                    overflow: 'hidden',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      boxShadow: '0 4px 12px rgba(220, 38, 38, 0.1)',
                      borderColor: '#dc2626',
                    },
                    '&:before': {
                      display: 'none'
                    }
                  }}
                >
                  {/* Process Header */}
                  <AccordionSummary
                    expandIcon={<ExpandMoreIcon sx={{ color: '#dc2626' }} />}
                    sx={{
                      p: { xs: 1.5, sm: 2 },
                      backgroundColor: '#f8fafc',
                      '&:hover': {
                        backgroundColor: '#f1f5f9'
                      },
                      '& .MuiAccordionSummary-content': {
                        margin: { xs: '8px 0', sm: '12px 0' }
                      }
                    }}
                  >
                    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, width: '100%', mr: { xs: 1, md: 2 }, gap: { xs: 1.5, md: 0 } }}>
                      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 1, sm: 2 }, width: { xs: '100%', md: 'auto' } }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          <Box
                            sx={{
                              backgroundColor: '#dc2626',
                              color: '#fff',
                              px: 2,
                              py: 0.75,
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
                        </Box>
                        <Typography variant="body2" sx={{ color: '#64748b', fontSize: { xs: '0.813rem', sm: '0.875rem' } }}>
                          {process.items && process.items.length > 0 ? (
                            // Multi-wood process
                            <>
                              {process.items.map((item: any, idx: number) => (
                                <span key={item.id}>
                                  {item.woodType.name} {item.thickness} ({item.pieceCount} pcs)
                                  {idx < process.items.length - 1 && ' + '}
                                </span>
                              ))}
                              {process.startingHumidity && ` • Initial humidity: ${process.startingHumidity}%`}
                            </>
                          ) : process.woodType ? (
                            // Single-wood process (legacy)
                            <>
                              {process.woodType.name} • {(process.thickness / 25.4).toFixed(1)}" ({process.thickness}mm) • {process.pieceCount} pieces
                              {process.startingHumidity && ` • Initial humidity: ${process.startingHumidity}%`}
                            </>
                          ) : (
                            'Loading...'
                          )}
                        </Typography>
                      </Box>
                      <Stack
                        direction="row"
                        spacing={{ xs: 0.75, sm: 1 }}
                        onClick={(e) => e.stopPropagation()}
                        sx={{ flexShrink: 0 }}
                      >
                        {process.status === 'IN_PROGRESS' && (
                          <>
                            <Button
                              size="small"
                              startIcon={<AddIcon />}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedProcess(process);
                                // Reset reading time to current time when dialog opens
                                setNewReading(prev => ({
                                  ...prev,
                                  readingTime: getCurrentLocalDatetime()
                                }));
                                setReadingDialogOpen(true);
                              }}
                              sx={{
                                color: '#dc2626',
                                borderColor: '#dc2626',
                                fontSize: { xs: '0.7rem', sm: '0.75rem' },
                                textTransform: 'none',
                                px: { xs: 1.5, sm: 2 },
                                py: { xs: 0.5, sm: 0.75 },
                                minWidth: { xs: '70px', sm: 'auto' },
                                whiteSpace: 'nowrap',
                                '& .MuiButton-startIcon': {
                                  marginRight: { xs: 0.5, sm: 1 },
                                  marginLeft: 0
                                },
                                '&:hover': {
                                  borderColor: '#b91c1c',
                                  backgroundColor: alpha('#dc2626', 0.04),
                                }
                              }}
                              variant="outlined"
                            >
                              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Add Reading</Box>
                              <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>Add</Box>
                            </Button>
                            <Button
                              size="small"
                              startIcon={<CheckCircleIcon />}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCompleteProcess(process);
                              }}
                              sx={{
                                color: '#10b981',
                                borderColor: '#10b981',
                                fontSize: { xs: '0.7rem', sm: '0.75rem' },
                                textTransform: 'none',
                                px: { xs: 1.5, sm: 2 },
                                py: { xs: 0.5, sm: 0.75 },
                                minWidth: { xs: '85px', sm: 'auto' },
                                whiteSpace: 'nowrap',
                                '& .MuiButton-startIcon': {
                                  marginRight: { xs: 0.5, sm: 1 },
                                  marginLeft: 0
                                },
                                '&:hover': {
                                  borderColor: '#059669',
                                  backgroundColor: alpha('#10b981', 0.04),
                                }
                              }}
                              variant="outlined"
                            >
                              Complete
                            </Button>
                          </>
                        )}
                        {isAdmin && (
                          <Button
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              openDetailsDialog(process);
                            }}
                            sx={{
                              color: '#3b82f6',
                              borderColor: '#3b82f6',
                              fontSize: { xs: '0.7rem', sm: '0.75rem' },
                              textTransform: 'none',
                              px: { xs: 1, sm: 2 },
                              minWidth: { xs: 'auto', sm: 'auto' },
                              display: { xs: 'none', sm: 'inline-flex' },
                              '&:hover': {
                                borderColor: '#2563eb',
                                backgroundColor: alpha('#3b82f6', 0.04),
                              }
                            }}
                            variant="outlined"
                          >
                            View Details
                          </Button>
                        )}
                        {isAdmin && process.status !== 'COMPLETED' && (
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditDialog(process);
                            }}
                            sx={{
                              color: '#f59e0b',
                              p: { xs: 0.75, sm: 1 },
                              '&:hover': {
                                backgroundColor: alpha('#f59e0b', 0.1)
                              }
                            }}
                            title="Edit initial data (Admin only)"
                          >
                            <EditIcon sx={{ fontSize: { xs: 18, sm: 20 } }} />
                          </IconButton>
                        )}
                        {process.status !== 'COMPLETED' && (
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteProcess(process.id);
                            }}
                            sx={{
                              color: '#ef4444',
                              p: { xs: 0.75, sm: 1 },
                              '&:hover': {
                                backgroundColor: alpha('#ef4444', 0.1)
                              }
                            }}
                          >
                            <DeleteIcon sx={{ fontSize: { xs: 18, sm: 20 } }} />
                          </IconButton>
                        )}
                      </Stack>
                    </Box>
                  </AccordionSummary>

                  <AccordionDetails sx={{ p: 0 }}>

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
                                {isAdmin && <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#64748b', width: 80 }}>Actions</TableCell>}
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
                                        {formatAsLocalTime(reading.readingTime, 'MM/dd/yyyy')}
                                      </Typography>
                                      <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mt: 0.25 }}>
                                        {formatAsLocalTime(reading.readingTime, 'hh:mm a')}
                                      </Typography>
                                    </TableCell>
                                    <TableCell sx={{ fontSize: '0.813rem' }}>
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <ElectricBoltIcon sx={{ fontSize: 14, color: '#16a34a' }} />
                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                          {reading.electricityMeter.toFixed(2)}
                                        </Typography>
                                        {(() => {
                                          // Get previous reading to calculate usage
                                          let prevReading = null;
                                          if (index > 0) {
                                            prevReading = process.readings[index - 1].electricityMeter;
                                          } else if (process.startingElectricityUnits) {
                                            prevReading = process.startingElectricityUnits;
                                          }

                                          // Only show usage if we have a previous reading to compare
                                          if (prevReading !== null && prevReading > 0) {
                                            const diff = reading.electricityMeter - prevReading;

                                            // If large positive jump (>100), it's a recharge
                                            if (diff > 100) {
                                              // Check if there's lukuSms to calculate usage during recharge
                                              let usageDuringRecharge = 0;
                                              if (reading.lukuSms) {
                                                // Extract kWh from Luku SMS
                                                const kwhMatch = reading.lukuSms.match(/([\d.]+)KWH/i);
                                                if (kwhMatch) {
                                                  const kwhPurchased = parseFloat(kwhMatch[1]);
                                                  const unitsAdded = diff; // 1569.02 - 175.11 = 1393.91
                                                  usageDuringRecharge = kwhPurchased - unitsAdded; // 1399.3 - 1393.91 = 5.39
                                                }
                                              }

                                              return (
                                                <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                  {usageDuringRecharge > 0 && (
                                                    <Chip
                                                      label={`-${usageDuringRecharge.toFixed(2)}`}
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
                                                  )}
                                                  <Chip
                                                    icon={<ElectricBoltIcon sx={{ fontSize: 12, color: '#f59e0b !important' }} />}
                                                    label="Recharged"
                                                    size="small"
                                                    sx={{
                                                      height: 18,
                                                      fontSize: '0.65rem',
                                                      backgroundColor: '#fef3c7',
                                                      color: '#f59e0b',
                                                      fontWeight: 600,
                                                      ml: usageDuringRecharge > 0 ? 0 : 0.5
                                                    }}
                                                  />
                                                </Box>
                                              );
                                            }

                                            // Normal usage: show the difference
                                            // If diff < 0, meter went down (consumption)
                                            // If diff > 0 but < 100, unusual but show it anyway
                                            const usage = Math.abs(diff);
                                            return (
                                              <Chip
                                                label={`-${usage.toFixed(2)}`}
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
                                    {isAdmin && (
                                      <TableCell>
                                        <IconButton
                                          size="small"
                                          onClick={() => openEditReadingDialog(reading)}
                                          sx={{
                                            color: '#3b82f6',
                                            '&:hover': { backgroundColor: alpha('#3b82f6', 0.1) }
                                          }}
                                        >
                                          <EditIcon sx={{ fontSize: 16 }} />
                                        </IconButton>
                                      </TableCell>
                                    )}
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
                                    {formatDateInTimezone(process.startTime, 'yyyy-MM-dd', timezone)}
                                  </Typography>
                                  <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mt: 0.25 }}>
                                    {formatDateInTimezone(process.startTime, 'hh:mm a', timezone)}
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
                                {isAdmin && <TableCell />}
                              </TableRow>
                              </TableBody>
                            </Table>
                          </TableContainer>
                        </AccordionDetails>
                      </Accordion>
                    </Box>

                  {/* AI Completion Estimation */}
                  {process.status === 'IN_PROGRESS' && (
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
                                      Expected: {formatDateInTimezone(estimation.estimatedDate, 'MMM d, yyyy \'at\' hh:mm a', timezone)}
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
                                            {estimation.estimatedDate && formatDateInTimezone(estimation.estimatedDate, 'MMM d, yyyy', timezone)}
                                          </Typography>
                                          <Typography variant="caption" sx={{ color: '#3b82f6', fontWeight: 600, display: 'block' }}>
                                            {estimation.estimatedDate && formatDateInTimezone(estimation.estimatedDate, 'hh:mm a', timezone)}
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
                                            {estimation.currentRate ? `${estimation.currentRate}% per reading` : 'N/A'}
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
                  </AccordionDetails>
                </Accordion>
              </Grid>
                  );
                })}
              </Grid>
            </Box>
          )}

          {/* Completed Section - Table Format (Desktop) / Card Format (Mobile) */}
          {processes.filter(p => p.status === 'COMPLETED').length > 0 && (
            <Box sx={{ mb: 4 }}>
              <Box sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                justifyContent: 'space-between',
                alignItems: { xs: 'stretch', sm: 'center' },
                gap: 2,
                mb: 2
              }}>
                <Typography
                  variant="h6"
                  sx={{
                    color: '#1e293b',
                    fontWeight: 700,
                    fontSize: '1.125rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}
                >
                  <CheckCircleIcon sx={{ fontSize: 24, color: '#10b981' }} />
                  Completed Drying
                  <Chip
                    label={getFilteredAndSortedCompletedProcesses().length}
                    size="small"
                    sx={{
                      backgroundColor: '#10b981',
                      color: 'white',
                      fontWeight: 700,
                      fontSize: '0.75rem'
                    }}
                  />
                </Typography>
                <TextField
                  size="small"
                  placeholder="Search..."
                  value={completedSearchTerm}
                  onChange={(e) => setCompletedSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ fontSize: 20, color: '#64748b' }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    width: { xs: '100%', sm: 350 },
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'white',
                    }
                  }}
                />
              </Box>

              {/* Desktop Table View */}
              <Paper
                elevation={0}
                sx={{
                  display: { xs: 'none', md: 'block' },
                  border: '1px solid #e2e8f0',
                  borderRadius: 2,
                  overflow: 'hidden'
                }}
              >
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ backgroundColor: '#f8fafc' }}>
                        <TableCell
                          sx={{ fontWeight: 700, color: '#1e293b', cursor: 'pointer' }}
                          onClick={() => handleCompletedSort('batchNumber')}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            Batch Number
                            {completedSortField === 'batchNumber' && (
                              completedSortOrder === 'asc' ? <ArrowUpwardIcon sx={{ fontSize: 16 }} /> : <ArrowDownwardIcon sx={{ fontSize: 16 }} />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell
                          sx={{ fontWeight: 700, color: '#1e293b', cursor: 'pointer' }}
                          onClick={() => handleCompletedSort('woodType')}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            Wood Type & Specs
                            {completedSortField === 'woodType' && (
                              completedSortOrder === 'asc' ? <ArrowUpwardIcon sx={{ fontSize: 16 }} /> : <ArrowDownwardIcon sx={{ fontSize: 16 }} />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell
                          sx={{ fontWeight: 700, color: '#1e293b', cursor: 'pointer' }}
                          onClick={() => handleCompletedSort('completedDate')}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            Completed Date
                            {completedSortField === 'completedDate' && (
                              completedSortOrder === 'asc' ? <ArrowUpwardIcon sx={{ fontSize: 16 }} /> : <ArrowDownwardIcon sx={{ fontSize: 16 }} />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell
                          sx={{ fontWeight: 700, color: '#1e293b', cursor: 'pointer' }}
                          onClick={() => handleCompletedSort('finalHumidity')}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            Final Humidity
                            {completedSortField === 'finalHumidity' && (
                              completedSortOrder === 'asc' ? <ArrowUpwardIcon sx={{ fontSize: 16 }} /> : <ArrowDownwardIcon sx={{ fontSize: 16 }} />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Electricity Used</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: '#1e293b', textAlign: 'right' }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {getFilteredAndSortedCompletedProcesses().map((process) => {
                        const electricityUsed = calculateElectricityUsed(process);
                        const finalHumidity = process.readings.length > 0
                          ? process.readings[process.readings.length - 1].humidity
                          : 0;

                        return (
                          <TableRow
                            key={process.id}
                            sx={{
                              '&:hover': {
                                backgroundColor: '#f0fdf4',
                              },
                              cursor: 'pointer'
                            }}
                          >
                            <TableCell>
                              <Box
                                sx={{
                                  backgroundColor: '#10b981',
                                  color: '#fff',
                                  px: 2,
                                  py: 0.75,
                                  borderRadius: 1,
                                  fontWeight: 700,
                                  fontSize: '0.875rem',
                                  display: 'inline-block'
                                }}
                              >
                                {process.batchNumber}
                              </Box>
                            </TableCell>
                            <TableCell>
                              {process.items && process.items.length > 0 ? (
                                // Multi-wood process
                                <>
                                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                                    Mixed Wood ({process.items.length} types)
                                  </Typography>
                                  <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                                    {process.items.map((item: any, idx: number) => (
                                      <span key={item.id}>
                                        {item.woodType.name} {item.thickness} ({item.pieceCount} pcs)
                                        {idx < process.items.length - 1 && ', '}
                                      </span>
                                    ))}
                                  </Typography>
                                </>
                              ) : process.woodType ? (
                                // Single-wood process (legacy)
                                <>
                                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                                    {process.woodType.name}
                                  </Typography>
                                  <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                                    {(process.thickness / 25.4).toFixed(1)}" ({process.thickness}mm) • {process.pieceCount} pcs
                                  </Typography>
                                </>
                              ) : (
                                <Typography variant="body2" sx={{ color: '#94a3b8' }}>Loading...</Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              {process.endTime ? (
                                <>
                                  <Typography variant="body2" sx={{ fontWeight: 500, color: '#1e293b' }}>
                                    {formatDateInTimezone(process.endTime, 'MMM d, yyyy', timezone)}
                                  </Typography>
                                  <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                                    {formatDateInTimezone(process.endTime, 'hh:mm a', timezone)}
                                  </Typography>
                                </>
                              ) : (
                                <Typography variant="body2" sx={{ color: '#94a3b8', fontStyle: 'italic' }}>
                                  N/A
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              <Card elevation={0} sx={{ backgroundColor: '#eff6ff', border: '1px solid #dbeafe', display: 'inline-block', px: 2, py: 1 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <OpacityIcon sx={{ fontSize: 18, color: '#3b82f6' }} />
                                  <Typography variant="body1" sx={{ fontWeight: 700, color: '#1e293b', fontSize: '1rem' }}>
                                    {finalHumidity.toFixed(1)}%
                                  </Typography>
                                </Box>
                              </Card>
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <ElectricBoltIcon sx={{ fontSize: 18, color: '#16a34a' }} />
                                <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                                  {Math.abs(electricityUsed).toFixed(2)} Unit
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell align="right">
                              <Stack direction="row" spacing={1} justifyContent="flex-end">
                                <Button
                                  size="small"
                                  startIcon={<AssessmentIcon />}
                                  onClick={() => {
                                    setSelectedProcess(process);
                                    setDetailsDialogOpen(true);
                                  }}
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
                                  View
                                </Button>
                                {isAdmin && (
                                  <>
                                    <IconButton
                                      size="small"
                                      onClick={() => {
                                        setSelectedProcess(process);
                                        setEditDialogOpen(true);
                                      }}
                                      sx={{
                                        color: '#64748b',
                                        '&:hover': {
                                          color: '#3b82f6',
                                          backgroundColor: alpha('#3b82f6', 0.04),
                                        }
                                      }}
                                    >
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                    <IconButton
                                      size="small"
                                      onClick={() => handleDeleteProcess(process.id)}
                                      sx={{
                                        color: '#64748b',
                                        '&:hover': {
                                          color: '#dc2626',
                                          backgroundColor: alpha('#dc2626', 0.04),
                                        }
                                      }}
                                    >
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </>
                                )}
                              </Stack>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>

              {/* Mobile Card View */}
              <Box sx={{ display: { xs: 'block', md: 'none' } }}>
                <Grid container spacing={2}>
                  {getFilteredAndSortedCompletedProcesses().map((process) => {
                    const electricityUsed = calculateElectricityUsed(process);
                    const finalHumidity = process.readings.length > 0
                      ? process.readings[process.readings.length - 1].humidity
                      : 0;

                    return (
                      <Grid item xs={12} key={process.id}>
                        <Card
                          elevation={0}
                          sx={{
                            border: '1px solid #e2e8f0',
                            borderRadius: 2,
                            '&:hover': {
                              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.1)',
                              borderColor: '#10b981',
                            }
                          }}
                        >
                          <CardContent sx={{ p: 2 }}>
                            {/* Header */}
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                              <Box
                                sx={{
                                  backgroundColor: '#10b981',
                                  color: '#fff',
                                  px: 2,
                                  py: 0.75,
                                  borderRadius: 1,
                                  fontWeight: 700,
                                  fontSize: '0.875rem'
                                }}
                              >
                                {process.batchNumber}
                              </Box>
                              <Stack direction="row" spacing={0.5}>
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    setSelectedProcess(process);
                                    setDetailsDialogOpen(true);
                                  }}
                                  sx={{
                                    color: '#3b82f6',
                                    '&:hover': {
                                      backgroundColor: alpha('#3b82f6', 0.04),
                                    }
                                  }}
                                >
                                  <AssessmentIcon fontSize="small" />
                                </IconButton>
                                {isAdmin && (
                                  <>
                                    <IconButton
                                      size="small"
                                      onClick={() => {
                                        setSelectedProcess(process);
                                        setEditDialogOpen(true);
                                      }}
                                      sx={{
                                        color: '#64748b',
                                        '&:hover': {
                                          color: '#3b82f6',
                                          backgroundColor: alpha('#3b82f6', 0.04),
                                        }
                                      }}
                                    >
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                    <IconButton
                                      size="small"
                                      onClick={() => handleDeleteProcess(process.id)}
                                      sx={{
                                        color: '#64748b',
                                        '&:hover': {
                                          color: '#dc2626',
                                          backgroundColor: alpha('#dc2626', 0.04),
                                        }
                                      }}
                                    >
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </>
                                )}
                              </Stack>
                            </Box>

                            {/* Wood Type */}
                            {process.items && process.items.length > 0 ? (
                              // Multi-wood process
                              <>
                                <Typography variant="body1" sx={{ fontWeight: 600, color: '#1e293b', mb: 0.5 }}>
                                  Mixed Wood ({process.items.length} types)
                                </Typography>
                                <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 2 }}>
                                  {process.items.map((item, idx) => (
                                    <span key={item.id}>
                                      {item.woodType.name} {item.thickness} ({item.pieceCount} pcs)
                                      {idx < process.items.length - 1 && ', '}
                                    </span>
                                  ))}
                                </Typography>
                              </>
                            ) : process.woodType ? (
                              // Single-wood process
                              <>
                                <Typography variant="body1" sx={{ fontWeight: 600, color: '#1e293b', mb: 0.5 }}>
                                  {process.woodType.name}
                                </Typography>
                                <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 2 }}>
                                  {(process.thickness / 25.4).toFixed(1)}" ({process.thickness}mm) • {process.pieceCount} pieces
                                </Typography>
                              </>
                            ) : (
                              <Typography variant="body2" sx={{ color: '#94a3b8', mb: 2 }}>Loading...</Typography>
                            )}

                            {/* Stats Cards */}
                            <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
                              <Box sx={{
                                flex: 1,
                                backgroundColor: '#eff6ff',
                                border: '1px solid #dbeafe',
                                borderRadius: 1.5,
                                p: 1.5
                              }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                                  <OpacityIcon sx={{ fontSize: 14, color: '#3b82f6' }} />
                                  <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.7rem' }}>
                                    Final Humidity
                                  </Typography>
                                </Box>
                                <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b', fontSize: '1.5rem' }}>
                                  {finalHumidity.toFixed(1)}%
                                </Typography>
                              </Box>
                              <Box sx={{
                                flex: 1,
                                backgroundColor: '#dcfce7',
                                border: '1px solid #bbf7d0',
                                borderRadius: 1.5,
                                p: 1.5
                              }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                                  <ElectricBoltIcon sx={{ fontSize: 14, color: '#16a34a' }} />
                                  <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.7rem' }}>
                                    Electricity
                                  </Typography>
                                </Box>
                                <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b', fontSize: '1.5rem' }}>
                                  {Math.abs(electricityUsed).toFixed(2)}
                                </Typography>
                                <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.65rem' }}>
                                  Unit
                                </Typography>
                              </Box>
                            </Box>

                            {/* Completed Date */}
                            {process.endTime && (
                              <Box sx={{ pt: 2, borderTop: '1px solid #e2e8f0' }}>
                                <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 0.5, fontSize: '0.7rem' }}>
                                  Completed
                                </Typography>
                                <Typography variant="body2" sx={{ fontWeight: 500, color: '#1e293b', fontSize: '0.875rem' }}>
                                  {formatDateInTimezone(process.endTime, 'MMM d, yyyy • hh:mm a', timezone)}
                                </Typography>
                              </Box>
                            )}
                          </CardContent>
                        </Card>
                      </Grid>
                    );
                  })}
                </Grid>
              </Box>
            </Box>
          )}

          {processes.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <DryIcon sx={{ fontSize: 64, color: '#cbd5e1', mb: 2 }} />
              <Typography variant="h6" sx={{ color: '#64748b', mb: 1 }}>
                No Drying Processes Yet
              </Typography>
              <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                Create your first drying process to start tracking operations
              </Typography>
            </Box>
          )}
        </>
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
              label="Warehouse"
              value={newProcess.warehouseId}
              onChange={(e) => {
                const warehouseId = e.target.value;
                setNewProcess({ ...newProcess, warehouseId });
                setWoodItems([{
                  id: Math.random().toString(),
                  woodTypeId: '',
                  thickness: '',
                  pieceCount: ''
                }]);
                fetchWarehouseStock(warehouseId);
              }}
              size="small"
              sx={textFieldSx}
            >
              {warehouses.map((warehouse) => (
                <MenuItem key={warehouse.id} value={warehouse.id}>
                  {warehouse.name} ({warehouse.code})
                </MenuItem>
              ))}
            </TextField>

            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1e293b', mt: 1 }}>
              Wood Types in This Batch
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748b', mt: -1 }}>
              Only not dried pieces can be used for drying
            </Typography>

            {woodItems.map((item, index) => (
              <Paper
                key={item.id}
                elevation={0}
                sx={{
                  p: 2,
                  border: '1px solid #e2e8f0',
                  borderRadius: 1,
                  position: 'relative'
                }}
              >
                <Stack spacing={2}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#475569' }}>
                      Wood Type {index + 1}
                    </Typography>
                    {woodItems.length > 1 && (
                      <IconButton
                        size="small"
                        onClick={() => {
                          setWoodItems(woodItems.filter(w => w.id !== item.id));
                        }}
                        sx={{ color: '#dc2626' }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Box>

                  <TextField
                    select
                    fullWidth
                    label="Wood Type"
                    value={item.woodTypeId}
                    onChange={(e) => {
                      const updated = [...woodItems];
                      updated[index] = { ...item, woodTypeId: e.target.value, thickness: '', pieceCount: '' };
                      setWoodItems(updated);
                    }}
                    size="small"
                    sx={textFieldSx}
                    disabled={!newProcess.warehouseId}
                  >
                    {Array.from(new Set(availableStock.map(s => s.woodTypeId))).map(woodTypeId => {
                      const stock = availableStock.find(s => s.woodTypeId === woodTypeId);
                      return stock ? (
                        <MenuItem key={stock.woodType.id} value={stock.woodType.id}>
                          {stock.woodType.name}
                        </MenuItem>
                      ) : null;
                    })}
                  </TextField>

                  <TextField
                    select
                    fullWidth
                    label="Thickness & Available Stock (Not Dried)"
                    value={item.thickness}
                    onChange={(e) => {
                      const updated = [...woodItems];
                      updated[index] = { ...item, thickness: e.target.value, pieceCount: '' };
                      setWoodItems(updated);
                    }}
                    size="small"
                    sx={textFieldSx}
                    disabled={!item.woodTypeId}
                  >
                    {availableStock
                      .filter(s => s.woodTypeId === item.woodTypeId && s.statusNotDried > 0)
                      .map((stock) => (
                        <MenuItem key={stock.id} value={stock.thickness}>
                          {stock.thickness} - Available: {stock.statusNotDried} pcs (Not Dried)
                        </MenuItem>
                      ))}
                  </TextField>

                  <TextField
                    fullWidth
                    label="Number of Pieces"
                    type="number"
                    value={item.pieceCount}
                    onChange={(e) => {
                      const updated = [...woodItems];
                      updated[index] = { ...item, pieceCount: e.target.value };
                      setWoodItems(updated);
                    }}
                    size="small"
                    sx={textFieldSx}
                    disabled={!item.thickness}
                    helperText={
                      item.thickness
                        ? `Max available: ${availableStock.find(s => s.woodTypeId === item.woodTypeId && s.thickness === item.thickness)?.statusNotDried || 0} pcs`
                        : 'Select thickness first'
                    }
                    inputProps={{
                      max: availableStock.find(s => s.woodTypeId === item.woodTypeId && s.thickness === item.thickness)?.statusNotDried || 0,
                      min: 1
                    }}
                  />
                </Stack>
              </Paper>
            ))}

            <Button
              startIcon={<AddIcon />}
              onClick={() => {
                setWoodItems([
                  ...woodItems,
                  {
                    id: Math.random().toString(),
                    woodTypeId: '',
                    thickness: '',
                    pieceCount: ''
                  }
                ]);
              }}
              disabled={!newProcess.warehouseId}
              sx={{
                textTransform: 'none',
                color: '#dc2626',
                borderColor: '#dc2626',
                '&:hover': {
                  borderColor: '#b91c1c',
                  backgroundColor: '#fef2f2'
                }
              }}
              variant="outlined"
            >
              Add Another Wood Type
            </Button>

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
            disabled={
              !newProcess.warehouseId ||
              woodItems.length === 0 ||
              !woodItems[0].woodTypeId ||
              !woodItems[0].thickness ||
              !woodItems[0].pieceCount
            }
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
              label="Electricity (Unit)"
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
            disabled={addingReading || !newReading.electricityMeter || !newReading.humidity}
            startIcon={addingReading ? <CircularProgress size={20} sx={{ color: 'white' }} /> : null}
            sx={{
              backgroundColor: '#dc2626',
              textTransform: 'none',
              fontWeight: 600,
              px: 3,
              '&:hover': {
                backgroundColor: '#b91c1c',
              },
              '&:disabled': {
                backgroundColor: '#f87171',
                color: 'white',
                opacity: 0.7
              }
            }}
          >
            {addingReading ? 'Adding...' : 'Add Reading'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Reading Dialog */}
      <Dialog
        open={editReadingDialogOpen}
        onClose={() => setEditReadingDialogOpen(false)}
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
              Edit Reading - {selectedProcess?.batchNumber}
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
              value={editReadingData.electricityMeter}
              onChange={(e) => setEditReadingData({ ...editReadingData, electricityMeter: e.target.value })}
              size="small"
              sx={textFieldSx}
              inputProps={{ step: 0.01 }}
            />

            <TextField
              fullWidth
              label="Humidity (%)"
              type="number"
              value={editReadingData.humidity}
              onChange={(e) => setEditReadingData({ ...editReadingData, humidity: e.target.value })}
              size="small"
              sx={textFieldSx}
              inputProps={{ step: 0.1, min: 0, max: 100 }}
            />

            <TextField
              fullWidth
              label="Reading Time"
              type="datetime-local"
              value={editReadingData.readingTime}
              onChange={(e) => setEditReadingData({ ...editReadingData, readingTime: e.target.value })}
              size="small"
              sx={textFieldSx}
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              fullWidth
              label="Notes"
              multiline
              rows={2}
              value={editReadingData.notes}
              onChange={(e) => setEditReadingData({ ...editReadingData, notes: e.target.value })}
              size="small"
              sx={textFieldSx}
            />

            <Divider sx={{ my: 1 }} />

            {/* Luku (Electricity Recharge) Section - Show stored SMS */}
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
                  <ElectricBoltIcon sx={{ fontSize: 20, color: editReadingData.lukuSms ? '#f59e0b' : '#94a3b8' }} />
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                    Luku Recharge SMS {editReadingData.lukuSms ? '✓' : '(Not recorded)'}
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={2}>
                  {editReadingData.lukuSms ? (
                    <>
                      <Typography variant="caption" sx={{ color: '#64748b' }}>
                        Electricity recharge SMS recorded with this reading
                      </Typography>
                      <TextField
                        fullWidth
                        label="Luku SMS"
                        multiline
                        rows={4}
                        value={editReadingData.lukuSms}
                        onChange={(e) => setEditReadingData({ ...editReadingData, lukuSms: e.target.value })}
                        size="small"
                        sx={textFieldSx}
                      />
                      <Typography variant="caption" sx={{ color: '#9ca3af', fontSize: '0.7rem' }}>
                        You can edit this SMS text if needed
                      </Typography>
                    </>
                  ) : (
                    <>
                      <Alert severity="info" sx={{ fontSize: '0.75rem' }}>
                        No electricity recharge was recorded with this reading
                      </Alert>
                      <Typography variant="caption" sx={{ color: '#64748b' }}>
                        You can add Luku SMS now if needed
                      </Typography>
                      <TextField
                        fullWidth
                        label="Paste SMS Here (Optional)"
                        multiline
                        rows={4}
                        value={editReadingData.lukuSms}
                        onChange={(e) => setEditReadingData({ ...editReadingData, lukuSms: e.target.value })}
                        placeholder="Malipo yamekamilika... TOKEN 5375 8923... 1399.3KWH Cost 408606.56..."
                        size="small"
                        sx={textFieldSx}
                      />
                    </>
                  )}
                </Stack>
              </AccordionDetails>
            </Accordion>
          </Stack>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ p: 2.5 }}>
          <Button
            onClick={() => setEditReadingDialogOpen(false)}
            sx={{
              color: '#64748b',
              textTransform: 'none',
              fontWeight: 600,
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleEditReading}
            variant="contained"
            disabled={!editReadingData.electricityMeter || !editReadingData.humidity}
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
            Save Changes
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
                <Typography variant="h6" sx={{ color: '#1e293b', mb: 2, fontWeight: 700, fontSize: '1rem' }}>
                  Process Information
                </Typography>
                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 2.5 }}>
                  {selectedProcess.items && selectedProcess.items.length > 0 ? (
                    // Multi-wood process
                    <Box sx={{ width: '100%' }}>
                      <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.75rem', mb: 1 }}>
                        Wood Types ({selectedProcess.items.length}):
                      </Typography>
                      {selectedProcess.items.map((item: any) => (
                        <Box key={item.id} sx={{ mb: 0.5, pl: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            • {item.woodType.name} {item.thickness} - {item.pieceCount} pieces
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  ) : selectedProcess.woodType ? (
                    // Single-wood process (legacy)
                    <>
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
                          {(selectedProcess.thickness / 10).toFixed(1)}cm ({(selectedProcess.thickness / 25.4).toFixed(2)}in)
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
                    </>
                  ) : null}
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

                {/* Creator & Timestamp Info */}
                {(selectedProcess.createdByName || selectedProcess.createdAt) && (
                  <Box sx={{
                    mt: 2,
                    p: 1.5,
                    backgroundColor: '#f1f5f9',
                    borderRadius: 2,
                    border: '1px solid #e2e8f0'
                  }}>
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                      {selectedProcess.createdByName && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.75rem' }}>
                            Created by:
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                            {selectedProcess.createdByName}
                          </Typography>
                        </Box>
                      )}
                      {selectedProcess.createdAt && (
                        <>
                          <Typography variant="body2" sx={{ color: '#cbd5e1' }}>•</Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.75rem' }}>
                              Created on:
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                              {formatDateInTimezone(selectedProcess.createdAt, 'yyyy-MM-dd hh:mm a', timezone)}
                            </Typography>
                          </Box>
                        </>
                      )}
                    </Box>
                  </Box>
                )}

                {/* Stats Cards */}
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  {(() => {
                    const electricityUsed = calculateElectricityUsed(selectedProcess);
                    const electricityCost = Math.abs(electricityUsed) * electricityRatePerKwh; // Use actual rate from latest recharge
                    const currentHumidity = selectedProcess.readings.length > 0
                      ? selectedProcess.readings[selectedProcess.readings.length - 1].humidity
                      : 0;

                    // Calculate running hours for depreciation - use last reading time if available
                    const startTime = new Date(selectedProcess.startTime).getTime();
                    const endTime = selectedProcess.endTime
                      ? new Date(selectedProcess.endTime).getTime()
                      : selectedProcess.readings.length > 0
                        ? new Date(selectedProcess.readings[selectedProcess.readings.length - 1].readingTime).getTime()
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
                              <Typography variant="caption" sx={{ color: '#9ca3af', fontSize: '0.65rem' }}>
                                @ {electricityRatePerKwh.toFixed(2)} TZS/kWh
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
                        <Grid item xs={12} sm={6} md={3}>
                          <Card elevation={0} sx={{ backgroundColor: '#fee2e2', border: '1px solid #fecaca' }}>
                            <CardContent sx={{ p: 1.5 }}>
                              <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.7rem', display: 'block', mb: 0.5 }}>
                                Total Cost
                              </Typography>
                              <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.1rem', color: '#dc2626' }}>
                                TZS {(electricityCost + depreciationCost).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#9ca3af', fontSize: '0.65rem' }}>
                                Electricity + Depreciation
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
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>Recorded By</TableCell>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>Notes</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedProcess.readings.map((reading) => (
                        <TableRow key={reading.id} sx={{ '&:hover': { backgroundColor: '#fef2f2' } }}>
                          <TableCell sx={{ fontSize: '0.75rem' }}>
                            {formatAsLocalTime(reading.readingTime, 'yyyy-MM-dd hh:mm a')}
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
                            {reading.electricityMeter.toFixed(2)}
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
                            {reading.humidity.toFixed(1)}
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.75rem' }}>
                            <Box>
                              <Typography variant="body2" sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#1e293b' }}>
                                {reading.createdByName || 'System'}
                              </Typography>
                              {reading.createdAt && (
                                <Typography variant="caption" sx={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                                  {formatDateInTimezone(reading.createdAt, 'yyyy-MM-dd hh:mm a', timezone)}
                                </Typography>
                              )}
                            </Box>
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.75rem' }}>
                            {reading.notes || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                      {selectedProcess.readings.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
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
        <DialogActions sx={{ p: 2.5, justifyContent: 'space-between' }}>
          {selectedProcess && (() => {
            // Use the same calculation as the UI display
            const electricityUsed = calculateElectricityUsed(selectedProcess);
            const electricityCost = Math.abs(electricityUsed) * electricityRatePerKwh;

            const startTime = new Date(selectedProcess.startTime).getTime();
            const endTime = selectedProcess.endTime
              ? new Date(selectedProcess.endTime).getTime()
              : selectedProcess.readings.length > 0
                ? new Date(selectedProcess.readings[selectedProcess.readings.length - 1].readingTime).getTime()
                : Date.now();
            const runningHours = (endTime - startTime) / (1000 * 60 * 60);

            const currentHumidity = selectedProcess.readings.length > 0
              ? selectedProcess.readings[selectedProcess.readings.length - 1].humidity
              : selectedProcess.startingHumidity || 0;

            const depreciationPerHour = annualDepreciation / 8760;
            const depreciationCost = runningHours * depreciationPerHour;

            return (
              <PDFDownloadLink
                document={
                  <DryingProcessReport
                    process={selectedProcess}
                    timestamp={new Date().toISOString()}
                    user={{
                      email: user?.email || '',
                      name: user?.name || user?.email || ''
                    }}
                    electricityUsed={electricityUsed}
                    runningHours={runningHours}
                    currentHumidity={currentHumidity}
                    electricityCost={electricityCost}
                    depreciationCost={depreciationCost}
                  />
                }
                fileName={`UD - Drying Details (${selectedProcess.batchNumber}).pdf`}
                style={{ textDecoration: 'none' }}
              >
                {({ loading }) => (
                  <Button
                    startIcon={<PictureAsPdfIcon />}
                    variant="contained"
                    disabled={loading}
                    sx={{
                      backgroundColor: '#dc2626',
                      color: '#fff',
                      textTransform: 'none',
                      fontWeight: 600,
                      '&:hover': {
                        backgroundColor: '#b91c1c',
                      },
                    }}
                  >
                    {loading ? 'Generating PDF...' : 'Generate PDF'}
                  </Button>
                )}
              </PDFDownloadLink>
            );
          })()}
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
            {editWoodItems.length > 0 ? (
              // Multi-wood process - show items
              <Alert severity="info" sx={{ mb: 2 }}>
                Multi-wood process: Wood items cannot be modified after creation. You can only edit process settings below.
              </Alert>
            ) : (
              // Single-wood process - show wood type selector
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
            )}

            {editWoodItems.length === 0 && (
              // Only show thickness and piece count for single-wood processes
              <>
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
              </>
            )}

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
            disabled={updating || (editWoodItems.length === 0 && (!editData.woodTypeId || !editData.thickness || !editData.pieceCount))}
            startIcon={updating ? <CircularProgress size={20} sx={{ color: 'white' }} /> : null}
            sx={{
              backgroundColor: '#f59e0b',
              textTransform: 'none',
              fontWeight: 600,
              px: 3,
              '&:hover': {
                backgroundColor: '#d97706',
              },
              '&:disabled': {
                backgroundColor: '#fbbf24',
                color: 'white',
                opacity: 0.7
              }
            }}
          >
            {updating ? 'Updating...' : 'Update Process'}
          </Button>
        </DialogActions>
      </Dialog>
    </StyledContainer>
  );
} 