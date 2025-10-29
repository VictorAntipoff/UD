import React, { useState, useEffect, useRef } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  TextField,
  Button,
  Grid,
  MenuItem,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Switch,
  FormControlLabel,
  List,
  ListItem,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Checkbox
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import ContentCutIcon from '@mui/icons-material/ContentCut';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import LockIcon from '@mui/icons-material/Lock';
import HistoryIcon from '@mui/icons-material/History';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import SendIcon from '@mui/icons-material/Send';
import { useSnackbar } from 'notistack';
import { useAuth } from '../../hooks/useAuth';
import type { WoodType } from '../../types/calculations';
import api from '../../lib/api';
import type { WoodReceipt as WoodReceiptType } from '../../types/wood-receipt';
import { colors } from '../../theme/colors';
import { styled } from '@mui/material/styles';
import { CircularProgress } from '@mui/material';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

interface PostgrestError {
  code: string;
  message: string;
  details: string | null;
  hint: string | null;
}

type ReceiptStatus = 'CREATED' | 'PENDING' | 'RECEIVED' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED';

interface EditingReceipt extends Omit<WoodReceiptType, 'total_volume_m3' | 'total_pieces'> {
  total_volume_m3: string | number;
  total_pieces: string | number;
}

interface LotNumberMap {
  [key: string]: string;
}

interface WoodTypeResponse {
  id: string;
  name: string;
}

interface RawWoodReceipt {
  id: string;
  wood_type_id: string;
  supplier: string;
  receipt_date: string;
  lot_number: string | null;
  status: string;
  created_by: string | null;
  total_volume_m3: number | null;
  total_pieces: number | null;
  total_amount: number;
  created_at: string | null;
  updated_at: string | null;
  wood_type: WoodTypeResponse | WoodTypeResponse[];
  notes?: string;
  purchase_order?: string;
}

const StyledContainer = styled(Container)(({ theme }) => ({
  minHeight: '100vh',
  paddingTop: theme.spacing(4),
  paddingBottom: theme.spacing(4),
  backgroundColor: '#f8fafc',
}));

// Common TextField styles
const textFieldSx = {
  '& .MuiOutlinedInput-root': {
    '& fieldset': {
      borderColor: 'rgba(0, 0, 0, 0.12)',
    },
    '&:hover fieldset': {
      borderColor: '#1976d2',
    },
    fontSize: '0.875rem',
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  '& .MuiInputLabel-root': {
    color: 'rgba(0, 0, 0, 0.6)',
    fontSize: '0.875rem',
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  '& .MuiFormHelperText-root': {
    fontSize: '0.75rem',
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  }
};

const WoodReceipt = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const { enqueueSnackbar } = useSnackbar();
  const [woodTypes, setWoodTypes] = useState<WoodType[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [receipts, setReceipts] = useState<WoodReceiptType[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newReceipt, setNewReceipt] = useState({
    wood_type_id: '',
    warehouse_id: '',
    supplier: '',
    purchase_date: new Date().toISOString().split('T')[0],
    purchase_order: '',
    wood_format: 'SLEEPERS',
    total_volume_m3: '',
    total_pieces: '',
    notes: '',
    status: 'PENDING',
    lot_number: '',
  });
  const [editingReceipt, setEditingReceipt] = useState<EditingReceipt | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [receiptToDelete, setReceiptToDelete] = useState<WoodReceiptType | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [traceabilityDialogOpen, setTraceabilityDialogOpen] = useState(false);
  const [traceabilityData, setTraceabilityData] = useState<any>(null);
  const [loadingTraceability, setLoadingTraceability] = useState(false);
  const [editingCost, setEditingCost] = useState(false);
  const [costData, setCostData] = useState<any>({
    purchasePrice: '',
    purchasePriceType: 'LUMPSUM',
    purchasePriceIncVat: false,
    transportPrice: '',
    transportPriceType: 'LUMPSUM',
    transportPriceIncVat: false,
    slicingExpenses: '',
    slicingExpensesType: 'LUMPSUM',
    slicingExpensesIncVat: false,
    otherExpenses: '',
    otherExpensesType: 'LUMPSUM',
    otherExpensesIncVat: false,
    notes: ''
  });
  const [notificationDialogOpen, setNotificationDialogOpen] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [sendingNotification, setSendingNotification] = useState(false);

  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchWoodTypes();
    fetchWarehouses();
    fetchReceipts();
    fetchNextLotNumber();
  }, []);

  const fetchNextLotNumber = async () => {
    try {
      const response = await api.get('/management/wood-receipts/next-lot');
      setNewReceipt(prev => ({ ...prev, lot_number: response.data.lotNumber }));
    } catch (error) {
      console.error('Error fetching next LOT number:', error);
    }
  };

  const fetchWoodTypes = async () => {
    try {
      const response = await api.get('/factory/wood-types');
      setWoodTypes(response.data || []);
    } catch (error) {
      console.error('Error fetching wood types:', error);
      enqueueSnackbar('Failed to fetch wood types', { variant: 'error' });
    }
  };

  const fetchWarehouses = async () => {
    try {
      const response = await api.get('/management/warehouses');
      setWarehouses(response.data || []);
    } catch (error) {
      console.error('Error fetching warehouses:', error);
      enqueueSnackbar('Failed to fetch warehouses', { variant: 'error' });
    }
  };

  const fetchReceipts = async () => {
    try {
      const response = await api.get('/management/wood-receipts');
      // Map camelCase backend response to snake_case frontend format
      const mappedReceipts = (response.data || []).map((receipt: any) => ({
        id: receipt.id,
        wood_type_id: receipt.woodTypeId,
        supplier: receipt.supplier,
        receipt_date: receipt.receiptDate ? receipt.receiptDate.split('T')[0] : '',
        purchase_date: receipt.receiptDate ? receipt.receiptDate.split('T')[0] : '',
        lot_number: receipt.lotNumber,
        purchase_order: receipt.purchaseOrder,
        wood_format: receipt.woodFormat || 'SLEEPERS',
        status: receipt.status,
        notes: receipt.notes || '',
        total_volume_m3: receipt.estimatedVolumeM3,
        total_pieces: receipt.estimatedPieces,
        total_amount: receipt.estimatedAmount,
        created_at: receipt.createdAt,
        updated_at: receipt.updatedAt,
        wood_type: receipt.woodType
      }));
      setReceipts(mappedReceipts);
    } catch (error: any) {
      // Silently handle 404 - wood-receipts endpoint not yet implemented
      if (error.response?.status !== 404) {
        console.error('Error fetching receipts:', error);
        enqueueSnackbar(
          `Failed to fetch receipts: ${error.message}`,
          { variant: 'error' }
        );
      }
      setReceipts([]);
    }
  };

  const handleCreateReceipt = async () => {
    try {
      setLoading(true);

      const receiptData = {
        wood_type_id: newReceipt.wood_type_id,
        warehouse_id: newReceipt.warehouse_id || null,
        supplier: newReceipt.supplier,
        receipt_date: newReceipt.purchase_date,
        lot_number: newReceipt.lot_number || null,
        purchase_order: newReceipt.purchase_order,
        status: 'PENDING',
        notes: newReceipt.notes || null,
        total_amount: 0,
        total_volume_m3: newReceipt.total_volume_m3 ? parseFloat(newReceipt.total_volume_m3) : null,
        total_pieces: newReceipt.total_pieces ? parseInt(newReceipt.total_pieces) : null
      };

      await api.post('/management/wood-receipts', receiptData);

      enqueueSnackbar('Receipt created successfully', { variant: 'success' });
      setOpenDialog(false);
      fetchReceipts();
      setNewReceipt({
        wood_type_id: '',
        warehouse_id: '',
        supplier: '',
        purchase_date: new Date().toISOString().split('T')[0],
        purchase_order: '',
        wood_format: 'SLEEPERS',
        total_volume_m3: '',
        total_pieces: '',
        notes: '',
        status: 'PENDING',
        lot_number: '',
      });
      // Fetch next LOT number for the next receipt
      fetchNextLotNumber();
    } catch (error: any) {
      console.error('Error creating receipt:', error);
      enqueueSnackbar(
        `Failed to create receipt: ${error.message}`,
        { variant: 'error' }
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setNewReceipt({
      wood_type_id: '',
      warehouse_id: '',
      supplier: '',
      purchase_date: new Date().toISOString().split('T')[0],
      purchase_order: '',
      wood_format: 'SLEEPERS',
      total_volume_m3: '',
      total_pieces: '',
      notes: '',
      status: 'PENDING',
      lot_number: '',
    });
  };

  const handleEditClick = (receipt: WoodReceiptType) => {
    setEditingReceipt({
      ...receipt,
      notes: receipt.notes || '',
      total_volume_m3: receipt.total_volume_m3?.toString() || '',
      total_pieces: receipt.total_pieces?.toString() || '',
    });
    setEditDialogOpen(true);
  };

  const handleReopenLot = async (receipt: WoodReceiptType) => {
    if (!isAdmin) {
      enqueueSnackbar('Only admins can reopen completed LOTs', { variant: 'error' });
      return;
    }

    try {
      setLoading(true);

      // Change status back to PENDING so it can be processed again
      await api.patch(`/management/wood-receipts/${receipt.id}`, {
        status: 'PENDING'
      });

      enqueueSnackbar(`LOT ${receipt.lot_number} has been reopened successfully`, { variant: 'success' });
      await fetchReceipts();
    } catch (error: any) {
      console.error('Error reopening LOT:', error);
      enqueueSnackbar(error?.response?.data?.error || 'Failed to reopen LOT', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleLockLot = async (receipt: WoodReceiptType) => {
    if (!isAdmin) {
      enqueueSnackbar('Only admins can lock LOTs', { variant: 'error' });
      return;
    }

    try {
      setLoading(true);

      // Change status to COMPLETED to lock the LOT
      await api.patch(`/management/wood-receipts/${receipt.id}`, {
        status: 'COMPLETED'
      });

      enqueueSnackbar(`LOT ${receipt.lot_number} has been locked successfully`, { variant: 'success' });
      await fetchReceipts();
    } catch (error: any) {
      console.error('Error locking LOT:', error);
      enqueueSnackbar(error?.response?.data?.error || 'Failed to lock LOT', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateReceipt = async () => {
    if (!editingReceipt) return;
    
    try {
      setLoading(true);
      
      const updateData = {
        wood_type_id: editingReceipt.wood_type_id,
        warehouse_id: editingReceipt.warehouse_id || null,
        supplier: editingReceipt.supplier,
        receipt_date: editingReceipt.purchase_date,
        purchase_order: editingReceipt.purchase_order,
        lot_number: editingReceipt.lot_number,
        wood_format: editingReceipt.wood_format,
        status: editingReceipt.status as ReceiptStatus,
        notes: editingReceipt.notes || null,
        ...(editingReceipt.total_volume_m3 ? { total_volume_m3: parseFloat(editingReceipt.total_volume_m3.toString()) } : {}),
        ...(editingReceipt.total_pieces ? { total_pieces: parseInt(editingReceipt.total_pieces.toString()) } : {})
      };

      console.log('Updating receipt with data:', updateData);

      const response = await api.put(`/management/wood-receipts/${editingReceipt.id}`, updateData);
      console.log('Update response:', response.data);

      await fetchReceipts();
      enqueueSnackbar('Receipt updated successfully', { variant: 'success' });
      setEditDialogOpen(false);
      setEditingReceipt(null);
    } catch (error: any) {
      console.error('Error updating receipt:', error);
      console.error('Error response:', error.response);
      const errorMessage = error.response?.data?.error || error.message || 'Unknown error';
      enqueueSnackbar(
        `Failed to update receipt: ${errorMessage}`,
        { variant: 'error' }
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setEditingReceipt(null);
    // Return focus to the table container
    const tableContainer = document.querySelector('.MuiTableContainer-root');
    if (tableContainer) {
      (tableContainer as HTMLElement).focus();
    }
  };

  const handleDeleteReceipt = async () => {
    if (!receiptToDelete) return;

    try {
      setIsDeleting(true);

      await api.delete(`/management/wood-receipts/${receiptToDelete.id}`);

      enqueueSnackbar('Receipt deleted successfully', { variant: 'success' });
      await fetchReceipts();
    } catch (error: any) {
      console.error('Error deleting receipt:', error);
      enqueueSnackbar(
        `Failed to delete receipt: ${error.message}`,
        { variant: 'error' }
      );
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setReceiptToDelete(null);
    }
  };

  const handleSaveCost = async () => {
    if (!traceabilityData?.lotNumber) return;

    try {
      await api.put(`/management/lot-cost/${traceabilityData.lotNumber}`, {
        purchasePrice: costData.purchasePrice ? parseFloat(costData.purchasePrice) : null,
        purchasePriceType: costData.purchasePriceType,
        purchasePriceIncVat: costData.purchasePriceIncVat,
        transportPrice: costData.transportPrice ? parseFloat(costData.transportPrice) : null,
        transportPriceType: costData.transportPriceType,
        transportPriceIncVat: costData.transportPriceIncVat,
        slicingExpenses: costData.slicingExpenses ? parseFloat(costData.slicingExpenses) : null,
        slicingExpensesType: costData.slicingExpensesType,
        slicingExpensesIncVat: costData.slicingExpensesIncVat,
        otherExpenses: costData.otherExpenses ? parseFloat(costData.otherExpenses) : null,
        otherExpensesType: costData.otherExpensesType,
        otherExpensesIncVat: costData.otherExpensesIncVat,
        notes: costData.notes || null
      });

      enqueueSnackbar('LOT cost information saved successfully', { variant: 'success' });
      setEditingCost(false);

      // Refresh traceability data to get updated cost
      const response = await api.get(`/management/lot-traceability/${traceabilityData.lotNumber}`);
      setTraceabilityData(response.data);

      // Update cost data state with the saved values
      if (response.data.cost) {
        setCostData({
          purchasePrice: response.data.cost.purchasePrice || '',
          purchasePriceType: response.data.cost.purchasePriceType || 'LUMPSUM',
          purchasePriceIncVat: response.data.cost.purchasePriceIncVat || false,
          transportPrice: response.data.cost.transportPrice || '',
          transportPriceType: response.data.cost.transportPriceType || 'LUMPSUM',
          transportPriceIncVat: response.data.cost.transportPriceIncVat || false,
          slicingExpenses: response.data.cost.slicingExpenses || '',
          slicingExpensesType: response.data.cost.slicingExpensesType || 'LUMPSUM',
          slicingExpensesIncVat: response.data.cost.slicingExpensesIncVat || false,
          otherExpenses: response.data.cost.otherExpenses || '',
          otherExpensesType: response.data.cost.otherExpensesType || 'LUMPSUM',
          otherExpensesIncVat: response.data.cost.otherExpensesIncVat || false,
          notes: response.data.cost.notes || ''
        });
      }
    } catch (error: any) {
      console.error('Error saving LOT cost:', error);
      enqueueSnackbar(`Failed to save cost information: ${error.message}`, { variant: 'error' });
    }
  };

  const generateLotCostingPDF = () => {
    if (!traceabilityData) return;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let currentPage = 1;

    // Extract data FIRST (before helper functions that use it)
    const lotNumber = traceabilityData.lotNumber || 'N/A';
    const woodReceipt = traceabilityData.stages?.woodReceipts?.[0] || traceabilityData.stages?.woodReceipt?.[0] || {};
    const woodType = woodReceipt.woodType || 'N/A';
    const supplier = woodReceipt.supplier || 'N/A';
    const receiptDate = woodReceipt.receiptDate
      ? format(new Date(woodReceipt.receiptDate), 'PP')
      : 'N/A';
    const totalM3 = woodReceipt.actualVolumeM3 || 0;
    const totalPieces = woodReceipt.actualPieces || 0;
    const status = woodReceipt.status || 'N/A';

    // Helper function to add header
    const addHeader = () => {
      // Add logo with correct aspect ratio (2486:616 = ~4.04:1)
      const logo = new Image();
      logo.src = '/src/assets/images/logo.png';
      doc.addImage(logo, 'PNG', 14, 6, 28, 7); // Fixed: 28/7 = 4:1 ratio

      // Title
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(220, 38, 38);
      doc.text('LOT Traceability Report', pageWidth / 2, 11, { align: 'center' });

      // Timestamp and version
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(`Generated: ${format(new Date(), 'PPpp')}`, pageWidth - 14, 9, { align: 'right' });
      doc.text('v5.0', pageWidth - 14, 12, { align: 'right' });

      // Gray line
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(14, 16, pageWidth - 14, 16);
    };

    // Helper function to add footer
    const addFooter = (pageNum: number, totalPages: number) => {
      const footerY = pageHeight - 12;
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(14, footerY, pageWidth - 14, footerY);

      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('This is a computer-generated document. No signature required.', pageWidth / 2, footerY + 4, { align: 'center' });
      doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - 14, footerY + 4, { align: 'right' });
    };

    // Helper function to check if new page is needed
    const checkPageBreak = (requiredSpace: number): number => {
      if (startY + requiredSpace > pageHeight - 25) {
        currentPage++;
        doc.addPage();
        addHeader();
        return 20; // Reset startY to top of new page
      }
      return startY;
    };

    // Helper function to add section header with clean style
    const addSectionHeader = (title: string) => {
      startY = checkPageBreak(10);

      // Simple red line on the left
      doc.setDrawColor(220, 38, 38);
      doc.setLineWidth(2);
      doc.line(14, startY, 14, startY + 6);

      // Section title
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text(title, 18, startY + 4);

      // Light bottom border
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(14, startY + 7, pageWidth - 14, startY + 7);

      startY += 11;
    };

    // Start first page
    addHeader();
    let startY = 20;

    // LOT Information Section
    addSectionHeader('LOT Information');

    // LOT info box - clean white background
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.roundedRect(14, startY, pageWidth - 28, 30, 1, 1, 'FD');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);

    // Left column - cleaner layout
    const leftX = 18;
    const valueX = 50;
    const rightX = 108;
    const rightValueX = 140;
    let infoY = startY + 7;

    doc.text('LOT Number:', leftX, infoY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(lotNumber, valueX, infoY);

    infoY += 5.5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Wood Type:', leftX, infoY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(woodType, valueX, infoY);

    infoY += 5.5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Supplier:', leftX, infoY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(supplier, valueX, infoY);

    infoY += 5.5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Status:', leftX, infoY);
    doc.setFont('helvetica', 'bold');
    if (status === 'COMPLETED') {
      doc.setTextColor(22, 163, 74);
    } else {
      doc.setTextColor(220, 38, 38);
    }
    doc.text(status, valueX, infoY);

    // Right column
    infoY = startY + 7;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Receipt Date:', rightX, infoY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(receiptDate, rightValueX, infoY);

    infoY += 5.5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Total Volume:', rightX, infoY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(`${totalM3.toFixed(3)} m³`, rightValueX, infoY);

    infoY += 5.5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Total Pieces:', rightX, infoY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(totalPieces.toString(), rightValueX, infoY);

    infoY += 5.5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Report Date:', rightX, infoY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(format(new Date(), 'PP'), rightValueX, infoY);

    startY += 35;

    // Wood Receipt Information Section
    addSectionHeader('Wood Receipt Details');

    const receiptRows: any[] = [];
    const allReceipts = traceabilityData.stages?.woodReceipts || (woodReceipt.id ? [woodReceipt] : []);

    if (allReceipts.length > 0) {
      allReceipts.forEach((receipt: any) => {
        const isDraft = receipt.status !== 'COMPLETED';
        const volumeText = receipt.actualVolumeM3
          ? `${receipt.actualVolumeM3.toFixed(3)} m³${isDraft ? ' (Draft)' : ''}`
          : 'N/A';
        const piecesText = receipt.actualPieces
          ? `${receipt.actualPieces}${isDraft ? ' (Draft)' : ''}`
          : 'N/A';
        const estVolumeText = receipt.estimatedVolumeM3
          ? `${receipt.estimatedVolumeM3.toFixed(3)} m³`
          : 'N/A';
        const estPiecesText = receipt.estimatedPieces?.toString() || 'N/A';

        receiptRows.push([
          receipt.woodType || 'N/A',
          receipt.supplier || 'N/A',
          receipt.receiptDate ? format(new Date(receipt.receiptDate), 'PP') : 'N/A',
          estVolumeText,
          volumeText,
          estPiecesText,
          piecesText,
          receipt.status || 'N/A'
        ]);
      });

      autoTable(doc, {
        startY,
        head: [['Wood', 'Supplier', 'Date', 'Est.Vol', 'Act.Vol', 'Est.Pcs', 'Act.Pcs', 'Status']],
        body: receiptRows,
        theme: 'grid',
        headStyles: {
          fillColor: [248, 250, 252],
          textColor: [30, 41, 59],
          fontStyle: 'bold',
          fontSize: 7.5,
          cellPadding: 2.5,
          lineColor: [226, 232, 240],
          lineWidth: 0.1
        },
        bodyStyles: {
          textColor: [71, 85, 105],
          fontSize: 7.5,
          cellPadding: 2.5,
          lineColor: [226, 232, 240],
          lineWidth: 0.1
        },
        margin: { left: 14, right: 14 },
        columnStyles: {
          0: { cellWidth: 22 },
          1: { cellWidth: 25 },
          2: { cellWidth: 22 },
          3: { cellWidth: 18 },
          4: { cellWidth: 20 },
          5: { cellWidth: 15 },
          6: { cellWidth: 17 },
          7: { cellWidth: 'auto' }
        }
      });

      startY = (doc as any).lastAutoTable.finalY + 6;
    } else {
      startY += 3;
    }

    // Slicing Operations Section
    const slicingOps = traceabilityData.stages?.slicing || [];
    if (slicingOps.length > 0) {
      addSectionHeader('Slicing Operations');

      const slicingRows: any[] = [];
      slicingOps.forEach((op: any, index: number) => {
        slicingRows.push([
          `OP-${(index + 1).toString().padStart(3, '0')}`,
          op.startTime ? format(new Date(op.startTime), 'PP p') : 'N/A',
          op.endTime ? format(new Date(op.endTime), 'PP p') : 'In Progress',
          op.status || 'N/A'
        ]);
      });

      autoTable(doc, {
        startY,
        head: [['Serial', 'Start', 'End', 'Status']],
        body: slicingRows,
        theme: 'grid',
        headStyles: {
          fillColor: [248, 250, 252],
          textColor: [30, 41, 59],
          fontStyle: 'bold',
          fontSize: 7.5,
          cellPadding: 2.5,
          lineColor: [226, 232, 240],
          lineWidth: 0.1
        },
        bodyStyles: {
          textColor: [71, 85, 105],
          fontSize: 7.5,
          cellPadding: 2.5,
          lineColor: [226, 232, 240],
          lineWidth: 0.1
        },
        margin: { left: 14, right: 14 }
      });

      startY = (doc as any).lastAutoTable.finalY + 6;
    }

    // Drying Processes Section (if available)
    const dryingProcesses = traceabilityData.stages?.dryingProcesses || [];
    if (dryingProcesses.length > 0) {
      addSectionHeader('Drying Processes');

      const dryingRows: any[] = [];
      dryingProcesses.forEach((batch: any) => {
        dryingRows.push([
          batch.batchNumber || 'N/A',
          batch.startDate ? format(new Date(batch.startDate), 'PP p') : 'N/A',
          batch.endDate ? format(new Date(batch.endDate), 'PP p') : 'In Progress',
          batch.status || 'N/A'
        ]);
      });

      autoTable(doc, {
        startY,
        head: [['Batch', 'Start', 'End', 'Status']],
        body: dryingRows,
        theme: 'grid',
        headStyles: {
          fillColor: [248, 250, 252],
          textColor: [30, 41, 59],
          fontStyle: 'bold',
          fontSize: 7.5,
          cellPadding: 2.5,
          lineColor: [226, 232, 240],
          lineWidth: 0.1
        },
        bodyStyles: {
          textColor: [71, 85, 105],
          fontSize: 7.5,
          cellPadding: 2.5,
          lineColor: [226, 232, 240],
          lineWidth: 0.1
        },
        margin: { left: 14, right: 14 }
      });

      startY = (doc as any).lastAutoTable.finalY + 6;
    }

    // Activity History Section
    const history = traceabilityData.history || [];
    if (history.length > 0) {
      addSectionHeader('Activity History');

      const historyRows: any[] = [];
      // Limit to last 5 history items to save space
      history.slice(-5).forEach((item: any) => {
        historyRows.push([
          item.timestamp ? format(new Date(item.timestamp), 'PP p') : 'N/A',
          item.userName || 'N/A',
          item.action || 'N/A',
          item.details || ''
        ]);
      });

      autoTable(doc, {
        startY,
        head: [['Time', 'User', 'Action', 'Details']],
        body: historyRows,
        theme: 'grid',
        headStyles: {
          fillColor: [248, 250, 252],
          textColor: [30, 41, 59],
          fontStyle: 'bold',
          fontSize: 7.5,
          cellPadding: 2.5,
          lineColor: [226, 232, 240],
          lineWidth: 0.1
        },
        bodyStyles: {
          textColor: [71, 85, 105],
          fontSize: 7,
          cellPadding: 2.5,
          lineColor: [226, 232, 240],
          lineWidth: 0.1
        },
        margin: { left: 14, right: 14 },
        columnStyles: {
          0: { cellWidth: 35 },
          1: { cellWidth: 25 },
          2: { cellWidth: 30 },
          3: { cellWidth: 'auto' }
        }
      });

      startY = (doc as any).lastAutoTable.finalY + 6;
    }

    // Cost Breakdown Section
    const hasCostData = costData.purchasePrice || costData.transportPrice ||
                        costData.slicingExpenses || costData.otherExpenses;

    if (hasCostData) {
      addSectionHeader('Cost Breakdown');

      // Prepare cost data
      const costRows: any[] = [];

      if (costData.purchasePrice) {
        const amount = parseFloat(costData.purchasePrice);
        const total = costData.purchasePriceType === 'PER_M3' ? amount * totalM3 : amount;
        const baseAmount = costData.purchasePriceIncVat ? total / 1.18 : total;
        costRows.push([
          'Purchase Price',
          `TZS ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          costData.purchasePriceType === 'PER_M3' ? 'Per m³' : 'Per Lot',
          costData.purchasePriceIncVat ? 'Inc VAT' : 'Exc VAT',
          `TZS ${baseAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        ]);
      }

      if (costData.transportPrice) {
        const amount = parseFloat(costData.transportPrice);
        const total = costData.transportPriceType === 'PER_M3' ? amount * totalM3 : amount;
        const baseAmount = costData.transportPriceIncVat ? total / 1.18 : total;
        costRows.push([
          'Transport Price',
          `TZS ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          costData.transportPriceType === 'PER_M3' ? 'Per m³' : 'Per Lot',
          costData.transportPriceIncVat ? 'Inc VAT' : 'Exc VAT',
          `TZS ${baseAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        ]);
      }

      if (costData.slicingExpenses) {
        const amount = parseFloat(costData.slicingExpenses);
        const total = costData.slicingExpensesType === 'PER_M3' ? amount * totalM3 : amount;
        const baseAmount = costData.slicingExpensesIncVat ? total / 1.18 : total;
        costRows.push([
          'Slicing Expenses',
          `TZS ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          costData.slicingExpensesType === 'PER_M3' ? 'Per m³' : 'Per Lot',
          costData.slicingExpensesIncVat ? 'Inc VAT' : 'Exc VAT',
          `TZS ${baseAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        ]);
      }

      if (costData.otherExpenses) {
        const amount = parseFloat(costData.otherExpenses);
        const total = costData.otherExpensesType === 'PER_M3' ? amount * totalM3 : amount;
        const baseAmount = costData.otherExpensesIncVat ? total / 1.18 : total;
        costRows.push([
          'Other Expenses',
          `TZS ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          costData.otherExpensesType === 'PER_M3' ? 'Per m³' : 'Per Lot',
          costData.otherExpensesIncVat ? 'Inc VAT' : 'Exc VAT',
          `TZS ${baseAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        ]);
      }

      if (costRows.length > 0) {
        autoTable(doc, {
          startY,
          head: [['Item', 'Unit Price', 'Type', 'VAT', 'Total (Exc VAT)']],
          body: costRows,
          theme: 'grid',
          headStyles: {
            fillColor: [248, 250, 252],
            textColor: [30, 41, 59],
            fontStyle: 'bold',
            fontSize: 7.5,
            cellPadding: 2.5,
            lineColor: [226, 232, 240],
            lineWidth: 0.1
          },
          bodyStyles: {
            textColor: [71, 85, 105],
            fontSize: 7.5,
            cellPadding: 2.5,
            lineColor: [226, 232, 240],
            lineWidth: 0.1
          },
          margin: { left: 14, right: 14 }
        });

        startY = (doc as any).lastAutoTable.finalY + 6;
      }

      // Calculate totals
      const purchasePrice = parseFloat(costData.purchasePrice || '0');
      const transportPrice = parseFloat(costData.transportPrice || '0');
      const slicingExpenses = parseFloat(costData.slicingExpenses || '0');
      const otherExpenses = parseFloat(costData.otherExpenses || '0');

      let purchaseTotal = costData.purchasePriceType === 'PER_M3' ? purchasePrice * totalM3 : purchasePrice;
      let transportTotal = costData.transportPriceType === 'PER_M3' ? transportPrice * totalM3 : transportPrice;
      let slicingTotal = costData.slicingExpensesType === 'PER_M3' ? slicingExpenses * totalM3 : slicingExpenses;
      let otherTotal = costData.otherExpensesType === 'PER_M3' ? otherExpenses * totalM3 : otherExpenses;

      if (costData.purchasePriceIncVat) purchaseTotal = purchaseTotal / 1.18;
      if (costData.transportPriceIncVat) transportTotal = transportTotal / 1.18;
      if (costData.slicingExpensesIncVat) slicingTotal = slicingTotal / 1.18;
      if (costData.otherExpensesIncVat) otherTotal = otherTotal / 1.18;

      const subtotal = purchaseTotal + transportTotal + slicingTotal + otherTotal;
      const vat = subtotal * 0.18;
      const total = subtotal + vat;

      // Clean Summary boxes
      startY += 2;

      // White boxes with clean borders
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.roundedRect(14, startY, 58, 16, 1, 1, 'FD');

      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('Subtotal (Exc VAT)', 17, startY + 5);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text(`TZS ${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 17, startY + 12);

      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(75, startY, 58, 16, 1, 1, 'FD');

      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('VAT (18%)', 78, startY + 5);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text(`TZS ${vat.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 78, startY + 12);

      doc.setFillColor(220, 38, 38);
      doc.setDrawColor(220, 38, 38);
      doc.setLineWidth(1);
      doc.roundedRect(136, startY, 58, 16, 1, 1, 'FD');

      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(255, 255, 255);
      doc.text('TOTAL (Inc VAT)', 139, startY + 5);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`TZS ${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 139, startY + 12);

      startY += 20;

      // Notes section
      if (costData.notes) {
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text('Notes:', 14, startY);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105);
        const splitNotes = doc.splitTextToSize(costData.notes, pageWidth - 28);
        doc.text(splitNotes, 14, startY + 4);
      }
    }

    // Add footers to all pages
    const totalPages = currentPage;
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      addFooter(i, totalPages);
    }

    // Save PDF
    const receiptDateStr = woodReceipt.receiptDate
      ? format(new Date(woodReceipt.receiptDate), 'yyyy-MM-dd')
      : format(new Date(), 'yyyy-MM-dd');
    const filename = `${lotNumber} (${woodType}) Traceability - ${receiptDateStr}.pdf`;
    doc.save(filename);

    enqueueSnackbar('PDF generated successfully', { variant: 'success' });
  };

  // Fetch users for notification
  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await api.get('/users');
      setUsers(response.data.filter((user: any) => user.isActive));
    } catch (error) {
      console.error('Error fetching users:', error);
      enqueueSnackbar('Failed to load users', { variant: 'error' });
    } finally {
      setLoadingUsers(false);
    }
  };

  // Send notification to selected users
  const handleSendNotification = async () => {
    if (selectedUsers.length === 0) {
      enqueueSnackbar('Please select at least one user', { variant: 'warning' });
      return;
    }

    if (!traceabilityData?.lotNumber) {
      enqueueSnackbar('No LOT data available', { variant: 'warning' });
      return;
    }

    try {
      setSendingNotification(true);

      const woodType = traceabilityData.woodReceipts?.[0]?.wood?.type || 'Wood';
      const message = `LOT ${traceabilityData.lotNumber} (${woodType}) - Traceability report is ready for review`;

      // Send notification to each selected user
      const promises = selectedUsers.map(userId =>
        api.post('/notifications/send', {
          receiverId: userId,
          title: 'LOT Traceability Report',
          message,
          type: 'LOT_TRACEABILITY',
          linkUrl: `/management/wood-receipt?lot=${traceabilityData.lotNumber}`
        })
      );

      await Promise.all(promises);

      enqueueSnackbar(`Notification sent to ${selectedUsers.length} user(s)`, { variant: 'success' });
      setNotificationDialogOpen(false);
      setSelectedUsers([]);
    } catch (error) {
      console.error('Error sending notifications:', error);
      enqueueSnackbar('Failed to send notifications', { variant: 'error' });
    } finally {
      setSendingNotification(false);
    }
  };

  // Handle opening notification dialog
  const handleOpenNotificationDialog = () => {
    if (!traceabilityData?.lotNumber) {
      enqueueSnackbar('No LOT data available', { variant: 'warning' });
      return;
    }
    setNotificationDialogOpen(true);
    fetchUsers();
  };

  // Toggle user selection
  const handleToggleUser = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleLotClick = async (lotNumber: string) => {
    if (!lotNumber) {
      enqueueSnackbar('No LOT number available', { variant: 'warning' });
      return;
    }

    try {
      setLoadingTraceability(true);
      setTraceabilityDialogOpen(true);

      const response = await api.get(`/management/lot-traceability/${lotNumber}`);
      setTraceabilityData(response.data);

      // Initialize cost data
      if (response.data.cost) {
        setCostData({
          purchasePrice: response.data.cost.purchasePrice || '',
          purchasePriceType: response.data.cost.purchasePriceType || 'LUMPSUM',
          purchasePriceIncVat: response.data.cost.purchasePriceIncVat || false,
          transportPrice: response.data.cost.transportPrice || '',
          transportPriceType: response.data.cost.transportPriceType || 'LUMPSUM',
          transportPriceIncVat: response.data.cost.transportPriceIncVat || false,
          slicingExpenses: response.data.cost.slicingExpenses || '',
          slicingExpensesType: response.data.cost.slicingExpensesType || 'LUMPSUM',
          slicingExpensesIncVat: response.data.cost.slicingExpensesIncVat || false,
          otherExpenses: response.data.cost.otherExpenses || '',
          otherExpensesType: response.data.cost.otherExpensesType || 'LUMPSUM',
          otherExpensesIncVat: response.data.cost.otherExpensesIncVat || false,
          notes: response.data.cost.notes || ''
        });
        setEditingCost(false); // Costs exist, start in view mode
      } else {
        setCostData({
          purchasePrice: '',
          purchasePriceType: 'LUMPSUM',
          purchasePriceIncVat: false,
          transportPrice: '',
          transportPriceType: 'LUMPSUM',
          transportPriceIncVat: false,
          slicingExpenses: '',
          slicingExpensesType: 'LUMPSUM',
          slicingExpensesIncVat: false,
          otherExpenses: '',
          otherExpensesType: 'LUMPSUM',
          otherExpensesIncVat: false,
          notes: ''
        });
        setEditingCost(true); // No costs yet, start in edit mode
      }
    } catch (error: any) {
      console.error('Error fetching LOT traceability:', error);
      enqueueSnackbar(
        `Failed to fetch LOT traceability: ${error.message}`,
        { variant: 'error' }
      );
      setTraceabilityDialogOpen(false);
    } finally {
      setLoadingTraceability(false);
    }
  };

  return (
    <StyledContainer maxWidth="lg">
      {/* Header Card */}
      <Paper
        elevation={0}
        sx={{
          backgroundColor: '#fff',
          borderRadius: 2,
          p: 4,
          mb: 3,
          border: '2px solid #fee2e2',
          background: 'linear-gradient(135deg, #fff 0%, #fef2f2 100%)',
        }}
      >
        <Box sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <Box>
            <Typography
              variant="h5"
              sx={{
                color: '#dc2626',
                fontWeight: 700,
                fontSize: '1.5rem',
                mb: 0.5,
                letterSpacing: '-0.025em',
              }}
            >
              LOT Management
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.875rem', fontWeight: 400 }}>
              Create and manage LOT numbers with wood receipt information
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenDialog(true)}
            sx={{
              backgroundColor: '#dc2626',
              color: '#fff',
              textTransform: 'none',
              px: 3,
              py: 1,
              fontSize: '0.875rem',
              fontWeight: 600,
              borderRadius: 2,
              boxShadow: '0 2px 8px rgba(220, 38, 38, 0.2)',
              transition: 'all 0.2s ease',
              '&:hover': {
                backgroundColor: '#b91c1c',
                boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)',
              }
            }}
          >
            Create New LOT
          </Button>
        </Box>
      </Paper>

      {/* Table Card */}
      <Paper
        elevation={0}
        sx={{
          backgroundColor: '#fff',
          borderRadius: 2,
          overflow: 'hidden',
          border: '2px solid #fee2e2',
        }}
      >
        <TableContainer>
          <Table sx={{
            '& .MuiTableCell-root': {
              fontSize: '0.8125rem',
              py: 1.5,
              px: 2,
              borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
            },
            '& .MuiTableCell-head': {
              fontWeight: 600,
              backgroundColor: '#fef2f2',
              color: '#dc2626',
              py: 1.75,
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              borderBottom: '2px solid #dc2626',
            },
            '& .MuiTableBody-root .MuiTableRow-root': {
              transition: 'all 0.2s ease',
              '&:hover': {
                backgroundColor: '#fef2f2',
              }
            }
          }}>
            <TableHead>
              <TableRow>
                <TableCell>LOT Number</TableCell>
                <TableCell>Wood Type</TableCell>
                <TableCell>Supplier</TableCell>
                <TableCell>PO Number</TableCell>
                <TableCell>Est. Volume (CBM)</TableCell>
                <TableCell>Est. Pieces</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {receipts.map((receipt) => (
                <TableRow key={receipt.id}>
                  <TableCell>
                    <Box
                      onClick={() => receipt.lot_number && handleLotClick(receipt.lot_number)}
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        backgroundColor: '#dc2626',
                        color: '#fff',
                        px: 1.5,
                        py: 0.5,
                        borderRadius: 1,
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        letterSpacing: '0.025em',
                        cursor: receipt.lot_number ? 'pointer' : 'default',
                        transition: 'all 0.2s ease',
                        '&:hover': receipt.lot_number ? {
                          backgroundColor: '#b91c1c',
                          boxShadow: '0 2px 4px rgba(220, 38, 38, 0.3)',
                        } : {},
                      }}
                    >
                      {receipt.lot_number || 'N/A'}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ fontWeight: 600, color: '#1e293b', fontSize: '0.8125rem' }}>
                      {receipt.wood_type?.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ color: '#475569', fontSize: '0.8125rem' }}>
                      {receipt.supplier}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ color: '#64748b', fontSize: '0.8125rem', fontWeight: 500 }}>
                      {receipt.purchase_order || 'N/A'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography sx={{ color: '#1e293b', fontWeight: 600, fontSize: '0.8125rem' }}>
                        {(() => {
                          const volume = receipt.actualVolumeM3 || receipt.estimatedVolumeM3 || receipt.total_volume_m3;
                          return volume ? parseFloat(volume.toString()).toFixed(4) : '0';
                        })()}
                      </Typography>
                      {receipt.actualVolumeM3 && (
                        <Typography sx={{ color: '#10b981', fontSize: '0.625rem', fontWeight: 600, mt: 0.25 }}>
                          ACTUAL
                        </Typography>
                      )}
                      {!receipt.actualVolumeM3 && (receipt.estimatedVolumeM3 || receipt.total_volume_m3) && (
                        <Typography sx={{ color: '#64748b', fontSize: '0.625rem', fontWeight: 500, mt: 0.25 }}>
                          EST.
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography sx={{ color: '#1e293b', fontWeight: 600, fontSize: '0.8125rem' }}>
                        {receipt.actualPieces || receipt.estimatedPieces || receipt.total_pieces || '0'}
                      </Typography>
                      {receipt.actualPieces && (
                        <Typography sx={{ color: '#10b981', fontSize: '0.625rem', fontWeight: 600, mt: 0.25 }}>
                          ACTUAL
                        </Typography>
                      )}
                      {!receipt.actualPieces && (receipt.estimatedPieces || receipt.total_pieces) && (
                        <Typography sx={{ color: '#64748b', fontSize: '0.625rem', fontWeight: 500, mt: 0.25 }}>
                          EST.
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={receipt.status}
                      size="small"
                      sx={{
                        fontSize: '0.6875rem',
                        fontWeight: 600,
                        height: '24px',
                        px: 1.25,
                        borderRadius: 1,
                        backgroundColor: receipt.status === 'CREATED' ? '#64748b' :
                          receipt.status === 'PENDING' ? '#fbbf24' :
                          receipt.status === 'RECEIVED' ? '#3b82f6' :
                          receipt.status === 'PROCESSING' ? '#8b5cf6' :
                          receipt.status === 'COMPLETED' ? '#10b981' :
                          '#ef4444',
                        color: '#fff',
                        border: 'none',
                      }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => handleEditClick(receipt)}
                      sx={{
                        backgroundColor: '#dc2626',
                        color: '#fff',
                        width: 32,
                        height: 32,
                        '&:hover': {
                          backgroundColor: '#b91c1c',
                        },
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    {isAdmin && receipt.status === 'COMPLETED' && (
                      <IconButton
                        size="small"
                        onClick={() => handleReopenLot(receipt)}
                        sx={{
                          backgroundColor: '#10b981',
                          color: '#fff',
                          ml: 1,
                          width: 32,
                          height: 32,
                          '&:hover': {
                            backgroundColor: '#059669',
                          },
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <LockOpenIcon fontSize="small" />
                      </IconButton>
                    )}
                    {isAdmin && (receipt.status === 'PENDING' || receipt.status === 'PROCESSING') && (
                      <IconButton
                        size="small"
                        onClick={() => handleLockLot(receipt)}
                        sx={{
                          backgroundColor: '#f59e0b',
                          color: '#fff',
                          ml: 1,
                          width: 32,
                          height: 32,
                          '&:hover': {
                            backgroundColor: '#d97706',
                          },
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <LockIcon fontSize="small" />
                      </IconButton>
                    )}
                    {(receipt.status === 'CREATED' || receipt.status === 'PENDING') && (
                      <IconButton
                        size="small"
                        onClick={() => {
                          setReceiptToDelete(receipt);
                          setDeleteDialogOpen(true);
                        }}
                        sx={{
                          backgroundColor: '#64748b',
                          color: '#fff',
                          ml: 1,
                          width: 32,
                          height: 32,
                          '&:hover': {
                            backgroundColor: '#475569',
                          },
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
        keepMounted={false}
        disablePortal={false}
        disableEnforceFocus={true}
        disableAutoFocus={true}
        disableRestoreFocus={true}
        container={() => document.getElementById('modal-root')}
        slotProps={{
          backdrop: {
            sx: { backgroundColor: 'rgba(0, 0, 0, 0.5)' }
          }
        }}
        PaperProps={{
          sx: {
            borderRadius: 2,
            backgroundColor: '#fff',
          }
        }}
        aria-labelledby="receipt-dialog-title"
      >
        <DialogTitle 
          id="receipt-dialog-title"
          sx={{ 
            color: 'rgba(0, 0, 0, 0.87)',
            fontWeight: 600,
            borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
            pb: 2,
            fontSize: '1.25rem', // 20px
            fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
          }}
        >
          Create New LOT (Stage 1)
        </DialogTitle>
        <DialogContent 
          sx={{ mt: 2 }}
          tabIndex={-1}
        >
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                select
                fullWidth
                label="Wood Type"
                value={newReceipt.wood_type_id}
                onChange={(e) => setNewReceipt(prev => ({ ...prev, wood_type_id: e.target.value }))}
                required
                error={!newReceipt.wood_type_id}
                helperText={!newReceipt.wood_type_id ? "Wood Type is required" : ""}
                sx={textFieldSx}
              >
                {woodTypes.map((type) => (
                  <MenuItem key={type.id} value={type.id}>
                    {type.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                select
                fullWidth
                label="Warehouse"
                value={newReceipt.warehouse_id}
                onChange={(e) => setNewReceipt(prev => ({ ...prev, warehouse_id: e.target.value }))}
                helperText="Select warehouse for stock tracking"
                sx={textFieldSx}
              >
                <MenuItem value="">
                  <em>No Warehouse</em>
                </MenuItem>
                {warehouses.filter(w => w.status === 'ACTIVE').map((warehouse) => (
                  <MenuItem key={warehouse.id} value={warehouse.id}>
                    {warehouse.name} ({warehouse.code})
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Supplier"
                value={newReceipt.supplier}
                onChange={(e) => setNewReceipt(prev => ({ ...prev, supplier: e.target.value }))}
                required
                error={!newReceipt.supplier}
                helperText={!newReceipt.supplier ? "Supplier is required" : ""}
                sx={textFieldSx}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                label="Purchase Date"
                value={newReceipt.purchase_date}
                onChange={(e) => setNewReceipt(prev => ({ ...prev, purchase_date: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                required
                error={!newReceipt.purchase_date}
                helperText={!newReceipt.purchase_date ? "Purchase Date is required" : ""}
                sx={textFieldSx}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Purchase Order Number (Optional)"
                value={newReceipt.purchase_order || ''}
                onChange={(e) => setNewReceipt(prev => ({ ...prev, purchase_order: e.target.value }))}
                placeholder="Can be added later"
                helperText="Optional - can be updated after creation"
                sx={textFieldSx}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="LOT Number"
                value={newReceipt.lot_number}
                InputProps={{
                  readOnly: true,
                }}
                disabled
                helperText="Auto-generated and immutable for traceability"
                sx={{
                  ...textFieldSx,
                  '& .MuiInputBase-input.Mui-disabled': {
                    WebkitTextFillColor: '#1e293b',
                    fontWeight: 600
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Estimated Volume (CBM)"
                value={newReceipt.total_volume_m3 || ''}
                onChange={(e) => setNewReceipt(prev => ({ ...prev, total_volume_m3: e.target.value }))}
                InputProps={{
                  inputProps: { min: 0, step: 0.001 }
                }}
                sx={textFieldSx}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label={newReceipt.wood_format === 'SLEEPERS' ? 'Estimated Number of Sleepers' : 'Estimated Number of Planks'}
                value={newReceipt.total_pieces || ''}
                onChange={(e) => setNewReceipt(prev => ({ ...prev, total_pieces: e.target.value }))}
                InputProps={{
                  inputProps: { min: 0, step: 1 }
                }}
                sx={textFieldSx}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                select
                fullWidth
                label="Wood Type"
                value={newReceipt.wood_format}
                onChange={(e) => setNewReceipt(prev => ({ ...prev, wood_format: e.target.value }))}
                required
                helperText="Sleepers require slicing, Planks skip slicing stage"
                sx={textFieldSx}
              >
                <MenuItem value="SLEEPERS">Sleepers (Requires Slicing)</MenuItem>
                <MenuItem value="PLANKS">Planks (Ready to Use)</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                value={newReceipt.notes || ''}
                onChange={(e) => setNewReceipt(prev => ({ ...prev, notes: e.target.value }))}
                multiline
                rows={3}
                sx={textFieldSx}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ 
          borderTop: '1px solid rgba(0, 0, 0, 0.12)',
          p: 2,
          gap: 1 
        }}>
          <Button 
            onClick={handleCloseDialog}
            sx={{ 
              color: 'rgba(0, 0, 0, 0.6)',
              textTransform: 'none',
              fontSize: '0.875rem',
              fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
              fontWeight: 500,
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateReceipt}
            disabled={loading ||
              !newReceipt.wood_type_id ||
              !newReceipt.supplier ||
              !newReceipt.purchase_date
            }
            variant="contained"
            sx={{
              backgroundColor: '#dc2626',
              color: '#fff',
              textTransform: 'none',
              fontSize: '0.875rem',
              fontWeight: 500,
              px: 2,
              py: 0.75,
              '&:hover': {
                backgroundColor: '#b91c1c',
              },
              '&:disabled': {
                backgroundColor: 'rgba(0, 0, 0, 0.12)',
                color: 'rgba(0, 0, 0, 0.26)',
              }
            }}
          >
            {loading ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={editDialogOpen}
        onClose={handleCloseEditDialog}
        maxWidth="sm"
        fullWidth
        keepMounted={false}
        disablePortal={false}
        disableEnforceFocus={true}
        disableAutoFocus={true}
        disableRestoreFocus={true}
        container={() => document.getElementById('modal-root')}
        slotProps={{
          backdrop: {
            sx: { backgroundColor: 'rgba(0, 0, 0, 0.5)' }
          }
        }}
        PaperProps={{
          sx: {
            borderRadius: 2,
            backgroundColor: '#fff',
          }
        }}
        aria-labelledby="edit-receipt-dialog-title"
      >
        <DialogTitle id="edit-receipt-dialog-title">Edit Wood Receipt</DialogTitle>
        <DialogContent>
          {editingReceipt && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="LOT Number"
                  value={editingReceipt.lot_number || 'N/A'}
                  InputProps={{
                    readOnly: true,
                  }}
                  sx={{
                    ...textFieldSx,
                    '& .MuiInputBase-input.Mui-readOnly': {
                      color: 'rgba(0, 0, 0, 0.87)',
                      fontWeight: 500,
                    },
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  select
                  fullWidth
                  label="Wood Type"
                  value={editingReceipt.wood_type_id}
                  onChange={(e) => setEditingReceipt(prev => prev ? { ...prev, wood_type_id: e.target.value } : null)}
                  required
                  sx={textFieldSx}
                >
                  {woodTypes.map((type) => (
                    <MenuItem key={type.id} value={type.id}>
                      {type.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  select
                  fullWidth
                  label="Warehouse"
                  value={editingReceipt.warehouse_id || ''}
                  onChange={(e) => setEditingReceipt(prev => prev ? { ...prev, warehouse_id: e.target.value } : null)}
                  helperText="Select warehouse for stock tracking"
                  sx={textFieldSx}
                >
                  <MenuItem value="">
                    <em>No Warehouse</em>
                  </MenuItem>
                  {warehouses.filter(w => w.status === 'ACTIVE').map((warehouse) => (
                    <MenuItem key={warehouse.id} value={warehouse.id}>
                      {warehouse.name} ({warehouse.code})
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Supplier"
                  value={editingReceipt.supplier}
                  onChange={(e) => setEditingReceipt(prev => prev ? { ...prev, supplier: e.target.value } : null)}
                  required
                  sx={textFieldSx}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="Purchase Date"
                  value={editingReceipt.purchase_date}
                  onChange={(e) => setEditingReceipt(prev => prev ? { ...prev, purchase_date: e.target.value } : null)}
                  InputLabelProps={{ shrink: true }}
                  required
                  sx={textFieldSx}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Purchase Order Number (Optional)"
                  value={editingReceipt.purchase_order || ''}
                  onChange={(e) => setEditingReceipt(prev => prev ? { ...prev, purchase_order: e.target.value } : null)}
                  placeholder="Can be added later"
                  helperText="Optional"
                  sx={textFieldSx}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Estimated Volume (CBM)"
                  value={editingReceipt.total_volume_m3 || ''}
                  onChange={(e) => setEditingReceipt(prev => prev ? { ...prev, total_volume_m3: e.target.value } : null)}
                  InputProps={{
                    inputProps: { min: 0, step: 0.001 }
                  }}
                  sx={textFieldSx}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label={editingReceipt.wood_format === 'PLANKS' ? 'Estimated Number of Planks' : 'Estimated Number of Sleepers'}
                  value={editingReceipt.total_pieces || ''}
                  onChange={(e) => setEditingReceipt(prev => prev ? { ...prev, total_pieces: e.target.value } : null)}
                  InputProps={{
                    inputProps: { min: 0, step: 1 }
                  }}
                  sx={textFieldSx}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  select
                  fullWidth
                  label="Wood Type"
                  value={editingReceipt.wood_format || 'SLEEPERS'}
                  onChange={(e) => setEditingReceipt(prev => prev ? { ...prev, wood_format: e.target.value } : null)}
                  required
                  helperText="Sleepers require slicing, Planks skip slicing stage"
                  sx={textFieldSx}
                >
                  <MenuItem value="SLEEPERS">Sleepers (Requires Slicing)</MenuItem>
                  <MenuItem value="PLANKS">Planks (Ready to Use)</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Notes"
                  value={editingReceipt.notes || ''}
                  onChange={(e) => setEditingReceipt(prev => prev ? { ...prev, notes: e.target.value } : null)}
                  multiline
                  rows={3}
                  sx={textFieldSx}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Status"
                  value={editingReceipt.status}
                  InputProps={{
                    readOnly: true,
                  }}
                  helperText="Status is automatically updated based on workflow stage"
                  sx={{
                    ...textFieldSx,
                    '& .MuiInputBase-input.Mui-readOnly': {
                      color: 'rgba(0, 0, 0, 0.87)',
                      fontWeight: 500,
                      backgroundColor: '#f8fafc',
                    },
                  }}
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          <Button
            onClick={handleCloseEditDialog}
            sx={{
              color: 'rgba(0, 0, 0, 0.6)',
              textTransform: 'none',
              fontSize: '0.875rem',
              fontWeight: 500,
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleUpdateReceipt}
            disabled={loading || !editingReceipt?.wood_type_id || !editingReceipt?.supplier || !editingReceipt?.purchase_date}
            sx={{
              backgroundColor: '#dc2626',
              color: '#fff',
              textTransform: 'none',
              fontSize: '0.875rem',
              fontWeight: 500,
              px: 2,
              py: 0.75,
              '&:hover': {
                backgroundColor: '#b91c1c',
              },
              '&:disabled': {
                backgroundColor: 'rgba(0, 0, 0, 0.12)',
                color: 'rgba(0, 0, 0, 0.26)',
              }
            }}
          >
            {loading ? 'Updating...' : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={deleteDialogOpen}
        onClose={() => {
          if (!isDeleting) {
            setDeleteDialogOpen(false);
            setReceiptToDelete(null);
          }
        }}
        maxWidth="sm"
        fullWidth
        disablePortal={false}
        disableEnforceFocus={true}
        disableAutoFocus={true}
        disableRestoreFocus={true}
        container={() => document.getElementById('modal-root')}
        PaperProps={{
          sx: {
            borderRadius: 2,
            backgroundColor: '#fff',
          }
        }}
      >
        <DialogTitle>Delete Receipt</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete LOT {receiptToDelete?.lot_number}? This action cannot be undone.
            Only LOTs in CREATED or PENDING status can be deleted.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          <Button
            onClick={() => {
              setDeleteDialogOpen(false);
              setReceiptToDelete(null);
            }}
            disabled={isDeleting}
            sx={{
              color: 'rgba(0, 0, 0, 0.6)',
              textTransform: 'none',
              fontSize: '0.875rem',
              fontWeight: 500,
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteReceipt}
            variant="contained"
            disabled={isDeleting}
            startIcon={isDeleting ? <CircularProgress size={20} /> : <DeleteIcon />}
            sx={{
              backgroundColor: '#dc2626',
              color: '#fff',
              textTransform: 'none',
              fontSize: '0.875rem',
              fontWeight: 500,
              px: 2,
              py: 0.75,
              '&:hover': {
                backgroundColor: '#b91c1c',
              },
              '&:disabled': {
                backgroundColor: 'rgba(0, 0, 0, 0.12)',
                color: 'rgba(0, 0, 0, 0.26)',
              }
            }}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* LOT Management Dialog */}
      <Dialog
        open={traceabilityDialogOpen}
        onClose={() => setTraceabilityDialogOpen(false)}
        maxWidth="md"
        fullWidth
        disablePortal={false}
        disableEnforceFocus={true}
        disableAutoFocus={true}
        disableRestoreFocus={true}
        container={() => document.getElementById('modal-root')}
        PaperProps={{
          sx: {
            borderRadius: 2,
            backgroundColor: '#fff',
          }
        }}
      >
        <DialogTitle sx={{ borderBottom: '1px solid #e2e8f0', pb: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#dc2626' }}>
              LOT Management: {traceabilityData?.lotNumber}
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
              Full tracking history for this LOT number
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {loadingTraceability ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress sx={{ color: '#dc2626' }} />
            </Box>
          ) : traceabilityData ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {/* Wood Receipts Stage */}
              <Box>
                <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  mb: 2,
                  pb: 1.5,
                  borderBottom: '2px solid #dc2626'
                }}>
                  <ReceiptLongIcon sx={{ color: '#dc2626', fontSize: '1.75rem' }} />
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#dc2626', fontSize: '1.125rem' }}>
                    Wood Receipt
                  </Typography>
                  <Chip
                    label={traceabilityData.stages.woodReceipts.length}
                    size="small"
                    sx={{
                      backgroundColor: '#dc2626',
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: '0.75rem'
                    }}
                  />
                </Box>
                {traceabilityData.stages.woodReceipts.length > 0 ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {traceabilityData.stages.woodReceipts.map((receipt: any, index: number) => (
                      <Paper
                        key={receipt.id}
                        elevation={0}
                        sx={{
                          border: '2px solid #fee2e2',
                          borderRadius: 2,
                          p: 3,
                          backgroundColor: '#fef2f2',
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            borderColor: '#dc2626',
                            boxShadow: '0 4px 12px rgba(220, 38, 38, 0.15)',
                          }
                        }}
                      >
                        <Grid container spacing={2.5}>
                          <Grid item xs={6}>
                            <Typography variant="caption" sx={{ color: '#991b1b', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.5px' }}>
                              Wood Type
                            </Typography>
                            <Typography variant="body1" sx={{ fontWeight: 700, color: '#1e293b', mt: 0.5 }}>
                              {receipt.woodType}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="caption" sx={{ color: '#991b1b', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.5px' }}>
                              Supplier
                            </Typography>
                            <Typography variant="body1" sx={{ fontWeight: 700, color: '#1e293b', mt: 0.5 }}>
                              {receipt.supplier}
                            </Typography>
                          </Grid>
                          <Grid item xs={3}>
                            <Typography variant="caption" sx={{ color: '#991b1b', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.5px' }}>
                              Est. Volume
                            </Typography>
                            <Typography variant="body1" sx={{ fontWeight: 700, color: '#dc2626', mt: 0.5 }}>
                              {receipt.estimatedVolumeM3 ? receipt.estimatedVolumeM3.toFixed(3) : 'N/A'} <Typography component="span" sx={{ fontSize: '0.75rem', color: '#64748b' }}>CBM</Typography>
                            </Typography>
                          </Grid>
                          <Grid item xs={3}>
                            <Typography variant="caption" sx={{ color: '#991b1b', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.5px' }}>
                              Est. Pieces
                            </Typography>
                            <Typography variant="body1" sx={{ fontWeight: 700, color: '#dc2626', mt: 0.5 }}>
                              {receipt.estimatedPieces || 'N/A'}
                            </Typography>
                          </Grid>
                          <Grid item xs={3}>
                            <Typography variant="caption" sx={{ color: '#059669', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.5px' }}>
                              {receipt.status === 'COMPLETED' ? 'Actual Volume' : 'Current Volume'}
                            </Typography>
                            <Typography variant="body1" sx={{ fontWeight: 700, color: receipt.status === 'COMPLETED' ? '#059669' : '#ea580c', mt: 0.5 }}>
                              {receipt.actualVolumeM3 ? receipt.actualVolumeM3.toFixed(3) : '0.000'} <Typography component="span" sx={{ fontSize: '0.75rem', color: '#64748b' }}>CBM</Typography>
                              {receipt.status !== 'COMPLETED' && (
                                <Typography component="span" sx={{ ml: 1, fontSize: '0.65rem', color: '#ea580c', fontWeight: 600, textTransform: 'uppercase' }}>
                                  (Draft)
                                </Typography>
                              )}
                            </Typography>
                          </Grid>
                          <Grid item xs={3}>
                            <Typography variant="caption" sx={{ color: '#059669', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.5px' }}>
                              {receipt.status === 'COMPLETED' ? 'Actual Pieces' : 'Current Pieces'}
                            </Typography>
                            <Typography variant="body1" sx={{ fontWeight: 700, color: receipt.status === 'COMPLETED' ? '#059669' : '#ea580c', mt: 0.5 }}>
                              {receipt.actualPieces || '0'}
                              {receipt.status !== 'COMPLETED' && (
                                <Typography component="span" sx={{ ml: 1, fontSize: '0.65rem', color: '#ea580c', fontWeight: 600, textTransform: 'uppercase' }}>
                                  (Draft)
                                </Typography>
                              )}
                            </Typography>
                          </Grid>
                          <Grid item xs={3}>
                            <Typography variant="caption" sx={{ color: '#991b1b', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.5px' }}>
                              Status
                            </Typography>
                            <Box sx={{ mt: 0.5 }}>
                              <Chip
                                label={receipt.status}
                                size="small"
                                sx={{
                                  backgroundColor: '#dc2626',
                                  color: '#fff',
                                  fontWeight: 700,
                                  fontSize: '0.75rem'
                                }}
                              />
                            </Box>
                          </Grid>
                          <Grid item xs={3}>
                            <Typography variant="caption" sx={{ color: '#991b1b', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.5px' }}>
                              Receipt Date
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: '#475569', mt: 0.5 }}>
                              {new Date(receipt.receiptDate).toLocaleDateString()}
                            </Typography>
                          </Grid>
                          {receipt.lastWorkedBy && (
                            <Grid item xs={6}>
                              <Typography variant="caption" sx={{ color: '#0891b2', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.5px' }}>
                                Last Worked By
                              </Typography>
                              <Typography variant="body2" sx={{ fontWeight: 600, color: '#0e7490', mt: 0.5 }}>
                                {receipt.lastWorkedBy}
                              </Typography>
                            </Grid>
                          )}
                          {receipt.lastWorkedAt && (
                            <Grid item xs={6}>
                              <Typography variant="caption" sx={{ color: '#0891b2', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.5px' }}>
                                Last Updated
                              </Typography>
                              <Typography variant="body2" sx={{ fontWeight: 600, color: '#0e7490', mt: 0.5 }}>
                                {new Date(receipt.lastWorkedAt).toLocaleString()}
                              </Typography>
                            </Grid>
                          )}
                        </Grid>
                      </Paper>
                    ))}
                  </Box>
                ) : (
                  <Paper elevation={0} sx={{ p: 3, backgroundColor: '#fef2f2', border: '1px dashed #fca5a5', borderRadius: 2 }}>
                    <Typography variant="body2" sx={{ color: '#dc2626', fontStyle: 'italic', textAlign: 'center' }}>
                      No wood receipts found for this LOT
                    </Typography>
                  </Paper>
                )}
              </Box>

              {/* Receipt Processing History Section */}
              <Box>
                <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  mb: 2,
                  pb: 1.5,
                  borderBottom: '2px solid #0891b2'
                }}>
                  <HistoryIcon sx={{ color: '#0891b2', fontSize: '1.75rem' }} />
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#0891b2', fontSize: '1.125rem' }}>
                    Receipt Processing History
                  </Typography>
                  <Chip
                    label={traceabilityData.history?.length || 0}
                    size="small"
                    sx={{ backgroundColor: '#0891b2', color: '#fff', fontWeight: 700 }}
                  />
                </Box>
                {traceabilityData.history && traceabilityData.history.length > 0 ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {traceabilityData.history.map((historyItem: any, index: number) => (
                      <Paper
                        key={historyItem.id}
                        elevation={0}
                        sx={{
                          p: 2,
                          borderLeft: '4px solid #0891b2',
                          backgroundColor: '#f0f9ff',
                          border: '1px solid #bae6fd',
                          borderRadius: 1.5
                        }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: '#0e7490', fontSize: '0.875rem' }}>
                              {historyItem.action}
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.8rem', mt: 0.5 }}>
                              {historyItem.details}
                            </Typography>
                          </Box>
                          <Chip
                            label={new Date(historyItem.timestamp).toLocaleString()}
                            size="small"
                            sx={{
                              backgroundColor: '#e0f2fe',
                              color: '#075985',
                              fontWeight: 500,
                              fontSize: '0.7rem'
                            }}
                          />
                        </Box>
                        <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.75rem' }}>
                          By: {historyItem.userName}
                        </Typography>
                      </Paper>
                    ))}
                  </Box>
                ) : (
                  <Paper elevation={0} sx={{ p: 3, backgroundColor: '#f8fafc', border: '2px dashed #cbd5e1', borderRadius: 2 }}>
                    <Typography variant="body2" sx={{ color: '#94a3b8', fontStyle: 'italic' }}>
                      No processing history available for this LOT
                    </Typography>
                  </Paper>
                )}
              </Box>

              {/* Wood Slicing Stage */}
              <Box>
                <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  mb: 2,
                  pb: 1.5,
                  borderBottom: '2px solid #dc2626'
                }}>
                  <ContentCutIcon sx={{ color: '#dc2626', fontSize: '1.75rem' }} />
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#dc2626', fontSize: '1.125rem' }}>
                    Wood Slicing
                  </Typography>
                  <Chip
                    label={traceabilityData.stages.slicing.length}
                    size="small"
                    sx={{ backgroundColor: '#dc2626', color: '#fff', fontWeight: 700 }}
                  />
                </Box>
                {traceabilityData.stages.slicing.length > 0 ? (() => {
                  // Calculate LOT-wide aggregated data
                  const operations = traceabilityData.stages.slicing;
                  let totalSleeperVolume = 0;
                  let totalPlankVolume = 0;
                  let totalSleepers = operations.length;
                  let totalPlanks = 0;

                  operations.forEach((op: any) => {
                    // Calculate sleeper volume
                    if (op.sleeperSizes) {
                      const sleeperVol = op.sleeperSizes.reduce((sum: number, size: any) => {
                        const width = (size.width || 0) / 100;
                        const height = (size.height || 0) / 100;
                        const length = size.length || 0;
                        const quantity = size.quantity || 1;
                        return sum + (width * height * length * quantity);
                      }, 0);
                      totalSleeperVolume += sleeperVol;
                    }

                    // Calculate plank volume
                    if (op.plankSizes) {
                      const plankVol = op.plankSizes.reduce((sum: number, size: any) => {
                        const width = (size.width || 0) / 100;
                        const height = (size.height || 0) / 100;
                        const length = size.length || 0;
                        const quantity = size.quantity || 1;
                        return sum + (width * height * length * quantity);
                      }, 0);
                      totalPlankVolume += plankVol;
                      totalPlanks += op.plankSizes.length;
                    }
                  });

                  const wasteVolume = totalSleeperVolume - totalPlankVolume;
                  const wastePercentage = totalSleeperVolume > 0 ? (wasteVolume / totalSleeperVolume) * 100 : 0;

                  // Get earliest start time
                  const sortedByTime = [...operations].sort((a: any, b: any) => {
                    const timeA = a.startTime ? new Date(a.startTime).getTime() : 0;
                    const timeB = b.startTime ? new Date(b.startTime).getTime() : 0;
                    return timeA - timeB;
                  });
                  const firstOperation = sortedByTime[0];
                  const startTime = firstOperation?.startTime;
                  const woodType = firstOperation?.woodType || 'Unknown';

                  return (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {/* LOT Summary */}
                      <Paper
                        elevation={0}
                        sx={{
                          border: '2px solid #fee2e2',
                          borderRadius: 2,
                          p: 3,
                          backgroundColor: '#fef2f2'
                        }}
                      >
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#dc2626', mb: 2 }}>
                          LOT Summary
                        </Typography>
                        <Grid container spacing={2}>
                          <Grid item xs={6} sm={4}>
                            <Typography variant="caption" sx={{ color: '#64748b', textTransform: 'uppercase', fontWeight: 600, fontSize: '0.7rem' }}>
                              Wood Type
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: '#1a1a1a', fontSize: '0.95rem' }}>
                              {woodType}
                            </Typography>
                          </Grid>
                          <Grid item xs={6} sm={4}>
                            <Typography variant="caption" sx={{ color: '#64748b', textTransform: 'uppercase', fontWeight: 600, fontSize: '0.7rem' }}>
                              Sleepers Sliced
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: '#1a1a1a', fontSize: '0.95rem' }}>
                              {totalSleepers} sleepers
                            </Typography>
                          </Grid>
                          <Grid item xs={12} sm={4}>
                            <Typography variant="caption" sx={{ color: '#64748b', textTransform: 'uppercase', fontWeight: 600, fontSize: '0.7rem' }}>
                              Started
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: '#1a1a1a', fontSize: '0.95rem' }}>
                              {startTime ? new Date(startTime).toLocaleString() : 'Not started'}
                            </Typography>
                          </Grid>
                        </Grid>
                      </Paper>

                      {/* Volume Statistics */}
                      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        <Paper
                          elevation={0}
                          sx={{
                            flex: 1,
                            minWidth: 200,
                            p: 2.5,
                            borderRadius: 2,
                            backgroundColor: '#eff6ff',
                            border: '2px solid #bfdbfe'
                          }}
                        >
                          <Typography variant="caption" sx={{ color: '#1e40af', fontSize: '0.75rem', fontWeight: 600 }}>
                            TOTAL SLEEPER VOLUME
                          </Typography>
                          <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e40af', mt: 1 }}>
                            {totalSleeperVolume.toFixed(3)} m³
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.7rem' }}>
                            Input material
                          </Typography>
                        </Paper>

                        <Paper
                          elevation={0}
                          sx={{
                            flex: 1,
                            minWidth: 200,
                            p: 2.5,
                            borderRadius: 2,
                            backgroundColor: '#f0fdf4',
                            border: '2px solid #bbf7d0'
                          }}
                        >
                          <Typography variant="caption" sx={{ color: '#15803d', fontSize: '0.75rem', fontWeight: 600 }}>
                            TOTAL PLANK VOLUME
                          </Typography>
                          <Typography variant="h5" sx={{ fontWeight: 700, color: '#15803d', mt: 1 }}>
                            {totalPlankVolume.toFixed(3)} m³
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.7rem' }}>
                            {totalPlanks} planks produced
                          </Typography>
                        </Paper>

                        <Paper
                          elevation={0}
                          sx={{
                            flex: 1,
                            minWidth: 200,
                            p: 2.5,
                            borderRadius: 2,
                            backgroundColor: '#fef2f2',
                            border: '2px solid #fecaca'
                          }}
                        >
                          <Typography variant="caption" sx={{ color: '#dc2626', fontSize: '0.75rem', fontWeight: 600 }}>
                            TOTAL WASTE
                          </Typography>
                          <Typography variant="h5" sx={{ fontWeight: 700, color: '#dc2626', mt: 1 }}>
                            {wastePercentage.toFixed(2)}%
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.7rem' }}>
                            {wasteVolume.toFixed(3)} m³ waste
                          </Typography>
                        </Paper>
                      </Box>
                    </Box>
                  );
                })() : (
                  <Paper elevation={0} sx={{ p: 3, backgroundColor: '#f8fafc', border: '2px dashed #cbd5e1', borderRadius: 2 }}>
                    <Typography variant="body2" sx={{ color: '#94a3b8', fontStyle: 'italic' }}>
                      No slicing operations recorded for this LOT yet
                    </Typography>
                  </Paper>
                )}
              </Box>

              {/* Cost Tracking Section - Admin Only */}
              {user?.role === 'ADMIN' && (
                <Box sx={{ mt: 3 }}>
                  <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    mb: 2,
                    pb: 1.5,
                    borderBottom: '2px solid #16a34a'
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <AttachMoneyIcon sx={{ color: '#16a34a', fontSize: '1.75rem' }} />
                      <Typography variant="h6" sx={{ fontWeight: 700, color: '#16a34a', fontSize: '1.125rem' }}>
                        Cost Tracking
                      </Typography>
                    </Box>
                    {!editingCost ? (
                      <Button
                        size="small"
                        startIcon={<EditIcon />}
                        onClick={() => setEditingCost(true)}
                        sx={{
                          textTransform: 'none',
                          color: '#16a34a',
                          borderColor: '#16a34a',
                          '&:hover': {
                            backgroundColor: '#f0fdf4',
                            borderColor: '#15803d'
                          }
                        }}
                        variant="outlined"
                      >
                        Edit Costs
                      </Button>
                    ) : (
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          size="small"
                          onClick={() => {
                            setEditingCost(false);
                            if (traceabilityData.cost) {
                              setCostData({
                                purchasePrice: traceabilityData.cost.purchasePrice || '',
                                transportPrice: traceabilityData.cost.transportPrice || '',
                                slicingExpenses: traceabilityData.cost.slicingExpenses || '',
                                otherExpenses: traceabilityData.cost.otherExpenses || '',
                                costType: traceabilityData.cost.costType || 'PER_LOT',
                                notes: traceabilityData.cost.notes || ''
                              });
                            }
                          }}
                          sx={{ textTransform: 'none' }}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          onClick={handleSaveCost}
                          sx={{
                            textTransform: 'none',
                            backgroundColor: '#16a34a',
                            '&:hover': {
                              backgroundColor: '#15803d'
                            }
                          }}
                        >
                          Save
                        </Button>
                      </Box>
                    )}
                  </Box>
                  <Paper elevation={0} sx={{ p: 3, backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 2 }}>
                    <Grid container spacing={3}>
                      {/* Purchase Price */}
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Purchase Price"
                          value={costData.purchasePrice}
                          onChange={(e) => setCostData({ ...costData, purchasePrice: e.target.value })}
                          disabled={!editingCost}
                          type="number"
                          InputProps={{
                            startAdornment: <Typography sx={{ mr: 1, color: '#64748b', fontWeight: 600 }}>TZS</Typography>,
                            endAdornment: (
                              <Box sx={{ display: 'flex', gap: 1, ml: 1, pl: 1, borderLeft: '1px solid #e2e8f0' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <Typography variant="caption" sx={{
                                    color: costData.purchasePriceType === 'LUMPSUM' ? '#16a34a' : '#94a3b8',
                                    fontWeight: 600,
                                    fontSize: '0.65rem'
                                  }}>
                                    Per Lot
                                  </Typography>
                                  <Switch
                                    size="small"
                                    checked={costData.purchasePriceType === 'PER_M3'}
                                    onChange={(e) => editingCost && setCostData({ ...costData, purchasePriceType: e.target.checked ? 'PER_M3' : 'LUMPSUM' })}
                                    disabled={!editingCost}
                                    sx={{
                                      width: 34,
                                      height: 18,
                                      p: 0,
                                      '& .MuiSwitch-switchBase': {
                                        padding: 0,
                                        margin: '2px',
                                        '&.Mui-checked': {
                                          transform: 'translateX(16px)',
                                          '& + .MuiSwitch-track': { backgroundColor: '#16a34a' },
                                        },
                                      },
                                      '& .MuiSwitch-thumb': { width: 14, height: 14 },
                                      '& .MuiSwitch-track': { borderRadius: 9 },
                                    }}
                                  />
                                  <Typography variant="caption" sx={{
                                    color: costData.purchasePriceType === 'PER_M3' ? '#16a34a' : '#94a3b8',
                                    fontWeight: 600,
                                    fontSize: '0.65rem'
                                  }}>
                                    Per m³
                                  </Typography>
                                </Box>
                                <Box sx={{ width: '1px', backgroundColor: '#e2e8f0' }} />
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <Typography variant="caption" sx={{
                                    color: !costData.purchasePriceIncVat ? '#16a34a' : '#94a3b8',
                                    fontWeight: 600,
                                    fontSize: '0.65rem'
                                  }}>
                                    Exc VAT
                                  </Typography>
                                  <Switch
                                    size="small"
                                    checked={costData.purchasePriceIncVat || false}
                                    onChange={(e) => editingCost && setCostData({ ...costData, purchasePriceIncVat: e.target.checked })}
                                    disabled={!editingCost}
                                    sx={{
                                      width: 34,
                                      height: 18,
                                      p: 0,
                                      '& .MuiSwitch-switchBase': {
                                        padding: 0,
                                        margin: '2px',
                                        '&.Mui-checked': {
                                          transform: 'translateX(16px)',
                                          '& + .MuiSwitch-track': { backgroundColor: '#16a34a' },
                                        },
                                      },
                                      '& .MuiSwitch-thumb': { width: 14, height: 14 },
                                      '& .MuiSwitch-track': { borderRadius: 9 },
                                    }}
                                  />
                                  <Typography variant="caption" sx={{
                                    color: costData.purchasePriceIncVat ? '#16a34a' : '#94a3b8',
                                    fontWeight: 600,
                                    fontSize: '0.65rem'
                                  }}>
                                    Inc VAT
                                  </Typography>
                                </Box>
                              </Box>
                            )
                          }}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              backgroundColor: '#fff',
                              pr: 1
                            }
                          }}
                        />
                      </Grid>

                      {/* Transport Price */}
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Transport Price"
                          value={costData.transportPrice}
                          onChange={(e) => setCostData({ ...costData, transportPrice: e.target.value })}
                          disabled={!editingCost}
                          type="number"
                          InputProps={{
                            startAdornment: <Typography sx={{ mr: 1, color: '#64748b', fontWeight: 600 }}>TZS</Typography>,
                            endAdornment: (
                              <Box sx={{ display: 'flex', gap: 1, ml: 1, pl: 1, borderLeft: '1px solid #e2e8f0' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <Typography variant="caption" sx={{
                                    color: costData.transportPriceType === 'LUMPSUM' ? '#16a34a' : '#94a3b8',
                                    fontWeight: 600,
                                    fontSize: '0.65rem'
                                  }}>
                                    Per Lot
                                  </Typography>
                                  <Switch
                                    size="small"
                                    checked={costData.transportPriceType === 'PER_M3'}
                                    onChange={(e) => editingCost && setCostData({ ...costData, transportPriceType: e.target.checked ? 'PER_M3' : 'LUMPSUM' })}
                                    disabled={!editingCost}
                                    sx={{
                                      width: 34,
                                      height: 18,
                                      p: 0,
                                      '& .MuiSwitch-switchBase': {
                                        padding: 0,
                                        margin: '2px',
                                        '&.Mui-checked': {
                                          transform: 'translateX(16px)',
                                          '& + .MuiSwitch-track': { backgroundColor: '#16a34a' },
                                        },
                                      },
                                      '& .MuiSwitch-thumb': { width: 14, height: 14 },
                                      '& .MuiSwitch-track': { borderRadius: 9 },
                                    }}
                                  />
                                  <Typography variant="caption" sx={{
                                    color: costData.transportPriceType === 'PER_M3' ? '#16a34a' : '#94a3b8',
                                    fontWeight: 600,
                                    fontSize: '0.65rem'
                                  }}>
                                    Per m³
                                  </Typography>
                                </Box>
                                <Box sx={{ width: '1px', backgroundColor: '#e2e8f0' }} />
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <Typography variant="caption" sx={{
                                    color: !costData.transportPriceIncVat ? '#16a34a' : '#94a3b8',
                                    fontWeight: 600,
                                    fontSize: '0.65rem'
                                  }}>
                                    Exc VAT
                                  </Typography>
                                  <Switch
                                    size="small"
                                    checked={costData.transportPriceIncVat || false}
                                    onChange={(e) => editingCost && setCostData({ ...costData, transportPriceIncVat: e.target.checked })}
                                    disabled={!editingCost}
                                    sx={{
                                      width: 34,
                                      height: 18,
                                      p: 0,
                                      '& .MuiSwitch-switchBase': {
                                        padding: 0,
                                        margin: '2px',
                                        '&.Mui-checked': {
                                          transform: 'translateX(16px)',
                                          '& + .MuiSwitch-track': { backgroundColor: '#16a34a' },
                                        },
                                      },
                                      '& .MuiSwitch-thumb': { width: 14, height: 14 },
                                      '& .MuiSwitch-track': { borderRadius: 9 },
                                    }}
                                  />
                                  <Typography variant="caption" sx={{
                                    color: costData.transportPriceIncVat ? '#16a34a' : '#94a3b8',
                                    fontWeight: 600,
                                    fontSize: '0.65rem'
                                  }}>
                                    Inc VAT
                                  </Typography>
                                </Box>
                              </Box>
                            )
                          }}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              backgroundColor: '#fff',
                              pr: 1
                            }
                          }}
                        />
                      </Grid>

                      {/* Slicing Expenses */}
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Slicing Expenses"
                          value={costData.slicingExpenses}
                          onChange={(e) => setCostData({ ...costData, slicingExpenses: e.target.value })}
                          disabled={!editingCost}
                          type="number"
                          InputProps={{
                            startAdornment: <Typography sx={{ mr: 1, color: '#64748b', fontWeight: 600 }}>TZS</Typography>,
                            endAdornment: (
                              <Box sx={{ display: 'flex', gap: 1, ml: 1, pl: 1, borderLeft: '1px solid #e2e8f0' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <Typography variant="caption" sx={{
                                    color: costData.slicingExpensesType === 'LUMPSUM' ? '#16a34a' : '#94a3b8',
                                    fontWeight: 600,
                                    fontSize: '0.65rem'
                                  }}>
                                    Per Lot
                                  </Typography>
                                  <Switch
                                    size="small"
                                    checked={costData.slicingExpensesType === 'PER_M3'}
                                    onChange={(e) => editingCost && setCostData({ ...costData, slicingExpensesType: e.target.checked ? 'PER_M3' : 'LUMPSUM' })}
                                    disabled={!editingCost}
                                    sx={{
                                      width: 34,
                                      height: 18,
                                      p: 0,
                                      '& .MuiSwitch-switchBase': {
                                        padding: 0,
                                        margin: '2px',
                                        '&.Mui-checked': {
                                          transform: 'translateX(16px)',
                                          '& + .MuiSwitch-track': { backgroundColor: '#16a34a' },
                                        },
                                      },
                                      '& .MuiSwitch-thumb': { width: 14, height: 14 },
                                      '& .MuiSwitch-track': { borderRadius: 9 },
                                    }}
                                  />
                                  <Typography variant="caption" sx={{
                                    color: costData.slicingExpensesType === 'PER_M3' ? '#16a34a' : '#94a3b8',
                                    fontWeight: 600,
                                    fontSize: '0.65rem'
                                  }}>
                                    Per m³
                                  </Typography>
                                </Box>
                                <Box sx={{ width: '1px', backgroundColor: '#e2e8f0' }} />
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <Typography variant="caption" sx={{
                                    color: !costData.slicingExpensesIncVat ? '#16a34a' : '#94a3b8',
                                    fontWeight: 600,
                                    fontSize: '0.65rem'
                                  }}>
                                    Exc VAT
                                  </Typography>
                                  <Switch
                                    size="small"
                                    checked={costData.slicingExpensesIncVat || false}
                                    onChange={(e) => editingCost && setCostData({ ...costData, slicingExpensesIncVat: e.target.checked })}
                                    disabled={!editingCost}
                                    sx={{
                                      width: 34,
                                      height: 18,
                                      p: 0,
                                      '& .MuiSwitch-switchBase': {
                                        padding: 0,
                                        margin: '2px',
                                        '&.Mui-checked': {
                                          transform: 'translateX(16px)',
                                          '& + .MuiSwitch-track': { backgroundColor: '#16a34a' },
                                        },
                                      },
                                      '& .MuiSwitch-thumb': { width: 14, height: 14 },
                                      '& .MuiSwitch-track': { borderRadius: 9 },
                                    }}
                                  />
                                  <Typography variant="caption" sx={{
                                    color: costData.slicingExpensesIncVat ? '#16a34a' : '#94a3b8',
                                    fontWeight: 600,
                                    fontSize: '0.65rem'
                                  }}>
                                    Inc VAT
                                  </Typography>
                                </Box>
                              </Box>
                            )
                          }}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              backgroundColor: '#fff',
                              pr: 1
                            }
                          }}
                        />
                      </Grid>

                      {/* Other Expenses */}
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Other Expenses"
                          value={costData.otherExpenses}
                          onChange={(e) => setCostData({ ...costData, otherExpenses: e.target.value })}
                          disabled={!editingCost}
                          type="number"
                          InputProps={{
                            startAdornment: <Typography sx={{ mr: 1, color: '#64748b', fontWeight: 600 }}>TZS</Typography>,
                            endAdornment: (
                              <Box sx={{ display: 'flex', gap: 1, ml: 1, pl: 1, borderLeft: '1px solid #e2e8f0' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <Typography variant="caption" sx={{
                                    color: costData.otherExpensesType === 'LUMPSUM' ? '#16a34a' : '#94a3b8',
                                    fontWeight: 600,
                                    fontSize: '0.65rem'
                                  }}>
                                    Per Lot
                                  </Typography>
                                  <Switch
                                    size="small"
                                    checked={costData.otherExpensesType === 'PER_M3'}
                                    onChange={(e) => editingCost && setCostData({ ...costData, otherExpensesType: e.target.checked ? 'PER_M3' : 'LUMPSUM' })}
                                    disabled={!editingCost}
                                    sx={{
                                      width: 34,
                                      height: 18,
                                      p: 0,
                                      '& .MuiSwitch-switchBase': {
                                        padding: 0,
                                        margin: '2px',
                                        '&.Mui-checked': {
                                          transform: 'translateX(16px)',
                                          '& + .MuiSwitch-track': { backgroundColor: '#16a34a' },
                                        },
                                      },
                                      '& .MuiSwitch-thumb': { width: 14, height: 14 },
                                      '& .MuiSwitch-track': { borderRadius: 9 },
                                    }}
                                  />
                                  <Typography variant="caption" sx={{
                                    color: costData.otherExpensesType === 'PER_M3' ? '#16a34a' : '#94a3b8',
                                    fontWeight: 600,
                                    fontSize: '0.65rem'
                                  }}>
                                    Per m³
                                  </Typography>
                                </Box>
                                <Box sx={{ width: '1px', backgroundColor: '#e2e8f0' }} />
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <Typography variant="caption" sx={{
                                    color: !costData.otherExpensesIncVat ? '#16a34a' : '#94a3b8',
                                    fontWeight: 600,
                                    fontSize: '0.65rem'
                                  }}>
                                    Exc VAT
                                  </Typography>
                                  <Switch
                                    size="small"
                                    checked={costData.otherExpensesIncVat || false}
                                    onChange={(e) => editingCost && setCostData({ ...costData, otherExpensesIncVat: e.target.checked })}
                                    disabled={!editingCost}
                                    sx={{
                                      width: 34,
                                      height: 18,
                                      p: 0,
                                      '& .MuiSwitch-switchBase': {
                                        padding: 0,
                                        margin: '2px',
                                        '&.Mui-checked': {
                                          transform: 'translateX(16px)',
                                          '& + .MuiSwitch-track': { backgroundColor: '#16a34a' },
                                        },
                                      },
                                      '& .MuiSwitch-thumb': { width: 14, height: 14 },
                                      '& .MuiSwitch-track': { borderRadius: 9 },
                                    }}
                                  />
                                  <Typography variant="caption" sx={{
                                    color: costData.otherExpensesIncVat ? '#16a34a' : '#94a3b8',
                                    fontWeight: 600,
                                    fontSize: '0.65rem'
                                  }}>
                                    Inc VAT
                                  </Typography>
                                </Box>
                              </Box>
                            )
                          }}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              backgroundColor: '#fff',
                              pr: 1
                            }
                          }}
                        />
                      </Grid>

                      {/* Summary Boxes */}
                      <Grid item xs={12}>
                        <Grid container spacing={2}>
                          <Grid item xs={12} md={4}>
                            <Paper elevation={0} sx={{ p: 2, backgroundColor: '#fef3c7', border: '2px solid #fbbf24', borderRadius: 2 }}>
                              <Typography variant="caption" sx={{ color: '#92400e', fontWeight: 600, fontSize: '0.75rem' }}>
                                SUBTOTAL (Excluding VAT)
                              </Typography>
                              <Typography variant="h6" sx={{ fontWeight: 700, color: '#92400e', mt: 0.5 }}>
                                TZS {(() => {
                                  const totalM3 = traceabilityData?.stages?.woodReceipt?.[0]?.actualVolumeM3 || 0;
                                  const purchasePrice = parseFloat(costData.purchasePrice || '0');
                                  const transportPrice = parseFloat(costData.transportPrice || '0');
                                  const slicingExpenses = parseFloat(costData.slicingExpenses || '0');
                                  const otherExpenses = parseFloat(costData.otherExpenses || '0');

                                  // Calculate totals based on Per Lot or Per m³
                                  let purchaseTotal = costData.purchasePriceType === 'PER_M3' ? purchasePrice * totalM3 : purchasePrice;
                                  let transportTotal = costData.transportPriceType === 'PER_M3' ? transportPrice * totalM3 : transportPrice;
                                  let slicingTotal = costData.slicingExpensesType === 'PER_M3' ? slicingExpenses * totalM3 : slicingExpenses;
                                  let otherTotal = costData.otherExpensesType === 'PER_M3' ? otherExpenses * totalM3 : otherExpenses;

                                  // If Inc VAT is checked, extract the base amount (divide by 1.18)
                                  if (costData.purchasePriceIncVat) purchaseTotal = purchaseTotal / 1.18;
                                  if (costData.transportPriceIncVat) transportTotal = transportTotal / 1.18;
                                  if (costData.slicingExpensesIncVat) slicingTotal = slicingTotal / 1.18;
                                  if (costData.otherExpensesIncVat) otherTotal = otherTotal / 1.18;

                                  return (purchaseTotal + transportTotal + slicingTotal + otherTotal).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                })()}
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.7rem' }}>
                                Total for LOT ({(traceabilityData?.stages?.woodReceipt?.[0]?.actualVolumeM3 || 0).toFixed(2)} m³)
                              </Typography>
                            </Paper>
                          </Grid>
                          <Grid item xs={12} md={4}>
                            <Paper elevation={0} sx={{ p: 2, backgroundColor: '#dbeafe', border: '2px solid #3b82f6', borderRadius: 2 }}>
                              <Typography variant="caption" sx={{ color: '#1e40af', fontWeight: 600, fontSize: '0.75rem' }}>
                                VAT (18%)
                              </Typography>
                              <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e40af', mt: 0.5 }}>
                                TZS {(() => {
                                  const totalM3 = traceabilityData?.stages?.woodReceipt?.[0]?.actualVolumeM3 || 0;
                                  const purchasePrice = parseFloat(costData.purchasePrice || '0');
                                  const transportPrice = parseFloat(costData.transportPrice || '0');
                                  const slicingExpenses = parseFloat(costData.slicingExpenses || '0');
                                  const otherExpenses = parseFloat(costData.otherExpenses || '0');

                                  // Calculate totals based on Per Lot or Per m³
                                  let purchaseTotal = costData.purchasePriceType === 'PER_M3' ? purchasePrice * totalM3 : purchasePrice;
                                  let transportTotal = costData.transportPriceType === 'PER_M3' ? transportPrice * totalM3 : transportPrice;
                                  let slicingTotal = costData.slicingExpensesType === 'PER_M3' ? slicingExpenses * totalM3 : slicingExpenses;
                                  let otherTotal = costData.otherExpensesType === 'PER_M3' ? otherExpenses * totalM3 : otherExpenses;

                                  // If Inc VAT is checked, extract the base amount (divide by 1.18)
                                  if (costData.purchasePriceIncVat) purchaseTotal = purchaseTotal / 1.18;
                                  if (costData.transportPriceIncVat) transportTotal = transportTotal / 1.18;
                                  if (costData.slicingExpensesIncVat) slicingTotal = slicingTotal / 1.18;
                                  if (costData.otherExpensesIncVat) otherTotal = otherTotal / 1.18;

                                  const subtotal = purchaseTotal + transportTotal + slicingTotal + otherTotal;
                                  return (subtotal * 0.18).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                })()}
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.7rem' }}>
                                18% of subtotal
                              </Typography>
                            </Paper>
                          </Grid>
                          <Grid item xs={12} md={4}>
                            <Paper elevation={0} sx={{ p: 2, backgroundColor: '#dcfce7', border: '2px solid #16a34a', borderRadius: 2 }}>
                              <Typography variant="caption" sx={{ color: '#15803d', fontWeight: 600, fontSize: '0.75rem' }}>
                                TOTAL (Including VAT)
                              </Typography>
                              <Typography variant="h6" sx={{ fontWeight: 700, color: '#15803d', mt: 0.5 }}>
                                TZS {(() => {
                                  const totalM3 = traceabilityData?.stages?.woodReceipt?.[0]?.actualVolumeM3 || 0;
                                  const purchasePrice = parseFloat(costData.purchasePrice || '0');
                                  const transportPrice = parseFloat(costData.transportPrice || '0');
                                  const slicingExpenses = parseFloat(costData.slicingExpenses || '0');
                                  const otherExpenses = parseFloat(costData.otherExpenses || '0');

                                  // Calculate totals based on Per Lot or Per m³
                                  let purchaseTotal = costData.purchasePriceType === 'PER_M3' ? purchasePrice * totalM3 : purchasePrice;
                                  let transportTotal = costData.transportPriceType === 'PER_M3' ? transportPrice * totalM3 : transportPrice;
                                  let slicingTotal = costData.slicingExpensesType === 'PER_M3' ? slicingExpenses * totalM3 : slicingExpenses;
                                  let otherTotal = costData.otherExpensesType === 'PER_M3' ? otherExpenses * totalM3 : otherExpenses;

                                  // If Inc VAT is checked, extract the base amount (divide by 1.18)
                                  if (costData.purchasePriceIncVat) purchaseTotal = purchaseTotal / 1.18;
                                  if (costData.transportPriceIncVat) transportTotal = transportTotal / 1.18;
                                  if (costData.slicingExpensesIncVat) slicingTotal = slicingTotal / 1.18;
                                  if (costData.otherExpensesIncVat) otherTotal = otherTotal / 1.18;

                                  const subtotal = purchaseTotal + transportTotal + slicingTotal + otherTotal;
                                  return (subtotal * 1.18).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                })()}
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.7rem' }}>
                                Grand total for LOT
                              </Typography>
                            </Paper>
                          </Grid>
                        </Grid>
                      </Grid>

                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          multiline
                          rows={2}
                          label="Notes"
                          value={costData.notes}
                          onChange={(e) => setCostData({ ...costData, notes: e.target.value })}
                          disabled={!editingCost}
                          placeholder="Additional notes about costs..."
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              backgroundColor: '#fff'
                            }
                          }}
                        />
                      </Grid>

                    </Grid>
                  </Paper>
                </Box>
              )}
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, display: 'flex', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              startIcon={<PictureAsPdfIcon />}
              onClick={generateLotCostingPDF}
              sx={{
                textTransform: 'none',
                color: '#dc2626',
                borderColor: '#dc2626',
                fontSize: '0.875rem',
                fontWeight: 500,
                px: 3,
                py: 1,
                '&:hover': {
                  backgroundColor: '#fef2f2',
                  borderColor: '#b91c1c'
                }
              }}
              variant="outlined"
            >
              Generate PDF
            </Button>
            <Button
              startIcon={<SendIcon />}
              onClick={handleOpenNotificationDialog}
              sx={{
                textTransform: 'none',
                color: '#2563eb',
                borderColor: '#2563eb',
                fontSize: '0.875rem',
                fontWeight: 500,
                px: 3,
                py: 1,
                '&:hover': {
                  backgroundColor: '#eff6ff',
                  borderColor: '#1d4ed8'
                }
              }}
              variant="outlined"
            >
              Send Notification
            </Button>
          </Box>
          <Button
            onClick={() => setTraceabilityDialogOpen(false)}
            sx={{
              backgroundColor: '#dc2626',
              color: '#fff',
              textTransform: 'none',
              fontSize: '0.875rem',
              fontWeight: 500,
              px: 3,
              py: 1,
              '&:hover': {
                backgroundColor: '#b91c1c',
              }
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notification Dialog */}
      <Dialog
        open={notificationDialogOpen}
        onClose={() => setNotificationDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Send Notification
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Select users to notify about LOT {traceabilityData?.lotNumber}
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          {loadingUsers ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress size={32} />
            </Box>
          ) : users.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
              No users available
            </Typography>
          ) : (
            <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
              {users.map((user) => (
                <ListItem
                  key={user.id}
                  disablePadding
                >
                  <ListItemButton
                    onClick={() => handleToggleUser(user.id)}
                    dense
                  >
                    <Checkbox
                      edge="start"
                      checked={selectedUsers.includes(user.id)}
                      tabIndex={-1}
                      disableRipple
                      sx={{ mr: 1 }}
                    />
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: '#dc2626' }}>
                        {user.firstName?.[0]}{user.lastName?.[0]}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={`${user.firstName} ${user.lastName}`}
                      secondary={`${user.email} • ${user.role}`}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setNotificationDialogOpen(false);
              setSelectedUsers([]);
            }}
            disabled={sendingNotification}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSendNotification}
            variant="contained"
            disabled={sendingNotification || selectedUsers.length === 0}
            sx={{
              bgcolor: '#dc2626',
              '&:hover': {
                bgcolor: '#b91c1c'
              }
            }}
          >
            {sendingNotification ? (
              <>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                Sending...
              </>
            ) : (
              `Send to ${selectedUsers.length} user${selectedUsers.length !== 1 ? 's' : ''}`
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </StyledContainer>
  );
};

export default WoodReceipt; 