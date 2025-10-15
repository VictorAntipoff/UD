import { Document, Page, Text, View, StyleSheet, Image, Svg, Path, Line as SvgLine, Text as SvgText, Circle } from '@react-pdf/renderer';
import logo from '../../assets/images/logo.png';

const APP_NAME = 'U Design';
const APP_VERSION = 'v1.0.0';

interface Reading {
  id: string;
  electricityMeter: number;
  humidity: number;
  readingTime: string;
  notes: string | null;
}

interface WoodType {
  id: string;
  name: string;
  grade: string;
}

interface DryingProcess {
  id: string;
  batchNumber: string;
  woodTypeId: string;
  thickness: number;
  pieceCount: number;
  startTime: string;
  endTime: string | null;
  status: string;
  startingHumidity: number | null;
  startingElectricityUnits: number | null;
  notes: string | null;
  woodType: WoodType;
  readings: Reading[];
}

interface DryingProcessReportProps {
  process: DryingProcess;
  timestamp: string;
  user: {
    email: string;
    name: string;
  };
  electricityUsed: number;
  runningHours: number;
  currentHumidity: number;
  electricityCost: number;
  depreciationCost: number;
}

const styles = StyleSheet.create({
  page: {
    padding: '18px 28px 30px 28px',
    fontSize: 6,
    fontFamily: 'Helvetica',
    color: '#2c3e50',
  },
  // Compact header with horizontal layout
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
    paddingBottom: 4,
    borderBottomWidth: 2,
    borderBottomColor: '#dc2626',
    borderBottomStyle: 'solid',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  logo: {
    width: 38,
    height: 38,
  },
  headerText: {
    flexDirection: 'column',
  },
  title: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#dc2626',
    marginBottom: 1,
  },
  subtitle: {
    fontSize: 5,
    color: '#64748b',
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  batchNumber: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#dc2626',
    backgroundColor: '#fee2e2',
    padding: '2px 5px',
    borderRadius: 2,
    marginBottom: 1.5,
  },
  metadata: {
    fontSize: 4.5,
    color: '#94a3b8',
    textAlign: 'right',
  },
  // Two-column layout for process info
  infoSection: {
    flexDirection: 'row',
    gap: 5,
    marginBottom: 5,
    marginTop: 3,
  },
  infoBox: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'solid',
    borderRadius: 2,
    padding: 4,
  },
  infoBoxTitle: {
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
    color: '#dc2626',
    marginBottom: 2,
    paddingBottom: 1.5,
    borderBottomWidth: 1,
    borderBottomColor: '#fee2e2',
    borderBottomStyle: 'solid',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 1.2,
  },
  infoLabel: {
    width: '50%',
    fontSize: 5,
    color: '#64748b',
  },
  infoValue: {
    width: '50%',
    fontSize: 5,
    color: '#2c3e50',
    fontFamily: 'Helvetica-Bold',
  },
  // Statistics in 4 columns
  statsGrid: {
    flexDirection: 'row',
    gap: 3,
    marginBottom: 5,
  },
  statBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#dc2626',
    borderStyle: 'solid',
    borderRadius: 2,
    padding: 3,
    backgroundColor: '#fff5f5',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 4.5,
    color: '#64748b',
    marginBottom: 0.5,
    textAlign: 'center',
  },
  statValue: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#dc2626',
    textAlign: 'center',
  },
  statUnit: {
    fontSize: 4,
    color: '#94a3b8',
    textAlign: 'center',
  },
  // Cost section
  costSection: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'solid',
    borderRadius: 2,
    padding: 4,
    marginBottom: 5,
  },
  costTitle: {
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
    color: '#dc2626',
    marginBottom: 2,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 1.2,
  },
  costLabel: {
    fontSize: 5,
    color: '#64748b',
  },
  costValue: {
    fontSize: 5,
    color: '#2c3e50',
    fontFamily: 'Helvetica-Bold',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 2,
    borderTopWidth: 1,
    borderTopColor: '#dc2626',
    borderTopStyle: 'solid',
    marginTop: 1.5,
  },
  totalLabel: {
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
    color: '#dc2626',
  },
  totalValue: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#dc2626',
  },
  // Compact section title
  sectionTitle: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    backgroundColor: '#dc2626',
    color: '#ffffff',
    padding: '2px 3px',
    marginBottom: 3,
    marginTop: 2,
  },
  // Chart section
  chartSection: {
    marginTop: 3,
    marginBottom: 5,
  },
  chartContainer: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'solid',
    borderRadius: 2,
    padding: 5,
    backgroundColor: '#ffffff',
  },
  // Compact table
  table: {
    marginTop: 3,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#dc2626',
    color: '#ffffff',
    padding: 2.5,
    fontFamily: 'Helvetica-Bold',
    fontSize: 5,
  },
  tableRow: {
    flexDirection: 'row',
    padding: 1.5,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e2e8f0',
    borderBottomStyle: 'solid',
    fontSize: 5,
  },
  tableRowAlt: {
    backgroundColor: '#f8fafc',
  },
  col1: {
    width: '28%',
  },
  col2: {
    width: '18%',
  },
  col3: {
    width: '18%',
  },
  col4: {
    width: '36%',
  },
  notesSection: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fef3c7',
    borderStyle: 'solid',
    borderRadius: 2,
    padding: 4,
    marginBottom: 5,
    marginTop: 3,
  },
  notesTitle: {
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
    color: '#92400e',
    marginBottom: 1.5,
  },
  notesText: {
    fontSize: 5,
    color: '#78350f',
    lineHeight: 1.3,
  },
  pageNumber: {
    position: 'absolute',
    bottom: 10,
    right: 28,
    fontSize: 5,
    color: '#94a3b8',
  },
  footer: {
    position: 'absolute',
    bottom: 10,
    left: 28,
    right: 60,
    fontSize: 5,
    color: '#94a3b8',
  },
  vixText: {
    color: '#dc2626',
    fontFamily: 'Helvetica-Bold',
  },
});

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'IN_PROGRESS':
      return 'In Progress';
    case 'COMPLETED':
      return 'Completed';
    case 'CANCELLED':
      return 'Cancelled';
    default:
      return status;
  }
};

export const DryingProcessReport: React.FC<DryingProcessReportProps> = ({
  process,
  timestamp,
  user,
  electricityUsed,
  runningHours,
  currentHumidity,
  electricityCost,
  depreciationCost,
}) => {
  const totalCost = electricityCost + depreciationCost;

  return (
    <Document>
      {/* PAGE 1 - Summary Information */}
      <Page size="A4" style={styles.page}>
        {/* Compact Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image src={logo} style={styles.logo} />
            <View style={styles.headerText}>
              <Text style={styles.title}>Drying Process Report</Text>
              <Text style={styles.subtitle}>Professional Wood Solutions</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.batchNumber}>{process.batchNumber}</Text>
            <Text style={styles.metadata}>Generated by: {user.name || user.email}</Text>
            <Text style={styles.metadata}>{new Date(timestamp).toLocaleString()}</Text>
          </View>
        </View>

        {/* Two-Column Process Information */}
        <View style={styles.infoSection}>
          <View style={styles.infoBox}>
            <Text style={styles.infoBoxTitle}>PROCESS DETAILS</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Status:</Text>
              <Text style={styles.infoValue}>{getStatusLabel(process.status)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Wood Type:</Text>
              <Text style={styles.infoValue}>{process.woodType.name}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Grade:</Text>
              <Text style={styles.infoValue}>{process.woodType.grade}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Thickness:</Text>
              <Text style={styles.infoValue}>
                {(process.thickness / 10).toFixed(1)}cm ({(process.thickness / 25.4).toFixed(2)}in)
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Pieces:</Text>
              <Text style={styles.infoValue}>{process.pieceCount}</Text>
            </View>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoBoxTitle}>TIMELINE</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Started:</Text>
              <Text style={styles.infoValue}>
                {new Date(process.startTime).toLocaleDateString()} {new Date(process.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
            {process.endTime && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Ended:</Text>
                <Text style={styles.infoValue}>
                  {new Date(process.endTime).toLocaleDateString()} {new Date(process.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            )}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Duration:</Text>
              <Text style={styles.infoValue}>{runningHours.toFixed(1)} hours</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Initial Humidity:</Text>
              <Text style={styles.infoValue}>
                {process.startingHumidity ? `${process.startingHumidity.toFixed(1)}%` : 'N/A'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Current Humidity:</Text>
              <Text style={styles.infoValue}>{currentHumidity.toFixed(1)}%</Text>
            </View>
          </View>
        </View>

        {/* Statistics in 4 Columns */}
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Electricity</Text>
            <Text style={styles.statValue}>{electricityUsed.toFixed(2)}</Text>
            <Text style={styles.statUnit}>Units</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Electricity Cost</Text>
            <Text style={styles.statValue}>{(electricityCost / 1000).toFixed(1)}K</Text>
            <Text style={styles.statUnit}>TZS</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Depreciation</Text>
            <Text style={styles.statValue}>{(depreciationCost / 1000).toFixed(1)}K</Text>
            <Text style={styles.statUnit}>TZS</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Total Cost</Text>
            <Text style={styles.statValue}>{(totalCost / 1000).toFixed(1)}K</Text>
            <Text style={styles.statUnit}>TZS</Text>
          </View>
        </View>

        {/* Cost Breakdown */}
        <View style={styles.costSection}>
          <Text style={styles.costTitle}>COST BREAKDOWN</Text>
          <View style={styles.costRow}>
            <Text style={styles.costLabel}>Electricity Cost:</Text>
            <Text style={styles.costValue}>TZS {electricityCost.toLocaleString()}</Text>
          </View>
          <View style={styles.costRow}>
            <Text style={styles.costLabel}>Depreciation Cost:</Text>
            <Text style={styles.costValue}>TZS {depreciationCost.toLocaleString()}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>TOTAL COST:</Text>
            <Text style={styles.totalValue}>TZS {totalCost.toLocaleString()}</Text>
          </View>
        </View>

        {/* Humidity Chart */}
        {process.readings.length > 1 && (
          <View style={styles.chartSection}>
            <Text style={styles.sectionTitle}>HUMIDITY TREND</Text>
            <View style={styles.chartContainer}>
              {(() => {
                const width = 500;
                const height = 100;
                const padding = { top: 15, right: 35, bottom: 25, left: 45 };
                const chartWidth = width - padding.left - padding.right;
                const chartHeight = height - padding.top - padding.bottom;

                const humidityValues = process.readings.map(r => r.humidity);
                const minHumidity = Math.floor(Math.min(...humidityValues) / 5) * 5;
                const maxHumidity = Math.ceil(Math.max(...humidityValues) / 5) * 5;
                const humidityRange = maxHumidity - minHumidity || 10;

                const points = process.readings.map((reading, index) => {
                  const x = padding.left + (index / Math.max(1, process.readings.length - 1)) * chartWidth;
                  const y = padding.top + chartHeight - ((reading.humidity - minHumidity) / humidityRange) * chartHeight;
                  return { x, y, humidity: reading.humidity };
                });

                const pathData = points.map((point, index) =>
                  `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
                ).join(' ');

                return (
                  <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
                    {/* Grid lines */}
                    {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                      const y = padding.top + ratio * chartHeight;
                      return (
                        <SvgLine
                          key={`grid-${i}`}
                          x1={padding.left}
                          y1={y}
                          x2={padding.left + chartWidth}
                          y2={y}
                          stroke="#e2e8f0"
                          strokeWidth="0.5"
                        />
                      );
                    })}

                    {/* Y-axis */}
                    <SvgLine
                      x1={padding.left}
                      y1={padding.top}
                      x2={padding.left}
                      y2={padding.top + chartHeight}
                      stroke="#64748b"
                      strokeWidth="1"
                    />

                    {/* X-axis */}
                    <SvgLine
                      x1={padding.left}
                      y1={padding.top + chartHeight}
                      x2={padding.left + chartWidth}
                      y2={padding.top + chartHeight}
                      stroke="#64748b"
                      strokeWidth="1"
                    />

                    {/* Y-axis labels */}
                    {[0, 0.5, 1].map((ratio, i) => {
                      const y = padding.top + (1 - ratio) * chartHeight;
                      const value = (minHumidity + ratio * humidityRange).toFixed(0);
                      return (
                        <SvgText
                          key={`y-label-${i}`}
                          x={padding.left - 8}
                          y={y + 2}
                          fontSize="6"
                          fill="#64748b"
                          textAnchor="end"
                        >
                          {value}%
                        </SvgText>
                      );
                    })}

                    {/* Humidity line */}
                    <Path
                      d={pathData}
                      stroke="#dc2626"
                      strokeWidth="2"
                      fill="none"
                    />

                    {/* Data points */}
                    {points.map((point, index) => (
                      <Circle
                        key={`point-${index}`}
                        cx={point.x}
                        cy={point.y}
                        r="2.5"
                        fill="#dc2626"
                      />
                    ))}

                    {/* X-axis label */}
                    <SvgText
                      x={padding.left + chartWidth / 2}
                      y={height - 8}
                      fontSize="6"
                      fill="#64748b"
                      textAnchor="middle"
                    >
                      Reading Progress ({process.readings.length} readings)
                    </SvgText>

                    {/* Y-axis label */}
                    <SvgText
                      x={15}
                      y={padding.top + chartHeight / 2}
                      fontSize="6"
                      fill="#64748b"
                      textAnchor="middle"
                      transform={`rotate(-90 15 ${padding.top + chartHeight / 2})`}
                    >
                      Humidity (%)
                    </SvgText>
                  </Svg>
                );
              })()}
            </View>
          </View>
        )}

        {/* Notes */}
        {process.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesTitle}>NOTES</Text>
            <Text style={styles.notesText}>{process.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text>
            {APP_NAME} {APP_VERSION} • Developed by <Text style={styles.vixText}>Vix</Text>
          </Text>
        </View>

        {/* Page Number */}
        <Text style={styles.pageNumber}>Page 1 of 2</Text>
      </Page>

      {/* PAGE 2 - Readings History */}
      <Page size="A4" style={styles.page}>
        {/* Simple Header */}
        <View style={{ marginBottom: 8, paddingBottom: 4, borderBottomWidth: 2, borderBottomColor: '#dc2626', borderBottomStyle: 'solid' }}>
          <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#dc2626' }}>
            {process.batchNumber} - Readings History
          </Text>
        </View>

        {/* Readings History Table */}
        <Text style={styles.sectionTitle}>
          READINGS HISTORY ({process.readings.length} {process.readings.length === 1 ? 'Reading' : 'Readings'})
        </Text>
        {process.readings.length > 0 ? (
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.col1}>Date & Time</Text>
              <Text style={styles.col2}>Electricity (U)</Text>
              <Text style={styles.col3}>Humidity (%)</Text>
              <Text style={styles.col4}>Notes</Text>
            </View>
            {process.readings.map((reading, index) => (
              <View key={reading.id} style={[styles.tableRow, index % 2 === 1 && styles.tableRowAlt]}>
                <Text style={styles.col1}>
                  {new Date(reading.readingTime).toLocaleDateString()} {new Date(reading.readingTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
                <Text style={styles.col2}>{reading.electricityMeter.toFixed(2)}</Text>
                <Text style={styles.col3}>{reading.humidity.toFixed(1)}</Text>
                <Text style={styles.col4}>{reading.notes || '-'}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={{ fontSize: 6, color: '#94a3b8', textAlign: 'center', marginTop: 20 }}>
            No readings recorded yet
          </Text>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text>
            {APP_NAME} {APP_VERSION} • Developed by <Text style={styles.vixText}>Vix</Text>
          </Text>
        </View>

        {/* Page Number */}
        <Text style={styles.pageNumber}>Page 2 of 2</Text>
      </Page>
    </Document>
  );
};
