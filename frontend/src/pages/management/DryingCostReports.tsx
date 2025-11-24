import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  CardContent,
  Grid,
  Chip,
  IconButton,
  Collapse,
  TextField,
  MenuItem,
  Stack,
  Divider
} from '@mui/material';
import { styled } from '@mui/material/styles';
import AssessmentIcon from '@mui/icons-material/Assessment';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import api from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';

const StyledContainer = styled(Container)(({ theme }) => ({
  minHeight: '100vh',
  paddingTop: theme.spacing(4),
  paddingBottom: theme.spacing(4),
  backgroundColor: '#f8fafc',
}));

interface WoodType {
  id: string;
  name: string;
}

interface DryingProcessItem {
  id: string;
  woodTypeId: string;
  woodType?: WoodType;
  thickness: string;
  pieceCount: number;
}

interface DryingReading {
  id: string;
  humidity: number;
  readingTime: string;
}

interface DryingProcess {
  id: string;
  batchNumber: string;
  woodTypeId?: string;
  woodType?: WoodType;
  thickness?: number;
  thicknessUnit?: string;
  pieceCount?: number;
  items?: DryingProcessItem[];
  startingHumidity?: number;
  readings?: DryingReading[];
  startTime: string;
  endTime?: string;
  totalCost?: number;
  status: string;
}

interface CostSummary {
  woodType: string;
  thickness: string;
  totalBatches: number;
  totalPieces: number;
  totalCost: number;
  avgCostPerPiece: number;
  batches: DryingProcess[];
}

export default function DryingCostReports() {
  const { hasPermission } = useAuth();
  const canViewAmount = hasPermission('drying-process', 'amount');

  const [processes, setProcesses] = useState<DryingProcess[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [filterWoodType, setFilterWoodType] = useState<string>('all');
  const [filterThickness, setFilterThickness] = useState<string>('all');

  // Redirect if user doesn't have permission
  useEffect(() => {
    if (!canViewAmount) {
      alert('You do not have permission to view cost reports.');
      window.location.href = '/dashboard';
    }
  }, [canViewAmount]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/factory/drying-processes');
      const completedProcesses = response.data.filter((p: DryingProcess) => p.status === 'COMPLETED');
      setProcesses(completedProcesses);
    } catch (error) {
      console.error('Error fetching drying processes:', error);
    } finally {
      setLoading(false);
    }
  };

  // Group processes by wood type and thickness
  const getCostSummaries = (): CostSummary[] => {
    const groups: Record<string, CostSummary> = {};

    processes.forEach(process => {
      // Handle both old-style (direct wood type/thickness) and new-style (via items)
      if (process.items && process.items.length > 0) {
        // New style: process has multiple items - need to split cost proportionally
        const totalBatchPieces = process.items.reduce((sum, item) => sum + item.pieceCount, 0);
        const batchTotalCost = process.totalCost || 0;

        process.items.forEach(item => {
          const woodTypeName = item.woodType?.name || 'Unknown';
          const thickness = item.thickness; // Already formatted like "1\"", "2\"", "Custom"

          // Skip if filtering
          if (filterWoodType !== 'all' && item.woodTypeId !== filterWoodType) return;
          if (filterThickness !== 'all' && thickness !== filterThickness) return;

          const key = `${woodTypeName}-${thickness}`;

          if (!groups[key]) {
            groups[key] = {
              woodType: woodTypeName,
              thickness,
              totalBatches: 0,
              totalPieces: 0,
              totalCost: 0,
              avgCostPerPiece: 0,
              batches: []
            };
          }

          // Calculate proportional cost for this item based on piece count
          const itemProportionalCost = totalBatchPieces > 0
            ? (item.pieceCount / totalBatchPieces) * batchTotalCost
            : 0;

          // Only count the batch once per group (not per item)
          if (!groups[key].batches.find(b => b.id === process.id)) {
            groups[key].totalBatches++;
            groups[key].batches.push(process);
          }

          groups[key].totalPieces += item.pieceCount || 0;
          groups[key].totalCost += itemProportionalCost;
        });
      } else {
        // Old style: process has direct wood type and thickness
        const woodTypeName = process.woodType?.name || 'Unknown';
        const thickness = process.thickness
          ? `${(process.thickness / (process.thicknessUnit === 'inch' ? 1 : 25.4)).toFixed(1)}"`
          : 'Unknown';

        // Skip if filtering
        if (filterWoodType !== 'all' && process.woodTypeId !== filterWoodType) return;
        if (filterThickness !== 'all' && thickness !== filterThickness) return;

        const key = `${woodTypeName}-${thickness}`;

        if (!groups[key]) {
          groups[key] = {
            woodType: woodTypeName,
            thickness,
            totalBatches: 0,
            totalPieces: 0,
            totalCost: 0,
            avgCostPerPiece: 0,
            batches: []
          };
        }

        groups[key].totalBatches++;
        groups[key].totalPieces += process.pieceCount || 0;
        groups[key].totalCost += process.totalCost || 0;
        groups[key].batches.push(process);
      }
    });

    // Calculate averages
    Object.values(groups).forEach(group => {
      group.avgCostPerPiece = group.totalPieces > 0 ? group.totalCost / group.totalPieces : 0;
      // Sort batches by start time descending
      group.batches.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
    });

    return Object.values(groups).sort((a, b) => b.totalCost - a.totalCost);
  };

  const summaries = getCostSummaries();

  // Calculate overall stats
  const totalBatches = summaries.reduce((sum, s) => sum + s.totalBatches, 0);
  const totalPieces = summaries.reduce((sum, s) => sum + s.totalPieces, 0);
  const totalCost = summaries.reduce((sum, s) => sum + s.totalCost, 0);
  const avgCostPerPiece = totalPieces > 0 ? totalCost / totalPieces : 0;

  // Get unique wood types and thicknesses for filters (handle both old and new styles)
  const uniqueWoodTypes = Array.from(new Set(
    processes.flatMap(p => {
      const types: string[] = [];
      if (p.woodType?.name) types.push(p.woodType.name);
      if (p.items) {
        p.items.forEach(item => {
          if (item.woodType?.name) types.push(item.woodType.name);
        });
      }
      return types;
    })
  )) as string[];

  const uniqueThicknesses = Array.from(new Set(
    processes.flatMap(p => {
      const thicknesses: string[] = [];
      if (p.thickness) {
        thicknesses.push(`${(p.thickness / (p.thicknessUnit === 'inch' ? 1 : 25.4)).toFixed(1)}"`);
      }
      if (p.items) {
        p.items.forEach(item => {
          if (item.thickness) thicknesses.push(item.thickness);
        });
      }
      return thicknesses;
    }).filter(Boolean)
  )) as string[];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <StyledContainer>
        <Typography>Loading...</Typography>
      </StyledContainer>
    );
  }

  return (
    <StyledContainer maxWidth="xl">
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <AssessmentIcon sx={{ fontSize: 40, color: '#dc2626' }} />
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b' }}>
            Drying Cost Reports
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ color: '#64748b' }}>
          Comprehensive cost analysis for all completed drying processes
        </Typography>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 3, border: '1px solid #e2e8f0' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <LocalFireDepartmentIcon sx={{ color: '#dc2626', fontSize: 28 }} />
                <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 600 }}>
                  Total Batches
                </Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b' }}>
                {totalBatches}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 3, border: '1px solid #e2e8f0' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Inventory2Icon sx={{ color: '#f59e0b', fontSize: 28 }} />
                <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 600 }}>
                  Total Pieces
                </Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b' }}>
                {totalPieces.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 3, border: '1px solid #e2e8f0' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <MonetizationOnIcon sx={{ color: '#10b981', fontSize: 28 }} />
                <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 600 }}>
                  Total Cost
                </Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b' }}>
                {formatCurrency(totalCost)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 3, border: '1px solid #e2e8f0' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <TrendingUpIcon sx={{ color: '#3b82f6', fontSize: 28 }} />
                <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 600 }}>
                  Avg Cost/Piece
                </Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b' }}>
                {formatCurrency(avgCostPerPiece)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 3, border: '1px solid #e2e8f0' }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            select
            label="Wood Type"
            value={filterWoodType}
            onChange={(e) => setFilterWoodType(e.target.value)}
            size="small"
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="all">All Wood Types</MenuItem>
            {uniqueWoodTypes.map(type => {
              // Find wood type from either direct relation or items
              let woodType = processes.find(p => p.woodType?.name === type)?.woodType;
              if (!woodType) {
                woodType = processes.flatMap(p => p.items || [])
                  .find(item => item.woodType?.name === type)?.woodType;
              }
              return (
                <MenuItem key={woodType?.id || type} value={woodType?.id || type}>
                  {type}
                </MenuItem>
              );
            })}
          </TextField>

          <TextField
            select
            label="Thickness"
            value={filterThickness}
            onChange={(e) => setFilterThickness(e.target.value)}
            size="small"
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="all">All Thicknesses</MenuItem>
            {uniqueThicknesses.map(thickness => (
              <MenuItem key={thickness} value={thickness}>
                {thickness}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </Paper>

      {/* Cost Summary Table */}
      <TableContainer component={Paper} sx={{ borderRadius: 3, border: '1px solid #e2e8f0' }}>
        <Table>
          <TableHead sx={{ backgroundColor: '#f8fafc' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Wood Type & Thickness</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, color: '#1e293b' }}>Batches</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, color: '#1e293b' }}>Total Pieces</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, color: '#1e293b' }}>Total Cost</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, color: '#1e293b' }}>Avg Cost/Piece</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, color: '#1e293b' }}>Details</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {summaries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4, color: '#64748b' }}>
                  No completed drying processes found
                </TableCell>
              </TableRow>
            ) : (
              summaries.map((summary, index) => {
                const groupKey = `${summary.woodType}-${summary.thickness}`;
                const isExpanded = expandedGroup === groupKey;

                return (
                  <React.Fragment key={groupKey}>
                    <TableRow sx={{ '&:hover': { backgroundColor: '#f8fafc' } }}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                              {summary.woodType}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#64748b' }}>
                              {summary.thickness}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={summary.totalBatches}
                          size="small"
                          sx={{ backgroundColor: '#dc2626', color: 'white', fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {summary.totalPieces.toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                          {formatCurrency(summary.totalCost)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#10b981' }}>
                          {formatCurrency(summary.avgCostPerPiece)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          onClick={() => setExpandedGroup(isExpanded ? null : groupKey)}
                        >
                          {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        </IconButton>
                      </TableCell>
                    </TableRow>

                    {/* Expanded Details */}
                    <TableRow>
                      <TableCell colSpan={6} sx={{ p: 0, border: 0 }}>
                        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                          <Box sx={{ p: 3, backgroundColor: '#f8fafc' }}>
                            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600, color: '#1e293b' }}>
                              Individual Batches:
                            </Typography>
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell sx={{ fontWeight: 600 }}>Batch Number</TableCell>
                                  <TableCell align="center" sx={{ fontWeight: 600 }}>Pieces</TableCell>
                                  <TableCell align="center" sx={{ fontWeight: 600 }}>Humidity</TableCell>
                                  <TableCell align="center" sx={{ fontWeight: 600 }}>Start Date</TableCell>
                                  <TableCell align="center" sx={{ fontWeight: 600 }}>End Date</TableCell>
                                  <TableCell align="right" sx={{ fontWeight: 600 }}>Total Cost</TableCell>
                                  <TableCell align="right" sx={{ fontWeight: 600 }}>Cost/Piece</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {summary.batches.map(batch => {
                                  // Calculate piece count from items if not directly available
                                  const pieceCount = batch.pieceCount ||
                                    (batch.items?.reduce((sum, item) => sum + item.pieceCount, 0) || 0);
                                  const costPerPiece = pieceCount && batch.totalCost ? batch.totalCost / pieceCount : 0;

                                  // Get humidity from → to
                                  const startHumidity = batch.startingHumidity;
                                  const endHumidity = batch.readings && batch.readings.length > 0
                                    ? batch.readings[batch.readings.length - 1].humidity
                                    : null;
                                  const humidityText = startHumidity && endHumidity
                                    ? `${startHumidity.toFixed(1)}% → ${endHumidity.toFixed(1)}%`
                                    : '-';

                                  return (
                                    <TableRow key={batch.id}>
                                      <TableCell>{batch.batchNumber}</TableCell>
                                      <TableCell align="center">{pieceCount.toLocaleString()}</TableCell>
                                      <TableCell align="center">{humidityText}</TableCell>
                                      <TableCell align="center">{formatDate(batch.startTime)}</TableCell>
                                      <TableCell align="center">{batch.endTime ? formatDate(batch.endTime) : '-'}</TableCell>
                                      <TableCell align="right">{formatCurrency(batch.totalCost || 0)}</TableCell>
                                      <TableCell align="right">
                                        {formatCurrency(costPerPiece)}
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </StyledContainer>
  );
}
