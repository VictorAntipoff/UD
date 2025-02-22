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
  Grid
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AddIcon from '@mui/icons-material/Add';
import BlockIcon from '@mui/icons-material/Block';
import DeleteIcon from '@mui/icons-material/Delete';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '@mui/material/styles';

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

// Add this interface for module-specific conditions
interface ModuleCondition {
  value: string;
  label: string;
  unit: string;
}

// Add module-specific conditions mapping
const MODULE_CONDITIONS: Record<string, ModuleCondition[]> = {
  WoodSlicer: [
    { value: 'waste_percentage_above', label: 'Waste Percentage Above', unit: '%' },
    { value: 'volume_above', label: 'Volume Above', unit: 'm³' }
  ],
  WoodCalculator: [
    { value: 'cost_above', label: 'Cost Above', unit: '$' },
    { value: 'quantity_above', label: 'Quantity Above', unit: 'pcs' }
  ]
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
  const theme = useTheme();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetchApprovals();
    fetchRules();
    fetchApprovers();
    checkAdminStatus();
  }, []);

  const fetchApprovals = async () => {
    try {
      const { data, error } = await supabase
        .from('approval_requests')
        .select(`
          *,
          operation:wood_slicing_operations (
            serial_number,
            waste_percentage,
            wood_type:wood_types (name)
          ),
          requestor:profiles!approval_requests_requestor_id_fkey (
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Fetch error:', error);
        throw error;
      }

      // Handle possible null values in the response
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
    } catch (error) {
      console.error('Error fetching approvals:', error);
    }
  };

  const fetchRules = async () => {
    try {
      const { data, error } = await supabase
        .from('approval_rules')
        .select(`
          *,
          approver:profiles!approval_rules_approver_id_fkey (
            id,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRules(data || []);
    } catch (error) {
      console.error('Error fetching rules:', error);
    }
  };

  const fetchApprovers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          role,
          full_name
        `)
        .order('email');

      if (error) throw error;
      setApprovers(data || []);
    } catch (error) {
      console.error('Error fetching approvers:', error);
    }
  };

  const handleApproval = async (requestId: string, status: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('approval_requests')
        .update({
          status,
          approver_id: user?.id,
          notes: approvalNote,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      // If approved, update the operation status
      if (status === 'approved' && selectedRequest?.operation_id) {
        const { error: opError } = await supabase
          .from('wood_slicing_operations')
          .update({ status: 'approved' })
          .eq('id', selectedRequest.operation_id);

        if (opError) throw opError;
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
      if (!user?.id) {
        throw new Error('You must be logged in to create rules');
      }

      // Check if user is admin
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, email')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Profile fetch error:', profileError);
        throw new Error('Failed to verify user permissions');
      }

      console.log('User profile:', profile); // Debug log

      if (!profile || profile.role !== 'ADMIN') {
        throw new Error(`Only admin users can create approval rules. Current role: ${profile?.role}`);
      }

      // Validate form data
      if (!ruleForm.approver_id || !ruleForm.module || !ruleForm.condition_type) {
        throw new Error('Please fill in all required fields');
      }

      const { error: insertError } = await supabase
        .from('approval_rules')
        .insert({
          ...ruleForm,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (insertError) {
        console.error('Insert error:', insertError);
        throw new Error('Failed to create rule');
      }

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
      alert(error.message || 'Failed to create rule');
    }
  };

  // Add this handler for module change
  const handleModuleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newModule = e.target.value;
    setRuleForm({
      ...ruleForm,
      module: newModule,
      condition_type: MODULE_CONDITIONS[newModule][0].value, // Reset to first condition
      condition_value: 10
    });
  };

  const checkAdminStatus = async () => {
    if (!user?.id) return;
    
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    setIsAdmin(data?.role === 'ADMIN');
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Approvals Management
        </Typography>

        <Paper sx={{ mb: 3 }}>
          <Tabs value={selectedTab} onChange={(_, value) => setSelectedTab(value)}>
            <Tab label="Pending" />
            <Tab label="Approved" />
            <Tab label="Rejected" />
          </Tabs>
        </Paper>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Request ID</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Operation</TableCell>
                <TableCell>Requestor</TableCell>
                <TableCell>Details</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {approvals
                .filter(approval => {
                  if (selectedTab === 0) return approval.status === 'pending';
                  if (selectedTab === 1) return approval.status === 'approved';
                  return approval.status === 'rejected';
                })
                .map((approval) => (
                  <TableRow key={approval.id}>
                    <TableCell>{approval.id.slice(0, 8)}</TableCell>
                    <TableCell>{approval.type}</TableCell>
                    <TableCell>
                      {approval.operation?.serial_number}<br />
                      <Typography variant="caption" color="text.secondary">
                        Waste: {approval.operation?.waste_percentage.toFixed(2)}%
                      </Typography>
                    </TableCell>
                    <TableCell>{approval.requestor?.email}</TableCell>
                    <TableCell>
                      <Tooltip title="View Details">
                        <IconButton size="small" onClick={() => {
                          setSelectedRequest(approval);
                          setIsDialogOpen(true);
                        }}>
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={approval.status}
                        color={
                          approval.status === 'approved' ? 'success' :
                          approval.status === 'rejected' ? 'error' :
                          'warning'
                        }
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      {approval.status === 'pending' && (
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                          <Tooltip title="Approve">
                            <IconButton
                              color="success"
                              size="small"
                              onClick={() => handleApproval(approval.id, 'approved')}
                            >
                              <CheckCircleIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Reject">
                            <IconButton
                              color="error"
                              size="small"
                              onClick={() => handleApproval(approval.id, 'rejected')}
                            >
                              <CancelIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Approval Dialog */}
      <Dialog open={isDialogOpen} onClose={() => setIsDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Approval Request Details</Typography>
            <Chip 
              label={selectedRequest?.status.toUpperCase()}
              color={
                selectedRequest?.status === 'pending' ? 'warning' :
                selectedRequest?.status === 'approved' ? 'success' : 'error'
              }
            />
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {/* Operation Details */}
            <Paper sx={{ p: 2, mb: 2 }}>
              <Typography variant="subtitle1" gutterBottom>Operation Details</Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Serial Number: {selectedRequest?.operation?.serial_number}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Wood Type: {selectedRequest?.operation?.wood_type?.name}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Waste Percentage: {selectedRequest?.operation?.waste_percentage.toFixed(2)}%
                  </Typography>
                </Grid>
              </Grid>
            </Paper>

            {/* Approval Notes */}
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Approval Notes"
              value={approvalNote}
              onChange={(e) => setApprovalNote(e.target.value)}
            />

            {/* View Report Button */}
            <Button
              startIcon={<VisibilityIcon />}
              onClick={() => {
                // Add logic to view operation report
              }}
              sx={{ mt: 2 }}
            >
              View Operation Report
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsDialogOpen(false)}>Cancel</Button>
          <Button
            color="success"
            onClick={() => handleApproval(selectedRequest!.id, 'approved')}
            startIcon={<CheckCircleIcon />}
          >
            Approve
          </Button>
          <Button
            color="error"
            onClick={() => handleApproval(selectedRequest!.id, 'rejected')}
            startIcon={<CancelIcon />}
          >
            Reject
          </Button>
        </DialogActions>
      </Dialog>

      <Box sx={{ mt: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5">Approval Rules</Typography>
          {isAdmin && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setIsRuleDialogOpen(true)}
            >
              Add Rule
            </Button>
          )}
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Module</TableCell>
                <TableCell>Condition</TableCell>
                <TableCell>Approver</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell>{rule.module}</TableCell>
                  <TableCell>
                    {(() => {
                      const condition = MODULE_CONDITIONS[rule.module].find(
                        c => c.value === rule.condition_type
                      );
                      return condition 
                        ? `${condition.label} ${rule.condition_value}${condition.unit}`
                        : rule.condition_type;
                    })()}
                  </TableCell>
                  <TableCell>{rule.approver?.email}</TableCell>
                  <TableCell>
                    <Chip
                      label={rule.is_active ? 'Active' : 'Inactive'}
                      color={rule.is_active ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => {
                        const newStatus = !rule.is_active;
                        supabase
                          .from('approval_rules')
                          .update({ is_active: newStatus })
                          .eq('id', rule.id)
                          .then(() => fetchRules());
                      }}
                    >
                      {rule.is_active ? <BlockIcon /> : <CheckCircleIcon />}
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => {
                        supabase
                          .from('approval_rules')
                          .delete()
                          .eq('id', rule.id)
                          .then(() => fetchRules());
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
      </Box>

      {/* Add Rule Dialog */}
      <Dialog 
        open={isRuleDialogOpen} 
        onClose={() => setIsRuleDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
      >
        <DialogTitle sx={{ 
          borderBottom: `1px solid ${theme.palette.divider}`,
          px: 3,
          py: 2
        }}>
          Add Approval Rule
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
            <TextField
              select
              size="small"
              fullWidth
              label="Module"
              value={ruleForm.module}
              onChange={handleModuleChange}
            >
              <MenuItem value="WoodSlicer">Wood Slicer</MenuItem>
              <MenuItem value="WoodCalculator">Wood Calculator</MenuItem>
            </TextField>

            <TextField
              select
              size="small"
              fullWidth
              label="Condition Type"
              value={ruleForm.condition_type}
              onChange={(e) => setRuleForm({ ...ruleForm, condition_type: e.target.value })}
            >
              {MODULE_CONDITIONS[ruleForm.module].map((condition) => (
                <MenuItem key={condition.value} value={condition.value}>
                  {condition.label}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              size="small"
              fullWidth
              type="number"
              label="Threshold Value"
              value={ruleForm.condition_value}
              onChange={(e) => setRuleForm({ ...ruleForm, condition_value: parseFloat(e.target.value) })}
              InputProps={{
                endAdornment: MODULE_CONDITIONS[ruleForm.module].find(
                  c => c.value === ruleForm.condition_type
                )?.unit || null
              }}
            />

            <TextField
              select
              size="small"
              fullWidth
              label="Approver"
              value={ruleForm.approver_id}
              onChange={(e) => setRuleForm({ ...ruleForm, approver_id: e.target.value })}
            >
              {approvers.map(approver => (
                <MenuItem key={approver.id} value={approver.id}>
                  {approver.email} {approver.role === 'ADMIN' && '(Admin)'} 
                  {approver.full_name && ` - ${approver.full_name}`}
                </MenuItem>
              ))}
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions sx={{ 
          borderTop: `1px solid ${theme.palette.divider}`,
          px: 3,
          py: 2
        }}>
          <Button 
            onClick={() => setIsRuleDialogOpen(false)}
            variant="outlined"
            size="small"
            sx={{ borderRadius: 1, textTransform: 'none', px: 3 }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleRuleSubmit}
            variant="contained"
            size="small"
            sx={{ 
              borderRadius: 1, 
              textTransform: 'none',
              px: 3,
              bgcolor: theme.palette.primary.main,
              '&:hover': {
                bgcolor: theme.palette.primary.dark
              }
            }}
          >
            Create Rule
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
} 