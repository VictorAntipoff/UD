import { Container, Typography } from '@mui/material';
import { SectionLabel } from '../../components/SectionLabel';

export default function WoodCalculator() {
  return (
    <Container sx={{ position: 'relative' }}>
      <SectionLabel text="@WoodCalculator" color="primary.main" position="top-left" />
      <Typography variant="h4" gutterBottom>
        Wood Calculator
      </Typography>
    </Container>
  );
} 