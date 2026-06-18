import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import logo from '../../assets/images/logo.png';

interface HandoverAsset {
  assetTag: string;
  name: string;
  category?: { name?: string } | null;
  brand?: string | null;
  modelNumber?: string | null;
  serialNumber?: string | null;
  location?: { name?: string; code?: string } | null;
  description?: string | null;
}

interface AssetHandoverReportProps {
  // Single asset (back-compat) OR multiple assets
  asset?: HandoverAsset;
  assets?: HandoverAsset[];
  receiverName: string;
  locationName: string;
  notes?: string;
  issuedByName: string;
  timestamp: string; // already-formatted date string
}

const styles = StyleSheet.create({
  page: {
    padding: '30 40',
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#2c3e50'
  },
  header: {
    marginBottom: 14,
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
    marginBottom: 12
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#2c3e50',
    marginBottom: 6,
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
  statement: {
    fontSize: 8.5,
    color: '#2c3e50',
    lineHeight: 1.5,
    padding: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 3
  },
  table: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'solid',
    borderRadius: 3
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    borderBottomStyle: 'solid'
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    borderBottomStyle: 'solid'
  },
  th: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#475569',
    padding: '5 5'
  },
  td: {
    fontSize: 7.5,
    color: '#2c3e50',
    padding: '5 5'
  },
  colNo: { width: '8%' },
  colTag: { width: '20%' },
  colName: { width: '40%' },
  colSerial: { width: '32%' },
  signBlock: {
    marginTop: 18,
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  signColumn: {
    width: '47%'
  },
  signLine: {
    borderBottomWidth: 1,
    borderBottomColor: '#2c3e50',
    borderBottomStyle: 'solid',
    height: 28,
    marginBottom: 4
  },
  signLabel: {
    fontSize: 8,
    color: '#64748b'
  },
  signSub: {
    fontSize: 7,
    color: '#94a3b8',
    marginTop: 2
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
  }
});

const InfoLine = ({ label, value }: { label: string; value?: string | null }) => (
  <View style={styles.row}>
    <Text style={styles.label}>{label}</Text>
    <Text style={styles.value}>{value && value.trim() ? value : 'N/A'}</Text>
  </View>
);

export const AssetHandoverReport = ({
  asset,
  assets,
  receiverName,
  locationName,
  notes,
  issuedByName,
  timestamp
}: AssetHandoverReportProps) => {
  const list: HandoverAsset[] = assets && assets.length > 0 ? assets : asset ? [asset] : [];
  const isSingle = list.length === 1;
  const headerLabel = isSingle ? list[0]?.assetTag : `${list.length} assets`;

  return (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Image src={logo} style={styles.logo} />
        <Text style={styles.title}>Asset Handover / Receipt Note</Text>
        <Text style={styles.subtitle}>
          Confirmation of asset receipt at the assigned location
        </Text>
        <View style={styles.metadata}>
          <Text>Asset: {headerLabel}</Text>
          <Text>Issued: {timestamp}</Text>
        </View>
      </View>

      {/* Asset details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {isSingle ? 'Asset Details' : `Assets (${list.length})`}
        </Text>
        {isSingle ? (
          <View style={styles.infoBox}>
            <InfoLine label="Asset Tag" value={list[0].assetTag} />
            <InfoLine label="Name" value={list[0].name} />
            <InfoLine label="Category" value={list[0].category?.name} />
            <InfoLine label="Brand" value={list[0].brand} />
            <InfoLine label="Model Number" value={list[0].modelNumber} />
            <InfoLine label="Serial Number" value={list[0].serialNumber} />
            <InfoLine label="Description" value={list[0].description} />
          </View>
        ) : (
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.th, styles.colNo]}>#</Text>
              <Text style={[styles.th, styles.colTag]}>Asset Tag</Text>
              <Text style={[styles.th, styles.colName]}>Name</Text>
              <Text style={[styles.th, styles.colSerial]}>Serial No.</Text>
            </View>
            {list.map((a, i) => (
              <View style={styles.tableRow} key={a.assetTag || i} wrap={false}>
                <Text style={[styles.td, styles.colNo]}>{i + 1}</Text>
                <Text style={[styles.td, styles.colTag]}>{a.assetTag || 'N/A'}</Text>
                <Text style={[styles.td, styles.colName]}>{a.name || 'N/A'}</Text>
                <Text style={[styles.td, styles.colSerial]}>
                  {a.serialNumber && a.serialNumber.trim() ? a.serialNumber : 'N/A'}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Handover details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Handover Details</Text>
        <View style={styles.infoBox}>
          <InfoLine label="Received By" value={receiverName} />
          <InfoLine label="Location" value={locationName} />
          <InfoLine label="Issued By" value={issuedByName} />
          <InfoLine label="Date" value={timestamp} />
          {notes && notes.trim() ? <InfoLine label="Notes" value={notes} /> : null}
        </View>
      </View>

      {/* Acknowledgement statement */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Acknowledgement</Text>
        <Text style={styles.statement}>
          I confirm that I have received the {isSingle ? 'asset' : `${list.length} assets`}{' '}
          described above in good working condition at the location stated, and I accept
          responsibility for their care and proper use while they remain in my charge.
        </Text>
      </View>

      {/* Signatures */}
      <View style={styles.signBlock}>
        <View style={styles.signColumn}>
          <View style={styles.signLine} />
          <Text style={styles.signLabel}>Received by (Signature)</Text>
          <Text style={styles.signSub}>Name: {receiverName || '______________________'}</Text>
          <Text style={styles.signSub}>Date: ______________________</Text>
        </View>
        <View style={styles.signColumn}>
          <View style={styles.signLine} />
          <Text style={styles.signLabel}>Issued by (Signature)</Text>
          <Text style={styles.signSub}>Name: {issuedByName || '______________________'}</Text>
          <Text style={styles.signSub}>Date: ______________________</Text>
        </View>
      </View>

      {/* Footer */}
      <Text style={styles.footer} fixed>
        U Design Asset Management • Generated on {timestamp} • This document confirms
        physical receipt of the asset(s) by the named recipient.
      </Text>
    </Page>
  </Document>
  );
};

export default AssetHandoverReport;
