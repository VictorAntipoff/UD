import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import FolderIcon from '@mui/icons-material/Folder';
import { useSnackbar } from 'notistack';
import api from '../../lib/api';

interface FileItem {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedAt: string;
}

const Files = () => {
  const { enqueueSnackbar } = useSnackbar();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; file: FileItem | null }>({
    open: false,
    file: null,
  });

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      const response = await api.get('/website/files');
      setFiles(response.data);
    } catch (error) {
      console.error('Error fetching files:', error);
      // Show empty state if endpoint doesn't exist yet
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setUploading(true);
    const formData = new FormData();

    Array.from(selectedFiles).forEach((file) => {
      formData.append('files', file);
    });

    try {
      const response = await api.post('/website/files/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      enqueueSnackbar(`${selectedFiles.length} file(s) uploaded successfully!`, { variant: 'success' });
      fetchFiles(); // Refresh the list
    } catch (error) {
      console.error('Error uploading files:', error);
      enqueueSnackbar('Failed to upload files. Please try again.', { variant: 'error' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    enqueueSnackbar('URL copied to clipboard!', { variant: 'success' });
  };

  const handleDeleteClick = (file: FileItem) => {
    setDeleteDialog({ open: true, file });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.file) return;

    try {
      await api.delete(`/website/files/${deleteDialog.file.id}`);
      enqueueSnackbar('File deleted successfully!', { variant: 'success' });
      fetchFiles();
    } catch (error) {
      console.error('Error deleting file:', error);
      enqueueSnackbar('Failed to delete file. Please try again.', { variant: 'error' });
    } finally {
      setDeleteDialog({ open: false, file: null });
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FolderIcon sx={{ fontSize: 32, color: 'primary.main' }} />
          <Typography variant="h4" sx={{ fontWeight: 600 }}>
            Website Files
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<UploadFileIcon />}
          onClick={handleUploadClick}
          disabled={uploading}
        >
          {uploading ? 'Uploading...' : 'Upload Files'}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*,.pdf"
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />
      </Box>

      <Paper sx={{ p: 3 }}>
        {loading ? (
          <Typography align="center" sx={{ py: 4 }}>
            Loading files...
          </Typography>
        ) : files.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <FolderIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" sx={{ color: 'text.secondary', mb: 1 }}>
              No files uploaded yet
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
              Upload images and files for your website
            </Typography>
            <Button
              variant="contained"
              startIcon={<UploadFileIcon />}
              onClick={handleUploadClick}
            >
              Upload Your First File
            </Button>
          </Box>
        ) : (
          <Grid container spacing={3}>
            {files.map((file) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={file.id}>
                <Card>
                  {file.type.startsWith('image/') ? (
                    <CardMedia
                      component="img"
                      height="200"
                      image={file.url}
                      alt={file.name}
                      sx={{ objectFit: 'cover' }}
                    />
                  ) : (
                    <Box
                      sx={{
                        height: 200,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#f8fafc',
                      }}
                    >
                      <FolderIcon sx={{ fontSize: 64, color: 'text.secondary' }} />
                    </Box>
                  )}
                  <CardContent>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 500,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {file.name}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                      <Chip label={formatFileSize(file.size)} size="small" />
                      <Chip
                        label={new Date(file.uploadedAt).toLocaleDateString()}
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                  </CardContent>
                  <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                    <IconButton
                      size="small"
                      onClick={() => handleCopyUrl(file.url)}
                      title="Copy URL"
                    >
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDeleteClick(file)}
                      title="Delete"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Paper>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, file: null })}>
        <DialogTitle>Delete File</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete <strong>{deleteDialog.file?.name}</strong>? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, file: null })}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Files;
