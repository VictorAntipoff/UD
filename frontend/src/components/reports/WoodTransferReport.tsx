import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import logo from '../../assets/images/logo.png';

const APP_NAME = 'U Design';
const APP_VERSION = 'v1.0.0';

interface Warehouse {
  id: string;
  name: string;
  code: string;
}

interface WoodType {
  id: string;
  name: string;
}

interface User {
  id: string;
  email: string;
  user_metadata?: {
    full_name?: string;
  };
}

interface TransferItem {
  id: string;
  woodType: WoodType;
  thickness: string;
  quantity: number;
  woodStatus: string;
  remarks: string | null;
}

interface WoodTransfer {
  id: string;
  transferNumber: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  status: string;
  transferDate: string;
  notes: string | null;
  createdAt: string;
  approvedAt: string | null;
  completedAt: string | null;
  fromWarehouse: Warehouse;
  toWarehouse: Warehouse;
  items: TransferItem[];
  createdBy: User;
  approvedBy: User | null;
}

interface WoodTransferReportProps {
  transfer: WoodTransfer;
  timestamp: string;
  user: {
    email: string;
    name: string;
  };
}

const styles = StyleSheet.create({
  page: {
    padding: '40 60',
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#2c3e50'
  },
  header: {
    marginBottom: 20,
    borderBottom: 1,
    borderColor: '#e2e8f0',
    paddingBottom: 15
  },
  logo: {
    width: 90,
    marginBottom: 6
  },
  title: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 3
  },
  subtitle: {
    fontSize: 8,
    color: '#64748b',
    marginBottom: 10
  },
  metadata: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 7,
    color: '#64748b'
  },
  section: {
    marginBottom: 15
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#2c3e50',
    marginBottom: 6,
    backgroundColor: '#f8fafc',
    padding: '5 7',
    borderRadius: 4
  },
  infoBox: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'solid',
    borderRadius: 4,
    padding: 10,
    marginBottom: 10
  },
  row: {
    flexDirection: 'row',
    marginBottom: 3,
    fontSize: 8
  },
  label: {
    width: '40%',
    color: '#64748b',
    fontSize: 8
  },
  value: {
    width: '60%',
    color: '#2c3e50',
    fontSize: 8,
    fontFamily: 'Helvetica-Bold'
  },
  routeBox: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'solid',
    borderRadius: 4,
    padding: 10,
    marginBottom: 10,
    alignItems: 'center'
  },
  routeText: {
    fontSize: 10,
    color: '#2c3e50',
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center'
  },
  arrow: {
    fontSize: 12,
    color: '#64748b',
    marginVertical: 3
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 3,
    marginBottom: 10
  },
  statusText: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold'
  },
  notes: {
    padding: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 4
  },
  notesText: {
    fontSize: 8,
    color: '#2c3e50'
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 60,
    right: 60,
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0'
  },
  vixText: {
    color: '#dc2626'
  },
  table: {
    marginTop: 10
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderBottomColor: '#e2e8f0',
    borderBottomWidth: 1,
    padding: '7 5',
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#64748b'
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomColor: '#e2e8f0',
    borderBottomWidth: 1,
    padding: '7 5',
    fontSize: 8
  },
  colItem: {
    width: '10%'
  },
  colWoodType: {
    width: '25%'
  },
  colThickness: {
    width: '15%'
  },
  colQuantity: {
    width: '15%'
  },
  colStatus: {
    width: '15%'
  },
  colRemarks: {
    width: '20%'
  },
  inTransitBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 3,
    backgroundColor: '#dbeafe'
  },
  inTransitBadgeText: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#1e40af'
  },
});

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'PENDING':
      return 'Pending Approval';
    case 'APPROVED':
      return 'Approved';
    case 'REJECTED':
      return 'Rejected';
    case 'IN_TRANSIT':
      return 'In Transit';
    case 'COMPLETED':
      return 'Completed';
    default:
      return status;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'PENDING':
      return { backgroundColor: '#fef3c7', color: '#92400e' };
    case 'APPROVED':
      return { backgroundColor: '#d1fae5', color: '#065f46' };
    case 'REJECTED':
      return { backgroundColor: '#fee2e2', color: '#991b1b' };
    case 'IN_TRANSIT':
      return { backgroundColor: '#e0e7ff', color: '#3730a3' };
    case 'COMPLETED':
      return { backgroundColor: '#dbeafe', color: '#1e40af' };
    default:
      return { backgroundColor: '#f3f4f6', color: '#374151' };
  }
};

const getWoodStatusLabel = (status: string) => {
  switch (status) {
    case 'NOT_DRIED':
      return 'Not Dried';
    case 'DRYING':
      return 'Drying';
    case 'DRIED':
      return 'Dried';
    default:
      return status;
  }
};

const getUserDisplay = (user: User | null) => {
  if (!user) return 'N/A';
  return user.user_metadata?.full_name || user.email;
};

export const WoodTransferReport: React.FC<WoodTransferReportProps> = ({
  transfer,
  timestamp,
  user,
}) => {
  const statusStyle = getStatusColor(transfer.status);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Image src={logo} style={styles.logo} />
          <Text style={styles.title}>Wood Transfer Report</Text>
          <Text style={styles.subtitle}>Professional Wood Solutions</Text>
          <View style={styles.metadata}>
            <View>
              <Text>Generated by: {user.name || user.email}</Text>
            </View>
            <View>
              <Text>{new Date(timestamp).toLocaleString()}</Text>
            </View>
          </View>
        </View>

        {/* Transfer Number & Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transfer Information</Text>
          <View style={styles.infoBox}>
            <View style={styles.row}>
              <Text style={styles.label}>Transfer Number:</Text>
              <Text style={styles.value}>{transfer.transferNumber}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Transfer Date:</Text>
              <Text style={styles.value}>
                {new Date(transfer.transferDate).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 5 }}>
              <View style={[styles.statusBadge, { backgroundColor: statusStyle.backgroundColor }]}>
                <Text style={[styles.statusText, { color: statusStyle.color }]}>
                  {getStatusLabel(transfer.status)}
                </Text>
              </View>
              {(transfer.status === 'IN_TRANSIT' || transfer.status === 'APPROVED') && (
                <View style={styles.inTransitBadge}>
                  <Text style={styles.inTransitBadgeText}>In Transit</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Route */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transfer Route</Text>
          <View style={styles.routeBox}>
            <Text style={styles.routeText}>
              {transfer.fromWarehouse.name} ({transfer.fromWarehouse.code})
            </Text>
            <Text style={styles.arrow}>↓</Text>
            <Text style={styles.routeText}>
              {transfer.toWarehouse.name} ({transfer.toWarehouse.code})
            </Text>
          </View>
        </View>

        {/* Transfer Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transfer Items ({transfer.items.length})</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.colItem}>#</Text>
              <Text style={styles.colWoodType}>Wood Type</Text>
              <Text style={styles.colThickness}>Thickness</Text>
              <Text style={styles.colQuantity}>Quantity</Text>
              <Text style={styles.colStatus}>Status</Text>
              <Text style={styles.colRemarks}>Remarks</Text>
            </View>
            {transfer.items.map((item, index) => (
              <View key={item.id} style={styles.tableRow}>
                <Text style={styles.colItem}>{index + 1}</Text>
                <Text style={styles.colWoodType}>{item.woodType.name}</Text>
                <Text style={styles.colThickness}>{item.thickness}</Text>
                <Text style={styles.colQuantity}>{item.quantity} pcs</Text>
                <Text style={styles.colStatus}>{getWoodStatusLabel(item.woodStatus)}</Text>
                <Text style={styles.colRemarks}>{item.remarks || '-'}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Timeline */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Timeline</Text>
          <View style={styles.infoBox}>
            <View style={styles.row}>
              <Text style={styles.label}>Created By:</Text>
              <Text style={styles.value}>{getUserDisplay(transfer.createdBy)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Created At:</Text>
              <Text style={styles.value}>
                {new Date(transfer.createdAt).toLocaleString()}
              </Text>
            </View>

            {transfer.approvedBy && (
              <>
                <View style={styles.row}>
                  <Text style={styles.label}>
                    {transfer.status === 'REJECTED' ? 'Rejected By:' : 'Approved By:'}
                  </Text>
                  <Text style={styles.value}>{getUserDisplay(transfer.approvedBy)}</Text>
                </View>
                {transfer.approvedAt && (
                  <View style={styles.row}>
                    <Text style={styles.label}>
                      {transfer.status === 'REJECTED' ? 'Rejected At:' : 'Approved At:'}
                    </Text>
                    <Text style={styles.value}>
                      {new Date(transfer.approvedAt).toLocaleString()}
                    </Text>
                  </View>
                )}
              </>
            )}

            {transfer.completedAt && (
              <View style={styles.row}>
                <Text style={styles.label}>Completed At:</Text>
                <Text style={styles.value}>
                  {new Date(transfer.completedAt).toLocaleString()}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Notes */}
        {transfer.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <View style={styles.notes}>
              <Text style={styles.notesText}>{transfer.notes}</Text>
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text>
            {APP_NAME} {APP_VERSION} • Developed by <Text style={styles.vixText}>Vix</Text>
          </Text>
        </View>
      </Page>
    </Document>
  );
};
