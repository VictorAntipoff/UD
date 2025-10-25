import {
  Box,
  Typography,
  Paper,
  Button,
  Chip,
  Grid,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Divider,
  CircularProgress,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Assignment as AssignmentIcon,
  Build as MaintenanceIcon,
  Description as DocumentIcon,
  TrendingDown as DepreciationIcon,
  Add as AddIcon,
  CheckCircle as ActiveIcon,
  Warning as BrokenIcon,
  Archive as DisposedIcon
} from '@mui/icons-material';
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../lib/api';
import { format } from 'date-fns';
import { AssetQRCode } from '../../components/AssetQRCode';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const AssetDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [asset, setAsset] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [maintenanceDialogOpen, setMaintenanceDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);

  useEffect(() => {
    if (id) fetchAsset();
  }, [id]);

  const fetchAsset = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/assets/${id}`);
      setAsset(response.data);
    } catch (error) {
      console.error('Error fetching asset:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this asset?')) return;

    try {
      await api.delete(`/assets/${id}`);
      navigate('/dashboard/assets');
    } catch (error) {
      console.error('Error deleting asset:', error);
    }
  };

  const handleAssign = async (data: any) => {
    try {
      await api.post(`/assets/${id}/assign`, data);
      fetchAsset();
      setAssignDialogOpen(false);
    } catch (error) {
      console.error('Error assigning asset:', error);
    }
  };

  const handleReturn = async () => {
    try {
      await api.post(`/assets/${id}/return`);
      fetchAsset();
    } catch (error) {
      console.error('Error returning asset:', error);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0
    }).format(value);
  };

  const getStatusColor = (status: string) => {
    const colors: any = {
      'ACTIVE': '#10b981',
      'IN_MAINTENANCE': '#f59e0b',
      'BROKEN': '#ef4444',
      'DISPOSED': '#64748b',
      'RETIRED': '#94a3b8'
    };
    return colors[status] || '#64748b';
  };

  const getStatusIcon = (status: string) => {
    const icons: any = {
      'ACTIVE': <ActiveIcon fontSize="small" />,
      'IN_MAINTENANCE': <MaintenanceIcon fontSize="small" />,
      'BROKEN': <BrokenIcon fontSize="small" />,
      'DISPOSED': <DisposedIcon fontSize="small" />
    };
    return icons[status] || null;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress sx={{ color: '#dc2626' }} />
      </Box>
    );
  }

  if (!asset) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Asset not found</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate('/dashboard/assets')} sx={{ color: '#64748b' }}>
            <BackIcon />
          </IconButton>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b' }}>
              {asset.name}
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b' }}>
              Asset Tag: {asset.assetTag}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={() => navigate(`/dashboard/assets/${id}/edit`)}
            sx={{
              borderColor: '#dc2626',
              color: '#dc2626',
              '&:hover': { borderColor: '#b91c1c', backgroundColor: '#fef2f2' }
            }}
          >
            Edit
          </Button>
          <Button
            variant="outlined"
            startIcon={<DeleteIcon />}
            onClick={handleDelete}
            sx={{
              borderColor: '#ef4444',
              color: '#ef4444',
              '&:hover': { borderColor: '#dc2626', backgroundColor: '#fef2f2' }
            }}
          >
            Delete
          </Button>
        </Box>
      </Box>

      {/* Product Image and QR Code */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {asset.imageUrl && (
          <Grid item xs={12} md={8}>
            <Paper elevation={0} sx={{ p: 2, border: '1px solid #e2e8f0', height: '100%' }}>
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <Box
                  component="img"
                  src={asset.imageUrl}
                  alt={asset.name}
                  sx={{
                    maxWidth: '100%',
                    maxHeight: '400px',
                    objectFit: 'contain',
                    borderRadius: 2,
                    border: '1px solid #e2e8f0',
                    backgroundColor: '#f8fafc',
                    p: 2
                  }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </Box>
            </Paper>
          </Grid>
        )}
        <Grid item xs={12} md={asset.imageUrl ? 4 : 12}>
          <AssetQRCode assetTag={asset.assetTag} assetId={asset.id} size={250} />
        </Grid>
      </Grid>

      {/* Status and Quick Info */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card elevation={0} sx={{ border: '1px solid #e2e8f0', height: '100%' }}>
            <CardContent>
              <Typography variant="body2" sx={{ color: '#64748b', mb: 1, fontSize: '0.75rem' }}>
                Status
              </Typography>
              <Chip
                icon={getStatusIcon(asset.status)}
                label={asset.status.replace('_', ' ')}
                sx={{
                  backgroundColor: getStatusColor(asset.status),
                  color: '#fff',
                  fontWeight: 600
                }}
              />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card elevation={0} sx={{ border: '1px solid #e2e8f0', height: '100%' }}>
            <CardContent>
              <Typography variant="body2" sx={{ color: '#64748b', mb: 1, fontSize: '0.75rem' }}>
                Purchase Price
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
                {formatCurrency(asset.purchasePrice)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card elevation={0} sx={{ border: '1px solid #e2e8f0', height: '100%' }}>
            <CardContent>
              <Typography variant="body2" sx={{ color: '#64748b', mb: 1, fontSize: '0.75rem' }}>
                Expected Lifespan
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#10b981' }}>
                {asset.lifespanValue ? `${asset.lifespanValue} ${asset.lifespanUnit?.toLowerCase()}` : 'Not set'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card elevation={0} sx={{ border: '1px solid #e2e8f0', height: '100%' }}>
            <CardContent>
              <Typography variant="body2" sx={{ color: '#64748b', mb: 1, fontSize: '0.75rem' }}>
                Category
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
                {asset.category?.name || 'N/A'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper elevation={0} sx={{ border: '1px solid #e2e8f0' }}>
        <Tabs
          value={tabValue}
          onChange={(e, newValue) => setTabValue(newValue)}
          sx={{
            borderBottom: '1px solid #e2e8f0',
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.875rem'
            },
            '& .Mui-selected': {
              color: '#dc2626'
            },
            '& .MuiTabs-indicator': {
              backgroundColor: '#dc2626'
            }
          }}
        >
          <Tab label="Overview" />
          <Tab label="Purchase & Warranty" />
          <Tab label="Maintenance" icon={<MaintenanceIcon fontSize="small" />} iconPosition="start" />
          <Tab label="Documents" icon={<DocumentIcon fontSize="small" />} iconPosition="start" />
          <Tab label="Assignment History" icon={<AssignmentIcon fontSize="small" />} iconPosition="start" />
        </Tabs>

        {/* Overview Tab */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3} sx={{ px: 3 }}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: '#1e293b' }}>
                Basic Information
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <InfoRow label="Category" value={asset.category.name} />
                <InfoRow label="Brand" value={asset.brand || 'N/A'} />
                <InfoRow label="Model Number" value={asset.modelNumber || 'N/A'} />
                <InfoRow label="Serial Number" value={asset.serialNumber || 'N/A'} />
                <InfoRow label="Location" value={asset.location || 'N/A'} />
                <InfoRow label="Description" value={asset.description || 'N/A'} />
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: '#1e293b' }}>
                Purchase Information
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <InfoRow label="Purchase Date" value={format(new Date(asset.purchaseDate), 'MMM dd, yyyy')} />
                <InfoRow label="Supplier" value={asset.supplier || 'N/A'} />
                <InfoRow label="Invoice Number" value={asset.invoiceNumber || 'N/A'} />
              </Box>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: '#1e293b' }}>
                Warranty
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <InfoRow
                  label="Warranty Start"
                  value={asset.warrantyStartDate ? format(new Date(asset.warrantyStartDate), 'MMM dd, yyyy') : 'N/A'}
                />
                <InfoRow
                  label="Warranty End"
                  value={asset.warrantyEndDate ? format(new Date(asset.warrantyEndDate), 'MMM dd, yyyy') : 'N/A'}
                />
                <InfoRow label="Warranty Terms" value={asset.warrantyTerms || 'N/A'} />
              </Box>
            </Grid>
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: '#1e293b' }}>
                Current Assignment
              </Typography>
              {asset.assignedToUserId || asset.assignedToTeam || asset.assignedToProject ? (
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <Box sx={{ flex: 1 }}>
                    {asset.assignedToUserId && <InfoRow label="Assigned to User" value={asset.assignedToUserId} />}
                    {asset.assignedToTeam && <InfoRow label="Assigned to Team" value={asset.assignedToTeam} />}
                    {asset.assignedToProject && <InfoRow label="Assigned to Project" value={asset.assignedToProject} />}
                    <InfoRow
                      label="Assignment Date"
                      value={asset.assignmentDate ? format(new Date(asset.assignmentDate), 'MMM dd, yyyy') : 'N/A'}
                    />
                  </Box>
                  <Button
                    variant="outlined"
                    onClick={handleReturn}
                    sx={{ borderColor: '#dc2626', color: '#dc2626' }}
                  >
                    Return Asset
                  </Button>
                </Box>
              ) : (
                <Box sx={{ textAlign: 'center', py: 2 }}>
                  <Typography variant="body2" sx={{ color: '#64748b', mb: 2 }}>
                    This asset is not currently assigned
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<AssignmentIcon />}
                    onClick={() => setAssignDialogOpen(true)}
                    sx={{ backgroundColor: '#dc2626', '&:hover': { backgroundColor: '#b91c1c' } }}
                  >
                    Assign Asset
                  </Button>
                </Box>
              )}
            </Grid>
          </Grid>
        </TabPanel>

        {/* Purchase & Warranty Tab */}
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ px: 3 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: '#1e293b' }}>
                  Purchase Information
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <InfoRow label="Purchase Date" value={asset.purchaseDate ? format(new Date(asset.purchaseDate), 'MMM dd, yyyy') : 'N/A'} />
                  <InfoRow label="Purchase Price" value={formatCurrency(asset.purchasePrice)} />
                  <InfoRow label="Supplier" value={asset.supplier || 'N/A'} />
                  <InfoRow label="Invoice Number" value={asset.invoiceNumber || 'N/A'} />
                  <InfoRow label="Expected Lifespan" value={asset.lifespanValue ? `${asset.lifespanValue} ${asset.lifespanUnit?.toLowerCase()}` : 'Not set'} />
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: '#1e293b' }}>
                  Warranty Information
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <InfoRow label="Warranty Provider" value={asset.warrantyProvider || 'N/A'} />
                  <InfoRow
                    label="Warranty Start"
                    value={asset.warrantyStartDate ? format(new Date(asset.warrantyStartDate), 'MMM dd, yyyy') : 'N/A'}
                  />
                  <InfoRow
                    label="Warranty End"
                    value={asset.warrantyEndDate ? format(new Date(asset.warrantyEndDate), 'MMM dd, yyyy') : 'N/A'}
                  />
                  <InfoRow label="Warranty Terms" value={asset.warrantyTerms || 'N/A'} />
                </Box>
              </Grid>
            </Grid>
          </Box>
        </TabPanel>

        {/* Maintenance Tab */}
        <TabPanel value={tabValue} index={2}>
          <Box sx={{ px: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                Maintenance Records
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setMaintenanceDialogOpen(true)}
                size="small"
                sx={{ backgroundColor: '#dc2626', '&:hover': { backgroundColor: '#b91c1c' } }}
              >
                Add Maintenance
              </Button>
            </Box>

            {asset.maintenanceRecords && asset.maintenanceRecords.length > 0 ? (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#f8fafc' }}>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Type</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Date</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Description</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Performed By</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Cost</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {asset.maintenanceRecords.map((record: any) => (
                      <TableRow key={record.id} hover>
                        <TableCell>
                          <Chip
                            label={record.maintenanceType}
                            size="small"
                            sx={{ fontSize: '0.75rem' }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.875rem' }}>
                          {record.scheduledDate ? format(new Date(record.scheduledDate), 'MMM dd, yyyy') : 'N/A'}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.875rem' }}>{record.description}</TableCell>
                        <TableCell sx={{ fontSize: '0.875rem' }}>{record.performedBy || 'N/A'}</TableCell>
                        <TableCell sx={{ fontSize: '0.875rem' }}>
                          {record.cost ? formatCurrency(record.cost) : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={record.status}
                            size="small"
                            sx={{
                              backgroundColor: record.status === 'COMPLETED' ? '#10b981' : '#f59e0b',
                              color: '#fff',
                              fontSize: '0.75rem'
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <MaintenanceIcon sx={{ fontSize: 48, color: '#cbd5e1', mb: 2 }} />
                <Typography variant="body2" sx={{ color: '#64748b' }}>
                  No maintenance records yet
                </Typography>
              </Box>
            )}
          </Box>
        </TabPanel>

        {/* Documents Tab */}
        <TabPanel value={tabValue} index={3}>
          <Box sx={{ px: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                Documents & Files
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                size="small"
                sx={{ backgroundColor: '#dc2626', '&:hover': { backgroundColor: '#b91c1c' } }}
              >
                Upload Document
              </Button>
            </Box>

            {asset.documents && asset.documents.length > 0 ? (
              <Grid container spacing={2}>
                {asset.documents.map((doc: any) => (
                  <Grid item xs={12} sm={6} md={4} key={doc.id}>
                    <Card elevation={0} sx={{ border: '1px solid #e2e8f0' }}>
                      <CardContent>
                        <DocumentIcon sx={{ fontSize: 40, color: '#dc2626', mb: 1 }} />
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                          {doc.title}
                        </Typography>
                        <Chip label={doc.documentType} size="small" sx={{ mb: 1, fontSize: '0.7rem' }} />
                        <Typography variant="caption" sx={{ display: 'block', color: '#64748b' }}>
                          {doc.fileName}
                        </Typography>
                        <Typography variant="caption" sx={{ display: 'block', color: '#94a3b8' }}>
                          Uploaded: {format(new Date(doc.uploadedAt), 'MMM dd, yyyy')}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <DocumentIcon sx={{ fontSize: 48, color: '#cbd5e1', mb: 2 }} />
                <Typography variant="body2" sx={{ color: '#64748b' }}>
                  No documents uploaded yet
                </Typography>
              </Box>
            )}
          </Box>
        </TabPanel>

        {/* Assignment History Tab */}
        <TabPanel value={tabValue} index={4}>
          <Box sx={{ px: 3 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: '#1e293b' }}>
              Assignment History
            </Typography>

            {asset.assignmentHistory && asset.assignmentHistory.length > 0 ? (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#f8fafc' }}>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Assigned To</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Assignment Date</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Return Date</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Assigned By</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Notes</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {asset.assignmentHistory.map((history: any) => (
                      <TableRow key={history.id} hover>
                        <TableCell sx={{ fontSize: '0.875rem' }}>
                          {history.assignedToUserId && `User: ${history.assignedToUserId}`}
                          {history.assignedToTeam && `Team: ${history.assignedToTeam}`}
                          {history.assignedToProject && `Project: ${history.assignedToProject}`}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.875rem' }}>
                          {format(new Date(history.assignmentDate), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.875rem' }}>
                          {history.returnDate ? format(new Date(history.returnDate), 'MMM dd, yyyy') : 'Active'}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.875rem' }}>{history.assignedBy || 'N/A'}</TableCell>
                        <TableCell sx={{ fontSize: '0.875rem' }}>{history.notes || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <AssignmentIcon sx={{ fontSize: 48, color: '#cbd5e1', mb: 2 }} />
                <Typography variant="body2" sx={{ color: '#64748b' }}>
                  No assignment history
                </Typography>
              </Box>
            )}
          </Box>
        </TabPanel>
      </Paper>

      {/* Assignment Dialog */}
      <AssignmentDialog
        open={assignDialogOpen}
        onClose={() => setAssignDialogOpen(false)}
        onSubmit={handleAssign}
      />
    </Box>
  );
};

// Helper component for info rows
const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
    <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.875rem' }}>
      {label}:
    </Typography>
    <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.875rem', textAlign: 'right' }}>
      {value}
    </Typography>
  </Box>
);

// Assignment Dialog Component
const AssignmentDialog = ({ open, onClose, onSubmit }: any) => {
  const [formData, setFormData] = useState({
    assignedToUserId: '',
    assignedToTeam: '',
    assignedToProject: '',
    assignedBy: '',
    notes: ''
  });

  const handleSubmit = () => {
    onSubmit(formData);
    setFormData({ assignedToUserId: '', assignedToTeam: '', assignedToProject: '', assignedBy: '', notes: '' });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Assign Asset</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
          <TextField
            fullWidth
            label="Assigned to User ID (optional)"
            value={formData.assignedToUserId}
            onChange={(e) => setFormData({ ...formData, assignedToUserId: e.target.value })}
          />
          <TextField
            fullWidth
            label="Assigned to Team (optional)"
            value={formData.assignedToTeam}
            onChange={(e) => setFormData({ ...formData, assignedToTeam: e.target.value })}
          />
          <TextField
            fullWidth
            label="Assigned to Project (optional)"
            value={formData.assignedToProject}
            onChange={(e) => setFormData({ ...formData, assignedToProject: e.target.value })}
          />
          <TextField
            fullWidth
            label="Assigned By"
            value={formData.assignedBy}
            onChange={(e) => setFormData({ ...formData, assignedBy: e.target.value })}
          />
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" sx={{ backgroundColor: '#dc2626' }}>
          Assign
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AssetDetail;
