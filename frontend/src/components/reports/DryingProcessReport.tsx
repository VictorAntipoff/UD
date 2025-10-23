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
  infoGrid: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 10
  },
  infoColumn: {
    flex: 1
  },
  row: {
    flexDirection: 'row',
    marginBottom: 3,
    fontSize: 8
  },
  label: {
    width: '45%',
    color: '#64748b',
    fontSize: 8
  },
  value: {
    width: '55%',
    color: '#2c3e50',
    fontSize: 8
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'solid',
    borderRadius: 4,
    padding: 10,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 7,
    color: '#64748b',
    marginBottom: 3,
    textAlign: 'center'
  },
  statValue: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#dc2626',
    textAlign: 'center'
  },
  statUnit: {
    fontSize: 7,
    color: '#94a3b8',
    marginTop: 2,
    textAlign: 'center'
  },
  result: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 4,
    borderLeft: 2,
    borderLeftColor: '#3b82f6'
  },
  resultText: {
    fontFamily: 'Helvetica-Bold',
    color: '#2c3e50',
    fontSize: 10
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
  tableCell: {
    flex: 1
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
  col1: {
    width: '30%',
  },
  col2: {
    width: '20%',
  },
  col3: {
    width: '20%',
  },
  col4: {
    width: '30%',
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
      {/* PAGE 1 */}
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Image src={logo} style={styles.logo} />
          <Text style={styles.title}>Drying Process Report</Text>
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

        {/* Process Information - 2 Columns */}
        <Text style={styles.sectionTitle}>Process Information</Text>
        <View style={styles.infoGrid}>
          <View style={styles.infoColumn}>
            <View style={styles.row}>
              <Text style={styles.label}>Batch Number:</Text>
              <Text style={styles.value}>{process.batchNumber}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Status:</Text>
              <Text style={styles.value}>{getStatusLabel(process.status)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Wood Type:</Text>
              <Text style={styles.value}>{process.woodType.name}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Grade:</Text>
              <Text style={styles.value}>{process.woodType.grade}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Thickness:</Text>
              <Text style={styles.value}>
                {(process.thickness / 10).toFixed(1)}cm ({(process.thickness / 25.4).toFixed(2)}in)
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Piece Count:</Text>
              <Text style={styles.value}>{process.pieceCount}</Text>
            </View>
          </View>

          <View style={styles.infoColumn}>
            <View style={styles.row}>
              <Text style={styles.label}>Start Time:</Text>
              <Text style={styles.value}>{new Date(process.startTime).toLocaleString()}</Text>
            </View>
            {process.endTime && (
              <View style={styles.row}>
                <Text style={styles.label}>End Time:</Text>
                <Text style={styles.value}>{new Date(process.endTime).toLocaleString()}</Text>
              </View>
            )}
            <View style={styles.row}>
              <Text style={styles.label}>Duration:</Text>
              <Text style={styles.value}>{runningHours.toFixed(1)} hours</Text>
            </View>
            {process.startingHumidity && (
              <View style={styles.row}>
                <Text style={styles.label}>Initial Humidity:</Text>
                <Text style={styles.value}>{process.startingHumidity.toFixed(1)}%</Text>
              </View>
            )}
            <View style={styles.row}>
              <Text style={styles.label}>Current Humidity:</Text>
              <Text style={styles.value}>{currentHumidity.toFixed(1)}%</Text>
            </View>
          </View>
        </View>

        {/* Statistics - 4 Stat Cards */}
        <Text style={styles.sectionTitle}>Statistics</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Electricity Used</Text>
            <Text style={styles.statValue}>{Math.abs(electricityUsed).toFixed(2)}</Text>
            <Text style={styles.statUnit}>Units</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Running Hours</Text>
            <Text style={styles.statValue}>{runningHours.toFixed(1)}</Text>
            <Text style={styles.statUnit}>hrs</Text>
          </View>
          {process.startingHumidity && (
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Starting Humidity</Text>
              <Text style={styles.statValue}>{process.startingHumidity.toFixed(1)}</Text>
              <Text style={styles.statUnit}>%</Text>
            </View>
          )}
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Current Humidity</Text>
            <Text style={styles.statValue}>{currentHumidity.toFixed(1)}</Text>
            <Text style={styles.statUnit}>%</Text>
          </View>
        </View>

        {/* Cost Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cost Breakdown</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Electricity Cost:</Text>
            <Text style={styles.value}>TZS {electricityCost.toLocaleString()}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Depreciation Cost:</Text>
            <Text style={styles.value}>TZS {depreciationCost.toLocaleString()}</Text>
          </View>
        </View>

        <View style={styles.result}>
          <Text style={styles.resultText}>Total Cost: TZS {totalCost.toLocaleString()}</Text>
        </View>

        {/* Notes */}
        {process.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <View style={styles.notes}>
              <Text style={styles.notesText}>{process.notes}</Text>
            </View>
          </View>
        )}

        {/* Humidity Chart */}
        {process.readings.length > 1 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Humidity Trend ({process.readings.length} readings)</Text>
              {(() => {
                const width = 470;
                const height = 140;
                const padding = { top: 25, right: 25, bottom: 35, left: 50 };
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
                          x={padding.left - 10}
                          y={y + 3}
                          fontSize="9"
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
                        r="2"
                        fill="#dc2626"
                      />
                    ))}

                    {/* Y-axis label */}
                    <SvgText
                      x={15}
                      y={padding.top + chartHeight / 2}
                      fontSize="9"
                      fill="#64748b"
                      textAnchor="middle"
                      transform={`rotate(-90 15 ${padding.top + chartHeight / 2})`}
                    >
                      Humidity (%)
                    </SvgText>

                    {/* X-axis label */}
                    <SvgText
                      x={padding.left + chartWidth / 2}
                      y={height - 10}
                      fontSize="9"
                      fill="#64748b"
                      textAnchor="middle"
                    >
                      Reading Progress
                    </SvgText>
                  </Svg>
                );
              })()}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text>
            {APP_NAME} {APP_VERSION} • Developed by <Text style={styles.vixText}>Vix</Text>
          </Text>
        </View>
      </Page>

      {/* PAGE 2 - Readings History */}
      <Page size="A4" style={styles.page}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Readings History ({process.readings.length} {process.readings.length === 1 ? 'Reading' : 'Readings'})
          </Text>
        {process.readings.length > 0 ? (
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.col1}>Date & Time</Text>
              <Text style={styles.col2}>Electricity (U)</Text>
              <Text style={styles.col3}>Humidity (%)</Text>
              <Text style={styles.col4}>Notes</Text>
            </View>
            {process.readings.map((reading) => (
              <View key={reading.id} style={styles.tableRow}>
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
          <Text style={{ fontSize: 10, color: '#94a3b8', textAlign: 'center', marginTop: 20 }}>
            No readings recorded yet
          </Text>
        )}
        </View>

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
