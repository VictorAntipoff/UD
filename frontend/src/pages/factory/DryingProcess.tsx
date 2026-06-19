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
import { useState, useEffect, type ReactNode } from 'react';
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
import { useSnackbar } from 'notistack';
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
  ReferenceLine,
  PieChart,
  Pie,
  Cell
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
  linkedRecharges?: ElectricityRecharge[];
}

interface ElectricityRecharge {
  id: string;
  dryingProcessId?: string;
  rechargeDate: string;
  token: string;
  kwhAmount: number;
  totalPaid: number;
  baseCost?: number;
  vat?: number;
  ewuraFee?: number;
  reaFee?: number;
  debtCollected?: number;
  meterReadingAfter?: number;
  notes?: string;
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
  recharges?: ElectricityRecharge[]; // Luku recharges
  items?: DryingProcessItem[]; // Multi-wood support
  createdAt: string;
  updatedAt: string;
}

export default function DryingProcess() {
  const { user, hasPermission } = useAuth();
  const { timezone } = useTimezone();
  const { enqueueSnackbar } = useSnackbar();
  const isAdmin = user?.role === 'ADMIN';
  const canViewAmount = hasPermission('drying-process', 'amount');

  const [processes, setProcesses] = useState<DryingProcess[]>([]);
  const [woodTypes, setWoodTypes] = useState<WoodType[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [availableStock, setAvailableStock] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [addingReading, setAddingReading] = useState(false);
  const [creatingProcess, setCreatingProcess] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [readingDialogOpen, setReadingDialogOpen] = useState(false);
  const [selectedProcess, setSelectedProcess] = useState<DryingProcess | null>(null);
  const [expandedProcesses, setExpandedProcesses] = useState<string[]>([]);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Confirmation dialog for close-workflow actions (request, approve, reject, reopen)
  type ActionDialogVariant = 'info' | 'warning' | 'danger' | 'success';
  type ActionDialogState = {
    open: boolean;
    title: string;
    body: ReactNode;
    confirmLabel: string;
    confirmColor: ActionDialogVariant;
    requireReason?: boolean;
    reasonPlaceholder?: string;
    onConfirm: (reason: string) => Promise<void> | void;
  };
  const [actionDialog, setActionDialog] = useState<ActionDialogState>({
    open: false,
    title: '',
    body: null,
    confirmLabel: 'Confirm',
    confirmColor: 'info',
    onConfirm: async () => {},
  });
  const [actionDialogReason, setActionDialogReason] = useState('');
  const [actionDialogSubmitting, setActionDialogSubmitting] = useState(false);

  // Luku details popup — opened when user clicks a 🔗 LUKU chip on a reading
  const [lukuDialog, setLukuDialog] = useState<{
    open: boolean;
    recharge: ElectricityRecharge | null;
    reading: DryingReading | null;
  }>({ open: false, recharge: null, reading: null });
  const [actionDialogError, setActionDialogError] = useState<string | null>(null);

  const openActionDialog = (cfg: Omit<ActionDialogState, 'open'>) => {
    setActionDialogReason('');
    setActionDialogError(null);
    setActionDialog({ ...cfg, open: true });
  };
  const closeActionDialog = () => {
    if (actionDialogSubmitting) return;
    setActionDialog((s) => ({ ...s, open: false }));
  };

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
  // Collapse the completed list to the most recent few; expand on demand.
  const [showAllCompleted, setShowAllCompleted] = useState(false);
  const COMPLETED_PREVIEW_COUNT = 2;

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

  const [rechargeDialogOpen, setRechargeDialogOpen] = useState(false);
  const [selectedProcessForRecharge, setSelectedProcessForRecharge] = useState<DryingProcess | null>(null);
  const [rechargeData, setRechargeData] = useState({
    smsText: '',
    selectedReadingId: ''
  });
  const [rechargePreview, setRechargePreview] = useState<{
    token: string;
    kwhAmount: number;
    baseCost: number;
    vat: number;
    ewuraFee: number;
    reaFee: number;
    debtCollected: number;
    totalPaid: number;
    smsTimestamp: string;
  } | null>(null);
  const [showRechargePreview, setShowRechargePreview] = useState(false);
  const [annualDepreciation, setAnnualDepreciation] = useState<number>(0);
  const [electricityRatePerKwh, setElectricityRatePerKwh] = useState<number>(292); // Default fallback rate

  // Edit reading state
  const [editReadingDialogOpen, setEditReadingDialogOpen] = useState(false);
  const [editingReading, setEditingReading] = useState<any>(null);
  const [editReadingData, setEditReadingData] = useState({
    electricityMeter: '',
    humidity: '',
    readingTime: '',
    notes: ''
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
        // Get the most recent recharge with actual cost data (filter out migrated recharges with totalPaid = 0)
        const latestRechargeWithCost = recharges.find((r: any) => r.totalPaid > 0);

        // Calculate rate: totalPaid / kwhAmount
        if (latestRechargeWithCost && latestRechargeWithCost.kwhAmount && latestRechargeWithCost.kwhAmount > 0) {
          const rate = latestRechargeWithCost.totalPaid / latestRechargeWithCost.kwhAmount;
          setElectricityRatePerKwh(rate);
          console.log(`Using actual electricity rate: ${rate.toFixed(2)} TZS/kWh (from latest recharge with cost data)`);
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
    if (creatingProcess) return; // Prevent double-click

    try {
      setCreatingProcess(true);

      // Validate warehouse selected
      if (!newProcess.warehouseId) {
        enqueueSnackbar('Please select a warehouse', { variant: 'warning' });
        setCreatingProcess(false);
        return;
      }

      // Validate at least one wood item
      if (woodItems.length === 0 || !woodItems[0].woodTypeId) {
        enqueueSnackbar('Please add at least one wood type', { variant: 'warning' });
        setCreatingProcess(false);
        return;
      }

      // Validate all wood items
      const items = [];
      for (const item of woodItems) {
        if (!item.woodTypeId || !item.thickness || !item.pieceCount) {
          enqueueSnackbar('Please fill in all fields for each wood type', { variant: 'warning' });
          setCreatingProcess(false);
          return;
        }

        // Find the stock for validation
        const stock = availableStock.find(
          s => s.woodTypeId === item.woodTypeId && s.thickness === item.thickness
        );

        if (!stock) {
          enqueueSnackbar('Selected stock not found for one of the wood types', { variant: 'error' });
          return;
        }

        const requestedQuantity = parseInt(item.pieceCount);
        if (requestedQuantity > stock.statusNotDried) {
          const woodType = woodTypes.find(w => w.id === item.woodTypeId);
          enqueueSnackbar(
            `Cannot dry ${requestedQuantity} pieces of ${woodType?.name} ${item.thickness}. Only ${stock.statusNotDried} not dried pieces available.`,
            { variant: 'error' }
          );
          return;
        }

        if (requestedQuantity <= 0) {
          enqueueSnackbar('Please enter a valid number of pieces (minimum 1) for all wood types', { variant: 'warning' });
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
      enqueueSnackbar(error.response?.data?.error || 'Failed to create drying process', { variant: 'error' });
    } finally {
      setCreatingProcess(false);
    }
  };

  // A reading qualifies as an "inferred recharge" candidate when:
  //   1. it has no recharge linked to it yet, and
  //   2. the meter jumped > 100 units vs the previous reading (or startingElectricityUnits
  //      if it's the first reading) — same heuristic that drives the ⚠ Inferred recharge chip.
  // Returns candidates newest-first.
  const getInferredRechargeReadings = (process: DryingProcess): DryingReading[] => {
    const readings = process.readings || [];
    if (readings.length === 0) return [];
    const candidates: DryingReading[] = [];
    for (let i = 0; i < readings.length; i++) {
      const reading = readings[i];
      if (reading.linkedRecharges && reading.linkedRecharges.length > 0) continue;
      const prev = i > 0
        ? readings[i - 1].electricityMeter
        : (process.startingElectricityUnits ?? null);
      if (prev === null || prev <= 0) continue;
      if (reading.electricityMeter - prev > 100) {
        candidates.push(reading);
      }
    }
    return candidates.reverse();
  };

  const handleOpenRechargeDialog = (process: DryingProcess) => {
    const inferred = getInferredRechargeReadings(process);
    if (inferred.length === 0) {
      enqueueSnackbar(
        'No inferred recharge detected. Add a meter reading taken AFTER recharging (meter must jump by more than 100 units) first, then attach the Luku SMS.',
        { variant: 'warning', autoHideDuration: 7000 }
      );
      return;
    }
    setSelectedProcessForRecharge(process);
    setRechargeDialogOpen(true);
    setRechargeData({
      smsText: '',
      selectedReadingId: inferred[0].id
    });
    // Reset preview state
    setShowRechargePreview(false);
    setRechargePreview(null);
  };

  // Parse SMS and show preview
  const handleParseRecharge = () => {
    if (!selectedProcessForRecharge || !rechargeData.smsText || !rechargeData.selectedReadingId) {
      enqueueSnackbar('Please paste the Luku SMS and select the reading this recharge is linked to', { variant: 'warning' });
      return;
    }

    // Parse SMS to extract recharge information
    const smsText = rechargeData.smsText;

    // Extract token
    const tokenMatch = smsText.match(/TOKEN[:：\s]*([0-9\s\-]+)/i);
    const token = tokenMatch ? tokenMatch[1].replace(/\s+/g, '').substring(0, 50) : '';

    // Extract kWh amount
    const kwhMatch = smsText.match(/([0-9]+(?:\.[0-9]+)?)\s*KWH/i);
    const kwhAmount = kwhMatch ? parseFloat(kwhMatch[1]) : 0;

    // Extract costs - support both old format (MALIPO_UMEME) and new format (Cost)
    const baseCostMatch = smsText.match(/(?:MALIPO[_\-]UMEME[_\-]|Cost\s+)([0-9]+(?:,[0-9]+)*(?:\.[0-9]+)?)/i);
    const baseCost = baseCostMatch ? parseFloat(baseCostMatch[1].replace(/,/g, '')) : 0;

    // VAT - support both "VAT_123" and "VAT 18% 123" formats
    const vatMatch = smsText.match(/VAT[_\-\s]+(?:\d+%\s+)?([0-9]+(?:,[0-9]+)*(?:\.[0-9]+)?)/i);
    const vat = vatMatch ? parseFloat(vatMatch[1].replace(/,/g, '')) : 0;

    // EWURA - support both "EWURA_123" and "EWURA 1% 123" formats
    const ewuraMatch = smsText.match(/EWURA[_\-\s]+(?:\d+%\s+)?([0-9]+(?:,[0-9]+)*(?:\.[0-9]+)?)/i);
    const ewuraFee = ewuraMatch ? parseFloat(ewuraMatch[1].replace(/,/g, '')) : 0;

    // REA - support both "REA_123" and "REA 3% 123" formats
    const reaMatch = smsText.match(/REA[_\-\s]+(?:\d+%\s+)?([0-9]+(?:,[0-9]+)*(?:\.[0-9]+)?)/i);
    const reaFee = reaMatch ? parseFloat(reaMatch[1].replace(/,/g, '')) : 0;

    // Debt Collected (new field)
    const debtMatch = smsText.match(/Debt\s+Collected\s+([0-9]+(?:,[0-9]+)*(?:\.[0-9]+)?)/i);
    const debtCollected = debtMatch ? parseFloat(debtMatch[1].replace(/,/g, '')) : 0;

    // Total - support both "Jumla 123" and "TOTAL TZS 123" formats
    const totalMatch = smsText.match(/(?:Jumla\s+|TOTAL\s+TZS\s+)([0-9]+(?:,[0-9]+)*(?:\.[0-9]+)?)/i);
    const totalPaid = totalMatch ? parseFloat(totalMatch[1].replace(/,/g, '')) : 0;

    // Extract SMS date for audit trail only (stored in notes)
    // Support both "Tarehe DD/MM/YYYY" and "YYYY-MM-DD HH:MM" formats
    const dateMatch = smsText.match(/Tarehe\s+(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/i);
    const newDateMatch = smsText.match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/);
    let smsTimestamp = '';
    if (dateMatch) {
      const day = String(dateMatch[1]).padStart(2, '0');
      const month = String(dateMatch[2]).padStart(2, '0');
      const year = dateMatch[3];
      const hour = dateMatch[4] ? String(dateMatch[4]).padStart(2, '0') : '00';
      const minute = dateMatch[5] ? String(dateMatch[5]).padStart(2, '0') : '00';
      smsTimestamp = `${day}/${month}/${year} ${hour}:${minute}`;
    } else if (newDateMatch) {
      // New format: YYYY-MM-DD HH:MM
      const year = newDateMatch[1];
      const month = newDateMatch[2];
      const day = newDateMatch[3];
      const hour = newDateMatch[4];
      const minute = newDateMatch[5];
      smsTimestamp = `${day}/${month}/${year} ${hour}:${minute}`;
    }

    if (!kwhAmount || kwhAmount === 0) {
      enqueueSnackbar('Could not parse kWh amount from SMS. Please check the SMS format.', { variant: 'error' });
      return;
    }

    // Set preview data
    setRechargePreview({
      token,
      kwhAmount,
      baseCost,
      vat,
      ewuraFee,
      reaFee,
      debtCollected,
      totalPaid,
      smsTimestamp
    });
    setShowRechargePreview(true);
  };

  // Confirm and save the recharge
  const handleConfirmRecharge = async () => {
    try {
      if (!selectedProcessForRecharge || !rechargePreview) {
        return;
      }

      const selectedReading = selectedProcessForRecharge.readings?.find(
        r => r.id === rechargeData.selectedReadingId
      );
      if (!selectedReading) {
        enqueueSnackbar('Selected reading not found. Please reopen the dialog and try again.', { variant: 'error' });
        return;
      }

      const rechargeDate = new Date().toISOString();
      const smsTimestamp = rechargePreview.smsTimestamp ? ` (SMS timestamp: ${rechargePreview.smsTimestamp})` : '';

      // Create recharge record. The meter-after value is taken directly from the
      // selected reading — that reading IS the post-recharge state by definition,
      // so there is no separate user-entered "meter after" field.
      await api.post('/electricity/recharges', {
        dryingProcessId: selectedProcessForRecharge.id,
        linkedReadingId: selectedReading.id,
        rechargeDate,
        token: rechargePreview.token,
        kwhAmount: rechargePreview.kwhAmount,
        totalPaid: rechargePreview.totalPaid,
        baseCost: rechargePreview.baseCost,
        vat: rechargePreview.vat,
        ewuraFee: rechargePreview.ewuraFee,
        reaFee: rechargePreview.reaFee,
        debtCollected: rechargePreview.debtCollected,
        meterReadingAfter: selectedReading.electricityMeter,
        notes: `Added during drying process${smsTimestamp}`
      });

      // Refresh data and close dialogs
      await fetchData();
      setShowRechargePreview(false);
      setRechargePreview(null);
      setRechargeDialogOpen(false);
      setRechargeData({ smsText: '', selectedReadingId: '' });
      enqueueSnackbar('Recharge added successfully', { variant: 'success' });
    } catch (error: any) {
      console.error('Error adding recharge:', error);
      enqueueSnackbar(error.response?.data?.error || 'Failed to add recharge', { variant: 'error' });
    }
  };

  // Cancel preview and go back to edit
  const handleCancelPreview = () => {
    setShowRechargePreview(false);
    setRechargePreview(null);
  };

  const handleAddReading = async () => {
    if (!selectedProcess || addingReading) return;

    try {
      setAddingReading(true);

      // Convert local time to UTC properly using parseLocalToUTC
      const readingTimeISO = parseLocalToUTC(newReading.readingTime, timezone);

      await api.post(`/factory/drying-processes/${selectedProcess.id}/readings`, {
        electricityMeter: parseFloat(newReading.electricityMeter),
        humidity: parseFloat(newReading.humidity),
        readingTime: readingTimeISO,
        notes: newReading.notes
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
    } catch (error: any) {
      console.error('Error adding reading:', error);
      enqueueSnackbar(error.response?.data?.error || 'Failed to add reading. Please try again.', { variant: 'error' });
    } finally {
      setAddingReading(false);
    }
  };

  const handleEditReading = async () => {
    if (!editingReading) return;

    try {
      // Convert local time to UTC properly using parseLocalToUTC
      const readingTimeISO = parseLocalToUTC(editReadingData.readingTime, timezone);

      await api.put(`/factory/drying-readings/${editingReading.id}`, {
        electricityMeter: parseFloat(editReadingData.electricityMeter),
        humidity: parseFloat(editReadingData.humidity),
        readingTime: readingTimeISO,
        notes: editReadingData.notes
      });

      // Refresh the process data
      await fetchData();
      setEditReadingDialogOpen(false);
      setEditingReading(null);
      setEditReadingData({
        electricityMeter: '',
        humidity: '',
        readingTime: '',
        notes: ''
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
      notes: reading.notes || ''
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

  const handleRequestClose = (process: DryingProcess) => {
    if (process.readings.length < 2) {
      enqueueSnackbar('Need at least 2 readings before requesting close', { variant: 'warning' });
      return;
    }
    openActionDialog({
      title: `Request close for ${process.batchNumber}?`,
      body: (
        <Stack spacing={1.5}>
          <Typography variant="body2" sx={{ color: '#475569' }}>
            Once submitted, no new readings, edits, or recharges can be added to this process
            until an admin approves or rejects the request.
          </Typography>
          <Typography variant="body2" sx={{ color: '#475569' }}>
            The cost will be calculated automatically and shown to the admin for review.
            Stock will only move from <b>Under Drying</b> to <b>Dried</b> after admin approval.
          </Typography>
        </Stack>
      ),
      confirmLabel: 'Request Close',
      confirmColor: 'success',
      requireReason: false,
      onConfirm: async () => {
        await api.post(`/factory/drying-processes/${process.id}/request-close`);
        await fetchData();
      },
    });
  };

  const handleApproveClose = (process: DryingProcess) => {
    const totalPieces = process.items?.length
      ? process.items.reduce((s, i) => s + i.pieceCount, 0)
      : process.pieceCount || 0;
    openActionDialog({
      title: `Approve close for ${process.batchNumber}?`,
      body: (
        <Stack spacing={1.5}>
          <Typography variant="body2" sx={{ color: '#475569' }}>This will:</Typography>
          <Box component="ul" sx={{ pl: 3, m: 0, color: '#475569' }}>
            <li><Typography variant="body2">Mark the process <b>COMPLETED</b></Typography></li>
            <li><Typography variant="body2">Move <b>{totalPieces}</b> pieces from Under Drying → Dried</Typography></li>
            <li><Typography variant="body2">Lock all readings and finalize the calculated cost</Typography></li>
          </Box>
          {process.totalCost ? (
            <Typography variant="body2" sx={{ color: '#475569', mt: 1 }}>
              Cost preview: <b>TZS {process.totalCost.toLocaleString('en-US', { maximumFractionDigits: 0 })}</b>
              <br />
              <Typography component="span" variant="caption" sx={{ color: '#64748b' }}>
                (Final value will be recalculated on approval.)
              </Typography>
            </Typography>
          ) : null}
        </Stack>
      ),
      confirmLabel: 'Approve',
      confirmColor: 'success',
      requireReason: false,
      onConfirm: async () => {
        await api.post(`/factory/drying-processes/${process.id}/approve-close`);
        await fetchData();
      },
    });
  };

  const handleRejectClose = (process: DryingProcess) => {
    openActionDialog({
      title: `Reject close for ${process.batchNumber}?`,
      body: (
        <Typography variant="body2" sx={{ color: '#475569' }}>
          The process will return to <b>In Progress</b>. The operator can then add or fix readings
          and re-request closing. Your reason will be visible to the operator and recorded in history.
        </Typography>
      ),
      confirmLabel: 'Reject',
      confirmColor: 'danger',
      requireReason: true,
      reasonPlaceholder: 'e.g. Last reading is missing the meter photo',
      onConfirm: async (reason) => {
        await api.post(`/factory/drying-processes/${process.id}/reject-close`, { reason });
        await fetchData();
      },
    });
  };

  const handleReopenProcess = (process: DryingProcess) => {
    openActionDialog({
      title: `Reopen ${process.batchNumber}?`,
      body: (
        <Stack spacing={1.5}>
          <Typography variant="body2" sx={{ color: '#475569' }}>This will:</Typography>
          <Box component="ul" sx={{ pl: 3, m: 0, color: '#475569' }}>
            <li><Typography variant="body2">Set status back to <b>IN_PROGRESS</b></Typography></li>
            <li><Typography variant="body2">Move pieces from <b>Dried</b> → <b>Under Drying</b> (reverse the close)</Typography></li>
            <li><Typography variant="body2">Clear the previously calculated cost</Typography></li>
          </Box>
          <Typography variant="caption" sx={{ color: '#64748b' }}>
            If the dried pieces have already been transferred or used downstream, the system will refuse
            to reopen rather than create negative stock.
          </Typography>
        </Stack>
      ),
      confirmLabel: 'Reopen',
      confirmColor: 'warning',
      requireReason: true,
      reasonPlaceholder: 'e.g. Process was closed by mistake before all readings were entered',
      onConfirm: async (reason) => {
        await api.post(`/factory/drying-processes/${process.id}/reopen`, { reason });
        await fetchData();
      },
    });
  };

  const handleDeleteProcess = (process: DryingProcess) => {
    const totalPieces = process.items?.length
      ? process.items.reduce((s, i) => s + i.pieceCount, 0)
      : process.pieceCount || 0;
    const willRestoreStock = process.status === 'IN_PROGRESS' && process.useStock;

    openActionDialog({
      title: `Delete ${process.batchNumber}?`,
      body: (
        <Stack spacing={1.5}>
          <Typography variant="body2" sx={{ color: '#475569' }}>
            This will permanently remove the drying process, all its readings,
            and any linked Luku recharges.
          </Typography>
          {willRestoreStock && totalPieces > 0 && (
            <Box sx={{ p: 1.5, backgroundColor: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 1 }}>
              <Typography variant="body2" sx={{ color: '#b45309', fontWeight: 600 }}>
                Stock impact
              </Typography>
              <Typography variant="caption" sx={{ color: '#92400e', display: 'block', mt: 0.5 }}>
                <strong>{totalPieces}</strong> piece{totalPieces === 1 ? '' : 's'} will be returned from
                Under&nbsp;Drying → Not&nbsp;Dried. The audit trail records who deleted the process and when.
              </Typography>
            </Box>
          )}
          {process.status !== 'IN_PROGRESS' && (
            <Typography variant="caption" sx={{ color: '#64748b' }}>
              The process is <strong>{process.status === 'PENDING_CLOSE' ? 'pending approval' : 'completed'}</strong>,
              so no stock will be moved by this delete.
            </Typography>
          )}
          <Typography variant="body2" sx={{ color: '#dc2626', fontWeight: 600, mt: 0.5 }}>
            This cannot be undone.
          </Typography>
        </Stack>
      ),
      confirmLabel: 'Delete process',
      confirmColor: 'danger',
      requireReason: false,
      onConfirm: async () => {
        await api.delete(`/factory/drying-processes/${process.id}`);
        setProcesses((prev) => prev.filter(p => p.id !== process.id));
      },
    });
  };

  const getStatusColor = (status: string) => {
    const colors: any = {
      'IN_PROGRESS': '#3b82f6',
      'PENDING_CLOSE': '#f59e0b',
      'COMPLETED': '#10b981',
      'CANCELLED': '#ef4444'
    };
    return colors[status] || '#64748b';
  };

  const getStatusLabel = (status: string) => {
    const labels: any = {
      'IN_PROGRESS': 'In Progress',
      'PENDING_CLOSE': 'Pending Approval',
      'COMPLETED': 'Completed',
      'CANCELLED': 'Cancelled'
    };
    return labels[status] || status;
  };

  const calculateElectricityUsed = (process: DryingProcess) => {
    if (!process.readings || process.readings.length === 0) return 0;

    const readings = process.readings;
    const recharges = process.recharges || [];
    // Mirror backend: prefer linked-reading time as the recharge anchor,
    // fall back to rechargeDate for legacy unlinked recharges.
    const rechargeEffectiveTime = (r: any): Date =>
      r.LinkedReading?.readingTime
        ? new Date(r.LinkedReading.readingTime)
        : new Date(r.rechargeDate);

    let totalUsed = 0;

    for (let i = 0; i < readings.length; i++) {
      const currentReading = readings[i];
      const currentTime = new Date(currentReading.readingTime);

      let prevReading: number;
      let prevTime: Date;

      if (i === 0) {
        prevReading = process.startingElectricityUnits || readings[0].electricityMeter;
        prevTime = new Date(process.startTime);
      } else {
        prevReading = readings[i - 1].electricityMeter;
        prevTime = new Date(readings[i - 1].readingTime);
      }

      const rechargesBetween = recharges.filter((r: any) => {
        const t = rechargeEffectiveTime(r);
        return t > prevTime && t <= currentTime;
      });

      if (rechargesBetween.length > 0) {
        // Match backend formula: prev + recharged - current
        const totalRecharged = rechargesBetween.reduce((sum, r) => sum + r.kwhAmount, 0);
        const consumed = prevReading + totalRecharged - currentReading.electricityMeter;
        totalUsed += Math.max(0, consumed);
      } else {
        const consumed = prevReading - currentReading.electricityMeter;
        if (consumed > 0) {
          totalUsed += consumed;
        }
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

  // The rows actually rendered: collapsed to the most recent few by default.
  // When the user is searching or has chosen to expand, show the full result set.
  const getVisibleCompletedProcesses = () => {
    const all = getFilteredAndSortedCompletedProcesses();
    if (showAllCompleted || completedSearchTerm.trim()) return all;
    return all.slice(0, COMPLETED_PREVIEW_COUNT);
  };

  const handleCompletedSort = (field: typeof completedSortField) => {
    if (completedSortField === field) {
      setCompletedSortOrder(completedSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setCompletedSortField(field);
      setCompletedSortOrder('asc');
    }
  };

  // Aggregate stats across ALL completed processes (ignores the search filter so
  // the summary always reflects the full picture). Pieces come from items[] for
  // multi-wood batches, or the legacy single fields otherwise.
  const getCompletedStats = () => {
    const completed = processes.filter(p => p.status === 'COMPLETED');

    let totalPieces = 0;
    let totalElectricity = 0;
    // wood-type name -> { total pieces, pieces per thickness label }
    const byWoodType: Record<string, { pieces: number; thickness: Record<string, number> }> = {};

    // items[] carry thickness as a display string (e.g. `2"`); legacy single
    // processes store it in mm, so normalise both to a readable inch label.
    const thicknessLabel = (raw: any): string => {
      if (raw === null || raw === undefined || raw === '') return '—';
      if (typeof raw === 'string') return raw.trim();
      const inches = raw / 25.4;
      return `${Number.isInteger(inches) ? inches : inches.toFixed(1)}"`;
    };

    const add = (name: string, thick: any, pcs: number) => {
      if (!pcs) return;
      totalPieces += pcs;
      const bucket = byWoodType[name] || (byWoodType[name] = { pieces: 0, thickness: {} });
      bucket.pieces += pcs;
      const tl = thicknessLabel(thick);
      bucket.thickness[tl] = (bucket.thickness[tl] || 0) + pcs;
    };

    for (const p of completed) {
      totalElectricity += Math.abs(calculateElectricityUsed(p));

      if (p.items && p.items.length > 0) {
        for (const item of p.items as any[]) {
          add(item.woodType?.name || 'Unknown', item.thickness, item.pieceCount || 0);
        }
      } else {
        add(p.woodType?.name || 'Unknown', p.thickness, p.pieceCount || 0);
      }
    }

    const woodTypes = Object.entries(byWoodType)
      .map(([name, data]) => ({
        name,
        pieces: data.pieces,
        percentage: totalPieces > 0 ? (data.pieces / totalPieces) * 100 : 0,
        // Per-thickness breakdown, largest first, as readable chips.
        thicknesses: Object.entries(data.thickness)
          .map(([label, pieces]) => ({ label, pieces }))
          .sort((a, b) => b.pieces - a.pieces),
      }))
      .sort((a, b) => b.pieces - a.pieces);

    return {
      totalBatches: completed.length,
      totalPieces,
      totalElectricity,
      woodTypeCount: woodTypes.length,
      woodTypes,
    };
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
        startTime: formatForDateTimeInput(process.startTime, timezone),
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
        startTime: formatForDateTimeInput(process.startTime, timezone),
        notes: process.notes || ''
      });
    } else {
      enqueueSnackbar('Cannot edit this process. Missing required fields.', { variant: 'warning' });
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
        startTime: parseLocalToUTC(editData.startTime, timezone),
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
      enqueueSnackbar('Failed to update process. Please try again.', { variant: 'error' });
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
          {/* In Progress + Pending Approval Section */}
          {processes.filter(p => p.status === 'IN_PROGRESS' || p.status === 'PENDING_CLOSE').length > 0 && (
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
                  label={processes.filter(p => p.status === 'IN_PROGRESS' || p.status === 'PENDING_CLOSE').length}
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
                {processes.filter(p => p.status === 'IN_PROGRESS' || p.status === 'PENDING_CLOSE').map((process) => {
                  const electricityUsed = calculateElectricityUsed(process);
                  const currentHumidity = process.readings.length > 0
                    ? process.readings[process.readings.length - 1].humidity
                    : 0;
                  // Tint the card by its status (blue=in progress, amber=pending).
                  const statusColor = getStatusColor(process.status);

                  return (
              <Grid item xs={12} key={process.id}>
                <Accordion
                  expanded={expandedProcesses.includes(process.id)}
                  onChange={() => toggleProcessExpanded(process.id)}
                  elevation={0}
                  sx={{
                    borderRadius: 2,
                    border: '1px solid #e2e8f0',
                    borderLeft: `4px solid ${statusColor}`,
                    overflow: 'hidden',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      boxShadow: `0 4px 14px ${alpha(statusColor, 0.18)}`,
                      borderColor: statusColor,
                      borderLeftColor: statusColor,
                    },
                    '&:before': {
                      display: 'none'
                    }
                  }}
                >
                  {/* Process Header */}
                  <AccordionSummary
                    expandIcon={<ExpandMoreIcon sx={{ color: statusColor }} />}
                    sx={{
                      p: { xs: 1.5, sm: 2 },
                      background: `linear-gradient(90deg, ${alpha(statusColor, 0.06)} 0%, #f8fafc 60%)`,
                      '&:hover': {
                        background: `linear-gradient(90deg, ${alpha(statusColor, 0.1)} 0%, #f1f5f9 60%)`
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
                              backgroundColor: statusColor,
                              color: '#fff',
                              px: 2,
                              py: 0.75,
                              borderRadius: 1,
                              fontWeight: 700,
                              fontSize: '0.875rem',
                              boxShadow: `0 2px 6px ${alpha(statusColor, 0.35)}`,
                            }}
                          >
                            {process.batchNumber}
                          </Box>
                          <Chip
                            label={getStatusLabel(process.status)}
                            size="small"
                            sx={{
                              backgroundColor: alpha(statusColor, 0.12),
                              color: statusColor,
                              fontWeight: 700,
                              fontSize: '0.75rem',
                              border: `1px solid ${alpha(statusColor, 0.4)}`,
                            }}
                          />
                        </Box>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
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
                        {/* Inline mini-stats — key live data at a glance */}
                        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 0.75 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 1, py: 0.4, borderRadius: 1, backgroundColor: alpha('#3b82f6', 0.1) }}>
                            <OpacityIcon sx={{ fontSize: 15, color: '#3b82f6' }} />
                            <Typography variant="caption" sx={{ fontWeight: 700, color: '#1e3a8a' }}>
                              {currentHumidity ? `${currentHumidity.toFixed(1)}%` : '—'}
                            </Typography>
                          </Box>
                          {canViewAmount && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 1, py: 0.4, borderRadius: 1, backgroundColor: alpha('#16a34a', 0.1) }}>
                              <ElectricBoltIcon sx={{ fontSize: 15, color: '#16a34a' }} />
                              <Typography variant="caption" sx={{ fontWeight: 700, color: '#166534' }}>
                                {Math.abs(electricityUsed).toFixed(0)} u
                              </Typography>
                            </Box>
                          )}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 1, py: 0.4, borderRadius: 1, backgroundColor: alpha('#64748b', 0.1) }}>
                            <TimelineIcon sx={{ fontSize: 15, color: '#64748b' }} />
                            <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569' }}>
                              {process.readings.length} reading{process.readings.length === 1 ? '' : 's'}
                            </Typography>
                          </Box>
                        </Stack>
                        </Box>
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
                                backgroundColor: '#3b82f6',
                                color: '#fff',
                                fontSize: { xs: '0.72rem', sm: '0.8rem' },
                                fontWeight: 700,
                                textTransform: 'none',
                                boxShadow: '0 2px 6px rgba(59,130,246,0.35)',
                                px: { xs: 1.75, sm: 2.5 },
                                py: { xs: 0.6, sm: 0.85 },
                                minWidth: { xs: '80px', sm: 'auto' },
                                whiteSpace: 'nowrap',
                                '& .MuiButton-startIcon': {
                                  marginRight: { xs: 0.5, sm: 1 },
                                  marginLeft: 0,
                                },
                                '&:hover': {
                                  backgroundColor: '#2563eb',
                                  boxShadow: '0 3px 8px rgba(59,130,246,0.45)',
                                }
                              }}
                              variant="contained"
                            >
                              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Add Reading</Box>
                              <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>Add</Box>
                            </Button>
                            {/* Request Close — secondary primary, sits next to Add Reading */}
                            <Button
                              size="small"
                              startIcon={<CheckCircleIcon />}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRequestClose(process);
                              }}
                              sx={{
                                color: '#059669',
                                borderColor: '#10b981',
                                fontSize: { xs: '0.7rem', sm: '0.75rem' },
                                fontWeight: 600,
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
                                  backgroundColor: alpha('#10b981', 0.06),
                                }
                              }}
                              variant="outlined"
                            >
                              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Request Close</Box>
                              <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>Close</Box>
                            </Button>
                            {/* Add Luku — least important, small quiet text button */}
                            <Button
                              size="small"
                              startIcon={<ElectricBoltIcon sx={{ fontSize: '16px !important' }} />}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenRechargeDialog(process);
                              }}
                              sx={{
                                color: '#64748b',
                                fontSize: { xs: '0.66rem', sm: '0.7rem' },
                                textTransform: 'none',
                                px: { xs: 0.75, sm: 1 },
                                py: 0.25,
                                minWidth: 'auto',
                                whiteSpace: 'nowrap',
                                '& .MuiButton-startIcon': {
                                  marginRight: 0.25,
                                  marginLeft: 0,
                                  color: '#f59e0b',
                                },
                                '&:hover': {
                                  backgroundColor: alpha('#f59e0b', 0.08),
                                  color: '#475569',
                                }
                              }}
                            >
                              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Luku</Box>
                              <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>Luku</Box>
                            </Button>
                          </>
                        )}
                        {process.status === 'PENDING_CLOSE' && (
                          <>
                            {/* The status is already shown by the red badge next to the
                                batch number, so no second "Pending Approval" chip here. */}
                            {/* A recharge can still be logged while pending close — it
                                feeds the cost preview the admin reviews before approving.
                                Gated by the same luku-recharge permission. */}
                            {hasPermission('luku-recharge') && (
                              <Button
                                size="small"
                                startIcon={<ElectricBoltIcon />}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenRechargeDialog(process);
                                }}
                                sx={{
                                  color: '#475569',
                                  borderColor: '#cbd5e1',
                                  fontSize: { xs: '0.7rem', sm: '0.75rem' },
                                  textTransform: 'none',
                                  px: { xs: 1.5, sm: 2 },
                                  py: { xs: 0.5, sm: 0.75 },
                                  minWidth: { xs: '70px', sm: 'auto' },
                                  whiteSpace: 'nowrap',
                                  '& .MuiButton-startIcon': {
                                    marginRight: { xs: 0.5, sm: 1 },
                                    marginLeft: 0,
                                    color: '#f59e0b',
                                  },
                                  '&:hover': {
                                    borderColor: '#94a3b8',
                                    backgroundColor: alpha('#64748b', 0.06),
                                  }
                                }}
                                variant="outlined"
                              >
                                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Add Luku</Box>
                                <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>Luku</Box>
                              </Button>
                            )}
                            {isAdmin && (
                              <>
                                <Button
                                  size="small"
                                  startIcon={<CheckCircleIcon />}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleApproveClose(process);
                                  }}
                                  sx={{
                                    backgroundColor: '#10b981',
                                    color: '#fff',
                                    fontSize: { xs: '0.7rem', sm: '0.75rem' },
                                    textTransform: 'none',
                                    boxShadow: 'none',
                                    px: { xs: 1.5, sm: 2 },
                                    py: { xs: 0.5, sm: 0.75 },
                                    whiteSpace: 'nowrap',
                                    '&:hover': {
                                      backgroundColor: '#059669',
                                      boxShadow: 'none',
                                    }
                                  }}
                                  variant="contained"
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRejectClose(process);
                                  }}
                                  sx={{
                                    color: '#ef4444',
                                    borderColor: '#ef4444',
                                    fontSize: { xs: '0.7rem', sm: '0.75rem' },
                                    textTransform: 'none',
                                    px: { xs: 1.5, sm: 2 },
                                    py: { xs: 0.5, sm: 0.75 },
                                    whiteSpace: 'nowrap',
                                    '&:hover': {
                                      borderColor: '#dc2626',
                                      backgroundColor: alpha('#ef4444', 0.04),
                                    }
                                  }}
                                  variant="outlined"
                                >
                                  Reject
                                </Button>
                              </>
                            )}
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
                              color: '#475569',
                              borderColor: '#cbd5e1',
                              fontSize: { xs: '0.7rem', sm: '0.75rem' },
                              textTransform: 'none',
                              px: { xs: 1, sm: 2 },
                              minWidth: { xs: 'auto', sm: 'auto' },
                              display: { xs: 'none', sm: 'inline-flex' },
                              '&:hover': {
                                borderColor: '#94a3b8',
                                backgroundColor: alpha('#64748b', 0.06),
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
                              color: '#64748b',
                              p: { xs: 0.75, sm: 1 },
                              '&:hover': {
                                color: '#475569',
                                backgroundColor: alpha('#64748b', 0.1)
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
                              handleDeleteProcess(process);
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

                  {process.status === 'PENDING_CLOSE' && (
                    <Alert
                      severity="warning"
                      icon={false}
                      sx={{
                        m: 3,
                        mb: 0,
                        backgroundColor: '#fffbeb',
                        border: '1px solid #fcd34d',
                        '& .MuiAlert-message': { width: '100%' },
                      }}
                    >
                      {isAdmin ? (
                        <>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: '#b45309', mb: 0.5 }}>
                            Pending admin approval — locked
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#92400e' }}>
                            No new readings, edits, or recharges can be added until an admin approves or rejects this close request.
                            {process.totalCost ? ` Cost preview: TZS ${process.totalCost.toLocaleString('en-US', { maximumFractionDigits: 0 })}.` : ''}
                          </Typography>
                        </>
                      ) : (
                        <>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: '#b45309', mb: 0.5 }}>
                            ⏳ Awaiting approval
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#92400e' }}>
                            Your close request has been submitted. An admin will review it and approve or reject. No new readings or edits can be added in the meantime.
                          </Typography>
                        </>
                      )}
                    </Alert>
                  )}

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

                      {canViewAmount && (
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
                      )}

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
                                        {formatAsLocalTime(reading.readingTime, 'MM/dd/yyyy', timezone)}
                                      </Typography>
                                      <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mt: 0.25 }}>
                                        {formatAsLocalTime(reading.readingTime, 'hh:mm a', timezone)}
                                      </Typography>
                                    </TableCell>
                                    <TableCell sx={{ fontSize: '0.813rem' }}>
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <ElectricBoltIcon sx={{ fontSize: 14, color: '#16a34a' }} />
                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                          {reading.electricityMeter.toFixed(2)}
                                        </Typography>
                                        {(() => {
                                          // PRIMARY: linked recharge data (real, clickable)
                                          if (reading.linkedRecharges && reading.linkedRecharges.length > 0) {
                                            const recharge = reading.linkedRecharges[0];
                                            return (
                                              <Chip
                                                icon={<ElectricBoltIcon sx={{ fontSize: 12, color: '#f59e0b !important' }} />}
                                                label={`🔗 LUKU ${recharge.kwhAmount.toFixed(0)} kWh`}
                                                size="small"
                                                clickable
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setLukuDialog({ open: true, recharge, reading });
                                                }}
                                                sx={{
                                                  height: 20,
                                                  fontSize: '0.7rem',
                                                  backgroundColor: '#fef3c7',
                                                  color: '#b45309',
                                                  fontWeight: 700,
                                                  border: '1px solid #fcd34d',
                                                  ml: 0.5,
                                                  '&:hover': { backgroundColor: '#fde68a' }
                                                }}
                                              />
                                            );
                                          }

                                          // FALLBACK: meter-jump heuristic for legacy unlinked data
                                          let prevReading = null;
                                          if (index > 0) {
                                            prevReading = process.readings[index - 1].electricityMeter;
                                          } else if (process.startingElectricityUnits) {
                                            prevReading = process.startingElectricityUnits;
                                          }
                                          if (prevReading !== null && prevReading > 0) {
                                            const diff = reading.electricityMeter - prevReading;

                                            // Large positive jump → inferred recharge (legacy, no link)
                                            if (diff > 100) {
                                              return (
                                                <Chip
                                                  label="⚠ Inferred recharge"
                                                  size="small"
                                                  title="The meter went up but no Luku recharge is linked to this reading. Likely legacy data."
                                                  sx={{
                                                    height: 20,
                                                    fontSize: '0.65rem',
                                                    backgroundColor: '#f1f5f9',
                                                    color: '#64748b',
                                                    fontWeight: 600,
                                                    border: '1px dashed #cbd5e1',
                                                    ml: 0.5
                                                  }}
                                                />
                                              );
                                            }

                                            // Normal consumption
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
                                        {process.status === 'IN_PROGRESS' ? (
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
                                        ) : (
                                          <IconButton
                                            size="small"
                                            disabled
                                            title="Readings are locked. Reopen the process to edit."
                                            sx={{ color: '#cbd5e1' }}
                                          >
                                            <EditIcon sx={{ fontSize: 16 }} />
                                          </IconButton>
                                        )}
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
              {/* ===== Summary statistics ===== */}
              {(() => {
                const stats = getCompletedStats();
                const palette = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#ef4444', '#84cc16'];
                const summaryCards: { label: string; value: string; sub?: string; icon: ReactNode; color: string }[] = [
                  {
                    label: 'Completed Batches',
                    value: stats.totalBatches.toLocaleString(),
                    sub: 'drying processes',
                    icon: <CheckCircleIcon sx={{ fontSize: 22 }} />,
                    color: '#10b981',
                  },
                  {
                    label: 'Pieces Dried',
                    value: stats.totalPieces.toLocaleString(),
                    sub: `across ${stats.woodTypeCount} wood type${stats.woodTypeCount === 1 ? '' : 's'}`,
                    icon: <DryIcon sx={{ fontSize: 22 }} />,
                    color: '#3b82f6',
                  },
                  {
                    label: 'Wood Types',
                    value: stats.woodTypeCount.toLocaleString(),
                    sub: stats.woodTypes[0] ? `top: ${stats.woodTypes[0].name}` : undefined,
                    icon: <TimelineIcon sx={{ fontSize: 22 }} />,
                    color: '#8b5cf6',
                  },
                  ...(canViewAmount ? [{
                    label: 'Electricity Used',
                    value: `${stats.totalElectricity.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
                    sub: 'units total',
                    icon: <ElectricBoltIcon sx={{ fontSize: 22 }} />,
                    color: '#f59e0b',
                  }] : []),
                ];

                // Lighten a hex color toward white by `amount` (0..1) — used to
                // shade each thickness within a wood type's base hue.
                const shade = (hex: string, amount: number) => {
                  const h = hex.replace('#', '');
                  const r = parseInt(h.slice(0, 2), 16);
                  const g = parseInt(h.slice(2, 4), 16);
                  const b = parseInt(h.slice(4, 6), 16);
                  const mix = (c: number) => Math.round(c + (255 - c) * amount);
                  const to2 = (c: number) => mix(c).toString(16).padStart(2, '0');
                  return `#${to2(r)}${to2(g)}${to2(b)}`;
                };

                // One slice per (wood type + thickness). Each wood type keeps a
                // base hue; its thicknesses are shades of that hue — thickest =
                // darkest, thinnest = lightest — so you can read both at a glance.
                const pieData = stats.woodTypes.flatMap((wt, wi) => {
                  const base = palette[wi % palette.length];
                  const n = wt.thicknesses.length;
                  return wt.thicknesses.map((t, ti) => ({
                    name: wt.name,
                    thickness: t.label,
                    sliceName: `${wt.name} ${t.label}`,
                    value: t.pieces,
                    percentage: stats.totalPieces > 0 ? (t.pieces / stats.totalPieces) * 100 : 0,
                    // ti=0 (thickest) → base color; later → progressively lighter.
                    color: n > 1 ? shade(base, (ti / n) * 0.6) : base,
                    woodPieces: wt.pieces,
                    woodPercentage: wt.percentage,
                  }));
                });

                // Distinct wood types, for a grouped legend.
                const legendGroups = stats.woodTypes.map((wt, wi) => ({
                  name: wt.name,
                  base: palette[wi % palette.length],
                  percentage: wt.percentage,
                  pieces: wt.pieces,
                  thicknesses: wt.thicknesses.map((t, ti) => ({
                    ...t,
                    color: wt.thicknesses.length > 1
                      ? shade(palette[wi % palette.length], (ti / wt.thicknesses.length) * 0.6)
                      : palette[wi % palette.length],
                    percentage: stats.totalPieces > 0 ? (t.pieces / stats.totalPieces) * 100 : 0,
                  })),
                }));

                return (
                  <Box sx={{ mb: 3 }}>
                    <Grid container spacing={2} alignItems="stretch">
                      {/* Left: compact stat cards in a 2×2 grid */}
                      <Grid item xs={12} md={pieData.length > 0 ? 5 : 12}>
                        <Grid container spacing={2}>
                          {summaryCards.map((card) => (
                            <Grid item xs={6} key={card.label}>
                              <Card
                                elevation={0}
                                sx={{
                                  border: '1px solid #e2e8f0',
                                  borderRadius: 2,
                                  height: '100%',
                                  transition: 'box-shadow 0.2s ease',
                                  '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.06)' },
                                }}
                              >
                                <CardContent sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 1.25, '&:last-child': { pb: 1.5 } }}>
                                  <Box
                                    sx={{
                                      width: 36,
                                      height: 36,
                                      borderRadius: 1.5,
                                      flexShrink: 0,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      backgroundColor: alpha(card.color, 0.12),
                                      color: card.color,
                                    }}
                                  >
                                    {card.icon}
                                  </Box>
                                  <Box sx={{ minWidth: 0 }}>
                                    <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e293b', lineHeight: 1.1, fontSize: '1.25rem' }}>
                                      {card.value}
                                    </Typography>
                                    <Typography variant="caption" noWrap sx={{ color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.02em', fontSize: '0.62rem', display: 'block' }}>
                                      {card.label}
                                    </Typography>
                                  </Box>
                                </CardContent>
                              </Card>
                            </Grid>
                          ))}
                        </Grid>
                      </Grid>

                      {/* Right: pie chart card — ~2 cards wide, donut + legend */}
                      {pieData.length > 0 && (
                        <Grid item xs={12} md={7}>
                          <Card elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2, height: '100%' }}>
                            <CardContent sx={{ p: { xs: 2, sm: 2.5 }, '&:last-child': { pb: { xs: 2, sm: 2.5 } } }}>
                              <Typography variant="subtitle2" sx={{ color: '#1e293b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.5 }}>
                                <DryIcon sx={{ fontSize: 18, color: '#64748b' }} />
                                Dried Wood by Type &amp; Thickness
                              </Typography>

                              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'center', gap: { xs: 2, sm: 3 } }}>
                                {/* Donut */}
                                <Box sx={{ position: 'relative', width: { xs: 170, sm: 190 }, height: { xs: 170, sm: 190 }, flexShrink: 0 }}>
                              <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                  <Pie
                                    data={pieData}
                                    dataKey="value"
                                    nameKey="sliceName"
                                    cx="50%"
                                    cy="50%"
                                    innerRadius="60%"
                                    outerRadius="95%"
                                    paddingAngle={pieData.length > 1 ? 1.5 : 0}
                                    stroke="#fff"
                                    strokeWidth={2}
                                  >
                                    {pieData.map((d) => (
                                      <Cell key={d.sliceName} fill={d.color} />
                                    ))}
                                  </Pie>
                                  <Tooltip
                                    content={({ active, payload }: any) => {
                                      if (!active || !payload || !payload.length) return null;
                                      const d = payload[0].payload;
                                      return (
                                        <Box sx={{ backgroundColor: '#fff', borderRadius: 1, border: '1px solid #e2e8f0', p: 1, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            <Box sx={{ width: 9, height: 9, borderRadius: '2px', backgroundColor: d.color }} />
                                            <Typography variant="caption" sx={{ fontWeight: 700, color: '#1e293b' }}>
                                              {d.name} · {d.thickness}
                                            </Typography>
                                          </Box>
                                          <Typography variant="caption" sx={{ color: '#1e293b', display: 'block', mt: 0.25 }}>
                                            {d.value.toLocaleString()} pcs · {d.percentage.toFixed(1)}%
                                          </Typography>
                                          <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block' }}>
                                            {d.name} total: {d.woodPieces.toLocaleString()} pcs ({d.woodPercentage.toFixed(0)}%)
                                          </Typography>
                                        </Box>
                                      );
                                    }}
                                  />
                                </PieChart>
                              </ResponsiveContainer>
                              {/* Center total */}
                              <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                                <Typography sx={{ fontWeight: 800, color: '#1e293b', lineHeight: 1, fontSize: '1.6rem' }}>
                                  {stats.totalPieces.toLocaleString()}
                                </Typography>
                                <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                                  pieces
                                </Typography>
                              </Box>
                            </Box>

                            {/* Legend — wood type with its thickness shades + bars */}
                            <Stack spacing={1.5} sx={{ flex: 1, width: '100%', minWidth: 0 }}>
                              {legendGroups.map((g) => (
                                <Box key={g.name}>
                                  <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', mb: 0.5 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                      <Box sx={{ width: 11, height: 11, borderRadius: '50%', backgroundColor: g.base }} />
                                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#1e293b' }}>
                                        {g.name}
                                      </Typography>
                                    </Box>
                                    <Typography variant="body2" sx={{ color: '#64748b' }}>
                                      <Box component="span" sx={{ fontWeight: 700, color: '#1e293b' }}>{g.pieces.toLocaleString()}</Box>
                                      {' pcs · '}
                                      <Box component="span" sx={{ fontWeight: 700, color: g.base }}>{g.percentage.toFixed(1)}%</Box>
                                    </Typography>
                                  </Box>
                                  {/* Single bar segmented by thickness shades */}
                                  <Box sx={{ display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden', backgroundColor: '#f1f5f9' }}>
                                    {g.thicknesses.map((t) => (
                                      <Box
                                        key={t.label}
                                        title={`${g.name} ${t.label}: ${t.pieces.toLocaleString()} pcs`}
                                        sx={{ width: `${g.pieces > 0 ? (t.pieces / g.pieces) * 100 : 0}%`, backgroundColor: t.color }}
                                      />
                                    ))}
                                  </Box>
                                  {/* Thickness chips */}
                                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 0.75 }}>
                                    {g.thicknesses.map((t) => (
                                      <Box
                                        key={t.label}
                                        sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 0.75, py: 0.25, borderRadius: 1, backgroundColor: alpha(t.color, 0.14) }}
                                      >
                                        <Box sx={{ width: 8, height: 8, borderRadius: '2px', backgroundColor: t.color }} />
                                        <Typography variant="caption" sx={{ color: '#334155', fontSize: '0.7rem', fontWeight: 600 }}>
                                          {t.label} · {t.pieces.toLocaleString()} pcs
                                        </Typography>
                                      </Box>
                                    ))}
                                  </Box>
                                </Box>
                              ))}
                                </Stack>
                              </Box>
                            </CardContent>
                          </Card>
                        </Grid>
                      )}
                    </Grid>
                  </Box>
                );
              })()}

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
                        {canViewAmount && (
                          <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Electricity Used</TableCell>
                        )}
                        <TableCell sx={{ fontWeight: 700, color: '#1e293b', textAlign: 'right' }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {getVisibleCompletedProcesses().map((process) => {
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
                            {canViewAmount && (
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <ElectricBoltIcon sx={{ fontSize: 18, color: '#16a34a' }} />
                                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                                    {Math.abs(electricityUsed).toFixed(2)} Unit
                                  </Typography>
                                </Box>
                              </TableCell>
                            )}
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
                                    <Button
                                      size="small"
                                      onClick={() => handleReopenProcess(process)}
                                      sx={{
                                        color: '#f59e0b',
                                        borderColor: '#f59e0b',
                                        fontSize: '0.75rem',
                                        textTransform: 'none',
                                        '&:hover': {
                                          borderColor: '#d97706',
                                          backgroundColor: alpha('#f59e0b', 0.04),
                                        }
                                      }}
                                      variant="outlined"
                                    >
                                      Reopen
                                    </Button>
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
                                      onClick={() => handleDeleteProcess(process)}
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
                  {getVisibleCompletedProcesses().map((process) => {
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
                                    <Button
                                      size="small"
                                      onClick={() => handleReopenProcess(process)}
                                      sx={{
                                        color: '#f59e0b',
                                        borderColor: '#f59e0b',
                                        fontSize: '0.7rem',
                                        textTransform: 'none',
                                        minWidth: 'auto',
                                        px: 1,
                                        '&:hover': {
                                          borderColor: '#d97706',
                                          backgroundColor: alpha('#f59e0b', 0.04),
                                        }
                                      }}
                                      variant="outlined"
                                    >
                                      Reopen
                                    </Button>
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
                                      onClick={() => handleDeleteProcess(process)}
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

              {/* Collapse / expand the completed list (hidden while searching) */}
              {!completedSearchTerm.trim() && getFilteredAndSortedCompletedProcesses().length > COMPLETED_PREVIEW_COUNT && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                  <Button
                    onClick={() => setShowAllCompleted((v) => !v)}
                    endIcon={<ExpandMoreIcon sx={{ transform: showAllCompleted ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />}
                    sx={{
                      color: '#10b981',
                      textTransform: 'none',
                      fontWeight: 600,
                      '&:hover': { backgroundColor: alpha('#10b981', 0.06) },
                    }}
                  >
                    {showAllCompleted
                      ? 'Show less'
                      : `Show all ${getFilteredAndSortedCompletedProcesses().length} completed`}
                  </Button>
                </Box>
              )}
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
              creatingProcess ||
              !newProcess.warehouseId ||
              woodItems.length === 0 ||
              !woodItems[0].woodTypeId ||
              !woodItems[0].thickness ||
              !woodItems[0].pieceCount
            }
            startIcon={creatingProcess ? <CircularProgress size={20} sx={{ color: 'white' }} /> : null}
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
            {creatingProcess ? 'Creating...' : 'Create Process'}
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
          </Stack>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ p: 2.5, justifyContent: 'space-between' }}>
          <Button
            onClick={async () => {
              if (!editingReading || !window.confirm('Are you sure you want to delete this reading? This action cannot be undone.')) return;

              try {
                await api.delete(`/factory/drying-readings/${editingReading.id}`);
                await fetchData();
                setEditReadingDialogOpen(false);
                setEditingReading(null);
              } catch (error: any) {
                console.error('Error deleting reading:', error);
                enqueueSnackbar(error.response?.data?.error || 'Failed to delete reading', { variant: 'error' });
              }
            }}
            startIcon={<DeleteIcon />}
            sx={{
              color: '#dc2626',
              textTransform: 'none',
              fontWeight: 600,
              '&:hover': {
                backgroundColor: alpha('#dc2626', 0.1)
              }
            }}
          >
            Delete
          </Button>
          <Box sx={{ display: 'flex', gap: 1 }}>
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
          </Box>
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
                        {canViewAmount && (
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
                        )}
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
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>Recorded By</TableCell>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>Notes</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {[...selectedProcess.readings].reverse().map((reading) => (
                        <TableRow key={reading.id} sx={{ '&:hover': { backgroundColor: '#fef2f2' } }}>
                          <TableCell sx={{ fontSize: '0.75rem' }}>
                            {formatAsLocalTime(reading.readingTime, 'yyyy-MM-dd hh:mm a', timezone)}
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

                      {/* Initial Reading Row */}
                      <TableRow sx={{ backgroundColor: '#fef3c7', '&:hover': { backgroundColor: '#fde68a !important' } }}>
                        <TableCell sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
                          {formatAsLocalTime(selectedProcess.startTime, 'yyyy-MM-dd hh:mm a', timezone)}
                          <Typography variant="caption" sx={{ display: 'block', color: '#92400e', fontSize: '0.65rem', mt: 0.25 }}>
                            Initial Reading
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
                          {selectedProcess.startingElectricityUnits?.toFixed(2) || '-'}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
                          {selectedProcess.startingHumidity?.toFixed(1) || '-'}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.75rem' }}>
                          <Box>
                            <Typography variant="body2" sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#1e293b' }}>
                              {selectedProcess.createdByName || 'System'}
                            </Typography>
                            {selectedProcess.createdAt && (
                              <Typography variant="caption" sx={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                                {formatDateInTimezone(selectedProcess.createdAt, 'yyyy-MM-dd hh:mm a', timezone)}
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.75rem', fontStyle: 'italic', color: '#78716c' }}>
                          Process started
                        </TableCell>
                      </TableRow>

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
          {canViewAmount && selectedProcess && (() => {
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

      {/* Add Luku Recharge Dialog */}
      <Dialog
        open={rechargeDialogOpen}
        onClose={() => {
          setRechargeDialogOpen(false);
          setShowRechargePreview(false);
          setRechargePreview(null);
        }}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
          }
        }}
      >
        <DialogTitle sx={{ pb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <ElectricBoltIcon sx={{ color: '#dc2626', fontSize: 28 }} />
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
              {showRechargePreview ? 'Confirm Luku Recharge' : 'Add Luku Recharge'} - {selectedProcessForRecharge?.batchNumber}
            </Typography>
          </Box>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 3 }}>
          {!showRechargePreview ? (
            <Stack spacing={2.5}>
              {(() => {
                const inferred = selectedProcessForRecharge ? getInferredRechargeReadings(selectedProcessForRecharge) : [];
                if (inferred.length === 0) return null;

                const meterBefore = (reading: DryingReading): number | null => {
                  if (!selectedProcessForRecharge) return null;
                  const all = selectedProcessForRecharge.readings || [];
                  const idx = all.findIndex(r => r.id === reading.id);
                  if (idx > 0) return all[idx - 1].electricityMeter;
                  return selectedProcessForRecharge.startingElectricityUnits ?? null;
                };

                return (
                  <>
                    <Alert severity="warning" icon={false} sx={{ fontSize: '0.875rem', backgroundColor: '#fffbeb', border: '1px solid #fde68a' }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#b45309', mb: 0.5 }}>
                        ⚠ Select the reading where the recharge happened
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#92400e', display: 'block' }}>
                        Only readings where the meter jumped by more than 100 units (and have no recharge attached yet) are shown below.
                        The selected reading's time becomes the cost-allocation anchor for this recharge.
                      </Typography>
                    </Alert>

                    <TextField
                      select
                      fullWidth
                      label="Inferred recharge reading"
                      value={rechargeData.selectedReadingId}
                      onChange={(e) => setRechargeData({ ...rechargeData, selectedReadingId: e.target.value })}
                      size="small"
                      sx={textFieldSx}
                      required
                      helperText="Pick the reading taken AFTER recharging — its meter value is used as the post-recharge meter."
                    >
                      {inferred.map((reading) => {
                        const before = meterBefore(reading);
                        const jump = before !== null ? reading.electricityMeter - before : null;
                        return (
                          <MenuItem key={reading.id} value={reading.id}>
                            {formatDateInTimezone(reading.readingTime, 'MMM d, yyyy hh:mm a', timezone)}
                            {' — meter '}
                            <strong>{reading.electricityMeter.toFixed(2)}</strong>
                            {jump !== null ? ` (+${jump.toFixed(2)})` : ''}
                            {`, humidity ${reading.humidity.toFixed(1)}%`}
                          </MenuItem>
                        );
                      })}
                    </TextField>
                  </>
                );
              })()}

              <Alert severity="info" sx={{ fontSize: '0.875rem' }}>
                <strong>Important:</strong> Paste the Luku SMS that corresponds to the reading you selected above.
              </Alert>

              <TextField
                fullWidth
                label="Luku SMS"
                multiline
                rows={5}
                value={rechargeData.smsText}
                onChange={(e) => setRechargeData({ ...rechargeData, smsText: e.target.value })}
                placeholder="Malipo yamekamilika.199d451c4c852896 9007252842029144016 TOKEN 1193 7922 8154 0931 2016 1403.5KWH..."
                size="small"
                sx={textFieldSx}
                required
              />
            </Stack>
          ) : (
            <Stack spacing={2}>
              <Alert severity="warning" sx={{ fontSize: '0.875rem' }}>
                <strong>Please verify</strong> the parsed values below before saving. If anything looks wrong, click "Back" to edit the SMS.
              </Alert>

              <Paper elevation={0} sx={{ p: 2, backgroundColor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>Token</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'monospace', fontSize: '0.75rem' }}>
                      {rechargePreview?.token || 'N/A'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>SMS Timestamp</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {rechargePreview?.smsTimestamp || 'Not detected'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>kWh Amount</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 700, color: '#16a34a' }}>
                      {rechargePreview?.kwhAmount.toLocaleString()} kWh
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>Meter Reading After</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 700, color: '#2563eb' }}>
                      {(() => {
                        const r = selectedProcessForRecharge?.readings?.find(x => x.id === rechargeData.selectedReadingId);
                        return r ? `${r.electricityMeter.toLocaleString()} units` : '—';
                      })()}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>

              <Paper elevation={0} sx={{ p: 2, backgroundColor: '#fef2f2', borderRadius: 2, border: '1px solid #fecaca' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#dc2626', mb: 1.5 }}>
                  Cost Breakdown
                </Typography>
                <Grid container spacing={1.5}>
                  <Grid item xs={6}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" sx={{ color: '#64748b' }}>Base Cost:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        TZS {rechargePreview?.baseCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" sx={{ color: '#64748b' }}>VAT (18%):</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        TZS {rechargePreview?.vat.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" sx={{ color: '#64748b' }}>EWURA (1%):</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        TZS {rechargePreview?.ewuraFee.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" sx={{ color: '#64748b' }}>REA (3%):</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        TZS {rechargePreview?.reaFee.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </Typography>
                    </Box>
                  </Grid>
                  {(rechargePreview?.debtCollected ?? 0) > 0 && (
                    <Grid item xs={6}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" sx={{ color: '#64748b' }}>Debt Collected:</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          TZS {rechargePreview?.debtCollected.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </Typography>
                      </Box>
                    </Grid>
                  )}
                  <Grid item xs={12}>
                    <Divider sx={{ my: 1 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body1" sx={{ fontWeight: 700, color: '#dc2626' }}>TOTAL PAID:</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: '#dc2626' }}>
                        TZS {rechargePreview?.totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
                      <Typography variant="body2" sx={{ color: '#64748b' }}>Rate per kWh:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#7c3aed' }}>
                        TZS {rechargePreview && rechargePreview.kwhAmount > 0
                          ? (rechargePreview.totalPaid / rechargePreview.kwhAmount).toFixed(2)
                          : '0.00'} /kWh
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>
            </Stack>
          )}
        </DialogContent>
        <Divider />
        <DialogActions sx={{ p: 2.5 }}>
          {!showRechargePreview ? (
            <>
              <Button
                onClick={() => setRechargeDialogOpen(false)}
                sx={{
                  color: '#64748b',
                  textTransform: 'none',
                  fontWeight: 600,
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleParseRecharge}
                variant="contained"
                disabled={!rechargeData.smsText.trim() || !rechargeData.selectedReadingId}
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
                Preview Recharge
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={handleCancelPreview}
                sx={{
                  color: '#64748b',
                  textTransform: 'none',
                  fontWeight: 600,
                }}
              >
                Back
              </Button>
              <Button
                onClick={handleConfirmRecharge}
                variant="contained"
                sx={{
                  backgroundColor: '#16a34a',
                  textTransform: 'none',
                  fontWeight: 600,
                  px: 3,
                  '&:hover': {
                    backgroundColor: '#15803d',
                  },
                }}
              >
                Confirm & Save
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Shared confirmation dialog for close-workflow actions */}
      <Dialog
        open={actionDialog.open}
        onClose={closeActionDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ pb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {actionDialog.confirmColor === 'danger' ? (
              <DeleteIcon sx={{ color: '#ef4444', fontSize: 28 }} />
            ) : actionDialog.confirmColor === 'warning' ? (
              <ElectricBoltIcon sx={{ color: '#f59e0b', fontSize: 28 }} />
            ) : actionDialog.confirmColor === 'success' ? (
              <CheckCircleIcon sx={{ color: '#10b981', fontSize: 28 }} />
            ) : (
              <DryIcon sx={{ color: '#3b82f6', fontSize: 28 }} />
            )}
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
              {actionDialog.title}
            </Typography>
          </Box>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 3 }}>
          {actionDialogError && !actionDialog.requireReason && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {actionDialogError}
            </Alert>
          )}
          <Box sx={{ mb: actionDialog.requireReason ? 2.5 : 0 }}>{actionDialog.body}</Box>
          {actionDialog.requireReason && (
            <TextField
              autoFocus
              fullWidth
              multiline
              minRows={2}
              maxRows={4}
              label="Reason (required)"
              placeholder={actionDialog.reasonPlaceholder || ''}
              value={actionDialogReason}
              onChange={(e) => {
                setActionDialogReason(e.target.value);
                if (actionDialogError) setActionDialogError(null);
              }}
              error={!!actionDialogError}
              helperText={actionDialogError || 'This will be recorded in the process history.'}
              size="small"
            />
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1 }}>
          <Button
            onClick={closeActionDialog}
            disabled={actionDialogSubmitting}
            sx={{ textTransform: 'none', color: '#64748b' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={actionDialogSubmitting}
            onClick={async () => {
              if (actionDialog.requireReason && !actionDialogReason.trim()) {
                setActionDialogError('Please enter a reason.');
                return;
              }
              setActionDialogSubmitting(true);
              setActionDialogError(null);
              try {
                await actionDialog.onConfirm(actionDialogReason.trim());
                setActionDialog((s) => ({ ...s, open: false }));
              } catch (err: any) {
                console.error('[ActionDialog] confirm failed:', err);
                const serverMsg =
                  err?.response?.data?.error ||
                  err?.response?.data?.message ||
                  err?.message ||
                  'The request failed. Please try again or check the server logs.';
                setActionDialogError(serverMsg);
              } finally {
                setActionDialogSubmitting(false);
              }
            }}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              px: 3,
              backgroundColor:
                actionDialog.confirmColor === 'danger' ? '#ef4444'
                : actionDialog.confirmColor === 'warning' ? '#f59e0b'
                : actionDialog.confirmColor === 'success' ? '#10b981'
                : '#3b82f6',
              '&:hover': {
                backgroundColor:
                  actionDialog.confirmColor === 'danger' ? '#dc2626'
                  : actionDialog.confirmColor === 'warning' ? '#d97706'
                  : actionDialog.confirmColor === 'success' ? '#059669'
                  : '#2563eb',
              },
            }}
          >
            {actionDialogSubmitting ? 'Working…' : actionDialog.confirmLabel}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Luku recharge details popup */}
      <Dialog
        open={lukuDialog.open}
        onClose={() => setLukuDialog({ open: false, recharge: null, reading: null })}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ pb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <ElectricBoltIcon sx={{ color: '#f59e0b', fontSize: 28 }} />
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
              Luku Recharge Details
            </Typography>
          </Box>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 3 }}>
          {lukuDialog.recharge && lukuDialog.reading && (() => {
            const r = lukuDialog.recharge;
            const reading = lukuDialog.reading;
            const effectiveRate = r.kwhAmount > 0 ? r.totalPaid / r.kwhAmount : 0;
            const fmtTZS = (n?: number) => n != null
              ? `TZS ${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
              : '—';
            return (
              <Stack spacing={2.5}>
                <Paper elevation={0} sx={{ p: 2, backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 2 }}>
                  <Typography variant="caption" sx={{ color: '#15803d', fontWeight: 700, display: 'block', mb: 1 }}>
                    🔗 LINKED TO READING
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#1e293b' }}>
                    {formatDateInTimezone(reading.readingTime, 'MMM d, yyyy hh:mm a', timezone)}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#475569', display: 'block', mt: 0.5 }}>
                    Meter: <strong>{reading.electricityMeter.toFixed(2)}</strong> Unit
                    {' • '}
                    Humidity: <strong>{reading.humidity.toFixed(1)}%</strong>
                  </Typography>
                </Paper>

                <Paper elevation={0} sx={{ p: 2, backgroundColor: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 2 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>kWh Added</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: '#16a34a' }}>
                        {r.kwhAmount.toLocaleString()} kWh
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>Total Paid</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: '#dc2626' }}>
                        {fmtTZS(r.totalPaid)}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>Effective Rate</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {effectiveRate.toFixed(2)} TZS/kWh
                      </Typography>
                    </Grid>
                    {r.meterReadingAfter != null && (
                      <Grid item xs={6}>
                        <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>Meter After Recharge</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {r.meterReadingAfter.toFixed(2)} Unit
                        </Typography>
                      </Grid>
                    )}
                  </Grid>
                </Paper>

                <Paper elevation={0} sx={{ p: 2, backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1e293b', mb: 1.5 }}>
                    Cost Breakdown
                  </Typography>
                  <Stack spacing={0.75}>
                    {r.baseCost != null && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" sx={{ color: '#475569' }}>Base cost</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{fmtTZS(r.baseCost)}</Typography>
                      </Box>
                    )}
                    {r.vat != null && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" sx={{ color: '#475569' }}>VAT</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{fmtTZS(r.vat)}</Typography>
                      </Box>
                    )}
                    {r.ewuraFee != null && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" sx={{ color: '#475569' }}>EWURA fee</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{fmtTZS(r.ewuraFee)}</Typography>
                      </Box>
                    )}
                    {r.reaFee != null && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" sx={{ color: '#475569' }}>REA fee</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{fmtTZS(r.reaFee)}</Typography>
                      </Box>
                    )}
                    {r.debtCollected != null && r.debtCollected > 0 && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" sx={{ color: '#475569' }}>Debt collected</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{fmtTZS(r.debtCollected)}</Typography>
                      </Box>
                    )}
                    <Divider sx={{ my: 0.5 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" sx={{ color: '#1e293b', fontWeight: 700 }}>Total</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#dc2626' }}>{fmtTZS(r.totalPaid)}</Typography>
                    </Box>
                  </Stack>
                </Paper>

                {r.token && (
                  <Box>
                    <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 0.5 }}>Token</Typography>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#1e293b', wordBreak: 'break-all' }}>
                      {r.token.match(/.{1,4}/g)?.join(' ') || r.token}
                    </Typography>
                  </Box>
                )}

                {r.notes && (
                  <Box>
                    <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 0.5 }}>Notes</Typography>
                    <Typography variant="body2" sx={{ color: '#475569' }}>{r.notes}</Typography>
                  </Box>
                )}

                <Box sx={{ borderTop: '1px solid #e2e8f0', pt: 1.5 }}>
                  <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block' }}>
                    Recorded on {formatDateInTimezone(r.createdAt, 'MMM d, yyyy hh:mm a', timezone)}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block' }}>
                    SMS-stamped {formatDateInTimezone(r.rechargeDate, 'MMM d, yyyy hh:mm a', timezone)} (informational only — cost uses linked-reading time)
                  </Typography>
                </Box>
              </Stack>
            );
          })()}
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button
            variant="contained"
            onClick={() => setLukuDialog({ open: false, recharge: null, reading: null })}
            sx={{ textTransform: 'none', fontWeight: 600, px: 3, backgroundColor: '#3b82f6', '&:hover': { backgroundColor: '#2563eb' } }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </StyledContainer>
  );
}