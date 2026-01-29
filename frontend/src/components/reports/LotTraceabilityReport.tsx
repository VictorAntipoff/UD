import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import logo from '../../assets/images/logo.png';

const APP_NAME = 'U Design';
const APP_VERSION = 'v1.0.0';

// Interfaces
interface WoodReceipt {
  id: string;
  woodType: string;
  supplier: string;
  receiptDate: string;
  purchaseOrder?: string;
  status: string;
  woodFormat?: string;
  estimatedVolumeM3?: number;
  estimatedPieces?: number;
  actualVolumeM3?: number;
  actualPieces?: number;
  paidVolumeM3?: number;
  paidPieces?: number;
  complimentaryVolumeM3?: number;
  complimentaryPieces?: number;
  measurements?: Measurement[];
}

interface Measurement {
  thickness: number;
  width: number;
  length: number;
  qty: number;
  volumeM3?: number;
  isComplimentary?: boolean;
}

interface SlicingOperation {
  id?: string;
  startTime?: string;
  endTime?: string;
  status: string;
}

interface DryingProcess {
  batchNumber?: string;
  startDate?: string;
  endDate?: string;
  status: string;
}

interface HistoryItem {
  timestamp: string;
  userName: string;
  action: string;
  details?: string;
}

interface CostData {
  purchasePrice?: string;
  purchasePriceType?: string;
  purchasePriceIncVat?: boolean;
  transportPrice?: string;
  transportPriceType?: string;
  transportPriceIncVat?: boolean;
  slicingExpenses?: string;
  slicingExpensesType?: string;
  slicingExpensesIncVat?: boolean;
  otherExpenses?: string;
  otherExpensesType?: string;
  otherExpensesIncVat?: boolean;
  notes?: string;
}

interface LotTraceabilityReportProps {
  lotNumber: string;
  woodReceipts: WoodReceipt[];
  slicingOperations?: SlicingOperation[];
  dryingProcesses?: DryingProcess[];
  history?: HistoryItem[];
  costData?: CostData;
  user: {
    email: string;
    name?: string;
  };
  timestamp: string;
}

const styles = StyleSheet.create({
  page: {
    padding: '25 30',
    fontFamily: 'Helvetica',
    fontSize: 8,
    color: '#2c3e50'
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  headerLeft: {
    flex: 1
  },
  headerRight: {
    alignItems: 'flex-end'
  },
  logo: {
    width: 80,
    marginBottom: 4
  },
  title: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#dc2626',
    marginBottom: 2
  },
  subtitle: {
    fontSize: 7,
    color: '#64748b'
  },
  headerMeta: {
    fontSize: 7,
    color: '#64748b',
    textAlign: 'right',
    marginBottom: 2
  },
  // LOT Info Card - Two column layout
  lotInfoCard: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
    padding: 12,
    marginBottom: 12
  },
  lotInfoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  lotNumber: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b'
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4
  },
  statusText: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold'
  },
  lotInfoGrid: {
    flexDirection: 'row'
  },
  lotInfoColumn: {
    flex: 1
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 6,
    alignItems: 'flex-start'
  },
  infoLabel: {
    width: 75,
    fontSize: 7.5,
    color: '#64748b',
    paddingTop: 1
  },
  infoValueContainer: {
    flex: 1,
    flexDirection: 'column'
  },
  infoValue: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b'
  },
  infoSubtext: {
    fontSize: 6,
    color: '#64748b',
    marginTop: 2
  },
  // Section styles
  section: {
    marginBottom: 10
  },
  sectionTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b',
    backgroundColor: '#f1f5f9',
    padding: '5 8',
    borderRadius: 3,
    marginBottom: 6
  },
  // Table styles
  table: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 3
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    padding: '5 6',
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#475569'
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e2e8f0',
    padding: '4 6',
    fontSize: 7
  },
  tableCell: {
    flex: 1
  },
  // Cost Summary boxes
  costSummaryRow: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 6
  },
  summaryBox: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
    padding: 8
  },
  summaryBoxRed: {
    flex: 1,
    backgroundColor: '#dc2626',
    borderRadius: 4,
    padding: 8
  },
  summaryLabel: {
    fontSize: 6.5,
    color: '#64748b',
    marginBottom: 2
  },
  summaryLabelWhite: {
    fontSize: 6.5,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 2
  },
  summaryValue: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b'
  },
  summaryValueWhite: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff'
  },
  // Highlight boxes
  priceBox: {
    marginTop: 8,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#3b82f6',
    borderRadius: 4,
    padding: 10,
    alignItems: 'center'
  },
  priceLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#1e40af',
    marginBottom: 2
  },
  priceValue: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#2563eb'
  },
  priceNote: {
    fontSize: 6,
    color: '#64748b',
    marginTop: 2
  },
  complimentaryBox: {
    marginTop: 6,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#22c55e',
    borderRadius: 4,
    padding: 10,
    alignItems: 'center'
  },
  complimentaryLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#166534',
    marginBottom: 2
  },
  complimentaryValue: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#16a34a'
  },
  // Notes
  notesBox: {
    marginTop: 6,
    backgroundColor: '#fefce8',
    borderWidth: 1,
    borderColor: '#fde047',
    borderRadius: 3,
    padding: 8
  },
  notesLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#854d0e',
    marginBottom: 3
  },
  notesText: {
    fontSize: 7,
    color: '#713f12'
  },
  // History
  historyItem: {
    flexDirection: 'row',
    padding: '4 6',
    borderBottomWidth: 0.5,
    borderBottomColor: '#f1f5f9',
    alignItems: 'flex-start'
  },
  historyAction: {
    width: 90,
    fontSize: 6.5,
    color: '#1e293b'
  },
  historyUser: {
    width: 120,
    fontSize: 6.5,
    color: '#64748b'
  },
  historyDate: {
    width: 100,
    fontSize: 6.5,
    color: '#64748b'
  },
  historyDetails: {
    flex: 1,
    fontSize: 6.5,
    color: '#64748b',
    fontStyle: 'italic'
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 30,
    right: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0'
  },
  footerText: {
    fontSize: 6.5,
    color: '#94a3b8'
  },
  footerBrand: {
    fontSize: 6.5,
    color: '#94a3b8'
  },
  vixText: {
    color: '#dc2626'
  }
});

const formatCurrency = (amount: number): string => {
  return `TZS ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDate = (date: string): string => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const formatDateTime = (date: string): string => {
  return new Date(date).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getStatusStyle = (status: string) => {
  switch (status) {
    case 'COMPLETED':
      return { backgroundColor: '#dcfce7', color: '#166534' };
    case 'PENDING':
    case 'CREATED':
    case 'PENDING_APPROVAL':
      return { backgroundColor: '#fef3c7', color: '#92400e' };
    case 'IN_PROGRESS':
    case 'PROCESSING':
      return { backgroundColor: '#dbeafe', color: '#1e40af' };
    default:
      return { backgroundColor: '#f3f4f6', color: '#374151' };
  }
};

export const LotTraceabilityReport: React.FC<LotTraceabilityReportProps> = ({
  lotNumber,
  woodReceipts,
  slicingOperations = [],
  dryingProcesses = [],
  history = [],
  costData,
  user,
  timestamp
}) => {
  // Get primary receipt info
  const primaryReceipt = woodReceipts[0] || {};
  const woodType = primaryReceipt.woodType || 'N/A';
  const supplier = primaryReceipt.supplier || 'N/A';
  const receiptDate = primaryReceipt.receiptDate;
  const status = primaryReceipt.status || 'N/A';
  const statusStyle = getStatusStyle(status);

  // Volume calculations
  const totalM3 = Math.round((primaryReceipt.actualVolumeM3 || 0) * 10000) / 10000;
  const paidM3 = Math.round((primaryReceipt.paidVolumeM3 || primaryReceipt.actualVolumeM3 || 0) * 10000) / 10000;
  const complimentaryM3 = Math.round((primaryReceipt.complimentaryVolumeM3 || 0) * 10000) / 10000;
  const totalPieces = primaryReceipt.actualPieces || 0;
  const paidPieces = primaryReceipt.paidPieces || totalPieces;
  const complimentaryPieces = primaryReceipt.complimentaryPieces || 0;

  // Cost calculations
  const hasCostData = costData && (costData.purchasePrice || costData.transportPrice ||
    costData.slicingExpenses || costData.otherExpenses);

  let subtotal = 0;
  let purchaseTotal = 0;
  let transportTotal = 0;
  let slicingTotal = 0;
  let otherTotal = 0;

  if (hasCostData && costData) {
    const purchasePrice = parseFloat(costData.purchasePrice || '0');
    const transportPrice = parseFloat(costData.transportPrice || '0');
    const slicingExpenses = parseFloat(costData.slicingExpenses || '0');
    const otherExpenses = parseFloat(costData.otherExpenses || '0');

    purchaseTotal = costData.purchasePriceType === 'PER_M3' ? purchasePrice * paidM3 : purchasePrice;
    transportTotal = costData.transportPriceType === 'PER_M3' ? transportPrice * totalM3 : transportPrice;
    slicingTotal = costData.slicingExpensesType === 'PER_M3' ? slicingExpenses * totalM3 : slicingExpenses;
    otherTotal = costData.otherExpensesType === 'PER_M3' ? otherExpenses * totalM3 : otherExpenses;

    if (costData.purchasePriceIncVat) purchaseTotal = purchaseTotal / 1.18;
    if (costData.transportPriceIncVat) transportTotal = transportTotal / 1.18;
    if (costData.slicingExpensesIncVat) slicingTotal = slicingTotal / 1.18;
    if (costData.otherExpensesIncVat) otherTotal = otherTotal / 1.18;

    subtotal = purchaseTotal + transportTotal + slicingTotal + otherTotal;
  }

  const vat = subtotal * 0.18;
  const total = subtotal + vat;
  const pricePerM3 = totalM3 > 0 ? total / totalM3 : 0;

  // Calculate complimentary value
  let complimentaryValue = 0;
  if (complimentaryM3 > 0 && costData?.purchasePrice) {
    const purchasePrice = parseFloat(costData.purchasePrice);
    complimentaryValue = costData.purchasePriceType === 'PER_M3' ? purchasePrice * complimentaryM3 : 0;
    if (costData.purchasePriceIncVat) complimentaryValue = complimentaryValue / 1.18;
  }
  const complimentaryValueWithVat = complimentaryValue * 1.18;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header} fixed>
          <View style={styles.headerLeft}>
            <Image src={logo} style={styles.logo} />
            <Text style={styles.title}>LOT Traceability Report</Text>
            <Text style={styles.subtitle}>Professional Wood Solutions</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.headerMeta}>Generated: {new Date(timestamp).toLocaleString()}</Text>
            <Text style={styles.headerMeta}>By: {user.name || user.email}</Text>
            <Text style={styles.headerMeta}>{APP_VERSION}</Text>
          </View>
        </View>

        {/* LOT Information Card - Keep together */}
        <View style={styles.lotInfoCard} wrap={false}>
          {/* Card Header */}
          <View style={styles.lotInfoHeader}>
            <Text style={styles.lotNumber}>{lotNumber}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusStyle.backgroundColor }]}>
              <Text style={[styles.statusText, { color: statusStyle.color }]}>
                {status.replace(/_/g, ' ')}
              </Text>
            </View>
          </View>

          {/* Two Column Grid */}
          <View style={styles.lotInfoGrid}>
            {/* Left Column */}
            <View style={styles.lotInfoColumn}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Wood Type:</Text>
                <Text style={styles.infoValue}>{woodType}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Supplier:</Text>
                <Text style={styles.infoValue}>{supplier}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Receipt Date:</Text>
                <Text style={styles.infoValue}>{receiptDate ? formatDate(receiptDate) : 'N/A'}</Text>
              </View>
            </View>

            {/* Right Column */}
            <View style={styles.lotInfoColumn}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Total Volume:</Text>
                <View style={styles.infoValueContainer}>
                  <Text style={styles.infoValue}>{totalM3.toFixed(4)} m³</Text>
                  {complimentaryM3 > 0 && (
                    <Text style={styles.infoSubtext}>
                      Paid: {paidM3.toFixed(4)} m³ | Free: {complimentaryM3.toFixed(4)} m³
                    </Text>
                  )}
                </View>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Total Pieces:</Text>
                <View style={styles.infoValueContainer}>
                  <Text style={styles.infoValue}>{totalPieces} pcs</Text>
                  {complimentaryPieces > 0 && (
                    <Text style={styles.infoSubtext}>
                      Paid: {paidPieces} pcs | Free: {complimentaryPieces} pcs
                    </Text>
                  )}
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Wood Receipt Details Table */}
        {woodReceipts.length > 0 && (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>Wood Receipt Details</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableCell, { flex: 1.2 }]}>Wood Type</Text>
                <Text style={[styles.tableCell, { flex: 1.2 }]}>Supplier</Text>
                <Text style={styles.tableCell}>Date</Text>
                <Text style={[styles.tableCell, { flex: 0.8 }]}>Est. Vol</Text>
                <Text style={[styles.tableCell, { flex: 0.8 }]}>Act. Vol</Text>
                <Text style={[styles.tableCell, { flex: 1.2 }]}>Status</Text>
              </View>
              {woodReceipts.map((receipt, index) => (
                <View key={receipt.id || index} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { flex: 1.2 }]}>{receipt.woodType}</Text>
                  <Text style={[styles.tableCell, { flex: 1.2 }]}>{receipt.supplier}</Text>
                  <Text style={styles.tableCell}>{receipt.receiptDate ? formatDate(receipt.receiptDate) : 'N/A'}</Text>
                  <Text style={[styles.tableCell, { flex: 0.8 }]}>{receipt.estimatedVolumeM3?.toFixed(4) || 'N/A'}</Text>
                  <Text style={[styles.tableCell, { flex: 0.8 }]}>{receipt.actualVolumeM3?.toFixed(4) || 'N/A'}</Text>
                  <Text style={[styles.tableCell, { flex: 1.2 }]}>{receipt.status.replace(/_/g, ' ')}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Measurements - Limit to first 20 rows */}
        {primaryReceipt.measurements && primaryReceipt.measurements.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {primaryReceipt.woodFormat === 'PLANKS' ? 'Plank' : 'Sleeper'} Measurements ({primaryReceipt.measurements.length} items)
            </Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableCell, { flex: 0.4 }]}>#</Text>
                <Text style={styles.tableCell}>Thickness</Text>
                <Text style={styles.tableCell}>Width</Text>
                <Text style={styles.tableCell}>Length</Text>
                <Text style={[styles.tableCell, { flex: 0.6 }]}>Qty</Text>
                <Text style={styles.tableCell}>Volume</Text>
                {primaryReceipt.measurements.some(m => m.isComplimentary) && (
                  <Text style={[styles.tableCell, { flex: 0.5 }]}>Type</Text>
                )}
              </View>
              {primaryReceipt.measurements.slice(0, 20).map((m, index) => (
                <View key={index} style={[styles.tableRow, m.isComplimentary ? { backgroundColor: '#f0fdf4' } : {}]}>
                  <Text style={[styles.tableCell, { flex: 0.4 }]}>{index + 1}</Text>
                  <Text style={styles.tableCell}>{m.thickness}"</Text>
                  <Text style={styles.tableCell}>{m.width}"</Text>
                  <Text style={styles.tableCell}>{m.length}'</Text>
                  <Text style={[styles.tableCell, { flex: 0.6 }]}>{m.qty}</Text>
                  <Text style={styles.tableCell}>{(m.volumeM3 || 0).toFixed(4)}</Text>
                  {primaryReceipt.measurements!.some(m => m.isComplimentary) && (
                    <Text style={[styles.tableCell, { flex: 0.5, color: m.isComplimentary ? '#16a34a' : '#64748b' }]}>
                      {m.isComplimentary ? 'FREE' : 'Paid'}
                    </Text>
                  )}
                </View>
              ))}
              {primaryReceipt.measurements.length > 20 && (
                <View style={[styles.tableRow, { backgroundColor: '#f8fafc' }]}>
                  <Text style={{ fontSize: 6.5, color: '#64748b', fontStyle: 'italic' }}>
                    ... and {primaryReceipt.measurements.length - 20} more measurements (see full report in system)
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Slicing Operations */}
        {slicingOperations.length > 0 && (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>Slicing Operations</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={styles.tableCell}>Serial</Text>
                <Text style={[styles.tableCell, { flex: 1.5 }]}>Start</Text>
                <Text style={[styles.tableCell, { flex: 1.5 }]}>End</Text>
                <Text style={styles.tableCell}>Status</Text>
              </View>
              {slicingOperations.map((op, index) => (
                <View key={op.id || index} style={styles.tableRow}>
                  <Text style={styles.tableCell}>OP-{String(index + 1).padStart(3, '0')}</Text>
                  <Text style={[styles.tableCell, { flex: 1.5 }]}>{op.startTime ? formatDateTime(op.startTime) : 'N/A'}</Text>
                  <Text style={[styles.tableCell, { flex: 1.5 }]}>{op.endTime ? formatDateTime(op.endTime) : 'In Progress'}</Text>
                  <Text style={styles.tableCell}>{op.status}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Drying Processes */}
        {dryingProcesses.length > 0 && (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>Drying Processes</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={styles.tableCell}>Batch</Text>
                <Text style={[styles.tableCell, { flex: 1.5 }]}>Start</Text>
                <Text style={[styles.tableCell, { flex: 1.5 }]}>End</Text>
                <Text style={styles.tableCell}>Status</Text>
              </View>
              {dryingProcesses.map((batch, index) => (
                <View key={index} style={styles.tableRow}>
                  <Text style={styles.tableCell}>{batch.batchNumber || 'N/A'}</Text>
                  <Text style={[styles.tableCell, { flex: 1.5 }]}>{batch.startDate ? formatDateTime(batch.startDate) : 'N/A'}</Text>
                  <Text style={[styles.tableCell, { flex: 1.5 }]}>{batch.endDate ? formatDateTime(batch.endDate) : 'In Progress'}</Text>
                  <Text style={styles.tableCell}>{batch.status}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Activity History */}
        {history.length > 0 && (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>Activity History (Last 5)</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={styles.historyAction}>Action</Text>
                <Text style={styles.historyUser}>User</Text>
                <Text style={styles.historyDate}>Date</Text>
                <Text style={[styles.historyDetails, { fontStyle: 'normal' }]}>Details</Text>
              </View>
              {history.slice(-5).map((item, index) => (
                <View key={index} style={styles.historyItem}>
                  <Text style={styles.historyAction}>{item.action.replace(/_/g, ' ')}</Text>
                  <Text style={styles.historyUser}>{item.userName}</Text>
                  <Text style={styles.historyDate}>{formatDateTime(item.timestamp)}</Text>
                  <Text style={styles.historyDetails}>{item.details || '-'}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Cost Breakdown - Keep together */}
        {hasCostData && costData && (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>Cost Breakdown</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableCell, { flex: 1.5 }]}>Item</Text>
                <Text style={styles.tableCell}>Unit Price</Text>
                <Text style={[styles.tableCell, { flex: 0.6 }]}>Type</Text>
                <Text style={[styles.tableCell, { flex: 0.5 }]}>VAT</Text>
                <Text style={styles.tableCell}>Total (Exc VAT)</Text>
              </View>

              {costData.purchasePrice && (
                <View style={styles.tableRow}>
                  <Text style={[styles.tableCell, { flex: 1.5 }]}>Purchase Price</Text>
                  <Text style={styles.tableCell}>{formatCurrency(parseFloat(costData.purchasePrice))}</Text>
                  <Text style={[styles.tableCell, { flex: 0.6 }]}>
                    {costData.purchasePriceType === 'PER_M3' ? 'Per m³' : 'Per Lot'}
                  </Text>
                  <Text style={[styles.tableCell, { flex: 0.5 }]}>{costData.purchasePriceIncVat ? 'Inc' : 'Exc'}</Text>
                  <Text style={styles.tableCell}>{formatCurrency(purchaseTotal)}</Text>
                </View>
              )}

              {costData.transportPrice && (
                <View style={styles.tableRow}>
                  <Text style={[styles.tableCell, { flex: 1.5 }]}>Transport Price</Text>
                  <Text style={styles.tableCell}>{formatCurrency(parseFloat(costData.transportPrice))}</Text>
                  <Text style={[styles.tableCell, { flex: 0.6 }]}>{costData.transportPriceType === 'PER_M3' ? 'Per m³' : 'Per Lot'}</Text>
                  <Text style={[styles.tableCell, { flex: 0.5 }]}>{costData.transportPriceIncVat ? 'Inc' : 'Exc'}</Text>
                  <Text style={styles.tableCell}>{formatCurrency(transportTotal)}</Text>
                </View>
              )}

              {costData.slicingExpenses && (
                <View style={styles.tableRow}>
                  <Text style={[styles.tableCell, { flex: 1.5 }]}>Slicing Expenses</Text>
                  <Text style={styles.tableCell}>{formatCurrency(parseFloat(costData.slicingExpenses))}</Text>
                  <Text style={[styles.tableCell, { flex: 0.6 }]}>{costData.slicingExpensesType === 'PER_M3' ? 'Per m³' : 'Per Lot'}</Text>
                  <Text style={[styles.tableCell, { flex: 0.5 }]}>{costData.slicingExpensesIncVat ? 'Inc' : 'Exc'}</Text>
                  <Text style={styles.tableCell}>{formatCurrency(slicingTotal)}</Text>
                </View>
              )}

              {costData.otherExpenses && (
                <View style={styles.tableRow}>
                  <Text style={[styles.tableCell, { flex: 1.5 }]}>Other Expenses</Text>
                  <Text style={styles.tableCell}>{formatCurrency(parseFloat(costData.otherExpenses))}</Text>
                  <Text style={[styles.tableCell, { flex: 0.6 }]}>{costData.otherExpensesType === 'PER_M3' ? 'Per m³' : 'Per Lot'}</Text>
                  <Text style={[styles.tableCell, { flex: 0.5 }]}>{costData.otherExpensesIncVat ? 'Inc' : 'Exc'}</Text>
                  <Text style={styles.tableCell}>{formatCurrency(otherTotal)}</Text>
                </View>
              )}
            </View>

            {/* Summary Boxes */}
            <View style={styles.costSummaryRow}>
              <View style={styles.summaryBox}>
                <Text style={styles.summaryLabel}>Subtotal (Exc VAT)</Text>
                <Text style={styles.summaryValue}>{formatCurrency(subtotal)}</Text>
              </View>
              <View style={styles.summaryBox}>
                <Text style={styles.summaryLabel}>VAT (18%)</Text>
                <Text style={styles.summaryValue}>{formatCurrency(vat)}</Text>
              </View>
              <View style={styles.summaryBoxRed}>
                <Text style={styles.summaryLabelWhite}>TOTAL (Inc VAT)</Text>
                <Text style={styles.summaryValueWhite}>{formatCurrency(total)}</Text>
              </View>
            </View>

            {/* Price per m³ */}
            {totalM3 > 0 && (
              <View style={styles.priceBox}>
                <Text style={styles.priceLabel}>PRICE PER M³</Text>
                <Text style={styles.priceValue}>{formatCurrency(pricePerM3)}</Text>
                <Text style={styles.priceNote}>Total cost ÷ {totalM3.toFixed(4)} m³</Text>
              </View>
            )}

            {/* Complimentary Wood Value */}
            {complimentaryM3 > 0 && (
              <View style={styles.complimentaryBox}>
                <Text style={styles.complimentaryLabel}>COMPLIMENTARY WOOD VALUE</Text>
                <Text style={styles.complimentaryValue}>{formatCurrency(complimentaryValueWithVat)}</Text>
                <Text style={styles.priceNote}>
                  {complimentaryM3.toFixed(4)} m³ × {complimentaryPieces} pcs (bonus from supplier)
                </Text>
              </View>
            )}

            {/* Notes */}
            {costData.notes && (
              <View style={styles.notesBox}>
                <Text style={styles.notesLabel}>Notes:</Text>
                <Text style={styles.notesText}>{costData.notes}</Text>
              </View>
            )}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>This is a computer-generated document. No signature required.</Text>
          <Text style={styles.footerBrand}>
            {APP_NAME} {APP_VERSION} • Developed by <Text style={styles.vixText}>Vix</Text>
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export default LotTraceabilityReport;
