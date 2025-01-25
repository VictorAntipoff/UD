import { View, Text, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  logoSection: {
    flexDirection: 'column'
  },
  companyName: {
    fontSize: 24,
    fontFamily: 'Helvetica-Bold',
    color: '#2c3e50'
  },
  tagline: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 4
  }
});

export const LogoHeader = () => (
  <View style={styles.header}>
    <View style={styles.logoSection}>
      <Text style={styles.companyName}>Wood Calculator</Text>
      <Text style={styles.tagline}>Professional Wood Solutions</Text>
    </View>
  </View>
); 