import React from 'react';
import {
  Box,
  Paper,
  Typography,
  LinearProgress,
  IconButton,
  Collapse,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Fade
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import DownloadingIcon from '@mui/icons-material/Downloading';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ImageIcon from '@mui/icons-material/Image';

export interface DownloadItem {
  id: string;
  name: string;
  type: 'pdf' | 'image';
  status: 'pending' | 'downloading' | 'completed' | 'error';
  error?: string;
}

interface DownloadProgressProps {
  open: boolean;
  items: DownloadItem[];
  onClose: () => void;
}

export default function DownloadProgress({ open, items, onClose }: DownloadProgressProps) {
  const totalItems = items.length;
  const completedItems = items.filter(item => item.status === 'completed').length;
  const errorItems = items.filter(item => item.status === 'error').length;
  const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
  const allCompleted = completedItems + errorItems === totalItems && totalItems > 0;

  return (
    <Fade in={open}>
      <Paper
        elevation={8}
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 400,
          maxWidth: 'calc(100vw - 48px)',
          zIndex: 9999,
          borderRadius: 2,
          overflow: 'hidden',
          bgcolor: 'white'
        }}
      >
        {/* Header */}
        <Box
          sx={{
            bgcolor: allCompleted
              ? errorItems > 0
                ? '#f59e0b'
                : '#10b981'
              : '#3b82f6',
            color: 'white',
            p: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <DownloadingIcon />
            <Typography variant="subtitle1" fontWeight={600}>
              {allCompleted
                ? errorItems > 0
                  ? 'Download Complete (with errors)'
                  : 'Download Complete'
                : 'Downloading Files...'}
            </Typography>
          </Box>
          <IconButton
            size="small"
            onClick={onClose}
            sx={{
              color: 'white',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* Progress Bar */}
        <Box sx={{ px: 2, pt: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {completedItems} of {totalItems} files
            </Typography>
            <Typography variant="body2" fontWeight={600} color="primary">
              {Math.round(progress)}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              height: 8,
              borderRadius: 1,
              bgcolor: '#e2e8f0',
              '& .MuiLinearProgress-bar': {
                bgcolor: allCompleted
                  ? errorItems > 0
                    ? '#f59e0b'
                    : '#10b981'
                  : '#3b82f6',
                borderRadius: 1
              }
            }}
          />
        </Box>

        {/* File List */}
        <Collapse in={true}>
          <List
            sx={{
              maxHeight: 300,
              overflow: 'auto',
              p: 2,
              pt: 1
            }}
          >
            {items.map((item) => (
              <ListItem
                key={item.id}
                sx={{
                  bgcolor: '#f8fafc',
                  borderRadius: 1,
                  mb: 1,
                  border: '1px solid #e2e8f0',
                  '&:last-child': { mb: 0 }
                }}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>
                  {item.status === 'completed' ? (
                    <CheckCircleIcon sx={{ color: '#10b981' }} />
                  ) : item.status === 'error' ? (
                    <ErrorIcon sx={{ color: '#ef4444' }} />
                  ) : item.type === 'pdf' ? (
                    <PictureAsPdfIcon sx={{ color: '#3b82f6' }} />
                  ) : (
                    <ImageIcon sx={{ color: '#3b82f6' }} />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 500,
                        color: item.status === 'error' ? '#ef4444' : '#1e293b',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {item.name}
                    </Typography>
                  }
                  secondary={
                    item.status === 'error' ? (
                      <Typography variant="caption" color="error">
                        {item.error || 'Failed to download'}
                      </Typography>
                    ) : item.status === 'downloading' ? (
                      <Typography variant="caption" color="primary">
                        Downloading...
                      </Typography>
                    ) : item.status === 'completed' ? (
                      <Typography variant="caption" sx={{ color: '#10b981' }}>
                        Downloaded
                      </Typography>
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        Pending...
                      </Typography>
                    )
                  }
                />
              </ListItem>
            ))}
          </List>
        </Collapse>
      </Paper>
    </Fade>
  );
}
