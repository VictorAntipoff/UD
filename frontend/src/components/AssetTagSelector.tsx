import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Box,
  Typography,
  CircularProgress,
  InputAdornment,
  Chip
} from '@mui/material';
import { Search as SearchIcon, Tag as TagIcon } from '@mui/icons-material';
import { useState, useEffect } from 'react';
import api from '../lib/api';

interface AssetTagSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (assetTag: string) => void;
  currentTag?: string;
}

const AssetTagSelector = ({ open, onClose, onSelect, currentTag }: AssetTagSelectorProps) => {
  const [tags, setTags] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchUnallocatedTags();
    }
  }, [open]);

  const fetchUnallocatedTags = async () => {
    try {
      setLoading(true);
      const response = await api.get('/assets/unallocated-tags');
      setTags(response.data.tags);
    } catch (error) {
      console.error('Error fetching unallocated tags:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTags = tags.filter(tag =>
    tag.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (tag: string) => {
    onSelect(tag);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{
        fontWeight: 600,
        color: '#1e293b',
        borderBottom: '1px solid #e2e8f0',
        pb: 2
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TagIcon sx={{ color: '#dc2626' }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Select Asset Tag
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.875rem', mt: 1 }}>
          Choose from available unallocated asset tags
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        {/* Search Box */}
        <Box sx={{ p: 2, borderBottom: '1px solid #e2e8f0' }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search asset tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: '#94a3b8', fontSize: '1.25rem' }} />
                </InputAdornment>
              )
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                fontSize: '0.875rem',
                '& fieldset': { borderColor: '#e2e8f0' },
                '&:hover fieldset': { borderColor: '#dc2626' },
                '&.Mui-focused fieldset': { borderColor: '#dc2626' }
              }
            }}
          />
        </Box>

        {/* Tags List */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress sx={{ color: '#dc2626' }} />
          </Box>
        ) : filteredTags.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4, px: 2 }}>
            <TagIcon sx={{ fontSize: 48, color: '#cbd5e1', mb: 1 }} />
            <Typography sx={{ color: '#94a3b8', fontSize: '0.875rem' }}>
              {searchTerm ? 'No tags match your search' : 'No unallocated tags available'}
            </Typography>
          </Box>
        ) : (
          <List sx={{ maxHeight: 400, overflow: 'auto', py: 0 }}>
            {filteredTags.map((tag) => (
              <ListItem key={tag} disablePadding>
                <ListItemButton
                  onClick={() => handleSelect(tag)}
                  sx={{
                    py: 1.5,
                    px: 2,
                    borderBottom: '1px solid #f1f5f9',
                    '&:hover': {
                      backgroundColor: '#fef2f2'
                    }
                  }}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip
                          label={tag}
                          size="small"
                          sx={{
                            backgroundColor: tag === currentTag ? '#dc2626' : '#f1f5f9',
                            color: tag === currentTag ? '#fff' : '#475569',
                            fontWeight: 600,
                            fontSize: '0.875rem'
                          }}
                        />
                        {tag === currentTag && (
                          <Typography sx={{ fontSize: '0.75rem', color: '#64748b' }}>
                            (Current)
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}

        {/* Stats */}
        {!loading && filteredTags.length > 0 && (
          <Box sx={{ px: 2, py: 1.5, backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
            <Typography sx={{ fontSize: '0.75rem', color: '#64748b' }}>
              {filteredTags.length} unallocated tag{filteredTags.length !== 1 ? 's' : ''} available
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, borderTop: '1px solid #e2e8f0' }}>
        <Button
          onClick={onClose}
          sx={{
            color: '#64748b',
            textTransform: 'none'
          }}
        >
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AssetTagSelector;
