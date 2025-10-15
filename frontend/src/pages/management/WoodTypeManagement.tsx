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
  Stack,
  Container
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CancelIcon from '@mui/icons-material/Cancel';
import ForestIcon from '@mui/icons-material/Forest';
import ImageList from '@mui/material/ImageList';
import ImageListItem from '@mui/material/ImageListItem';
import { alpha } from '@mui/material/styles';
import api from '../../lib/api';
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
    janka_hardness: number | null;
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

const StyledContainer = styled(Container)(({ theme }) => ({
  minHeight: '100vh',
  paddingTop: theme.spacing(4),
  paddingBottom: theme.spacing(4),
  backgroundColor: '#f8fafc',
}));

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

const textFieldSx = {
  '& .MuiOutlinedInput-root': {
    '& fieldset': {
      borderColor: 'rgba(0, 0, 0, 0.12)',
    },
    '&:hover fieldset': {
      borderColor: '#dc2626',
    },
    '&.Mui-focused fieldset': {
      borderColor: '#dc2626',
    },
    fontSize: '0.875rem',
  },
  '& .MuiInputLabel-root': {
    color: 'rgba(0, 0, 0, 0.6)',
    fontSize: '0.875rem',
    '&.Mui-focused': {
      color: '#dc2626',
    },
  },
};

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
              backgroundColor: alpha('#dc2626', 0.1),
              color: '#dc2626',
              fontSize: '0.75rem',
              height: '24px',
              '& .MuiChip-deleteIcon': {
                color: '#dc2626',
                fontSize: '1rem',
                '&:hover': {
                  color: '#b91c1c'
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
          sx={textFieldSx}
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
            objectFit: 'cover',
            borderRadius: '8px'
          }}
        />
        <IconButton
          size="small"
          onClick={() => onDelete(index)}
          sx={{
            position: 'absolute',
            top: 4,
            right: 4,
            backgroundColor: 'rgba(0,0,0,0.6)',
            '&:hover': {
              backgroundColor: 'rgba(0,0,0,0.8)'
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

  const fetchWoodTypes = async () => {
    try {
      const response = await api.get('/factory/wood-types');
      setWoodTypes(response.data || []);
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
        characteristics: editingWoodType.characteristics || {},
        sustainability: editingWoodType.sustainability || {},
        technical_data: editingWoodType.technical_data || {}
      };

      if (editingWoodType.id) {
        await api.put(`/factory/wood-types/${editingWoodType.id}`, woodTypeData);
      } else {
        await api.post('/factory/wood-types', woodTypeData);
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
      await api.delete(`/factory/wood-types/${id}`);
      await fetchWoodTypes();
      setError(null);
    } catch (error: any) {
      console.error('Error deleting wood type:', error);
      if (error.response?.status === 400 && error.response?.data?.error) {
        setError(error.response.data.error);
      } else if (error.response?.data?.error) {
        setError(error.response.data.error);
      } else {
        setError('Failed to delete wood type. It may be in use by calculations or processes.');
      }
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const files = event.target.files;
      if (!files) return;

      console.log('Image upload temporarily disabled - backend API needed');
      setError('Image upload not yet implemented with backend API');

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

  const getStatusColor = (grade: string) => {
    switch (grade) {
      case 'A': return { bg: '#dcfce7', color: '#166534' };
      case 'B': return { bg: '#dbeafe', color: '#1e40af' };
      case 'C': return { bg: '#fef3c7', color: '#92400e' };
      case 'D': return { bg: '#fee2e2', color: '#991b1b' };
      default: return { bg: '#f1f5f9', color: '#475569' };
    }
  };

  return (
    <StyledContainer maxWidth="xl">
      {/* Header */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
          borderRadius: 2,
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ForestIcon sx={{ fontSize: 28, color: 'white' }} />
            </Box>
            <Box>
              <Typography
                variant="h4"
                sx={{
                  color: 'white',
                  fontWeight: 700,
                  fontSize: '1.75rem',
                  letterSpacing: '-0.025em',
                }}
              >
                Wood Types Management
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontSize: '0.875rem',
                  mt: 0.5,
                }}
              >
                Manage wood types, properties, and technical specifications
              </Typography>
            </Box>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpen()}
            sx={{
              backgroundColor: 'white',
              color: '#dc2626',
              fontWeight: 600,
              fontSize: '0.875rem',
              textTransform: 'none',
              px: 3,
              py: 1,
              borderRadius: 2,
              boxShadow: 'none',
              '&:hover': {
                backgroundColor: '#f8fafc',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                transform: 'translateY(-2px)',
              },
              transition: 'all 0.2s ease',
            }}
          >
            Add Wood Type
          </Button>
        </Box>
      </Paper>

      {error && (
        <Alert
          severity="error"
          onClose={() => setError(null)}
          sx={{
            mb: 3,
            borderRadius: 2,
            '& .MuiAlert-message': {
              fontSize: '0.875rem'
            }
          }}
        >
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress sx={{ color: '#dc2626' }} />
        </Box>
      ) : woodTypes.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            p: 8,
            textAlign: 'center',
            borderRadius: 2,
            border: '2px dashed #e2e8f0',
            backgroundColor: 'white',
          }}
        >
          <ForestIcon sx={{ fontSize: 64, color: '#cbd5e1', mb: 2 }} />
          <Typography variant="h6" sx={{ color: '#64748b', mb: 1, fontWeight: 500 }}>
            No wood types yet
          </Typography>
          <Typography variant="body2" sx={{ color: '#94a3b8', mb: 3 }}>
            Get started by adding your first wood type
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpen()}
            sx={{
              backgroundColor: '#dc2626',
              '&:hover': {
                backgroundColor: '#b91c1c',
              },
              textTransform: 'none',
              fontWeight: 600,
            }}
          >
            Add Wood Type
          </Button>
        </Paper>
      ) : (
        <Paper
          elevation={0}
          sx={{
            borderRadius: 2,
            overflow: 'hidden',
            border: '1px solid #e2e8f0',
            backgroundColor: 'white',
          }}
        >
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f8fafc' }}>
                  <TableCell sx={{ fontWeight: 600, color: '#334155', fontSize: '0.875rem' }}>
                    Wood Type
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#334155', fontSize: '0.875rem' }}>
                    Grade
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#334155', fontSize: '0.875rem' }}>
                    Properties
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#334155', fontSize: '0.875rem' }}>
                    Technical Data
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#334155', fontSize: '0.875rem' }}>
                    Price Range
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, color: '#334155', fontSize: '0.875rem' }}>
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {woodTypes.map((woodType) => {
                  const gradeColors = getStatusColor(woodType.grade);
                  return (
                    <TableRow
                      key={woodType.id}
                      sx={{
                        '&:hover': {
                          backgroundColor: '#f8fafc',
                        },
                        transition: 'background-color 0.2s ease',
                      }}
                    >
                      <TableCell>
                        <Box>
                          <Typography
                            sx={{
                              fontWeight: 600,
                              color: '#1e293b',
                              fontSize: '0.875rem',
                              mb: 0.5,
                            }}
                          >
                            {woodType.name}
                          </Typography>
                          {woodType.alternative_names && woodType.alternative_names.length > 0 && (
                            <Typography
                              variant="caption"
                              sx={{
                                color: '#64748b',
                                fontSize: '0.75rem',
                              }}
                            >
                              Also: {woodType.alternative_names.join(', ')}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={`Grade ${woodType.grade}`}
                          size="small"
                          sx={{
                            backgroundColor: gradeColors.bg,
                            color: gradeColors.color,
                            fontWeight: 600,
                            fontSize: '0.75rem',
                            height: '24px',
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                          {woodType.characteristics?.durability && (
                            <Chip
                              label={`${woodType.characteristics.durability} Durability`}
                              size="small"
                              sx={{
                                backgroundColor: alpha('#dc2626', 0.08),
                                color: '#dc2626',
                                fontSize: '0.75rem',
                                height: '24px',
                                fontWeight: 500,
                              }}
                            />
                          )}
                          {woodType.characteristics?.workability && (
                            <Chip
                              label={woodType.characteristics.workability}
                              size="small"
                              sx={{
                                backgroundColor: '#f1f5f9',
                                color: '#64748b',
                                fontSize: '0.75rem',
                                height: '24px',
                                fontWeight: 500,
                              }}
                            />
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Stack spacing={0.5}>
                          {woodType.density && (
                            <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.75rem' }}>
                              <strong>Density:</strong> {woodType.density} kg/m³
                            </Typography>
                          )}
                          {woodType.technical_data?.moisture_content && (
                            <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.75rem' }}>
                              <strong>Moisture:</strong> {woodType.technical_data.moisture_content}%
                            </Typography>
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        {woodType.price_range?.min != null && woodType.price_range?.max != null ? (
                          <Typography
                            variant="body2"
                            sx={{
                              color: '#dc2626',
                              fontWeight: 600,
                              fontSize: '0.875rem',
                            }}
                          >
                            TZS {woodType.price_range.min.toLocaleString()} - {woodType.price_range.max.toLocaleString()}
                          </Typography>
                        ) : (
                          <Typography variant="body2" sx={{ color: '#94a3b8', fontSize: '0.875rem' }}>
                            Not specified
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                          <Tooltip title="Edit">
                            <IconButton
                              size="small"
                              onClick={() => handleOpen(woodType)}
                              sx={{
                                color: '#64748b',
                                '&:hover': {
                                  backgroundColor: alpha('#dc2626', 0.08),
                                  color: '#dc2626',
                                },
                              }}
                            >
                              <EditIcon sx={{ fontSize: '1.25rem' }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              onClick={() => handleDelete(woodType.id)}
                              sx={{
                                color: '#64748b',
                                '&:hover': {
                                  backgroundColor: alpha('#dc2626', 0.08),
                                  color: '#dc2626',
                                },
                              }}
                            >
                              <DeleteIcon sx={{ fontSize: '1.25rem' }} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Edit/Add Dialog */}
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            maxHeight: '90vh',
          }
        }}
      >
        <DialogTitle
          sx={{
            fontSize: '1.25rem',
            fontWeight: 700,
            color: '#1e293b',
            borderBottom: '1px solid #e2e8f0',
            pb: 2,
          }}
        >
          {editingWoodType.id ? 'Edit Wood Type' : 'Add Wood Type'}
        </DialogTitle>
        <DialogContent sx={{ py: 3, px: 3 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3, mt: 1 }}>
            {/* Basic Information */}
            <Box>
              <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155', mb: 2 }}>
                Basic Information
              </Typography>
              <Stack spacing={2}>
                <TextField
                  fullWidth
                  label="Name"
                  required
                  value={editingWoodType.name}
                  onChange={(e) => setEditingWoodType(prev => ({ ...prev, name: e.target.value }))}
                  size="small"
                  sx={textFieldSx}
                />
                <AlternativeNamesInput
                  value={editingWoodType.alternative_names}
                  onChange={(newValue) => setEditingWoodType(prev => ({
                    ...prev,
                    alternative_names: newValue
                  }))}
                />
                <TextField
                  fullWidth
                  select
                  label="Grade"
                  value={editingWoodType.grade}
                  onChange={(e) => setEditingWoodType(prev => ({ ...prev, grade: e.target.value as any }))}
                  size="small"
                  sx={textFieldSx}
                >
                  {grades.map(grade => (
                    <MenuItem key={grade} value={grade}>Grade {grade}</MenuItem>
                  ))}
                </TextField>
                <TextField
                  fullWidth
                  label="Origin"
                  value={editingWoodType.origin || ''}
                  onChange={(e) => setEditingWoodType(prev => ({ ...prev, origin: e.target.value }))}
                  size="small"
                  sx={textFieldSx}
                />
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Description"
                  value={editingWoodType.description || ''}
                  onChange={(e) => setEditingWoodType(prev => ({ ...prev, description: e.target.value }))}
                  size="small"
                  sx={textFieldSx}
                />
              </Stack>
            </Box>

            {/* Price Range */}
            <Box>
              <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155', mb: 2 }}>
                Pricing
              </Typography>
              <Stack spacing={2}>
                <TextField
                  fullWidth
                  label="Min Price per m³"
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
                  sx={textFieldSx}
                />
                <TextField
                  fullWidth
                  label="Max Price per m³"
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
                  sx={textFieldSx}
                />
              </Stack>
            </Box>

            {/* Characteristics */}
            <Box>
              <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155', mb: 2 }}>
                Characteristics
              </Typography>
              <Stack spacing={2}>
                <TextField
                  fullWidth
                  label="Color"
                  value={editingWoodType.characteristics?.color || ''}
                  onChange={(e) => setEditingWoodType(prev => ({
                    ...prev,
                    characteristics: { ...prev.characteristics, color: e.target.value }
                  }))}
                  size="small"
                  sx={textFieldSx}
                />
                <TextField
                  fullWidth
                  label="Grain Pattern"
                  value={editingWoodType.characteristics?.grain || ''}
                  onChange={(e) => setEditingWoodType(prev => ({
                    ...prev,
                    characteristics: { ...prev.characteristics, grain: e.target.value }
                  }))}
                  size="small"
                  sx={textFieldSx}
                />
                <TextField
                  fullWidth
                  select
                  label="Durability"
                  value={editingWoodType.characteristics?.durability || ''}
                  onChange={(e) => setEditingWoodType(prev => ({
                    ...prev,
                    characteristics: { ...prev.characteristics, durability: e.target.value as any }
                  }))}
                  size="small"
                  sx={textFieldSx}
                >
                  {durabilityOptions.map(option => (
                    <MenuItem key={option} value={option}>{option}</MenuItem>
                  ))}
                </TextField>
                <TextField
                  fullWidth
                  select
                  label="Workability"
                  value={editingWoodType.characteristics?.workability || ''}
                  onChange={(e) => setEditingWoodType(prev => ({
                    ...prev,
                    characteristics: {
                      ...prev.characteristics,
                      workability: e.target.value as 'Easy' | 'Moderate' | 'Difficult'
                    }
                  }))}
                  size="small"
                  sx={textFieldSx}
                >
                  {workabilityOptions.map(option => (
                    <MenuItem key={option} value={option}>{option}</MenuItem>
                  ))}
                </TextField>
              </Stack>
            </Box>

            {/* Technical Data */}
            <Box>
              <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155', mb: 2 }}>
                Technical Data
              </Typography>
              <Stack spacing={2}>
                <TextField
                  fullWidth
                  label="Density"
                  type="number"
                  value={editingWoodType.density || ''}
                  onChange={(e) => setEditingWoodType(prev => ({ ...prev, density: parseFloat(e.target.value) || null }))}
                  size="small"
                  InputProps={{
                    endAdornment: <InputAdornment position="end">kg/m³</InputAdornment>
                  }}
                  sx={textFieldSx}
                />
                <TextField
                  fullWidth
                  label="Moisture Content"
                  type="number"
                  value={editingWoodType.technical_data?.moisture_content || ''}
                  onChange={(e) => setEditingWoodType(prev => ({
                    ...prev,
                    technical_data: { ...prev.technical_data, moisture_content: parseFloat(e.target.value) || null }
                  }))}
                  size="small"
                  InputProps={{
                    endAdornment: <InputAdornment position="end">%</InputAdornment>
                  }}
                  sx={textFieldSx}
                />
                <TextField
                  fullWidth
                  label="Janka Hardness"
                  type="number"
                  value={editingWoodType.technical_data?.janka_hardness || ''}
                  onChange={(e) => setEditingWoodType(prev => ({
                    ...prev,
                    technical_data: { ...prev.technical_data, janka_hardness: parseFloat(e.target.value) || null }
                  }))}
                  size="small"
                  sx={textFieldSx}
                />
                <TextField
                  fullWidth
                  select
                  label="Growth Rate"
                  value={editingWoodType.sustainability?.growth_rate || ''}
                  onChange={(e) => setEditingWoodType(prev => ({
                    ...prev,
                    sustainability: { ...prev.sustainability, growth_rate: e.target.value as any }
                  }))}
                  size="small"
                  sx={textFieldSx}
                >
                  {growthRateOptions.map(option => (
                    <MenuItem key={option} value={option}>{option}</MenuItem>
                  ))}
                </TextField>
              </Stack>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, pt: 2, borderTop: '1px solid #e2e8f0' }}>
          <Button
            onClick={handleClose}
            sx={{
              color: '#64748b',
              textTransform: 'none',
              fontWeight: 600,
              '&:hover': {
                backgroundColor: '#f1f5f9',
              },
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            sx={{
              backgroundColor: '#dc2626',
              textTransform: 'none',
              fontWeight: 600,
              px: 3,
              '&:hover': {
                backgroundColor: '#b91c1c',
              },
            }}
          >
            {editingWoodType.id ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </StyledContainer>
  );
};

export default WoodTypeManagement;
