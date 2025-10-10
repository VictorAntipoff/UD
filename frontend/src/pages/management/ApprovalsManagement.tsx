import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Grid,
  CircularProgress,
  Stack
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AddIcon from '@mui/icons-material/Add';
import BlockIcon from '@mui/icons-material/Block';
import DeleteIcon from '@mui/icons-material/Delete';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import RuleIcon from '@mui/icons-material/Rule';
import { useAuth } from '../../hooks/useAuth';
import api from '../../lib/api';
import { alpha } from '@mui/material/styles';
import { styled } from '@mui/material/styles';

interface ApprovalRequest {
  id: string;
  type: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
  requestor_id: string;
  approver_id?: string;
  operation_id?: string;
  notes?: string;
  operation?: {
    serial_number: string;
    waste_percentage: number;
    wood_type?: {
      name: string;
    };
  };
  requestor?: {
    email: string;
  };
}

interface ApprovalRule {
  id: string;
  module: string;
  condition_type: string;
  condition_value: number;
  approver_id: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  approver?: {
    id: string;
    email: string;
    role: string;
  };
}

interface ApprovalRuleForm {
  module: string;
  condition_type: string;
  condition_value: number;
  approver_id: string;
}

const MODULE_CONDITIONS: Record<string, Array<{ value: string, label: string, unit: string }>> = {
  WoodSlicer: [
    { value: 'waste_percentage_above', label: 'Waste Percentage Above', unit: '%' },
    { value: 'volume_above', label: 'Volume Above', unit: 'm³' }
  ],
  WoodCalculator: [
    { value: 'cost_above', label: 'Cost Above', unit: '$' },
    { value: 'quantity_above', label: 'Quantity Above', unit: 'pcs' }
  ]
};

const StyledContainer = styled(Container)(({ theme }) => ({
  minHeight: '100vh',
  paddingTop: theme.spacing(4),
  paddingBottom: theme.spacing(4),
  backgroundColor: '#f8fafc',
}));

const textFieldSx = {
  '& .MuiOutlinedInput-root': {
    '& fieldset': {
      borderColor: 'rgba(0, 0, 0, 0.12)',
    },
    '&:hover fieldset': {
      borderColor: '#dc2626',
    },
    '&.Mui-focused fieldset': {
      borderColor: '#dc2626',
    },
    fontSize: '0.875rem',
  },
  '& .MuiInputLabel-root': {
    color: 'rgba(0, 0, 0, 0.6)',
    fontSize: '0.875rem',
    '&.Mui-focused': {
      color: '#dc2626',
    },
  },
};

export default function ApprovalsManagement() {
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
  const [approvalNote, setApprovalNote] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [rules, setRules] = useState<ApprovalRule[]>([]);
  const [isRuleDialogOpen, setIsRuleDialogOpen] = useState(false);
  const [ruleForm, setRuleForm] = useState<ApprovalRuleForm>({
    module: 'WoodSlicer',
    condition_type: 'waste_percentage_above',
    condition_value: 10,
    approver_id: ''
  });
  const [approvers, setApprovers] = useState<{ id: string; email: string; role: string; full_name?: string }[]>([]);
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([
      fetchApprovals(),
      fetchRules(),
      fetchApprovers(),
      checkAdminStatus()
    ]);
    setLoading(false);
  };

  const fetchApprovals = async () => {
    try {
      const response = await api.get('/management/approvals');
      const data = response.data;

      const safeData = (data || []).map(approval => ({
        ...approval,
        operation: approval.operation || {
          serial_number: 'N/A',
          waste_percentage: 0,
          wood_type: { name: 'N/A' }
        },
        requestor: approval.requestor || {
          email: 'unknown@example.com'
        }
      }));

      setApprovals(safeData);
    } catch (error: any) {
      if (error.response?.status !== 404) {
        console.error('Error fetching approvals:', error);
      }
      setApprovals([]);
    }
  };

  const fetchRules = async () => {
    try {
      const response = await api.get('/management/approval-rules');
      setRules(response.data || []);
    } catch (error: any) {
      if (error.response?.status !== 404) {
        console.error('Error fetching rules:', error);
      }
      setRules([]);
    }
  };

  const fetchApprovers = async () => {
    try {
      const response = await api.get('/users/profiles');
      setApprovers(response.data || []);
    } catch (error: any) {
      if (error.response?.status !== 404) {
        console.error('Error fetching approvers:', error);
      }
      setApprovers([]);
    }
  };

  const handleApproval = async (requestId: string, status: 'approved' | 'rejected') => {
    try {
      await api.patch(`/management/approvals/${requestId}`, {
        status,
        notes: approvalNote
      });

      if (status === 'approved' && selectedRequest?.operation_id) {
        await api.patch(`/factory/operations/${selectedRequest.operation_id}`, {
          status: 'approved'
        });
      }

      setIsDialogOpen(false);
      setApprovalNote('');
      fetchApprovals();
    } catch (error) {
      console.error('Error updating approval:', error);
    }
  };

  const handleRuleSubmit = async () => {
    try {
      if (!ruleForm.approver_id || !ruleForm.module || !ruleForm.condition_type) {
        throw new Error('Please fill in all required fields');
      }

      await api.post('/management/approval-rules', {
        ...ruleForm,
        is_active: true
      });

      setIsRuleDialogOpen(false);
      setRuleForm({
        module: 'WoodSlicer',
        condition_type: 'waste_percentage_above',
        condition_value: 10,
        approver_id: ''
      });
      fetchRules();
    } catch (error: any) {
      console.error('Error creating rule:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create rule';
      alert(errorMessage);
    }
  };

  const checkAdminStatus = async () => {
    if (!user?.id) return;

    try {
      const response = await api.get(`/users/profile/${user.id}`);
      setIsAdmin(response.data?.role === 'ADMIN');
    } catch (error: any) {
      if (error.response?.status !== 404) {
        console.error('Error checking admin status:', error);
      }
      setIsAdmin(false);
    }
  };

  const filteredApprovals = approvals.filter(approval => {
    if (selectedTab === 0) return approval.status === 'pending';
    if (selectedTab === 1) return approval.status === 'approved';
    return approval.status === 'rejected';
  });

  return (
    <StyledContainer maxWidth="xl">
      {/* Header */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
          borderRadius: 2,
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AssignmentTurnedInIcon sx={{ fontSize: 28, color: 'white' }} />
          </Box>
          <Box>
            <Typography
              variant="h4"
              sx={{
                color: 'white',
                fontWeight: 700,
                fontSize: '1.75rem',
                letterSpacing: '-0.025em',
              }}
            >
              Approvals Management
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: 'rgba(255, 255, 255, 0.9)',
                fontSize: '0.875rem',
                mt: 0.5,
              }}
            >
              Review and manage approval requests and workflow rules
            </Typography>
          </Box>
        </Box>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress sx={{ color: '#dc2626' }} />
        </Box>
      ) : (
        <>
          {/* Approval Requests Section */}
          <Paper
            elevation={0}
            sx={{
              mb: 4,
              borderRadius: 2,
              overflow: 'hidden',
              border: '1px solid #e2e8f0',
            }}
          >
            <Tabs
              value={selectedTab}
              onChange={(_, value) => setSelectedTab(value)}
              sx={{
                borderBottom: '1px solid #e2e8f0',
                '& .MuiTab-root': {
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  minHeight: 48,
                  '&.Mui-selected': {
                    color: '#dc2626',
                  },
                },
                '& .MuiTabs-indicator': {
                  backgroundColor: '#dc2626',
                },
              }}
            >
              <Tab label={`Pending (${approvals.filter(a => a.status === 'pending').length})`} />
              <Tab label={`Approved (${approvals.filter(a => a.status === 'approved').length})`} />
              <Tab label={`Rejected (${approvals.filter(a => a.status === 'rejected').length})`} />
            </Tabs>

            {filteredApprovals.length === 0 ? (
              <Box sx={{ p: 8, textAlign: 'center' }}>
                <AssignmentTurnedInIcon sx={{ fontSize: 64, color: '#cbd5e1', mb: 2 }} />
                <Typography variant="h6" sx={{ color: '#64748b', mb: 1, fontWeight: 500 }}>
                  No {selectedTab === 0 ? 'pending' : selectedTab === 1 ? 'approved' : 'rejected'} requests
                </Typography>
                <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                  {selectedTab === 0 ? 'All caught up! No approvals waiting for review.' : 'No requests in this category yet.'}
                </Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#f8fafc' }}>
                      <TableCell sx={{ fontWeight: 600, color: '#334155', fontSize: '0.875rem' }}>
                        Request ID
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#334155', fontSize: '0.875rem' }}>
                        Type
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#334155', fontSize: '0.875rem' }}>
                        Operation
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#334155', fontSize: '0.875rem' }}>
                        Requestor
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#334155', fontSize: '0.875rem' }}>
                        Status
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, color: '#334155', fontSize: '0.875rem' }}>
                        Actions
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredApprovals.map((approval) => (
                      <TableRow
                        key={approval.id}
                        sx={{
                          '&:hover': {
                            backgroundColor: '#f8fafc',
                          },
                          transition: 'background-color 0.2s ease',
                        }}
                      >
                        <TableCell>
                          <Typography sx={{ fontSize: '0.875rem', fontFamily: 'monospace', color: '#64748b' }}>
                            {approval.id.slice(0, 8)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography sx={{ fontSize: '0.875rem', color: '#1e293b', fontWeight: 500 }}>
                            {approval.type}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography sx={{ fontSize: '0.875rem', color: '#1e293b', fontWeight: 500 }}>
                            {approval.operation?.serial_number}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.75rem' }}>
                            Waste: {approval.operation?.waste_percentage.toFixed(2)}%
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography sx={{ fontSize: '0.875rem', color: '#64748b' }}>
                            {approval.requestor?.email}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={approval.status.toUpperCase()}
                            size="small"
                            sx={{
                              backgroundColor:
                                approval.status === 'approved' ? '#dcfce7' :
                                approval.status === 'rejected' ? '#fee2e2' : '#fef3c7',
                              color:
                                approval.status === 'approved' ? '#166534' :
                                approval.status === 'rejected' ? '#991b1b' : '#92400e',
                              fontWeight: 600,
                              fontSize: '0.75rem',
                              height: '24px',
                            }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                            <Tooltip title="View Details">
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setSelectedRequest(approval);
                                  setIsDialogOpen(true);
                                }}
                                sx={{
                                  color: '#64748b',
                                  '&:hover': {
                                    backgroundColor: alpha('#dc2626', 0.08),
                                    color: '#dc2626',
                                  },
                                }}
                              >
                                <VisibilityIcon sx={{ fontSize: '1.25rem' }} />
                              </IconButton>
                            </Tooltip>
                            {approval.status === 'pending' && (
                              <>
                                <Tooltip title="Approve">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleApproval(approval.id, 'approved')}
                                    sx={{
                                      color: '#64748b',
                                      '&:hover': {
                                        backgroundColor: alpha('#16a34a', 0.08),
                                        color: '#16a34a',
                                      },
                                    }}
                                  >
                                    <CheckCircleIcon sx={{ fontSize: '1.25rem' }} />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Reject">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleApproval(approval.id, 'rejected')}
                                    sx={{
                                      color: '#64748b',
                                      '&:hover': {
                                        backgroundColor: alpha('#dc2626', 0.08),
                                        color: '#dc2626',
                                      },
                                    }}
                                  >
                                    <CancelIcon sx={{ fontSize: '1.25rem' }} />
                                  </IconButton>
                                </Tooltip>
                              </>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>

          {/* Approval Rules Section */}
          <Paper
            elevation={0}
            sx={{
              borderRadius: 2,
              overflow: 'hidden',
              border: '1px solid #e2e8f0',
            }}
          >
            <Box
              sx={{
                p: 3,
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#f8fafc',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <RuleIcon sx={{ color: '#dc2626', fontSize: 24 }} />
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
                  Approval Rules
                </Typography>
              </Box>
              {isAdmin && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setIsRuleDialogOpen(true)}
                  sx={{
                    backgroundColor: '#dc2626',
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    '&:hover': {
                      backgroundColor: '#b91c1c',
                    },
                  }}
                >
                  Add Rule
                </Button>
              )}
            </Box>

            {rules.length === 0 ? (
              <Box sx={{ p: 8, textAlign: 'center' }}>
                <RuleIcon sx={{ fontSize: 64, color: '#cbd5e1', mb: 2 }} />
                <Typography variant="h6" sx={{ color: '#64748b', mb: 1, fontWeight: 500 }}>
                  No approval rules configured
                </Typography>
                <Typography variant="body2" sx={{ color: '#94a3b8', mb: 3 }}>
                  Set up rules to automate approval workflows
                </Typography>
                {isAdmin && (
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setIsRuleDialogOpen(true)}
                    sx={{
                      backgroundColor: '#dc2626',
                      textTransform: 'none',
                      fontWeight: 600,
                      '&:hover': {
                        backgroundColor: '#b91c1c',
                      },
                    }}
                  >
                    Add Rule
                  </Button>
                )}
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#f8fafc' }}>
                      <TableCell sx={{ fontWeight: 600, color: '#334155', fontSize: '0.875rem' }}>
                        Module
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#334155', fontSize: '0.875rem' }}>
                        Condition
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#334155', fontSize: '0.875rem' }}>
                        Approver
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#334155', fontSize: '0.875rem' }}>
                        Status
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, color: '#334155', fontSize: '0.875rem' }}>
                        Actions
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rules.map((rule) => (
                      <TableRow
                        key={rule.id}
                        sx={{
                          '&:hover': {
                            backgroundColor: '#f8fafc',
                          },
                          transition: 'background-color 0.2s ease',
                        }}
                      >
                        <TableCell>
                          <Typography sx={{ fontSize: '0.875rem', color: '#1e293b', fontWeight: 500 }}>
                            {rule.module}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography sx={{ fontSize: '0.875rem', color: '#64748b' }}>
                            {(() => {
                              const condition = MODULE_CONDITIONS[rule.module]?.find(
                                c => c.value === rule.condition_type
                              );
                              return condition
                                ? `${condition.label} ${rule.condition_value}${condition.unit}`
                                : rule.condition_type;
                            })()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography sx={{ fontSize: '0.875rem', color: '#64748b' }}>
                              {rule.approver?.email}
                            </Typography>
                            {rule.approver?.role === 'ADMIN' && (
                              <Chip
                                size="small"
                                label="Admin"
                                sx={{
                                  backgroundColor: alpha('#dc2626', 0.1),
                                  color: '#dc2626',
                                  fontSize: '0.75rem',
                                  height: '20px',
                                  fontWeight: 600,
                                }}
                              />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={rule.is_active ? 'Active' : 'Inactive'}
                            size="small"
                            sx={{
                              backgroundColor: rule.is_active ? '#dcfce7' : '#f1f5f9',
                              color: rule.is_active ? '#166534' : '#64748b',
                              fontWeight: 600,
                              fontSize: '0.75rem',
                              height: '24px',
                            }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                            <Tooltip title={rule.is_active ? 'Deactivate' : 'Activate'}>
                              <IconButton
                                size="small"
                                onClick={async () => {
                                  const newStatus = !rule.is_active;
                                  try {
                                    await api.patch(`/management/approval-rules/${rule.id}`, {
                                      is_active: newStatus
                                    });
                                    fetchRules();
                                  } catch (error) {
                                    console.error('Error updating rule status:', error);
                                  }
                                }}
                                sx={{
                                  color: '#64748b',
                                  '&:hover': {
                                    backgroundColor: alpha('#dc2626', 0.08),
                                    color: '#dc2626',
                                  },
                                }}
                              >
                                {rule.is_active ? <BlockIcon sx={{ fontSize: '1.25rem' }} /> : <CheckCircleIcon sx={{ fontSize: '1.25rem' }} />}
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton
                                size="small"
                                onClick={async () => {
                                  if (window.confirm('Are you sure you want to delete this rule?')) {
                                    try {
                                      await api.delete(`/management/approval-rules/${rule.id}`);
                                      fetchRules();
                                    } catch (error) {
                                      console.error('Error deleting rule:', error);
                                    }
                                  }
                                }}
                                sx={{
                                  color: '#64748b',
                                  '&:hover': {
                                    backgroundColor: alpha('#dc2626', 0.08),
                                    color: '#dc2626',
                                  },
                                }}
                              >
                                <DeleteIcon sx={{ fontSize: '1.25rem' }} />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </>
      )}

      {/* Approval Details Dialog */}
      <Dialog
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
          }
        }}
      >
        <DialogTitle
          sx={{
            fontSize: '1.25rem',
            fontWeight: 700,
            color: '#1e293b',
            borderBottom: '1px solid #e2e8f0',
            pb: 2,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>Approval Request Details</span>
          <Chip
            label={selectedRequest?.status.toUpperCase()}
            size="small"
            sx={{
              backgroundColor:
                selectedRequest?.status === 'approved' ? '#dcfce7' :
                selectedRequest?.status === 'rejected' ? '#fee2e2' : '#fef3c7',
              color:
                selectedRequest?.status === 'approved' ? '#166534' :
                selectedRequest?.status === 'rejected' ? '#991b1b' : '#92400e',
              fontWeight: 600,
              fontSize: '0.75rem',
            }}
          />
        </DialogTitle>
        <DialogContent sx={{ py: 3, px: 3 }}>
          <Stack spacing={3}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                backgroundColor: '#f8fafc',
                borderRadius: 2,
                border: '1px solid #e2e8f0',
              }}
            >
              <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155', mb: 2 }}>
                Operation Details
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.75rem' }}>
                    Serial Number
                  </Typography>
                  <Typography sx={{ fontSize: '0.875rem', color: '#1e293b', fontWeight: 500 }}>
                    {selectedRequest?.operation?.serial_number}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.75rem' }}>
                    Wood Type
                  </Typography>
                  <Typography sx={{ fontSize: '0.875rem', color: '#1e293b', fontWeight: 500 }}>
                    {selectedRequest?.operation?.wood_type?.name}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.75rem' }}>
                    Waste Percentage
                  </Typography>
                  <Typography sx={{ fontSize: '0.875rem', color: '#dc2626', fontWeight: 600 }}>
                    {selectedRequest?.operation?.waste_percentage.toFixed(2)}%
                  </Typography>
                </Grid>
              </Grid>
            </Paper>

            <TextField
              fullWidth
              multiline
              rows={4}
              label="Approval Notes"
              value={approvalNote}
              onChange={(e) => setApprovalNote(e.target.value)}
              placeholder="Add notes about this approval decision..."
              sx={textFieldSx}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, pt: 2, borderTop: '1px solid #e2e8f0', gap: 1 }}>
          <Button
            onClick={() => setIsDialogOpen(false)}
            sx={{
              color: '#64748b',
              textTransform: 'none',
              fontWeight: 600,
              '&:hover': {
                backgroundColor: '#f1f5f9',
              },
            }}
          >
            Cancel
          </Button>
          {selectedRequest?.status === 'pending' && (
            <>
              <Button
                onClick={() => handleApproval(selectedRequest!.id, 'rejected')}
                startIcon={<CancelIcon />}
                sx={{
                  color: '#dc2626',
                  textTransform: 'none',
                  fontWeight: 600,
                  borderColor: '#dc2626',
                  '&:hover': {
                    backgroundColor: alpha('#dc2626', 0.08),
                    borderColor: '#b91c1c',
                  },
                }}
                variant="outlined"
              >
                Reject
              </Button>
              <Button
                onClick={() => handleApproval(selectedRequest!.id, 'approved')}
                startIcon={<CheckCircleIcon />}
                variant="contained"
                sx={{
                  backgroundColor: '#16a34a',
                  textTransform: 'none',
                  fontWeight: 600,
                  px: 3,
                  '&:hover': {
                    backgroundColor: '#15803d',
                  },
                }}
              >
                Approve
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Add Rule Dialog */}
      <Dialog
        open={isRuleDialogOpen}
        onClose={() => setIsRuleDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
          }
        }}
      >
        <DialogTitle
          sx={{
            fontSize: '1.25rem',
            fontWeight: 700,
            color: '#1e293b',
            borderBottom: '1px solid #e2e8f0',
            pb: 2,
          }}
        >
          Add Approval Rule
        </DialogTitle>
        <DialogContent sx={{ py: 3, px: 3 }}>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField
              select
              fullWidth
              label="Module"
              value={ruleForm.module}
              onChange={(e) => {
                const newModule = e.target.value;
                setRuleForm({
                  ...ruleForm,
                  module: newModule,
                  condition_type: MODULE_CONDITIONS[newModule][0].value
                });
              }}
              size="small"
              sx={textFieldSx}
            >
              {Object.keys(MODULE_CONDITIONS).map(module => (
                <MenuItem key={module} value={module}>{module}</MenuItem>
              ))}
            </TextField>

            <TextField
              select
              fullWidth
              label="Condition"
              value={ruleForm.condition_type}
              onChange={(e) => setRuleForm({ ...ruleForm, condition_type: e.target.value })}
              size="small"
              sx={textFieldSx}
            >
              {MODULE_CONDITIONS[ruleForm.module].map(condition => (
                <MenuItem key={condition.value} value={condition.value}>
                  {condition.label}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              fullWidth
              type="number"
              label="Value"
              value={ruleForm.condition_value}
              onChange={(e) => setRuleForm({ ...ruleForm, condition_value: parseFloat(e.target.value) })}
              size="small"
              sx={textFieldSx}
            />

            <TextField
              select
              fullWidth
              label="Approver"
              value={ruleForm.approver_id}
              onChange={(e) => setRuleForm({ ...ruleForm, approver_id: e.target.value })}
              size="small"
              sx={textFieldSx}
            >
              {approvers.map(approver => (
                <MenuItem key={approver.id} value={approver.id}>
                  {approver.email}
                  {approver.full_name && ` - ${approver.full_name}`}
                  {approver.role === 'ADMIN' && ' (Admin)'}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, pt: 2, borderTop: '1px solid #e2e8f0' }}>
          <Button
            onClick={() => setIsRuleDialogOpen(false)}
            sx={{
              color: '#64748b',
              textTransform: 'none',
              fontWeight: 600,
              '&:hover': {
                backgroundColor: '#f1f5f9',
              },
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleRuleSubmit}
            variant="contained"
            sx={{
              backgroundColor: '#dc2626',
              textTransform: 'none',
              fontWeight: 600,
              px: 3,
              '&:hover': {
                backgroundColor: '#b91c1c',
              },
            }}
          >
            Create Rule
          </Button>
        </DialogActions>
      </Dialog>
    </StyledContainer>
  );
}
