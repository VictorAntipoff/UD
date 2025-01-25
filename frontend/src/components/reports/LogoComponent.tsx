import { View, Text, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20
  },
  logoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50'
  },
  subText: {
    fontSize: 10,
    color: '#64748b'
  }
});

export const LogoComponent = () => (
  <View style={styles.logoContainer}>
    <Text style={styles.logoText}>Wood Calculator</Text>
    <Text style={styles.subText}>Professional Wood Calculation Report</Text>
  </View>
); 