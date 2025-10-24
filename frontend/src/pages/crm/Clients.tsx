import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  CircularProgress,
  Alert,
  TextField,
  InputAdornment,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import EmailIcon from '@mui/icons-material/Email';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import UnsubscribeIcon from '@mui/icons-material/Unsubscribe';
import { useSnackbar } from 'notistack';
import api from '../../lib/api';
import colors from '../../styles/colors';

interface NewsletterSubscriber {
  id: string;
  email: string;
  source: string;
  status: string;
  subscribedAt: string;
  unsubscribedAt: string | null;
}

interface Stats {
  total: number;
  active: number;
  unsubscribed: number;
}

const Clients = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [filteredSubscribers, setFilteredSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, active: 0, unsubscribed: 0 });
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSubscriber, setSelectedSubscriber] = useState<NewsletterSubscriber | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchSubscribers();
  }, []);

  useEffect(() => {
    // Filter subscribers based on search term
    if (searchTerm.trim() === '') {
      setFilteredSubscribers(subscribers);
    } else {
      const filtered = subscribers.filter(subscriber =>
        subscriber.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredSubscribers(filtered);
    }
  }, [searchTerm, subscribers]);

  const fetchSubscribers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/crm/newsletter/subscribers');
      setSubscribers(response.data.subscribers || []);
      setFilteredSubscribers(response.data.subscribers || []);
      setStats(response.data.stats || { total: 0, active: 0, unsubscribed: 0 });
    } catch (error) {
      console.error('Error fetching subscribers:', error);
      enqueueSnackbar('Failed to load subscribers', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (subscriber: NewsletterSubscriber) => {
    setSelectedSubscriber(subscriber);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedSubscriber) return;

    try {
      await api.delete(`/crm/newsletter/subscribers/${selectedSubscriber.id}`);
      enqueueSnackbar('Subscriber deleted successfully', { variant: 'success' });
      setDeleteDialogOpen(false);
      setSelectedSubscriber(null);
      fetchSubscribers();
    } catch (error) {
      console.error('Error deleting subscriber:', error);
      enqueueSnackbar('Failed to delete subscriber', { variant: 'error' });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, color: colors.grey.dark, mb: 1 }}>
          Newsletter Clients
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Manage your mailing list subscribers from the Coming Soon page
        </Typography>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card sx={{ backgroundColor: '#f0f9ff', border: '1px solid #bae6fd' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    Total Subscribers
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 600, color: '#0284c7' }}>
                    {stats.total}
                  </Typography>
                </Box>
                <PersonAddIcon sx={{ fontSize: 40, color: '#0284c7', opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card sx={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    Active
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 600, color: '#16a34a' }}>
                    {stats.active}
                  </Typography>
                </Box>
                <EmailIcon sx={{ fontSize: 40, color: '#16a34a', opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card sx={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    Unsubscribed
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 600, color: '#dc2626' }}>
                    {stats.unsubscribed}
                  </Typography>
                </Box>
                <UnsubscribeIcon sx={{ fontSize: 40, color: '#dc2626', opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search Bar */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search by email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              backgroundColor: '#fff',
              '&:hover fieldset': {
                borderColor: colors.primary,
              },
              '&.Mui-focused fieldset': {
                borderColor: colors.primary,
              },
            },
          }}
        />
      </Box>

      {/* Subscribers Table */}
      <Card>
        <CardContent>
          {filteredSubscribers.length === 0 ? (
            <Alert severity="info">
              {searchTerm ? 'No subscribers match your search.' : 'No subscribers yet. They will appear here when users sign up on the Coming Soon page.'}
            </Alert>
          ) : (
            <TableContainer component={Paper} sx={{ boxShadow: 'none' }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: colors.grey.light }}>
                    <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Source</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Subscribed At</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredSubscribers.map((subscriber) => (
                    <TableRow
                      key={subscriber.id}
                      sx={{
                        '&:hover': {
                          backgroundColor: colors.grey.light,
                        },
                      }}
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <EmailIcon sx={{ fontSize: 18, color: colors.grey.main }} />
                          {subscriber.email}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={subscriber.source}
                          size="small"
                          sx={{
                            backgroundColor: '#e0e7ff',
                            color: '#4338ca',
                            fontWeight: 500,
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={subscriber.status}
                          size="small"
                          sx={{
                            backgroundColor: subscriber.status === 'active' ? '#dcfce7' : '#fee2e2',
                            color: subscriber.status === 'active' ? '#15803d' : '#dc2626',
                            fontWeight: 500,
                          }}
                        />
                      </TableCell>
                      <TableCell>{formatDate(subscriber.subscribedAt)}</TableCell>
                      <TableCell align="center">
                        <IconButton
                          onClick={() => handleDeleteClick(subscriber)}
                          sx={{
                            color: colors.grey.main,
                            '&:hover': {
                              color: '#dc2626',
                              backgroundColor: '#fee2e2',
                            },
                          }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
          }
        }}
      >
        <DialogTitle sx={{
          fontSize: '1.5rem',
          fontWeight: 600,
          color: colors.grey.dark,
          pb: 2
        }}>
          Delete Subscriber
        </DialogTitle>
        <DialogContent sx={{ pb: 3 }}>
          <Typography sx={{ fontSize: '1rem', lineHeight: 1.6, mb: 2 }}>
            Are you sure you want to delete <strong>{selectedSubscriber?.email}</strong> from the mailing list?
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: 'text.secondary',
              fontSize: '0.875rem',
              fontStyle: 'italic'
            }}
          >
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            variant="outlined"
            sx={{
              borderColor: colors.grey.main,
              color: colors.grey.dark,
              fontSize: '0.9rem',
              px: 3,
              py: 1,
              '&:hover': {
                borderColor: colors.grey.dark,
                backgroundColor: 'transparent',
              },
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            variant="contained"
            sx={{
              backgroundColor: '#dc2626',
              color: 'white',
              fontSize: '0.9rem',
              px: 3,
              py: 1,
              fontWeight: 600,
              '&:hover': {
                backgroundColor: '#b91c1c',
              },
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Clients;
