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
  asset: HandoverAsset;
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
  receiverName,
  locationName,
  notes,
  issuedByName,
  timestamp
}: AssetHandoverReportProps) => (
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
          <Text>Asset: {asset.assetTag}</Text>
          <Text>Issued: {timestamp}</Text>
        </View>
      </View>

      {/* Asset details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Asset Details</Text>
        <View style={styles.infoBox}>
          <InfoLine label="Asset Tag" value={asset.assetTag} />
          <InfoLine label="Name" value={asset.name} />
          <InfoLine label="Category" value={asset.category?.name} />
          <InfoLine label="Brand" value={asset.brand} />
          <InfoLine label="Model Number" value={asset.modelNumber} />
          <InfoLine label="Serial Number" value={asset.serialNumber} />
          <InfoLine label="Description" value={asset.description} />
        </View>
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
          I confirm that I have received the asset described above in good working
          condition at the location stated, and I accept responsibility for its care
          and proper use while it remains in my charge.
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
        physical receipt of the asset by the named recipient.
      </Text>
    </Page>
  </Document>
);

export default AssetHandoverReport;
