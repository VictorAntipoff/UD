import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  Box,
  Grid,
  Card,
  CardMedia,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  IconButton,
  Chip
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import api from '../lib/api';

interface ProductResult {
  title: string;
  link: string;
  snippet: string;
  image?: string;
  price?: string;
  source?: string;
}

interface ProductSearchDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (product: ProductResult) => void;
}

export default function ProductSearchDialog({ open, onClose, onSelect }: ProductSearchDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<ProductResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    setError(null);

    try {
      const response = await api.post('/assets/search-product', {
        query: searchQuery
      });

      if (response.data.results) {
        setResults(response.data.results);
      } else {
        setError('No results found');
      }
    } catch (err: any) {
      console.error('Search error:', err);
      setError(err.response?.data?.error || 'Failed to search products');
    } finally {
      setSearching(false);
    }
  };

  const handleSelectProduct = (product: ProductResult) => {
    onSelect(product);
    onClose();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          maxHeight: '90vh'
        }
      }}
    >
      <DialogTitle sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #e2e8f0',
        pb: 2,
        fontWeight: 600,
        color: '#1e293b'
      }}>
        Search Product Online
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        {/* Search Bar */}
        <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
          <TextField
            fullWidth
            placeholder="Search for product (e.g., Makita RT0700C Trimmer)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            size="small"
            autoFocus
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2
              }
            }}
          />
          <Button
            variant="contained"
            onClick={handleSearch}
            disabled={searching || !searchQuery.trim()}
            startIcon={searching ? <CircularProgress size={20} /> : <SearchIcon />}
            sx={{
              minWidth: '120px',
              bgcolor: '#dc2626',
              '&:hover': { bgcolor: '#b91c1c' },
              textTransform: 'none',
              borderRadius: 2
            }}
          >
            {searching ? 'Searching...' : 'Search'}
          </Button>
        </Box>

        {/* Error Message */}
        {error && (
          <Box sx={{
            p: 2,
            bgcolor: '#fee2e2',
            color: '#dc2626',
            borderRadius: 2,
            mb: 3
          }}>
            {error}
          </Box>
        )}

        {/* Results Grid */}
        {results.length > 0 && (
          <Grid container spacing={2}>
            {results.map((product, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Card
                  sx={{
                    height: '100%',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 8px 16px rgba(0,0,0,0.1)'
                    },
                    borderRadius: 2,
                    border: '1px solid #e2e8f0'
                  }}
                  onClick={() => handleSelectProduct(product)}
                >
                  {product.image && (
                    <CardMedia
                      component="img"
                      height="180"
                      image={product.image}
                      alt={product.title}
                      sx={{
                        objectFit: 'contain',
                        bgcolor: '#f8fafc',
                        p: 2
                      }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  )}
                  <CardContent sx={{ p: 2 }}>
                    <Typography
                      variant="subtitle2"
                      sx={{
                        fontWeight: 600,
                        mb: 1,
                        color: '#1e293b',
                        fontSize: '0.875rem',
                        lineHeight: 1.4,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}
                    >
                      {product.title}
                    </Typography>

                    {product.snippet && (
                      <Typography
                        variant="body2"
                        sx={{
                          color: '#64748b',
                          fontSize: '0.75rem',
                          mb: 1,
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}
                      >
                        {product.snippet}
                      </Typography>
                    )}

                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                      {product.price && (
                        <Chip
                          label={product.price}
                          size="small"
                          sx={{
                            bgcolor: '#dcfce7',
                            color: '#166534',
                            fontSize: '0.7rem',
                            fontWeight: 600
                          }}
                        />
                      )}
                      {product.source && (
                        <Chip
                          label={product.source}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.7rem' }}
                        />
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Empty State */}
        {!searching && results.length === 0 && !error && (
          <Box sx={{
            textAlign: 'center',
            py: 6,
            color: '#94a3b8'
          }}>
            <SearchIcon sx={{ fontSize: 48, mb: 2, opacity: 0.3 }} />
            <Typography variant="body2">
              Enter a product name to search
            </Typography>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
