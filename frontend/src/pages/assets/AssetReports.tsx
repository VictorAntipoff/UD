import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  MenuItem,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Assessment as ReportIcon,
  FilterList as FilterIcon,
  Download as DownloadIcon,
  Print as PrintIcon,
  Refresh as RefreshIcon,
  PictureAsPdf as PdfIcon,
  AttachMoney as MoneyIcon,
  MoneyOff as MoneyOffIcon
} from '@mui/icons-material';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { format } from 'date-fns';

export default function AssetReports() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [includePrices, setIncludePrices] = useState(true);

  // Filter states
  const [reportType, setReportType] = useState<'general' | 'detailed'>('general');
  const [locationId, setLocationId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Options for dropdowns
  const [locations, setLocations] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    fetchDropdownOptions();
  }, []);

  const fetchDropdownOptions = async () => {
    try {
      const [locationsRes, categoriesRes] = await Promise.all([
        api.get('/assets/locations/active'),
        api.get('/assets/categories')
      ]);
      setLocations(locationsRes.data);
      setCategories(categoriesRes.data);
    } catch (error) {
      console.error('Error fetching options:', error);
    }
  };

  const generateReport = async () => {
    try {
      setLoading(true);
      const params: any = { reportType };

      if (locationId) params.locationId = locationId;
      if (categoryId) params.categoryId = categoryId;
      if (status) params.status = status;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await api.get('/assets/reports/generate', { params });
      setReportData(response.data);
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async (withPrices: boolean) => {
    try {
      const params: any = {
        reportType,
        includePrices: withPrices
      };

      if (locationId) params.locationId = locationId;
      if (categoryId) params.categoryId = categoryId;
      if (status) params.status = status;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await api.get('/assets/reports/pdf', {
        params,
        responseType: 'blob'
      });

      // Create download link
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `asset-report-${withPrices ? 'with-prices' : 'without-prices'}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Failed to download PDF report');
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

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b', mb: 1 }}>
          Asset Reports
        </Typography>
        <Typography variant="body2" sx={{ color: '#64748b' }}>
          Generate comprehensive reports on your asset inventory
        </Typography>
      </Box>

      {/* Filters Section */}
      <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2, p: 3, mb: 3, '@media print': { display: 'none' } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <FilterIcon sx={{ color: '#dc2626' }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1e293b' }}>
            Report Filters
          </Typography>
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              select
              label="Report Type"
              value={reportType}
              onChange={(e) => setReportType(e.target.value as 'general' | 'detailed')}
              variant="outlined"
            >
              <MenuItem value="general">General Report (Summary)</MenuItem>
              <MenuItem value="detailed">Detailed Report (Complete Info)</MenuItem>
            </TextField>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              select
              label="Filter by Location"
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              variant="outlined"
            >
              <MenuItem value="">All Locations</MenuItem>
              {locations.map((loc) => (
                <MenuItem key={loc.id} value={loc.id}>
                  {loc.name}{loc.building ? ` - ${loc.building}` : ''}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              select
              label="Filter by Category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              variant="outlined"
            >
              <MenuItem value="">All Categories</MenuItem>
              {categories.map((cat) => (
                <MenuItem key={cat.id} value={cat.id}>
                  {cat.name} ({cat.code})
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              select
              label="Filter by Status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              variant="outlined"
            >
              <MenuItem value="">All Statuses</MenuItem>
              <MenuItem value="ACTIVE">Active</MenuItem>
              <MenuItem value="IN_MAINTENANCE">In Maintenance</MenuItem>
              <MenuItem value="BROKEN">Broken</MenuItem>
              <MenuItem value="DISPOSED">Disposed</MenuItem>
              <MenuItem value="RETIRED">Retired</MenuItem>
            </TextField>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Purchase Date From"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              variant="outlined"
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Purchase Date To"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              variant="outlined"
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
        </Grid>

        <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
          <Button
            variant="contained"
            startIcon={loading ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : <ReportIcon />}
            onClick={generateReport}
            disabled={loading}
            sx={{
              backgroundColor: '#dc2626',
              '&:hover': { backgroundColor: '#b91c1c' },
              textTransform: 'none',
              px: 3
            }}
          >
            {loading ? 'Generating...' : 'Generate Report'}
          </Button>

          {reportData && (
            <>
              <Button
                variant="outlined"
                startIcon={<PdfIcon />}
                onClick={() => handleDownloadPDF(true)}
                sx={{
                  borderColor: '#10b981',
                  color: '#10b981',
                  textTransform: 'none',
                  '&:hover': { borderColor: '#059669', backgroundColor: '#f0fdf4' }
                }}
              >
                PDF with Prices
              </Button>
              <Button
                variant="outlined"
                startIcon={<PdfIcon />}
                onClick={() => handleDownloadPDF(false)}
                sx={{
                  borderColor: '#f59e0b',
                  color: '#f59e0b',
                  textTransform: 'none',
                  '&:hover': { borderColor: '#d97706', backgroundColor: '#fffbeb' }
                }}
              >
                PDF without Prices
              </Button>
              <Button
                variant="outlined"
                startIcon={<PrintIcon />}
                onClick={handlePrint}
                sx={{
                  borderColor: '#dc2626',
                  color: '#dc2626',
                  textTransform: 'none',
                  '&:hover': { borderColor: '#b91c1c', backgroundColor: '#fef2f2' }
                }}
              >
                Print
              </Button>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={() => setReportData(null)}
                sx={{
                  borderColor: '#64748b',
                  color: '#64748b',
                  textTransform: 'none',
                  '&:hover': { borderColor: '#475569', backgroundColor: '#f8fafc' }
                }}
              >
                Clear
              </Button>
            </>
          )}
        </Box>
      </Paper>

      {/* Report Display */}
      {reportData && (
        <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2, p: 4 }}>
          {/* Report Header */}
          <Box sx={{ textAlign: 'center', mb: 4, borderBottom: '2px solid #dc2626', pb: 3 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b', mb: 1 }}>
              Asset {reportData.reportType === 'general' ? 'Summary' : 'Detailed'} Report
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b' }}>
              Generated on {format(new Date(reportData.generatedAt), 'MMMM dd, yyyy - hh:mm a')}
            </Typography>
            {Object.values(reportData.filters).some(v => v) && (
              <Box sx={{ mt: 2, display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Typography variant="caption" sx={{ color: '#64748b' }}>Applied Filters:</Typography>
                {reportData.filters.locationId && <Chip label="Location Filter" size="small" />}
                {reportData.filters.categoryId && <Chip label="Category Filter" size="small" />}
                {reportData.filters.status && <Chip label={`Status: ${reportData.filters.status}`} size="small" />}
                {reportData.filters.startDate && <Chip label={`From: ${format(new Date(reportData.filters.startDate), 'MMM dd, yyyy')}`} size="small" />}
              </Box>
            )}
          </Box>

          {/* General Report - Summary Statistics */}
          {reportData.reportType === 'general' && reportData.summary && (
            <>
              <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} md={3}>
                  <Card elevation={0} sx={{ border: '1px solid #e2e8f0', backgroundColor: '#fef2f2' }}>
                    <CardContent>
                      <Typography variant="body2" sx={{ color: '#64748b', mb: 1 }}>Total Assets</Typography>
                      <Typography variant="h4" sx={{ fontWeight: 700, color: '#dc2626' }}>
                        {reportData.summary.totalAssets}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Card elevation={0} sx={{ border: '1px solid #e2e8f0', backgroundColor: '#f0fdf4' }}>
                    <CardContent>
                      <Typography variant="body2" sx={{ color: '#64748b', mb: 1 }}>Total Value</Typography>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: '#10b981' }}>
                        {formatCurrency(reportData.summary.totalValue)}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Card elevation={0} sx={{ border: '1px solid #e2e8f0', backgroundColor: '#eff6ff' }}>
                    <CardContent>
                      <Typography variant="body2" sx={{ color: '#64748b', mb: 1 }}>Average Value</Typography>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: '#3b82f6' }}>
                        {formatCurrency(reportData.summary.averageValue)}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Card elevation={0} sx={{ border: '1px solid #e2e8f0', backgroundColor: '#fef3c7' }}>
                    <CardContent>
                      <Typography variant="body2" sx={{ color: '#64748b', mb: 1 }}>Categories</Typography>
                      <Typography variant="h4" sx={{ fontWeight: 700, color: '#f59e0b' }}>
                        {Object.keys(reportData.summary.byCategory).length}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* Distribution Charts */}
              <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} md={4}>
                  <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', p: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>By Status</Typography>
                    {Object.entries(reportData.summary.byStatus).map(([status, count]: [string, any]) => (
                      <Box key={status} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Chip label={status} size="small" sx={{ backgroundColor: getStatusColor(status), color: '#fff' }} />
                        <Typography variant="body2">{count} assets</Typography>
                      </Box>
                    ))}
                  </Paper>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', p: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>By Category</Typography>
                    {Object.entries(reportData.summary.byCategory).slice(0, 5).map(([category, count]: [string, any]) => (
                      <Box key={category} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" sx={{ color: '#64748b' }}>{category}</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{count}</Typography>
                      </Box>
                    ))}
                  </Paper>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', p: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>By Location</Typography>
                    {Object.entries(reportData.summary.byLocation).slice(0, 5).map(([location, count]: [string, any]) => (
                      <Box key={location} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" sx={{ color: '#64748b' }}>{location}</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{count}</Typography>
                      </Box>
                    ))}
                  </Paper>
                </Grid>
              </Grid>

              <Divider sx={{ my: 3 }} />

              {/* Assets Table */}
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: '#1e293b' }}>
                Asset List
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#f8fafc' }}>
                      <TableCell sx={{ fontWeight: 600 }}>Asset Tag</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Category</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Location</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Purchase Date</TableCell>
                      <TableCell sx={{ fontWeight: 600, textAlign: 'right' }}>Value</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reportData.assets.map((asset: any) => (
                      <TableRow key={asset.assetTag} hover>
                        <TableCell>{asset.assetTag}</TableCell>
                        <TableCell>{asset.name}</TableCell>
                        <TableCell>{asset.category}</TableCell>
                        <TableCell>{asset.location}</TableCell>
                        <TableCell>
                          <Chip
                            label={asset.status}
                            size="small"
                            sx={{
                              backgroundColor: getStatusColor(asset.status),
                              color: '#fff',
                              fontSize: '0.7rem'
                            }}
                          />
                        </TableCell>
                        <TableCell>{format(new Date(asset.purchaseDate), 'MMM dd, yyyy')}</TableCell>
                        <TableCell sx={{ textAlign: 'right' }}>{formatCurrency(asset.purchasePrice)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}

          {/* Detailed Report */}
          {reportData.reportType === 'detailed' && (
            <>
              <Box sx={{ mb: 3 }}>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" sx={{ color: '#64748b' }}>Total Assets:</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>{reportData.totalAssets}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" sx={{ color: '#64748b' }}>Total Value:</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: '#10b981' }}>
                      {formatCurrency(reportData.totalValue)}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>

              <Divider sx={{ my: 3 }} />

              {reportData.assets.map((asset: any, index: number) => (
                <Box key={asset.assetTag} sx={{ mb: 4, pageBreakInside: 'avoid' }}>
                  <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', p: 3 }}>
                    {/* Asset Header */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
                          {asset.name}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#64748b' }}>
                          {asset.assetTag} | {asset.brand} {asset.modelNumber}
                        </Typography>
                      </Box>
                      <Chip
                        label={asset.status}
                        sx={{
                          backgroundColor: getStatusColor(asset.status),
                          color: '#fff',
                          fontWeight: 600
                        }}
                      />
                    </Box>

                    <Grid container spacing={2}>
                      {/* Basic Info */}
                      <Grid item xs={12} md={6}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#1e293b' }}>
                          Basic Information
                        </Typography>
                        <Box sx={{ pl: 2 }}>
                          <Typography variant="body2" sx={{ mb: 0.5 }}>
                            <strong>Category:</strong> {asset.category.name} ({asset.category.code})
                          </Typography>
                          <Typography variant="body2" sx={{ mb: 0.5 }}>
                            <strong>Serial Number:</strong> {asset.serialNumber || 'N/A'}
                          </Typography>
                          {asset.location && (
                            <Typography variant="body2" sx={{ mb: 0.5 }}>
                              <strong>Location:</strong> {asset.location.name}
                              {asset.location.room && ` - Room ${asset.location.room}`}
                            </Typography>
                          )}
                        </Box>
                      </Grid>

                      {/* Purchase Info */}
                      <Grid item xs={12} md={6}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#1e293b' }}>
                          Purchase Information
                        </Typography>
                        <Box sx={{ pl: 2 }}>
                          <Typography variant="body2" sx={{ mb: 0.5 }}>
                            <strong>Date:</strong> {format(new Date(asset.purchaseDate), 'MMM dd, yyyy')}
                          </Typography>
                          <Typography variant="body2" sx={{ mb: 0.5 }}>
                            <strong>Price:</strong> {formatCurrency(asset.purchasePrice)}
                          </Typography>
                          <Typography variant="body2" sx={{ mb: 0.5 }}>
                            <strong>Supplier:</strong> {asset.supplier || 'N/A'}
                          </Typography>
                          {asset.invoiceNumber && (
                            <Typography variant="body2" sx={{ mb: 0.5 }}>
                              <strong>Invoice:</strong> {asset.invoiceNumber}
                            </Typography>
                          )}
                        </Box>
                      </Grid>

                      {/* Warranty */}
                      {(asset.warrantyStartDate || asset.warrantyEndDate) && (
                        <Grid item xs={12} md={6}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#1e293b' }}>
                            Warranty
                          </Typography>
                          <Box sx={{ pl: 2 }}>
                            {asset.warrantyStartDate && (
                              <Typography variant="body2" sx={{ mb: 0.5 }}>
                                <strong>Start:</strong> {format(new Date(asset.warrantyStartDate), 'MMM dd, yyyy')}
                              </Typography>
                            )}
                            {asset.warrantyEndDate && (
                              <Typography variant="body2" sx={{ mb: 0.5 }}>
                                <strong>End:</strong> {format(new Date(asset.warrantyEndDate), 'MMM dd, yyyy')}
                              </Typography>
                            )}
                            {asset.warrantyDuration && (
                              <Typography variant="body2" sx={{ mb: 0.5 }}>
                                <strong>Duration:</strong> {asset.warrantyDuration}
                              </Typography>
                            )}
                          </Box>
                        </Grid>
                      )}

                      {/* Maintenance Records */}
                      {asset.maintenanceRecords && asset.maintenanceRecords.length > 0 && (
                        <Grid item xs={12}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#1e293b' }}>
                            Maintenance Records ({asset.maintenanceRecords.length})
                          </Typography>
                          <Box sx={{ pl: 2 }}>
                            {asset.maintenanceRecords.slice(0, 3).map((record: any) => (
                              <Typography key={record.id} variant="body2" sx={{ mb: 0.5, fontSize: '0.8rem' }}>
                                • {format(new Date(record.maintenanceDate), 'MMM dd, yyyy')} - {record.type}: {record.description}
                              </Typography>
                            ))}
                          </Box>
                        </Grid>
                      )}

                      {/* Documents */}
                      {asset.documents && asset.documents.length > 0 && (
                        <Grid item xs={12}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#1e293b' }}>
                            Documents ({asset.documents.length})
                          </Typography>
                          <Box sx={{ pl: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            {asset.documents.map((doc: any) => (
                              <Chip key={doc.id} label={doc.title} size="small" variant="outlined" />
                            ))}
                          </Box>
                        </Grid>
                      )}
                    </Grid>
                  </Paper>
                  {index < reportData.assets.length - 1 && <Divider sx={{ my: 2 }} />}
                </Box>
              ))}
            </>
          )}
        </Paper>
      )}

      {/* Empty State */}
      {!reportData && !loading && (
        <Paper
          elevation={0}
          sx={{
            border: '2px dashed #e2e8f0',
            borderRadius: 2,
            p: 6,
            textAlign: 'center',
            backgroundColor: '#f8fafc'
          }}
        >
          <ReportIcon sx={{ fontSize: 64, color: '#cbd5e1', mb: 2 }} />
          <Typography variant="h6" sx={{ color: '#64748b', mb: 1 }}>
            No Report Generated
          </Typography>
          <Typography variant="body2" sx={{ color: '#94a3b8' }}>
            Configure your filters and click "Generate Report" to view asset data
          </Typography>
        </Paper>
      )}
    </Box>
  );
}
