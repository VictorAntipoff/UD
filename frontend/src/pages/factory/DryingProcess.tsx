import { Container, Typography } from '@mui/material';
import { SectionLabel } from '../../components/SectionLabel';

export default function DryingProcess() {
  return (
    <Container sx={{ position: 'relative' }}>
      <SectionLabel text="@DryingProcess" color="primary.main" position="top-left" />
      <Typography variant="h4" gutterBottom>
        Drying Process
      </Typography>
    </Container>
  );
} 