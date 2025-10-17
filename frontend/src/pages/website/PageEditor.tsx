import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import PreviewIcon from '@mui/icons-material/Preview';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate, useParams } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import api from '../../lib/api';

interface PageContent {
  title: string;
  subtitle: string;
  description: string;
  products: Array<{
    name: string;
    icon: string;
    description: string;
  }>;
  footerText: string;
}

const PageEditor = () => {
  const { pageId } = useParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pageName, setPageName] = useState('');

  const [content, setContent] = useState<PageContent>({
    title: 'Welcome to UDesign',
    subtitle: 'Premium Hardwood & Custom Furniture Manufacturer',
    description: 'We specialize in crafting exceptional furniture and supplying premium hardwood products. From solid timber and engineered wood to decorative veneers and custom furniture pieces, we bring quality craftsmanship and natural beauty to every project.',
    products: [
      { name: 'Premium Hardwood', icon: '🌳', description: 'Solid hardwood timber for construction and craftsmanship' },
      { name: 'Custom Furniture', icon: '🪑', description: 'Bespoke furniture pieces crafted to your specifications' },
      { name: 'Fabricated Wood', icon: '🔨', description: 'Engineered wood products for commercial applications' },
      { name: 'Wood Veneer', icon: '📐', description: 'High-quality decorative veneers in various finishes' },
    ],
    footerText: 'Website Coming Soon • Contact Us For Inquiries',
  });

  useEffect(() => {
    fetchPageContent();
  }, [pageId]);

  const fetchPageContent = async () => {
    try {
      if (pageId === 'coming-soon') {
        setPageName('Coming Soon Page');
        // Load from API when available
        // const response = await api.get(`/website/pages/${pageId}`);
        // setContent(response.data.content);
      }
    } catch (error) {
      console.error('Error fetching page:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(`/website/pages/${pageId}`, { content });
      enqueueSnackbar('Page saved successfully!', { variant: 'success' });
    } catch (error) {
      console.error('Error saving page:', error);
      enqueueSnackbar('Failed to save page. Please try again.', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleProductChange = (index: number, field: string, value: string) => {
    const updatedProducts = [...content.products];
    updatedProducts[index] = { ...updatedProducts[index], [field]: value };
    setContent({ ...content, products: updatedProducts });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/dashboard/website/pages')}
            variant="outlined"
          >
            Back
          </Button>
          <Typography variant="h4" sx={{ fontWeight: 600 }}>
            Edit: {pageName}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            startIcon={<PreviewIcon />}
            onClick={() => window.open('/', '_blank')}
            variant="outlined"
          >
            Preview
          </Button>
          <Button
            startIcon={<SaveIcon />}
            onClick={handleSave}
            variant="contained"
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </Box>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        Edit the content below to customize your Coming Soon page. Changes will be reflected immediately on the public website.
      </Alert>

      <Paper sx={{ p: 3 }}>
        <Grid container spacing={3}>
          {/* Header Section */}
          <Grid item xs={12}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              Header Section
            </Typography>
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Main Title"
              value={content.title}
              onChange={(e) => setContent({ ...content, title: e.target.value })}
              placeholder="e.g., Welcome to UDesign"
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Subtitle"
              value={content.subtitle}
              onChange={(e) => setContent({ ...content, subtitle: e.target.value })}
              placeholder="e.g., Premium Hardwood & Custom Furniture Manufacturer"
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Description"
              value={content.description}
              onChange={(e) => setContent({ ...content, description: e.target.value })}
              placeholder="Enter your business description"
            />
          </Grid>

          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
          </Grid>

          {/* Products Section */}
          <Grid item xs={12}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              Products Section
            </Typography>
          </Grid>

          {content.products.map((product, index) => (
            <Grid item xs={12} md={6} key={index}>
              <Paper sx={{ p: 2, backgroundColor: '#f8fafc' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                  Product {index + 1}
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Product Name"
                      value={product.name}
                      onChange={(e) => handleProductChange(index, 'name', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Icon (Emoji)"
                      value={product.icon}
                      onChange={(e) => handleProductChange(index, 'icon', e.target.value)}
                      helperText="Use an emoji like 🌳 🪑 🔨 📐"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      size="small"
                      multiline
                      rows={2}
                      label="Description"
                      value={product.description}
                      onChange={(e) => handleProductChange(index, 'description', e.target.value)}
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          ))}

          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
          </Grid>

          {/* Footer Section */}
          <Grid item xs={12}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              Footer Section
            </Typography>
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Footer Text"
              value={content.footerText}
              onChange={(e) => setContent({ ...content, footerText: e.target.value })}
              placeholder="e.g., Website Coming Soon • Contact Us For Inquiries"
            />
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default PageEditor;
