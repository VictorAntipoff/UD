import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Button,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import ArticleIcon from '@mui/icons-material/Article';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';

interface Page {
  id: string;
  name: string;
  slug: string;
  status: 'draft' | 'published';
  updatedAt: string;
}

const Pages = () => {
  const navigate = useNavigate();
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    try {
      const response = await api.get('/website/pages');
      console.log('Pages API response:', response.data);
      setPages(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching pages:', error);
      // Always show Coming Soon page if API fails
      const fallbackPage = {
        id: 'coming-soon',
        name: 'Coming Soon',
        slug: 'coming-soon',
        status: 'published' as const,
        updatedAt: new Date().toISOString(),
      };
      console.log('Using fallback page:', fallbackPage);
      setPages([fallbackPage]);
      setLoading(false);
    }
  };

  const handleEdit = (pageId: string) => {
    navigate(`/dashboard/website/pages/${pageId}`);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <ArticleIcon sx={{ fontSize: 32, color: 'primary.main' }} />
          <Typography variant="h4" sx={{ fontWeight: 600 }}>
            Website Pages
          </Typography>
        </Box>
      </Box>

      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f8fafc' }}>
                <TableCell sx={{ fontWeight: 600 }}>Page Name</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Slug</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Last Updated</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : pages.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    No pages found
                  </TableCell>
                </TableRow>
              ) : (
                pages.map((page) => (
                  <TableRow key={page.id} hover>
                    <TableCell>
                      <Typography sx={{ fontWeight: 500 }}>{page.name}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ color: 'text.secondary' }}>/{page.slug}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={page.status}
                        color={page.status === 'published' ? 'success' : 'default'}
                        size="small"
                        sx={{ textTransform: 'capitalize' }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ color: 'text.secondary' }}>
                        {new Date(page.updatedAt).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        onClick={() => handleEdit(page.id)}
                        color="primary"
                        size="small"
                      >
                        <EditIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default Pages;
