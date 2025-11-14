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

interface TransferHistory {
  id: string;
  transferId: string;
  transferNumber: string;
  userId: string;
  userName: string;
  userEmail: string;
  action: string;
  details: string | null;
  timestamp: string;
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
  history?: TransferHistory[];
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
    padding: '30 40',
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#2c3e50'
  },
  header: {
    marginBottom: 12,
    borderBottom: 1,
    borderColor: '#e2e8f0',
    paddingBottom: 10
  },
  logo: {
    width: 100,
    marginBottom: 6
  },
  title: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 3
  },
  subtitle: {
    fontSize: 8,
    color: '#64748b',
    marginBottom: 8
  },
  metadata: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 7,
    color: '#64748b'
  },
  section: {
    marginBottom: 10
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#2c3e50',
    marginBottom: 5,
    backgroundColor: '#f8fafc',
    padding: '4 6',
    borderRadius: 3
  },
  infoBox: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'solid',
    borderRadius: 3,
    padding: 8
  },
  row: {
    flexDirection: 'row',
    marginBottom: 3,
    fontSize: 8
  },
  label: {
    width: '35%',
    color: '#64748b',
    fontSize: 8
  },
  value: {
    width: '65%',
    color: '#2c3e50',
    fontSize: 8,
    fontFamily: 'Helvetica-Bold'
  },
  routeBox: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'solid',
    borderRadius: 3,
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  routeText: {
    fontSize: 9,
    color: '#2c3e50',
    fontFamily: 'Helvetica-Bold'
  },
  arrow: {
    fontSize: 10,
    color: '#64748b',
    marginHorizontal: 6
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 3,
    marginTop: 5
  },
  statusText: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold'
  },
  notes: {
    padding: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 3
  },
  notesText: {
    fontSize: 8,
    color: '#2c3e50'
  },
  footer: {
    position: 'absolute',
    bottom: 25,
    left: 40,
    right: 40,
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 7,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0'
  },
  vixText: {
    color: '#dc2626'
  },
  table: {
    marginTop: 5
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderBottomColor: '#e2e8f0',
    borderBottomWidth: 1,
    padding: '6 4',
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#64748b'
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomColor: '#e2e8f0',
    borderBottomWidth: 1,
    padding: '6 4',
    fontSize: 8
  },
  colItem: {
    width: '8%'
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
    width: '17%'
  },
  colRemarks: {
    width: '20%'
  },
  historyItem: {
    marginBottom: 3,
    fontSize: 7,
    paddingLeft: 8,
    borderLeftWidth: 2,
    borderLeftColor: '#e2e8f0',
    borderLeftStyle: 'solid',
    paddingVertical: 2
  },
  historyLine: {
    flexDirection: 'row',
    alignItems: 'flex-start'
  },
  historyAction: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#2c3e50',
    width: 75
  },
  historyMeta: {
    fontSize: 7,
    color: '#64748b',
    width: 65
  },
  historyDate: {
    fontSize: 7,
    color: '#64748b',
    width: 100
  },
  historyDetails: {
    fontSize: 7,
    color: '#64748b',
    fontStyle: 'italic',
    flex: 1
  },
  historySeparator: {
    marginHorizontal: 4,
    color: '#cbd5e1',
    fontSize: 7
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
              <Text style={styles.label}>Status:</Text>
              <View style={[styles.statusBadge, { backgroundColor: statusStyle.backgroundColor }]}>
                <Text style={[styles.statusText, { color: statusStyle.color }]}>
                  {getStatusLabel(transfer.status)}
                </Text>
              </View>
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
            <View style={styles.row}>
              <Text style={styles.label}>Route:</Text>
              <Text style={styles.value}>
                {transfer.fromWarehouse.name} ({transfer.fromWarehouse.code}) → {transfer.toWarehouse.name} ({transfer.toWarehouse.code})
              </Text>
            </View>
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

        {/* Timeline / History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transfer History</Text>
          <View style={styles.infoBox}>
            {transfer.history && transfer.history.length > 0 ? (
              transfer.history.map((historyItem) => {
                // Extract first name only
                const firstName = historyItem.userName.split(' ')[0];

                return (
                  <View key={historyItem.id} style={styles.historyItem}>
                    <View style={styles.historyLine}>
                      <Text style={styles.historyAction}>
                        {historyItem.action.replace(/_/g, ' ')}
                      </Text>
                      <Text style={styles.historyMeta}>
                        {firstName}
                      </Text>
                      <Text style={styles.historyDate}>
                        {new Date(historyItem.timestamp).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </Text>
                      {historyItem.details && (
                        <Text style={styles.historyDetails}>
                          {historyItem.details}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })
            ) : (
              <>
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
              </>
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
