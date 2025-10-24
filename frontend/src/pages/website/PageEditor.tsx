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
  IconButton,
  Card,
  CardMedia,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  ImageList,
  ImageListItem,
  ImageListItemBar,
  Breadcrumbs,
  Link,
  Chip,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import PreviewIcon from '@mui/icons-material/Preview';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import FolderIcon from '@mui/icons-material/Folder';
import HomeIcon from '@mui/icons-material/Home';
import { useNavigate, useParams } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import api from '../../lib/api';

interface CarouselImage {
  src: string;
  alt: string;
  title?: string;
  description?: string;
}

interface PageContent {
  mainTitle: string;
  highlightedWord: string;
  subtitle: string;
  phone: string;
  email: string;
  carouselImages: CarouselImage[];
  logoUrl: string;
}

interface BackendFile {
  id: string;
  name: string;
  originalName: string;
  url: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

interface Folder {
  id: string;
  name: string;
  _count: {
    files: number;
    subfolders: number;
  };
}

interface BreadcrumbItem {
  id: string | null;
  name: string;
}

const PageEditor = () => {
  const { pageId } = useParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pageName, setPageName] = useState('');
  const [fileBrowserOpen, setFileBrowserOpen] = useState(false);
  const [backendFiles, setBackendFiles] = useState<BackendFile[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([{ id: null, name: 'Root' }]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  const [content, setContent] = useState<PageContent>({
    mainTitle: 'Crafting Visions in Wood',
    highlightedWord: 'Bold',
    subtitle: 'Our website is under construction, but our passion for creating extraordinary wood furniture never stops.',
    phone: '+255 743 777333',
    email: 'info@udesign.co.tz',
    logoUrl: '/logo.png',
    carouselImages: [
      {
        src: 'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?q=80&w=800&h=800&auto=format&fit=crop',
        alt: 'Handcrafted Solid Oak Dining Table',
        title: 'Solid Oak Dining Table',
        description: 'Handcrafted from premium oak with natural finish',
      },
      {
        src: 'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?q=80&w=800&h=800&auto=format&fit=crop',
        alt: 'Custom Walnut Bookshelf',
        title: 'Walnut Bookshelf',
        description: 'Custom design with adjustable shelves',
      },
      {
        src: 'https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?q=80&w=800&h=800&auto=format&fit=crop',
        alt: 'Teak Outdoor Furniture Set',
        title: 'Teak Outdoor Set',
        description: 'Weather-resistant teak for outdoor elegance',
      },
      {
        src: 'https://images.unsplash.com/photo-1540574163026-643ea20ade25?q=80&w=800&h=800&auto=format&fit=crop',
        alt: 'Mahogany King Size Bed Frame',
        title: 'Mahogany Bed Frame',
        description: 'King size with intricate hand-carved details',
      },
      {
        src: 'https://images.unsplash.com/photo-1556185781-a47769abb7ee?q=80&w=800&h=800&auto=format&fit=crop',
        alt: 'Custom Maple Kitchen Cabinets',
        title: 'Maple Kitchen Cabinets',
        description: 'Custom-built with dovetail joinery',
      },
    ],
  });

  useEffect(() => {
    fetchPageContent();
  }, [pageId]);

  const fetchPageContent = async () => {
    try {
      setPageName('Coming Soon Page');

      // Try to fetch the page from backend
      const response = await api.get(`/website/pages/slug/coming-soon`);
      if (response.data && response.data.content) {
        // Ensure all required fields exist
        const loadedContent = response.data.content;
        setContent({
          mainTitle: loadedContent.mainTitle || 'Crafting Visions in Wood',
          highlightedWord: loadedContent.highlightedWord || 'Bold',
          subtitle: loadedContent.subtitle || 'Our website is under construction, but our passion for creating extraordinary wood furniture never stops.',
          phone: loadedContent.phone || '+255 743 777333',
          email: loadedContent.email || 'info@udesign.co.tz',
          logoUrl: loadedContent.logoUrl || '/logo.png',
          carouselImages: Array.isArray(loadedContent.carouselImages) ? loadedContent.carouselImages : [],
        });
      }
    } catch (error: any) {
      // If page doesn't exist, we'll use the default content
      console.log('Page not found, using default content');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let savedSuccessfully = false;

      // First try to update existing page
      try {
        const existingPage = await api.get(`/website/pages/slug/coming-soon`);
        if (existingPage.data) {
          console.log('Updating existing page:', existingPage.data.id);
          const response = await api.put(`/website/pages/${existingPage.data.id}`, { content });
          console.log('Update response:', response.data);
          savedSuccessfully = true;
        }
      } catch (getError: any) {
        // Page doesn't exist, create it
        console.log('Page not found, creating new page...');
        try {
          const response = await api.post(`/website/pages`, {
            name: 'Coming Soon Page',
            slug: 'coming-soon',
            content,
            status: 'published',
          });
          console.log('Create response:', response.data);
          savedSuccessfully = true;
        } catch (postError: any) {
          console.error('Error creating page:', postError.response?.data || postError.message);
          throw postError;
        }
      }

      if (savedSuccessfully) {
        enqueueSnackbar('Page saved successfully! Refresh the Coming Soon page to see changes.', { variant: 'success' });
      }
    } catch (error: any) {
      console.error('Error saving page:', error.response?.data || error.message);
      enqueueSnackbar(`Failed to save page: ${error.response?.data?.error || error.message}`, { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleImageChange = (index: number, field: keyof CarouselImage, value: string) => {
    const updatedImages = [...content.carouselImages];
    updatedImages[index] = { ...updatedImages[index], [field]: value };
    setContent({ ...content, carouselImages: updatedImages });
  };

  const handleAddImage = () => {
    const newImage: CarouselImage = {
      src: '',
      alt: '',
      title: '',
      description: '',
    };
    setContent({ ...content, carouselImages: [...content.carouselImages, newImage] });
  };

  const handleRemoveImage = (index: number) => {
    const updatedImages = content.carouselImages.filter((_, i) => i !== index);
    setContent({ ...content, carouselImages: updatedImages });
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post('/website/files/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data && response.data[0]) {
        handleImageChange(index, 'src', response.data[0].url);
        enqueueSnackbar('Image uploaded successfully!', { variant: 'success' });
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      enqueueSnackbar('Failed to upload image. Please try again.', { variant: 'error' });
    }
  };

  const fetchBackendFiles = async (folderId: string | null = null) => {
    setLoadingFiles(true);
    try {
      const params = folderId ? `?parentId=${folderId}` : '';
      const response = await api.get(`/website/folders${params}`);
      if (response.data) {
        // Set folders
        setFolders(response.data.folders || []);
        // Filter only image files
        const imageFiles = (response.data.files || []).filter((file: BackendFile) =>
          file.mimeType.startsWith('image/')
        );
        setBackendFiles(imageFiles);
      }
    } catch (error) {
      console.error('Error fetching files:', error);
      enqueueSnackbar('Failed to load files from backend', { variant: 'error' });
    } finally {
      setLoadingFiles(false);
    }
  };

  const handleOpenFileBrowser = (index: number) => {
    setSelectedImageIndex(index);
    setFileBrowserOpen(true);
    setCurrentFolderId(null);
    setBreadcrumbs([{ id: null, name: 'Root' }]);
    fetchBackendFiles(null);
  };

  const handleNavigateToFolder = (folder: Folder) => {
    setCurrentFolderId(folder.id);
    setBreadcrumbs([...breadcrumbs, { id: folder.id, name: folder.name }]);
    fetchBackendFiles(folder.id);
  };

  const handleBreadcrumbClick = (index: number) => {
    const newBreadcrumbs = breadcrumbs.slice(0, index + 1);
    setBreadcrumbs(newBreadcrumbs);
    const folderId = newBreadcrumbs[index].id;
    setCurrentFolderId(folderId);
    fetchBackendFiles(folderId);
  };

  const handleSelectFile = (fileUrl: string) => {
    if (selectedImageIndex !== null) {
      handleImageChange(selectedImageIndex, 'src', fileUrl);
      setFileBrowserOpen(false);
      setSelectedImageIndex(null);
      enqueueSnackbar('Image selected successfully!', { variant: 'success' });
    }
  };

  const getFileUrl = (url: string) => {
    // If URL is already a full URL (starts with http:// or https://), use it directly
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    // For relative URLs (local files), prepend API URL in production
    if (import.meta.env.DEV) {
      return url; // Proxy will handle it in development
    } else {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3010';
      return `${baseUrl}${url}`;
    }
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
        Edit the content below to customize your Coming Soon page. Changes will be saved to the database and reflected on the public website.
      </Alert>

      <Paper sx={{ p: 3 }}>
        <Grid container spacing={3}>
          {/* Header Section */}
          <Grid item xs={12}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#dc2626' }}>
              Header Section
            </Typography>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Main Title (before highlighted word)"
              value={content.mainTitle}
              onChange={(e) => setContent({ ...content, mainTitle: e.target.value })}
              placeholder="e.g., Crafting Visions in Wood"
              helperText="This appears before the highlighted word"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Highlighted Word (in red)"
              value={content.highlightedWord}
              onChange={(e) => setContent({ ...content, highlightedWord: e.target.value })}
              placeholder="e.g., Bold"
              helperText="This word will be displayed in red"
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Subtitle"
              value={content.subtitle}
              onChange={(e) => setContent({ ...content, subtitle: e.target.value })}
              placeholder="e.g., Our website is under construction..."
            />
          </Grid>

          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
          </Grid>

          {/* Contact Information */}
          <Grid item xs={12}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#dc2626' }}>
              Contact Information
            </Typography>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Phone Number"
              value={content.phone}
              onChange={(e) => setContent({ ...content, phone: e.target.value })}
              placeholder="+255 743 777333"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Email Address"
              type="email"
              value={content.email}
              onChange={(e) => setContent({ ...content, email: e.target.value })}
              placeholder="info@udesign.co.tz"
            />
          </Grid>

          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
          </Grid>

          {/* Logo Section */}
          <Grid item xs={12}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#dc2626' }}>
              Logo
            </Typography>
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Logo URL"
              value={content.logoUrl}
              onChange={(e) => setContent({ ...content, logoUrl: e.target.value })}
              placeholder="/logo.png or https://..."
              helperText="Upload your logo to the file manager and paste the URL here"
            />
          </Grid>

          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
          </Grid>

          {/* Carousel Images Section */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#dc2626' }}>
                Carousel Images
              </Typography>
              <Button
                startIcon={<AddPhotoAlternateIcon />}
                onClick={handleAddImage}
                variant="outlined"
                sx={{ borderColor: '#dc2626', color: '#dc2626', '&:hover': { borderColor: '#b91c1c', backgroundColor: '#fef2f2' } }}
              >
                Add Image
              </Button>
            </Box>
          </Grid>

          {content.carouselImages && content.carouselImages.length > 0 ? content.carouselImages.map((image, index) => (
            <Grid item xs={12} key={index}>
              <Card sx={{ p: 2, backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#64748b' }}>
                    Image {index + 1}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => handleRemoveImage(index)}
                    sx={{ color: '#dc2626' }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    {image.src && (
                      <CardMedia
                        component="img"
                        height="140"
                        image={image.src}
                        alt={image.alt}
                        sx={{ borderRadius: 1, mb: 2, objectFit: 'cover' }}
                      />
                    )}
                    <Box sx={{ display: 'flex', gap: 1, flexDirection: 'column' }}>
                      <Button
                        variant="outlined"
                        component="label"
                        size="small"
                        startIcon={<AddPhotoAlternateIcon />}
                        sx={{ borderColor: '#dc2626', color: '#dc2626', '&:hover': { borderColor: '#b91c1c' } }}
                      >
                        Upload New
                        <input
                          type="file"
                          hidden
                          accept="image/*"
                          onChange={(e) => handleImageUpload(e, index)}
                        />
                      </Button>
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<PhotoLibraryIcon />}
                        onClick={() => handleOpenFileBrowser(index)}
                        sx={{ backgroundColor: '#dc2626', '&:hover': { backgroundColor: '#b91c1c' } }}
                      >
                        Browse Files
                      </Button>
                      <Typography variant="caption" sx={{ color: '#64748b', px: 1, textAlign: 'center' }}>
                        Or paste URL below
                      </Typography>
                    </Box>
                  </Grid>

                  <Grid item xs={12} md={8}>
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Image URL"
                          value={image.src}
                          onChange={(e) => handleImageChange(index, 'src', e.target.value)}
                          placeholder="https://... or /uploads/..."
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Alt Text (for accessibility)"
                          value={image.alt}
                          onChange={(e) => handleImageChange(index, 'alt', e.target.value)}
                          placeholder="e.g., Handcrafted Solid Oak Dining Table"
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Title"
                          value={image.title || ''}
                          onChange={(e) => handleImageChange(index, 'title', e.target.value)}
                          placeholder="e.g., Solid Oak Dining Table"
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Description"
                          value={image.description || ''}
                          onChange={(e) => handleImageChange(index, 'description', e.target.value)}
                          placeholder="e.g., Handcrafted from premium oak"
                        />
                      </Grid>
                    </Grid>
                  </Grid>
                </Grid>
              </Card>
            </Grid>
          )) : (
            <Grid item xs={12}>
              <Alert severity="info">
                No carousel images yet. Click "Add Image" to get started.
              </Alert>
            </Grid>
          )}
        </Grid>
      </Paper>

      {/* File Browser Dialog */}
      <Dialog
        open={fileBrowserOpen}
        onClose={() => setFileBrowserOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PhotoLibraryIcon sx={{ color: '#dc2626' }} />
            <Typography variant="h6">Select Image from Files</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {/* Breadcrumbs */}
          <Box sx={{ mb: 2, p: 1, backgroundColor: '#f9fafb', borderRadius: 1 }}>
            <Breadcrumbs>
              {breadcrumbs.map((crumb, index) => (
                <Link
                  key={crumb.id || 'root'}
                  component="button"
                  variant="body2"
                  onClick={() => handleBreadcrumbClick(index)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    cursor: 'pointer',
                    textDecoration: 'none',
                    color: index === breadcrumbs.length - 1 ? '#dc2626' : 'text.primary',
                    fontWeight: index === breadcrumbs.length - 1 ? 600 : 400,
                    '&:hover': {
                      textDecoration: 'underline',
                    },
                  }}
                >
                  {index === 0 && <HomeIcon fontSize="small" />}
                  {crumb.name}
                </Link>
              ))}
            </Breadcrumbs>
          </Box>

          {loadingFiles ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : folders.length === 0 && backendFiles.length === 0 ? (
            <Alert severity="info">
              No folders or image files found. Upload some images to the file manager first.
            </Alert>
          ) : (
            <Box>
              {/* Folders */}
              {folders.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: '#64748b' }}>
                    Folders
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {folders.map((folder) => (
                      <Chip
                        key={folder.id}
                        icon={<FolderIcon />}
                        label={folder.name}
                        onClick={() => handleNavigateToFolder(folder)}
                        sx={{
                          cursor: 'pointer',
                          backgroundColor: '#fff',
                          border: '1px solid #e2e8f0',
                          '&:hover': {
                            backgroundColor: '#fef2f2',
                            borderColor: '#dc2626',
                          },
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              )}

              {/* Images */}
              {backendFiles.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: '#64748b' }}>
                    Images
                  </Typography>
                  <ImageList cols={3} gap={16}>
                    {backendFiles.map((file) => (
                      <ImageListItem
                        key={file.id}
                        sx={{
                          cursor: 'pointer',
                          border: '2px solid transparent',
                          borderRadius: 1,
                          overflow: 'hidden',
                          transition: 'all 0.2s',
                          '&:hover': {
                            borderColor: '#dc2626',
                            transform: 'scale(1.05)',
                          },
                        }}
                        onClick={() => handleSelectFile(file.url)}
                      >
                        <img
                          src={getFileUrl(file.url)}
                          alt={file.originalName}
                          loading="lazy"
                          style={{
                            height: 200,
                            objectFit: 'cover',
                          }}
                        />
                        <ImageListItemBar
                          title={file.originalName}
                          subtitle={`${(file.size / 1024).toFixed(1)} KB`}
                          actionIcon={
                            <IconButton sx={{ color: 'white' }}>
                              <CheckCircleIcon />
                            </IconButton>
                          }
                        />
                      </ImageListItem>
                    ))}
                  </ImageList>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFileBrowserOpen(false)}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PageEditor;
