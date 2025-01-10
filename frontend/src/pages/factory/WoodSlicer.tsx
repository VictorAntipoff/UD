import { Container, Typography } from '@mui/material';
import { SectionLabel } from '../../components/SectionLabel';

export default function WoodSlicer() {
  return (
    <Container sx={{ position: 'relative' }}>
      <SectionLabel text="@WoodSlicer" color="primary.main" position="top-left" />
      <Typography variant="h4" gutterBottom>
        Wood Slicer
      </Typography>
    </Container>
  );
} 