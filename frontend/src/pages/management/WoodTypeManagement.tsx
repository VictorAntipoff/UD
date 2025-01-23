import React, { useState, useEffect } from 'react';
import {
  Container,
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
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Alert,
  Tooltip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { supabase } from '../../config/supabase';

interface WoodType {
  id: string;
  name: string;
  description: string | null;
  density: number | null;
  grade: 'A' | 'B' | 'C' | 'D';
  origin: string | null;
}

const defaultWoodType: WoodType = {
  id: '',
  name: '',
  description: null,
  density: null,
  grade: 'A',
  origin: null
};

const grades = ['A', 'B', 'C', 'D'];

export default function WoodTypeManagement() {
  const [woodTypes, setWoodTypes] = useState<WoodType[]>([]);
  const [open, setOpen] = useState(false);
  const [editingWoodType, setEditingWoodType] = useState<WoodType>(defaultWoodType);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchWoodTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('wood_types')
        .select('*')
        .order('name');

      if (error) throw error;
      setWoodTypes(data || []);
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

      if (editingWoodType.id) {
        // Update existing wood type
        const { error } = await supabase
          .from('wood_types')
          .update({
            name: editingWoodType.name,
            description: editingWoodType.description,
            density: editingWoodType.density,
            grade: editingWoodType.grade,
            origin: editingWoodType.origin
          })
          .eq('id', editingWoodType.id);

        if (error) throw error;
      } else {
        // Create new wood type
        const { error } = await supabase
          .from('wood_types')
          .insert([{
            name: editingWoodType.name,
            description: editingWoodType.description,
            density: editingWoodType.density,
            grade: editingWoodType.grade,
            origin: editingWoodType.origin
          }]);

        if (error) throw error;
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

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography 
          variant="h5" 
          component="h1"
          sx={{ 
            fontSize: '1.1rem',
            fontWeight: 500,
            color: '#2c3e50'
          }}
        >
          Wood Type Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpen()}
          sx={{
            backgroundColor: '#2c3e50',
            '&:hover': {
              backgroundColor: '#34495e'
            },
            fontSize: '0.85rem'
          }}
        >
          Add Wood Type
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper elevation={0} sx={{ border: '1px solid #e1e8ed', borderRadius: 2 }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.85rem' }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.85rem' }}>Grade</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.85rem' }}>Origin</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.85rem' }}>Density</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.85rem' }}>Description</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {woodTypes.map((woodType) => (
                <TableRow key={woodType.id} hover>
                  <TableCell sx={{ fontSize: '0.85rem' }}>{woodType.name}</TableCell>
                  <TableCell sx={{ fontSize: '0.85rem' }}>{woodType.grade}</TableCell>
                  <TableCell sx={{ fontSize: '0.85rem' }}>{woodType.origin || '-'}</TableCell>
                  <TableCell sx={{ fontSize: '0.85rem' }}>
                    {woodType.density ? `${woodType.density} kg/m³` : '-'}
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.85rem' }}>{woodType.description || '-'}</TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                      <Tooltip title="Edit">
                        <IconButton 
                          size="small" 
                          onClick={() => handleOpen(woodType)}
                          sx={{ 
                            padding: 0.5,
                            '&:hover': {
                              backgroundColor: '#f0f2f5'
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
                            '&:hover': {
                              backgroundColor: '#fee2e2',
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

      <Dialog 
        open={open} 
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontSize: '1rem', pb: 1 }}>
          {editingWoodType.id ? 'Edit Wood Type' : 'Add Wood Type'}
        </DialogTitle>
        <DialogContent sx={{ pb: 1 }}>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Name"
              value={editingWoodType.name}
              onChange={(e) => setEditingWoodType(prev => ({ ...prev, name: e.target.value }))}
              size="small"
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              select
              label="Grade"
              value={editingWoodType.grade}
              onChange={(e) => setEditingWoodType(prev => ({ ...prev, grade: e.target.value as 'A' | 'B' | 'C' | 'D' }))}
              size="small"
              sx={{ mb: 2 }}
            >
              {grades.map((grade) => (
                <MenuItem key={grade} value={grade}>
                  Grade {grade}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              fullWidth
              label="Origin"
              value={editingWoodType.origin || ''}
              onChange={(e) => setEditingWoodType(prev => ({ ...prev, origin: e.target.value }))}
              size="small"
              sx={{ mb: 2 }}
            />
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
              label="Description"
              value={editingWoodType.description || ''}
              onChange={(e) => setEditingWoodType(prev => ({ ...prev, description: e.target.value }))}
              size="small"
              multiline
              rows={3}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button 
            onClick={handleClose}
            sx={{ 
              fontSize: '0.85rem',
              color: '#64748b'
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
              fontSize: '0.85rem'
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
} 