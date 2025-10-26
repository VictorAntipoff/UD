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
  Chip,
  Tabs,
  Tab
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import LinkIcon from '@mui/icons-material/Link';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import api from '../lib/api';

interface ProductResult {
  title: string;
  link: string;
  snippet: string;
  image?: string;
  price?: string;
  source?: string;
  isOfficialSite?: boolean;
  pdfUrl?: string;
}

interface ProductSearchDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (product: ProductResult) => void;
  brand?: string;
}

export default function ProductSearchDialog({ open, onClose, onSelect, brand }: ProductSearchDialogProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [productUrl, setProductUrl] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<ProductResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    setError(null);

    try {
      const response = await api.post('/assets/search-product', {
        query: searchQuery,
        brand: brand || ''
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

  const handleScrapeUrl = async () => {
    if (!productUrl.trim()) return;

    setSearching(true);
    setError(null);
    setResults([]);

    try {
      const response = await api.post('/assets/scrape-product-url', {
        url: productUrl
      });

      if (response.data.success && response.data.product) {
        setResults([response.data.product]);
      } else {
        setError('Could not extract product information from URL');
      }
    } catch (err: any) {
      console.error('URL scraping error:', err);
      setError(err.response?.data?.error || 'Failed to scrape product data from URL');
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
      if (activeTab === 0) {
        handleSearch();
      } else {
        handleScrapeUrl();
      }
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
        {/* Tabs */}
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => {
            setActiveTab(newValue);
            setResults([]);
            setError(null);
          }}
          sx={{ mb: 3, borderBottom: '1px solid #e2e8f0' }}
        >
          <Tab
            label="Search Online"
            icon={<SearchIcon />}
            iconPosition="start"
            sx={{ textTransform: 'none', fontWeight: 600 }}
          />
          <Tab
            label="Paste Product Link"
            icon={<LinkIcon />}
            iconPosition="start"
            sx={{ textTransform: 'none', fontWeight: 600 }}
          />
        </Tabs>

        {/* Search Tab */}
        {activeTab === 0 && (
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
        )}

        {/* Paste Link Tab */}
        {activeTab === 1 && (
          <Box sx={{ mb: 3 }}>
            <TextField
              fullWidth
              placeholder="Paste product URL (e.g., https://www.makita.com/product/...)"
              value={productUrl}
              onChange={(e) => setProductUrl(e.target.value)}
              onKeyPress={handleKeyPress}
              size="small"
              autoFocus
              sx={{
                mb: 2,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2
                }
              }}
            />
            <Button
              variant="contained"
              onClick={handleScrapeUrl}
              disabled={searching || !productUrl.trim()}
              startIcon={searching ? <CircularProgress size={20} /> : <LinkIcon />}
              fullWidth
              sx={{
                bgcolor: '#dc2626',
                '&:hover': { bgcolor: '#b91c1c' },
                textTransform: 'none',
                borderRadius: 2
              }}
            >
              {searching ? 'Fetching data...' : 'Get Product Info'}
            </Button>
          </Box>
        )}

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
                    position: 'relative',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 8px 16px rgba(0,0,0,0.1)'
                    },
                    borderRadius: 2,
                    border: product.isOfficialSite ? '2px solid #10b981' : '1px solid #e2e8f0'
                  }}
                  onClick={() => handleSelectProduct(product)}
                >
                  {product.isOfficialSite && (
                    <Chip
                      label="Official Website"
                      size="small"
                      sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        bgcolor: '#10b981',
                        color: '#fff',
                        fontWeight: 600,
                        fontSize: '0.65rem',
                        zIndex: 1
                      }}
                    />
                  )}
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
                      {product.pdfUrl && (
                        <Chip
                          icon={<PictureAsPdfIcon sx={{ fontSize: '0.9rem' }} />}
                          label="PDF Available"
                          size="small"
                          sx={{
                            bgcolor: '#dbeafe',
                            color: '#1e40af',
                            fontSize: '0.7rem',
                            fontWeight: 600
                          }}
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
