import { Box, Typography, Grid, Paper, LinearProgress, CircularProgress, Chip } from '@mui/material';
import InventoryIcon from '@mui/icons-material/Inventory';
import ContentCutIcon from '@mui/icons-material/ContentCut';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import ForestIcon from '@mui/icons-material/Forest';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useState, useEffect } from 'react';
import api from '../../lib/api';

interface DashboardStats {
  totalLots: number;
  activeLots: number;
  pendingApprovals: number;
  slicingInProgress: number;
  completedLots: number;
  woodTypes: number;
  totalVolume: number;
  recentLots: any[];
}

const Dashboard = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalLots: 0,
    activeLots: 0,
    pendingApprovals: 0,
    slicingInProgress: 0,
    completedLots: 0,
    woodTypes: 0,
    totalVolume: 0,
    recentLots: []
  });
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch all necessary data
      const [receiptsRes, woodTypesRes, approvalsRes] = await Promise.all([
        api.get('/management/wood-receipts'),
        api.get('/factory/wood-types'),
        api.get('/management/approvals/pending-count')
      ]);

      const receipts = receiptsRes.data || [];
      const woodTypes = woodTypesRes.data || [];

      // Calculate statistics
      const activeLots = receipts.filter((r: any) =>
        r.status !== 'COMPLETED' && r.status !== 'CANCELLED'
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

      setStats({
        totalLots: receipts.length,
        activeLots,
        pendingApprovals: approvalsRes.data.count || 0,
        slicingInProgress,
        completedLots,
        woodTypes: woodTypes.length,
        totalVolume: Math.round(totalVolume * 100) / 100,
        recentLots
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
      path: '/management/wood-receipt',
      gradient: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)'
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
      color: '#3b82f6',
      subtext: 'Currently Processing',
      path: '/factory/wood-slicer',
      gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
    },
    {
      icon: <TrendingUpIcon sx={{ fontSize: 40 }} />,
      count: loading ? <CircularProgress size={24} /> : stats.completedLots,
      label: 'Completed LOTs',
      color: '#10b981',
      subtext: 'Finished Processing',
      path: '/management/wood-receipt',
      gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
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
    <Box sx={{ p: 3, backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h4"
          component="h1"
          sx={{
            fontSize: '2rem',
            fontWeight: 800,
            background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            mb: 1
          }}
        >
          {user?.firstName ? `Welcome back, ${user.firstName}!` : 'Dashboard'}
        </Typography>
        <Typography
          variant="body1"
          sx={{
            color: '#64748b',
            fontSize: '1rem',
            fontWeight: 500
          }}
        >
          LOT Traceability & Wood Processing Overview
        </Typography>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {statCards.map((card, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Paper
              elevation={0}
              onClick={() => navigate(card.path)}
              sx={{
                p: 3,
                height: '100%',
                background: '#fff',
                border: '2px solid #fee2e2',
                borderRadius: 2,
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden',
                '&:hover': {
                  transform: 'translateY(-8px)',
                  boxShadow: '0 12px 24px rgba(0,0,0,0.1)',
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
                  height: '4px',
                  background: card.gradient,
                  transform: 'translateX(-100%)',
                  transition: 'transform 0.3s ease'
                }
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{
                  width: 56,
                  height: 56,
                  borderRadius: 2,
                  background: `${card.color}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: card.color
                }}>
                  {card.icon}
                </Box>
              </Box>

              <Typography
                variant="h3"
                sx={{
                  color: card.color,
                  fontSize: '2.5rem',
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
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              background: 'linear-gradient(135deg, #fef2f2 0%, #fff 100%)',
              border: '2px solid #fee2e2',
              borderRadius: 2
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Box sx={{
                width: 48,
                height: 48,
                borderRadius: 2,
                background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff'
              }}>
                <LocalShippingIcon sx={{ fontSize: 28 }} />
              </Box>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#dc2626' }}>
                  {loading ? <CircularProgress size={20} /> : `${stats.totalVolume} CBM`}
                </Typography>
                <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 600 }}>
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
              p: 3,
              background: 'linear-gradient(135deg, #fef2f2 0%, #fff 100%)',
              border: '2px solid #fee2e2',
              borderRadius: 2
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Box sx={{
                width: 48,
                height: 48,
                borderRadius: 2,
                background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff'
              }}>
                <ForestIcon sx={{ fontSize: 28 }} />
              </Box>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#dc2626' }}>
                  {loading ? <CircularProgress size={20} /> : stats.woodTypes}
                </Typography>
                <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 600 }}>
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
          p: 3,
          background: '#fff',
          border: '2px solid #fee2e2',
          borderRadius: 2
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <ReceiptLongIcon sx={{ color: '#dc2626', fontSize: 28 }} />
            <Typography
              variant="h6"
              sx={{
                fontSize: '1.25rem',
                fontWeight: 700,
                color: '#1e293b'
              }}
            >
              Recent LOTs
            </Typography>
          </Box>
          <Typography
            onClick={() => navigate('/management/wood-receipt')}
            sx={{
              color: '#dc2626',
              fontSize: '0.875rem',
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
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress sx={{ color: '#dc2626' }} />
          </Box>
        ) : stats.recentLots.length === 0 ? (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <WarningAmberIcon sx={{ fontSize: 48, color: '#cbd5e1', mb: 2 }} />
            <Typography sx={{ color: '#64748b', fontWeight: 500 }}>
              No LOTs found. Create your first LOT to get started!
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {stats.recentLots.map((lot: any) => (
              <Paper
                key={lot.id}
                elevation={0}
                onClick={() => navigate('/management/wood-receipt')}
                sx={{
                  p: 2.5,
                  border: '1px solid #e2e8f0',
                  borderRadius: 1.5,
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
                      {lot.estimatedVolumeM3 || lot.actualVolumeM3 || 0} CBM
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
    </Box>
  );
};

export default Dashboard;
