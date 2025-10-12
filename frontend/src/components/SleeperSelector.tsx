import { useState } from 'react';
import { Box, Typography, Grid, Chip, Paper, alpha, Tabs, Tab, Button, ButtonGroup } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ContentCutIcon from '@mui/icons-material/ContentCut';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';

interface SleeperInfo {
  number: number;
  width: number;
  height: number;
  length: number;
  isUsed: boolean;
}

interface SleeperSelectorProps {
  sleepers: SleeperInfo[];
  onSelectSleeper: (sleeper: SleeperInfo) => void;
  selectedSleeperNumber: number | null;
}

const SLEEPERS_PER_PAGE = 50; // Show 50 sleepers per page

const SleeperSelector = ({ sleepers, onSelectSleeper, selectedSleeperNumber }: SleeperSelectorProps) => {
  const [currentPage, setCurrentPage] = useState(0);

  if (sleepers.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="body2" sx={{ color: '#64748b' }}>
          No sleepers available for this lot
        </Typography>
      </Box>
    );
  }

  // Calculate pagination
  const totalPages = Math.ceil(sleepers.length / SLEEPERS_PER_PAGE);
  const startIndex = currentPage * SLEEPERS_PER_PAGE;
  const endIndex = Math.min(startIndex + SLEEPERS_PER_PAGE, sleepers.length);
  const currentSleepers = sleepers.slice(startIndex, endIndex);

  // Calculate statistics
  const usedCount = sleepers.filter(s => s.isUsed).length;
  const availableCount = sleepers.length - usedCount;
  const progressPercentage = sleepers.length > 0 ? (usedCount / sleepers.length) * 100 : 0;

  return (
    <Box>
      {/* Header with statistics */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b', fontSize: '1rem' }}>
            Select Sleeper to Slice
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Chip
              label={`${availableCount} Available`}
              size="small"
              sx={{
                bgcolor: '#dcfce7',
                color: '#16a34a',
                fontWeight: 600,
                fontSize: '0.75rem'
              }}
            />
            <Chip
              label={`${usedCount} Sliced`}
              size="small"
              sx={{
                bgcolor: '#f1f5f9',
                color: '#64748b',
                fontWeight: 600,
                fontSize: '0.75rem'
              }}
            />
          </Box>
        </Box>

        {/* Progress bar */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.75rem' }}>
              Progress: {usedCount} / {sleepers.length} sleepers
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>
              {progressPercentage.toFixed(1)}%
            </Typography>
          </Box>
          <Box sx={{
            width: '100%',
            height: 8,
            bgcolor: '#f1f5f9',
            borderRadius: 1,
            overflow: 'hidden'
          }}>
            <Box sx={{
              width: `${progressPercentage}%`,
              height: '100%',
              bgcolor: '#16a34a',
              transition: 'width 0.3s ease'
            }} />
          </Box>
        </Box>

        {/* Pagination controls */}
        {totalPages > 1 && (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.875rem' }}>
              Showing {startIndex + 1}-{endIndex} of {sleepers.length}
            </Typography>
            <ButtonGroup size="small" variant="outlined">
              <Button
                onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                disabled={currentPage === 0}
                startIcon={<NavigateBeforeIcon />}
                sx={{
                  textTransform: 'none',
                  fontSize: '0.75rem'
                }}
              >
                Previous
              </Button>
              <Button
                onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
                disabled={currentPage === totalPages - 1}
                endIcon={<NavigateNextIcon />}
                sx={{
                  textTransform: 'none',
                  fontSize: '0.75rem'
                }}
              >
                Next
              </Button>
            </ButtonGroup>
          </Box>
        )}
      </Box>

      {/* Sleeper grid - more compact design */}
      <Grid container spacing={1}>
        {currentSleepers.map((sleeper) => (
          <Grid item xs={3} sm={2} md={1.5} xl={1.2} key={sleeper.number}>
            <Paper
              elevation={0}
              sx={{
                p: 1,
                cursor: 'pointer',
                backgroundColor: sleeper.isUsed ? '#fef3c7' : '#dcfce7',
                border: `2px solid ${
                  selectedSleeperNumber === sleeper.number
                    ? '#dc2626'
                    : sleeper.isUsed
                    ? '#fbbf24'
                    : '#bbf7d0'
                }`,
                borderRadius: 1.5,
                opacity: 1,
                transition: 'all 0.2s',
                minHeight: 70,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                position: 'relative',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  borderColor: '#dc2626',
                },
              }}
              onClick={() => onSelectSleeper(sleeper)}
            >
              {/* Sliced badge in top-right corner */}
              {sleeper.isUsed && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    backgroundColor: '#16a34a',
                    borderRadius: '50%',
                    width: 18,
                    height: 18,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <CheckCircleIcon sx={{ fontSize: 12, color: 'white' }} />
                </Box>
              )}

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    color: sleeper.isUsed ? '#d97706' : '#16a34a'
                  }}
                >
                  #{sleeper.number}
                </Typography>
                {selectedSleeperNumber === sleeper.number && (
                  <ContentCutIcon sx={{ fontSize: 14, color: '#dc2626' }} />
                )}
              </Box>
              <Typography
                variant="caption"
                sx={{
                  color: sleeper.isUsed ? '#64748b' : '#0f172a',
                  fontSize: '0.625rem',
                  fontWeight: 500,
                  textAlign: 'center',
                  lineHeight: 1.2
                }}
              >
                {sleeper.width}×{sleeper.height}×{sleeper.length}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Selected sleeper confirmation */}
      {selectedSleeperNumber && (
        <Box
          sx={{
            mt: 3,
            p: 2,
            backgroundColor: sleepers.find(s => s.number === selectedSleeperNumber)?.isUsed
              ? alpha('#f59e0b', 0.1)
              : alpha('#dc2626', 0.05),
            border: `2px solid ${sleepers.find(s => s.number === selectedSleeperNumber)?.isUsed ? '#fbbf24' : '#fecaca'}`,
            borderRadius: 2,
          }}
        >
          <Typography
            variant="body2"
            sx={{
              color: sleepers.find(s => s.number === selectedSleeperNumber)?.isUsed ? '#d97706' : '#dc2626',
              fontWeight: 600
            }}
          >
            {sleepers.find(s => s.number === selectedSleeperNumber)?.isUsed
              ? `✓ Sleeper #${selectedSleeperNumber} selected (Already sliced - Editing mode)`
              : `✓ Sleeper #${selectedSleeperNumber} selected - Add planks below`}
          </Typography>
        </Box>
      )}

      {/* Quick jump to page */}
      {totalPages > 3 && (
        <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Typography variant="caption" sx={{ color: '#64748b', alignSelf: 'center', mr: 1 }}>
            Jump to:
          </Typography>
          {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => (
            <Button
              key={i}
              size="small"
              variant={currentPage === i ? 'contained' : 'outlined'}
              onClick={() => setCurrentPage(i)}
              sx={{
                minWidth: 40,
                height: 32,
                fontSize: '0.75rem',
                textTransform: 'none',
                ...(currentPage === i && {
                  bgcolor: '#dc2626',
                  '&:hover': { bgcolor: '#b91c1c' }
                })
              }}
            >
              {i * SLEEPERS_PER_PAGE + 1}-{Math.min((i + 1) * SLEEPERS_PER_PAGE, sleepers.length)}
            </Button>
          ))}
          {totalPages > 10 && (
            <Typography variant="caption" sx={{ color: '#64748b', alignSelf: 'center' }}>
              ... +{totalPages - 10} more
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
};

export default SleeperSelector;
