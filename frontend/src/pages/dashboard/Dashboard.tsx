import { Box, Typography, Grid, Paper, LinearProgress, CircularProgress, Chip } from '@mui/material';
import InventoryIcon from '@mui/icons-material/Inventory';
import ContentCutIcon from '@mui/icons-material/ContentCut';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import ForestIcon from '@mui/icons-material/Forest';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import { useTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useState, useEffect } from 'react';
import api from '../../lib/api';

interface DashboardStats {
  totalLots: number;
  activeLots: number;
  pendingApprovals: number;
  pendingReceipts: number;
  slicingInProgress: number;
  completedLots: number;
  woodTypes: number;
  totalVolume: number;
  recentLots: any[];
  ongoingDrying: any[];
}

const Dashboard = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalLots: 0,
    activeLots: 0,
    pendingApprovals: 0,
    pendingReceipts: 0,
    slicingInProgress: 0,
    completedLots: 0,
    woodTypes: 0,
    totalVolume: 0,
    recentLots: [],
    ongoingDrying: []
  });
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch all necessary data
      const [receiptsRes, woodTypesRes, approvalsRes, dryingRes] = await Promise.all([
        api.get('/management/wood-receipts'),
        api.get('/factory/wood-types'),
        api.get('/management/approvals/pending-count'),
        api.get('/factory/drying-processes')
      ]);

      const receipts = receiptsRes.data || [];
      const woodTypes = woodTypesRes.data || [];
      const dryingProcesses = dryingRes.data || [];

      // Calculate statistics
      const activeLots = receipts.filter((r: any) =>
        r.status !== 'COMPLETED' && r.status !== 'CANCELLED'
      ).length;

      const pendingReceipts = receipts.filter((r: any) =>
        r.status === 'CREATED' || r.status === 'PENDING'
      ).length;

      const slicingInProgress = receipts.filter((r: any) =>
        r.status === 'SLICING' || r.status === 'IN_PROCESS'
      ).length;

      const completedLots = receipts.filter((r: any) =>
        r.status === 'COMPLETED'
      ).length;

      const totalVolume = receipts.reduce((sum: number, r: any) =>
        sum + (r.estimatedVolumeM3 || r.actualVolumeM3 || 0), 0
      );

      // Get recent 5 lots
      const recentLots = receipts
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);

      // Filter ongoing drying processes
      const ongoingDrying = dryingProcesses.filter((p: any) =>
        p.status === 'IN_PROGRESS' || p.status === 'ACTIVE'
      );

      setStats({
        totalLots: receipts.length,
        activeLots,
        pendingApprovals: approvalsRes.data.count || 0,
        pendingReceipts,
        slicingInProgress,
        completedLots,
        woodTypes: woodTypes.length,
        totalVolume: Math.round(totalVolume * 100) / 100,
        recentLots,
        ongoingDrying
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      icon: <InventoryIcon sx={{ fontSize: 40 }} />,
      count: loading ? <CircularProgress size={24} /> : stats.totalLots,
      label: 'Total LOTs',
      color: '#dc2626',
      subtext: `${stats.activeLots} Active`,
      path: '/dashboard/management/wood-receipt',
      gradient: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)'
    },
    {
      icon: <LocalShippingIcon sx={{ fontSize: 40 }} />,
      count: loading ? <CircularProgress size={24} /> : stats.pendingReceipts,
      label: 'Pending Receipts',
      color: '#3b82f6',
      subtext: 'Awaiting Delivery',
      path: '/dashboard/management/wood-receipt',
      gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
    },
    {
      icon: <AssignmentTurnedInIcon sx={{ fontSize: 40 }} />,
      count: loading ? <CircularProgress size={24} /> : stats.pendingApprovals,
      label: 'Pending Approvals',
      color: '#f59e0b',
      subtext: 'Require Action',
      path: '/management/approvals',
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
    },
    {
      icon: <ContentCutIcon sx={{ fontSize: 40 }} />,
      count: loading ? <CircularProgress size={24} /> : stats.slicingInProgress,
      label: 'Slicing in Progress',
      color: '#8b5cf6',
      subtext: 'Currently Processing',
      path: '/dashboard/factory/wood-slicer',
      gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)'
    }
  ];

  const getStatusColor = (status: string) => {
    const colors: any = {
      'CREATED': '#64748b',
      'PENDING': '#f59e0b',
      'RECEIVED': '#3b82f6',
      'SLICING': '#8b5cf6',
      'COMPLETED': '#10b981',
      'CANCELLED': '#ef4444'
    };
    return colors[status] || '#64748b';
  };

  const getStatusLabel = (status: string) => {
    const labels: any = {
      'CREATED': 'Created',
      'PENDING': 'Pending',
      'RECEIVED': 'Received',
      'SLICING': 'Slicing',
      'COMPLETED': 'Completed',
      'CANCELLED': 'Cancelled'
    };
    return labels[status] || status;
  };

  return (
    <Box sx={{ p: 2, backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ mb: 2 }}>
        <Typography
          variant="h4"
          component="h1"
          sx={{
            fontSize: '1.5rem',
            fontWeight: 800,
            background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            mb: 0.5
          }}
        >
          {user?.firstName ? `Welcome back, ${user.firstName}!` : 'Dashboard'}
        </Typography>
        <Typography
          variant="body1"
          sx={{
            color: '#64748b',
            fontSize: '0.875rem',
            fontWeight: 500
          }}
        >
          LOT Traceability & Wood Processing Overview
        </Typography>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        {statCards.map((card, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Paper
              elevation={0}
              onClick={() => navigate(card.path)}
              sx={{
                p: 2,
                height: '100%',
                background: '#fff',
                border: '1px solid #fee2e2',
                borderRadius: 1.5,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                position: 'relative',
                overflow: 'hidden',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 8px 16px rgba(0,0,0,0.08)',
                  borderColor: card.color,
                  '&::before': {
                    transform: 'translateX(0)'
                  }
                },
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '3px',
                  background: card.gradient,
                  transform: 'translateX(-100%)',
                  transition: 'transform 0.2s ease'
                }
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
                <Box sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 1.5,
                  background: `${card.color}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: card.color,
                  '& svg': { fontSize: 28 }
                }}>
                  {card.icon}
                </Box>
              </Box>

              <Typography
                variant="h3"
                sx={{
                  color: card.color,
                  fontSize: '1.75rem',
                  fontWeight: 800,
                  mb: 0.5,
                  lineHeight: 1
                }}
              >
                {card.count}
              </Typography>

              <Typography
                sx={{
                  color: '#1e293b',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  mb: 0.5
                }}
              >
                {card.label}
              </Typography>

              <Typography
                sx={{
                  color: '#64748b',
                  fontSize: '0.75rem',
                  fontWeight: 500
                }}
              >
                {card.subtext}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Additional Info Cards */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={6}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              background: 'linear-gradient(135deg, #fef2f2 0%, #fff 100%)',
              border: '1px solid #fee2e2',
              borderRadius: 1.5
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{
                width: 40,
                height: 40,
                borderRadius: 1.5,
                background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff'
              }}>
                <LocalShippingIcon sx={{ fontSize: 22 }} />
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#dc2626', fontSize: '1.25rem' }}>
                  {loading ? <CircularProgress size={16} /> : `${parseFloat(stats.totalVolume).toFixed(3)} CBM`}
                </Typography>
                <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 600, fontSize: '0.75rem' }}>
                  Total Wood Volume
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              background: 'linear-gradient(135deg, #fef2f2 0%, #fff 100%)',
              border: '1px solid #fee2e2',
              borderRadius: 1.5
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{
                width: 40,
                height: 40,
                borderRadius: 1.5,
                background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff'
              }}>
                <ForestIcon sx={{ fontSize: 22 }} />
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#dc2626', fontSize: '1.25rem' }}>
                  {loading ? <CircularProgress size={16} /> : stats.woodTypes}
                </Typography>
                <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 600, fontSize: '0.75rem' }}>
                  Wood Types Available
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Recent LOTs */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          background: '#fff',
          border: '1px solid #fee2e2',
          borderRadius: 1.5
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <ReceiptLongIcon sx={{ color: '#dc2626', fontSize: 24 }} />
            <Typography
              variant="h6"
              sx={{
                fontSize: '1rem',
                fontWeight: 700,
                color: '#1e293b'
              }}
            >
              Recent LOTs
            </Typography>
          </Box>
          <Typography
            onClick={() => navigate('/dashboard/management/wood-receipt')}
            sx={{
              color: '#dc2626',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              '&:hover': {
                textDecoration: 'underline'
              }
            }}
          >
            View All →
          </Typography>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress sx={{ color: '#dc2626' }} size={24} />
          </Box>
        ) : stats.recentLots.length === 0 ? (
          <Box sx={{ py: 3, textAlign: 'center' }}>
            <WarningAmberIcon sx={{ fontSize: 40, color: '#cbd5e1', mb: 1.5 }} />
            <Typography sx={{ color: '#64748b', fontWeight: 500, fontSize: '0.875rem' }}>
              No LOTs found. Create your first LOT to get started!
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {stats.recentLots.map((lot: any) => (
              <Paper
                key={lot.id}
                elevation={0}
                onClick={() => navigate('/dashboard/management/wood-receipt')}
                sx={{
                  p: 1.5,
                  border: '1px solid #e2e8f0',
                  borderRadius: 1,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    transform: 'translateX(4px)',
                    borderColor: '#dc2626',
                    boxShadow: '0 4px 12px rgba(220, 38, 38, 0.1)'
                  }
                }}
              >
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={3}>
                    <Box sx={{
                      display: 'inline-block',
                      backgroundColor: '#dc2626',
                      color: '#fff',
                      px: 2,
                      py: 0.75,
                      borderRadius: 1,
                      fontWeight: 700,
                      fontSize: '0.875rem'
                    }}>
                      {lot.lotNumber}
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.75rem', mb: 0.5 }}>
                      Wood Type
                    </Typography>
                    <Typography sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                      {lot.woodType?.name || 'N/A'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={2}>
                    <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.75rem', mb: 0.5 }}>
                      Supplier
                    </Typography>
                    <Typography sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                      {lot.supplier}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={2}>
                    <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.75rem', mb: 0.5 }}>
                      Volume
                    </Typography>
                    <Typography sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                      {(lot.estimatedVolumeM3 || lot.actualVolumeM3 || 0).toFixed(3)} CBM
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={2}>
                    <Chip
                      label={getStatusLabel(lot.status)}
                      size="small"
                      sx={{
                        backgroundColor: getStatusColor(lot.status),
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        height: 28
                      }}
                    />
                  </Grid>
                </Grid>
              </Paper>
            ))}
          </Box>
        )}
      </Paper>

      {/* Ongoing Drying Processes */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mt: 2,
          background: '#fff',
          border: '1px solid #fee2e2',
          borderRadius: 1.5
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <LocalFireDepartmentIcon sx={{ color: '#dc2626', fontSize: 24 }} />
            <Typography
              variant="h6"
              sx={{
                fontSize: '1rem',
                fontWeight: 700,
                color: '#1e293b'
              }}
            >
              Ongoing Drying Processes
            </Typography>
          </Box>
          <Typography
            onClick={() => navigate('/dashboard/factory/drying-process')}
            sx={{
              color: '#dc2626',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              '&:hover': {
                textDecoration: 'underline'
              }
            }}
          >
            View All →
          </Typography>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress sx={{ color: '#dc2626' }} size={24} />
          </Box>
        ) : stats.ongoingDrying.length === 0 ? (
          <Box sx={{ py: 3, textAlign: 'center' }}>
            <LocalFireDepartmentIcon sx={{ fontSize: 40, color: '#cbd5e1', mb: 1.5 }} />
            <Typography sx={{ color: '#64748b', fontWeight: 500, fontSize: '0.875rem' }}>
              No ongoing drying processes. Start a new drying process!
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {stats.ongoingDrying.map((process: any) => (
              <Paper
                key={process.id}
                elevation={0}
                onClick={() => navigate('/dashboard/factory/drying-process')}
                sx={{
                  p: 1.5,
                  border: '1px solid #e2e8f0',
                  borderRadius: 1,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    transform: 'translateX(4px)',
                    borderColor: '#dc2626',
                    boxShadow: '0 4px 12px rgba(220, 38, 38, 0.1)'
                  }
                }}
              >
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={3}>
                    <Box sx={{
                      display: 'inline-block',
                      backgroundColor: '#dc2626',
                      color: '#fff',
                      px: 2,
                      py: 0.75,
                      borderRadius: 1,
                      fontWeight: 700,
                      fontSize: '0.875rem'
                    }}>
                      {process.batchNumber || 'N/A'}
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.75rem', mb: 0.5 }}>
                      Wood Type & Pieces
                    </Typography>
                    {process.items && process.items.length > 0 ? (
                      <Box>
                        {process.items.map((item: any, idx: number) => (
                          <Typography key={item.id} sx={{ fontWeight: 600, fontSize: '0.875rem', lineHeight: 1.4 }}>
                            {item.woodType?.name || 'Unknown'} {item.thickness} - {item.pieceCount} pcs
                          </Typography>
                        ))}
                      </Box>
                    ) : (
                      <Typography sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                        {process.woodType?.name || 'N/A'} - {process.pieceCount || 0} pcs
                      </Typography>
                    )}
                  </Grid>
                  <Grid item xs={12} sm={2}>
                    <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.75rem', mb: 0.5 }}>
                      Latest Humidity
                    </Typography>
                    <Typography sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                      {process.readings && process.readings.length > 0
                        ? `${process.readings[process.readings.length - 1].humidity}%`
                        : 'No readings'
                      }
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={1}>
                    <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.75rem', mb: 0.5 }}>
                      Readings
                    </Typography>
                    <Typography sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                      {process.readings?.length || 0}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={2}>
                    <Chip
                      label={process.status === 'IN_PROGRESS' ? 'In Progress' : 'Active'}
                      size="small"
                      sx={{
                        backgroundColor: '#f59e0b',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        height: 28
                      }}
                    />
                  </Grid>
                </Grid>
              </Paper>
            ))}
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default Dashboard;
