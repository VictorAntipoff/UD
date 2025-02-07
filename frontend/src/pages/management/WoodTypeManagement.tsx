import { useState, useEffect, type FC } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Alert,
  Tooltip,
  Chip,
  CircularProgress,
  InputAdornment,
  Autocomplete,
  Stack
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CancelIcon from '@mui/icons-material/Cancel';
import ImageList from '@mui/material/ImageList';
import ImageListItem from '@mui/material/ImageListItem';
import { supabase } from '../../config/supabase';
import { SupabaseErrorBoundary } from '../../components/SupabaseErrorBoundary';
import { alpha } from '@mui/material/styles';
import { styled } from '@mui/material/styles';

interface WoodType {
  id: string;
  name: string;
  alternative_names: string[] | null;
  description: string | null;
  density: number | null;
  grade: 'A' | 'B' | 'C' | 'D';
  origin: string | null;
  price_range: {
    min: number;
    max: number;
  } | null;
  image_url: string | null;
  characteristics: {
    color: string | null;
    grain: string | null;
    durability: 'Low' | 'Medium' | 'High' | null;
    workability: 'Easy' | 'Moderate' | 'Difficult' | null;
    applications: string[] | null;
  };
  sustainability: {
    certification: string[] | null;
    growth_rate: 'Slow' | 'Medium' | 'Fast' | null;
    environmental_impact: string | null;
  };
  technical_data: {
    moisture_content: number | null;
    shrinkage: number | null;
    janka_hardness: number | null; // Hardness rating
  };
  images: string[];
}

const defaultWoodType: WoodType = {
  id: '',
  name: '',
  alternative_names: null,
  description: null,
  density: null,
  grade: 'A',
  origin: null,
  price_range: null,
  image_url: null,
  characteristics: {
    color: null,
    grain: null,
    durability: null,
    workability: null,
    applications: null
  },
  sustainability: {
    certification: null,
    growth_rate: null,
    environmental_impact: null
  },
  technical_data: {
    moisture_content: null,
    shrinkage: null,
    janka_hardness: null
  },
  images: []
};

const grades = ['A', 'B', 'C', 'D'];
const durabilityOptions = ['Low', 'Medium', 'High'];
const workabilityOptions = ['Easy', 'Moderate', 'Difficult'];
const growthRateOptions = ['Slow', 'Medium', 'Fast'];

const theme = {
  colors: {
    primary: {
      main: '#dc2626', // red-600
      light: '#ef4444', // red-500
      dark: '#b91c1c', // red-700
      contrastText: '#ffffff'
    },
    secondary: {
      main: '#f1f5f9', // slate-100
      hover: '#e2e8f0' // slate-200
    },
    text: {
      primary: '#334155', // slate-700
      secondary: '#64748b' // slate-500
    },
    border: '#e2e8f0', // slate-200
    error: {
      light: '#fecaca',
      main: '#ef4444',
      dark: '#dc2626'
    }
  },
  transitions: {
    standard: 'all 0.3s ease-in-out'
  }
};

const VisuallyHiddenInput = styled('input')({
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  bottom: 0,
  left: 0,
  whiteSpace: 'nowrap',
  width: 1,
});

const AlternativeNamesInput = ({ 
  value, 
  onChange 
}: { 
  value: string[] | null, 
  onChange: (newValue: string[]) => void 
}) => {
  const [inputValue, setInputValue] = useState('');

  return (
    <Autocomplete
      multiple
      freeSolo
      value={value || []}
      onChange={(_, newValue) => onChange(newValue)}
      inputValue={inputValue}
      onInputChange={(_, newInputValue) => setInputValue(newInputValue)}
      options={[]}
      renderTags={(value, getTagProps) =>
        value.map((option, index) => (
          <Chip
            {...getTagProps({ index })}
            key={index}
            label={option}
            onDelete={() => {
              const newValue = [...value];
              newValue.splice(index, 1);
              onChange(newValue);
            }}
            sx={{
              backgroundColor: alpha(theme.colors.primary.main, 0.1),
              color: theme.colors.primary.main,
              '& .MuiChip-deleteIcon': {
                color: theme.colors.primary.main,
                '&:hover': {
                  color: theme.colors.primary.dark
                }
              }
            }}
          />
        ))
      }
      renderInput={(params) => (
        <TextField
          {...params}
          size="small"
          label="Alternative Names"
          helperText="Press Enter to add a name"
        />
      )}
    />
  );
};

const ImageGallery = ({ 
  images, 
  onDelete 
}: { 
  images: string[], 
  onDelete: (index: number) => void 
}) => (
  <ImageList sx={{ width: '100%', height: 200 }} cols={3} rowHeight={164}>
    {images.map((img, index) => (
      <ImageListItem key={index} sx={{ position: 'relative' }}>
        <img
          src={img}
          alt={`Wood type ${index + 1}`}
          loading="lazy"
          style={{ 
            height: '100%', 
            width: '100%', 
            objectFit: 'cover' 
          }}
        />
        <IconButton
          size="small"
          onClick={() => onDelete(index)}
          sx={{
            position: 'absolute',
            top: 4,
            right: 4,
            backgroundColor: 'rgba(0,0,0,0.5)',
            '&:hover': {
              backgroundColor: 'rgba(0,0,0,0.7)'
            }
          }}
        >
          <CancelIcon sx={{ color: 'white', fontSize: '1.2rem' }} />
        </IconButton>
      </ImageListItem>
    ))}
  </ImageList>
);

const WoodTypeManagement: FC = () => {
  const [woodTypes, setWoodTypes] = useState<WoodType[]>([]);
  const [open, setOpen] = useState(false);
  const [editingWoodType, setEditingWoodType] = useState<WoodType>(defaultWoodType);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const currentFile = import.meta.url;

  const fetchWoodTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('wood_types')
        .select('*')
        .order('name');

      if (error) throw error;

      // Transform the data to match our interface
      const formattedData = (data || []).map(item => ({
        ...defaultWoodType,
        ...item,
        price_range: item.price_range || null,
        characteristics: {
          ...defaultWoodType.characteristics,
          ...(item.characteristics || {})
        },
        sustainability: {
          ...defaultWoodType.sustainability,
          ...(item.sustainability || {})
        },
        technical_data: {
          ...defaultWoodType.technical_data,
          ...(item.technical_data || {})
        }
      }));

      setWoodTypes(formattedData);
    } catch (error) {
      console.error('Error fetching wood types:', error);
      setError('Failed to load wood types');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWoodTypes();
  }, []);

  const handleOpen = (woodType: WoodType = defaultWoodType) => {
    setEditingWoodType(woodType);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingWoodType(defaultWoodType);
    setError(null);
  };

  const handleSave = async () => {
    try {
      if (!editingWoodType.name) {
        setError('Name is required');
        return;
      }

      // Format the data to match the database structure
      const woodTypeData = {
        name: editingWoodType.name,
        description: editingWoodType.description || null,
        density: editingWoodType.density || null,
        grade: editingWoodType.grade,
        origin: editingWoodType.origin || null,
        alternative_names: editingWoodType.alternative_names || [],
        price_range: editingWoodType.price_range?.min && editingWoodType.price_range?.max 
          ? {
              min: editingWoodType.price_range.min,
              max: editingWoodType.price_range.max
            }
          : null,
        images: editingWoodType.images || [],
        characteristics: {
          color: editingWoodType.characteristics?.color || null,
          grain: editingWoodType.characteristics?.grain || null,
          durability: editingWoodType.characteristics?.durability || null,
          workability: editingWoodType.characteristics?.workability || null,
          applications: editingWoodType.characteristics?.applications || []
        },
        sustainability: {
          certification: editingWoodType.sustainability?.certification || [],
          growth_rate: editingWoodType.sustainability?.growth_rate || null,
          environmental_impact: editingWoodType.sustainability?.environmental_impact || null
        },
        technical_data: {
          moisture_content: editingWoodType.technical_data?.moisture_content || null,
          shrinkage: editingWoodType.technical_data?.shrinkage || null,
          janka_hardness: editingWoodType.technical_data?.janka_hardness || null
        }
      };

      // Log the data being sent (for debugging)
      console.log('Saving wood type data:', woodTypeData);

      if (editingWoodType.id) {
        const { error } = await supabase
          .from('wood_types')
          .update(woodTypeData)
          .eq('id', editingWoodType.id);

        if (error) {
          console.error('Update error:', error);
          throw error;
        }
      } else {
        const { error } = await supabase
          .from('wood_types')
          .insert([woodTypeData]);

        if (error) {
          console.error('Insert error:', error);
          throw error;
        }
      }

      await fetchWoodTypes();
      handleClose();
    } catch (error) {
      console.error('Error saving wood type:', error);
      setError('Failed to save wood type');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this wood type?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('wood_types')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchWoodTypes();
    } catch (error) {
      console.error('Error deleting wood type:', error);
      setError('Failed to delete wood type');
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const files = event.target.files;
      if (!files) return;

      const uploadPromises = Array.from(files).map(async (file) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `wood-types/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('images')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('images')
          .getPublicUrl(filePath);

        return publicUrl;
      });

      const uploadedUrls = await Promise.all(uploadPromises);

      setEditingWoodType(prev => ({
        ...prev,
        images: [...(prev.images || []), ...uploadedUrls]
      }));

    } catch (error) {
      console.error('Error uploading images:', error);
      setError('Failed to upload images');
    }
  };

  const handleImageDelete = (index: number) => {
    setEditingWoodType(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  return (
    <SupabaseErrorBoundary>
      <Box sx={{ p: 3 }}>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3 
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography 
              variant="h5" 
              sx={{ 
                color: '#2c3e50',
                fontWeight: 500
              }}
            >
              Wood Types Management
            </Typography>
            {import.meta.env.DEV && (
              <Tooltip 
                title={`File: ${currentFile.split('/src/')[1]}`}
                arrow
              >
                <Chip
                  label="Development"
                  size="small"
                  sx={{
                    backgroundColor: '#fbbf24',
                    color: '#78350f',
                    '& .MuiChip-label': {
                      fontWeight: 600
                    },
                    cursor: 'help'
                  }}
                />
              </Tooltip>
            )}
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpen()}
            sx={{
              backgroundColor: '#2c3e50',
              '&:hover': {
                backgroundColor: '#34495e'
              },
              fontSize: '0.85rem',
              textTransform: 'none'
            }}
          >
            Add Wood Type
          </Button>
        </Box>

        {error && (
          <Alert 
            severity="error" 
            sx={{ 
              mb: 3,
              '& .MuiAlert-message': {
                fontSize: '0.875rem'
              }
            }}
          >
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={24} sx={{ color: '#2c3e50' }} />
          </Box>
        ) : (
          <Paper 
            elevation={0} 
            sx={{ 
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
              overflow: 'hidden'
            }}
          >
            <TableContainer>
              <Table size="small" sx={{
                '& .MuiTableCell-root': {
                  fontSize: '0.875rem',
                  py: 1.5,
                  px: 2,
                  transition: theme.transitions.standard
                },
                '& .MuiTableCell-head': {
                  fontWeight: 600,
                  backgroundColor: alpha(theme.colors.primary.main, 0.03),
                  color: theme.colors.text.primary,
                  py: 1.25
                },
                '& .MuiTableRow-root': {
                  transition: theme.transitions.standard,
                  '&:hover': {
                    backgroundColor: alpha(theme.colors.primary.main, 0.02)
                  },
                  '&:hover .action-buttons': {
                    opacity: 1,
                    transform: 'translateX(0)'
                  }
                }
              }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Wood Type</TableCell>
                    <TableCell>Properties</TableCell>
                    <TableCell>Technical Data</TableCell>
                    <TableCell>Price Range</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {woodTypes.map((woodType) => (
                    <TableRow key={woodType.id}>
                      <TableCell>
                        <Box>
                          <Typography sx={{ 
                            fontWeight: 500, 
                            color: theme.colors.text.primary,
                            fontSize: '0.875rem'
                          }}>
                            {woodType.name}
                          </Typography>
                          {woodType.alternative_names && woodType.alternative_names.length > 0 && (
                            <Typography 
                              variant="caption" 
                              sx={{ 
                                color: theme.colors.text.secondary,
                                display: 'block',
                                mt: 0.5
                              }}
                            >
                              Also: {woodType.alternative_names.join(', ')}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1}>
                          {woodType.characteristics.durability && (
                            <Chip
                              label={woodType.characteristics.durability}
                              size="small"
                              sx={{
                                backgroundColor: alpha(theme.colors.primary.main, 0.1),
                                color: theme.colors.primary.main,
                                fontSize: '0.75rem'
                              }}
                            />
                          )}
                          {woodType.grade && (
                            <Chip
                              label={`Grade ${woodType.grade}`}
                              size="small"
                              sx={{
                                backgroundColor: theme.colors.secondary.main,
                                color: theme.colors.text.primary,
                                fontSize: '0.75rem'
                              }}
                            />
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Stack spacing={0.5}>
                          {woodType.density && (
                            <Typography variant="caption">
                              Density: {woodType.density} kg/m³
                            </Typography>
                          )}
                          {woodType.technical_data.moisture_content && (
                            <Typography variant="caption">
                              Moisture: {woodType.technical_data.moisture_content}%
                            </Typography>
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        {woodType.price_range?.min != null && woodType.price_range?.max != null ? (
                          <Typography variant="body2" sx={{ color: theme.colors.primary.main }}>
                            TZS {woodType.price_range.min.toLocaleString()} - {woodType.price_range.max.toLocaleString()}/m³
                          </Typography>
                        ) : (
                          <Typography variant="body2" sx={{ color: theme.colors.text.secondary }}>
                            Not specified
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Box 
                          className="action-buttons"
                          sx={{ 
                            display: 'flex', 
                            justifyContent: 'flex-end', 
                            gap: 1,
                            opacity: 0.4,
                            transform: 'translateX(10px)',
                            transition: theme.transitions.standard
                          }}
                        >
                          <Tooltip title="Edit">
                            <IconButton 
                              size="small" 
                              onClick={() => handleOpen(woodType)}
                              sx={{ 
                                padding: 0.5,
                                color: '#64748b',
                                '&:hover': {
                                  backgroundColor: '#f1f5f9',
                                  color: '#2c3e50'
                                }
                              }}
                            >
                              <EditIcon sx={{ fontSize: '1.1rem' }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton 
                              size="small"
                              onClick={() => handleDelete(woodType.id)}
                              sx={{ 
                                padding: 0.5,
                                color: '#64748b',
                                '&:hover': {
                                  backgroundColor: '#fef2f2',
                                  color: '#ef4444'
                                }
                              }}
                            >
                              <DeleteIcon sx={{ fontSize: '1.1rem' }} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}

        <Dialog 
          open={open} 
          onClose={handleClose}
          maxWidth="lg"
          fullWidth
          PaperProps={{
            elevation: 0,
            sx: {
              borderRadius: 2,
              border: `1px solid ${theme.colors.border}`,
              overflow: 'hidden',
              animation: 'fadeIn 0.3s ease-out',
              '@keyframes fadeIn': {
                from: {
                  opacity: 0,
                  transform: 'translateY(-20px)'
                },
                to: {
                  opacity: 1,
                  transform: 'translateY(0)'
                }
              }
            }
          }}
        >
          <DialogTitle sx={{ 
            fontSize: '1.25rem', 
            fontWeight: 600,
            color: theme.colors.text.primary,
            borderBottom: `1px solid ${theme.colors.border}`,
            pb: 2,
            backgroundColor: alpha(theme.colors.primary.main, 0.03)
          }}>
            {editingWoodType.id ? 'Edit Wood Type' : 'Add Wood Type'}
          </DialogTitle>
          <DialogContent sx={{ 
            py: 4,
            px: 4,
            backgroundColor: '#ffffff'
          }}>
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: 4,
              '& .section-title': {
                fontSize: '0.95rem',
                fontWeight: 600,
                color: theme.colors.primary.main,
                mb: 2,
                display: 'flex',
                alignItems: 'center',
                '&::before': {
                  content: '""',
                  width: 4,
                  height: 4,
                  borderRadius: '50%',
                  backgroundColor: theme.colors.primary.main,
                  mr: 1
                }
              },
              '& .MuiTextField-root': {
                transition: theme.transitions.standard,
                '& .MuiOutlinedInput-root': {
                  '&:hover fieldset': {
                    borderColor: theme.colors.primary.light
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: theme.colors.primary.main
                  }
                }
              }
            }}>
              {/* Basic Information Section */}
              <Box>
                <Typography className="section-title">
                  Basic Information
                </Typography>
                <TextField
                  fullWidth
                  label="Name"
                  value={editingWoodType.name}
                  onChange={(e) => setEditingWoodType(prev => ({ ...prev, name: e.target.value }))}
                  size="small"
                  sx={{ mb: 2 }}
                />
                <Box sx={{ mb: 2 }}>
                  <AlternativeNamesInput
                    value={editingWoodType.alternative_names}
                    onChange={(newValue) => setEditingWoodType(prev => ({
                      ...prev,
                      alternative_names: newValue
                    }))}
                  />
                </Box>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
                  <TextField
                    fullWidth
                    label="Min Price/m³"
                    type="number"
                    value={editingWoodType.price_range?.min ?? ''}
                    onChange={(e) => setEditingWoodType(prev => ({
                      ...prev,
                      price_range: {
                        ...prev.price_range,
                        min: e.target.value === '' ? null : Number(e.target.value)
                      }
                    } as WoodType))}
                    size="small"
                    InputProps={{
                      startAdornment: <InputAdornment position="start">TZS</InputAdornment>
                    }}
                  />
                  <TextField
                    fullWidth
                    label="Max Price/m³"
                    type="number"
                    value={editingWoodType.price_range?.max ?? ''}
                    onChange={(e) => setEditingWoodType(prev => ({
                      ...prev,
                      price_range: {
                        ...prev.price_range,
                        max: e.target.value === '' ? null : Number(e.target.value)
                      }
                    } as WoodType))}
                    size="small"
                    InputProps={{
                      startAdornment: <InputAdornment position="start">TZS</InputAdornment>
                    }}
                  />
                </Box>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Description"
                  value={editingWoodType.description || ''}
                  onChange={(e) => setEditingWoodType(prev => ({ ...prev, description: e.target.value }))}
                  size="small"
                  sx={{ mb: 2 }}
                />
              </Box>

              {/* Characteristics Section */}
              <Box>
                <Typography className="section-title">
                  Characteristics
                </Typography>
                <TextField
                  fullWidth
                  label="Color"
                  value={editingWoodType.characteristics.color || ''}
                  onChange={(e) => setEditingWoodType(prev => ({
                    ...prev,
                    characteristics: { ...prev.characteristics, color: e.target.value }
                  }))}
                  size="small"
                  sx={{ mb: 2 }}
                />
                <TextField
                  fullWidth
                  label="Grain Pattern"
                  value={editingWoodType.characteristics.grain || ''}
                  onChange={(e) => setEditingWoodType(prev => ({
                    ...prev,
                    characteristics: { ...prev.characteristics, grain: e.target.value }
                  }))}
                  size="small"
                  sx={{ mb: 2 }}
                />
                <TextField
                  fullWidth
                  select
                  label="Durability"
                  value={editingWoodType.characteristics.durability || ''}
                  onChange={(e) => setEditingWoodType(prev => ({
                    ...prev,
                    characteristics: { ...prev.characteristics, durability: e.target.value as any }
                  }))}
                  size="small"
                  sx={{ mb: 2 }}
                >
                  {durabilityOptions.map(option => (
                    <MenuItem key={option} value={option}>{option}</MenuItem>
                  ))}
                </TextField>
                <TextField
                  fullWidth
                  label="Applications"
                  value={editingWoodType.characteristics.applications?.join(', ') || ''}
                  onChange={(e) => setEditingWoodType(prev => ({
                    ...prev,
                    characteristics: {
                      ...prev.characteristics,
                      applications: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                    }
                  }))}
                  size="small"
                  helperText="Separate applications with commas"
                  sx={{ mb: 2 }}
                />
                <TextField
                  fullWidth
                  select
                  label="Workability"
                  value={editingWoodType.characteristics.workability || ''}
                  onChange={(e) => setEditingWoodType(prev => ({
                    ...prev,
                    characteristics: { 
                      ...prev.characteristics, 
                      workability: e.target.value as 'Easy' | 'Moderate' | 'Difficult' 
                    }
                  }))}
                  size="small"
                  sx={{ mb: 2 }}
                >
                  {workabilityOptions.map(option => (
                    <MenuItem key={option} value={option}>{option}</MenuItem>
                  ))}
                </TextField>
              </Box>

              {/* Technical Data Section */}
              <Box>
                <Typography className="section-title">
                  Technical Data
                </Typography>
                <TextField
                  fullWidth
                  label="Density (kg/m³)"
                  type="number"
                  value={editingWoodType.density || ''}
                  onChange={(e) => setEditingWoodType(prev => ({ ...prev, density: parseFloat(e.target.value) || null }))}
                  size="small"
                  sx={{ mb: 2 }}
                />
                <TextField
                  fullWidth
                  label="Moisture Content (%)"
                  type="number"
                  value={editingWoodType.technical_data.moisture_content || ''}
                  onChange={(e) => setEditingWoodType(prev => ({
                    ...prev,
                    technical_data: { ...prev.technical_data, moisture_content: parseFloat(e.target.value) || null }
                  }))}
                  size="small"
                  sx={{ mb: 2 }}
                />
                <TextField
                  fullWidth
                  label="Janka Hardness"
                  type="number"
                  value={editingWoodType.technical_data.janka_hardness || ''}
                  onChange={(e) => setEditingWoodType(prev => ({
                    ...prev,
                    technical_data: { ...prev.technical_data, janka_hardness: parseFloat(e.target.value) || null }
                  }))}
                  size="small"
                  sx={{ mb: 2 }}
                />
              </Box>

              {/* Sustainability Section */}
              <Box>
                <Typography className="section-title">
                  Sustainability
                </Typography>
                <TextField
                  fullWidth
                  label="Certifications"
                  value={editingWoodType.sustainability.certification?.join(', ') || ''}
                  onChange={(e) => setEditingWoodType(prev => ({
                    ...prev,
                    sustainability: {
                      ...prev.sustainability,
                      certification: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                    }
                  }))}
                  size="small"
                  helperText="Separate certifications with commas"
                  sx={{ mb: 2 }}
                />
                <TextField
                  fullWidth
                  select
                  label="Growth Rate"
                  value={editingWoodType.sustainability.growth_rate || ''}
                  onChange={(e) => setEditingWoodType(prev => ({
                    ...prev,
                    sustainability: { ...prev.sustainability, growth_rate: e.target.value as any }
                  }))}
                  size="small"
                  sx={{ mb: 2 }}
                >
                  {growthRateOptions.map(option => (
                    <MenuItem key={option} value={option}>{option}</MenuItem>
                  ))}
                </TextField>
              </Box>

              {/* Image Section */}
              <Box sx={{ mb: 2 }}>
                <Typography className="section-title">
                  Wood Images
                </Typography>
                <Stack spacing={2}>
                  <Button
                    component="label"
                    variant="outlined"
                    startIcon={<CloudUploadIcon />}
                    sx={{
                      borderColor: theme.colors.border,
                      color: theme.colors.text.primary,
                      '&:hover': {
                        borderColor: theme.colors.primary.main,
                        backgroundColor: alpha(theme.colors.primary.main, 0.04)
                      }
                    }}
                  >
                    Upload Images
                    <VisuallyHiddenInput 
                      type="file" 
                      onChange={handleImageUpload} 
                      accept="image/*"
                      multiple 
                    />
                  </Button>
                  {editingWoodType.images.length > 0 && (
                    <ImageGallery 
                      images={editingWoodType.images} 
                      onDelete={handleImageDelete} 
                    />
                  )}
                </Stack>
              </Box>
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button 
              onClick={handleClose}
              sx={{ 
                fontSize: '0.85rem',
                color: '#64748b',
                textTransform: 'none'
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              variant="contained"
              sx={{
                backgroundColor: '#2c3e50',
                '&:hover': {
                  backgroundColor: '#34495e'
                },
                fontSize: '0.85rem',
                textTransform: 'none'
              }}
            >
              Save
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </SupabaseErrorBoundary>
  );
};

export default WoodTypeManagement; 