import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Grid,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Snackbar,
  Alert,
  Breadcrumbs,
  Link,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Avatar,
} from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import HomeIcon from '@mui/icons-material/Home';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import EditIcon from '@mui/icons-material/Edit';
import GridViewIcon from '@mui/icons-material/GridView';
import ViewListIcon from '@mui/icons-material/ViewList';
import ImageIcon from '@mui/icons-material/Image';
import CloseIcon from '@mui/icons-material/Close';
import api from '../../lib/api';

interface Folder {
  id: string;
  name: string;
  _count: {
    files: number;
    subfolders: number;
  };
}

interface FileItem {
  id: string;
  name: string;
  originalName: string;
  url: string;
  type: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
}

interface BreadcrumbItem {
  id: string | null;
  name: string;
}

const Files = () => {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([{ id: null, name: 'Root' }]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Helper function to get full URL for file
  const getFileUrl = (url: string) => {
    // If URL is already a full URL (starts with http:// or https://), use it directly
    // This handles Cloudinary URLs
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }

    // For relative URLs (legacy local files)
    if (import.meta.env.DEV) {
      // Development: use proxy
      return url;
    } else {
      // Production: use full backend URL
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3010';
      return `${baseUrl}${url}`;
    }
  };

  // Folder creation
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Folder rename
  const [renameFolderOpen, setRenameFolderOpen] = useState(false);
  const [renamingFolder, setRenamingFolder] = useState<Folder | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: 'file' | 'folder'; id: string } | null>(null);

  // File preview
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);

  // Snackbar
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  useEffect(() => {
    fetchFolderContents(currentFolderId);
  }, [currentFolderId]);

  const fetchFolderContents = async (folderId: string | null) => {
    setLoading(true);
    try {
      const params = folderId ? `?parentId=${folderId}` : '';
      const response = await api.get(`/website/folders${params}`);
      setFolders(response.data.folders);
      setFiles(response.data.files);
    } catch (error) {
      console.error('Error fetching folder contents:', error);
      showSnackbar('Failed to load folder contents', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleNavigateToFolder = (folder: Folder) => {
    setCurrentFolderId(folder.id);
    setBreadcrumbs([...breadcrumbs, { id: folder.id, name: folder.name }]);
  };

  const handleBreadcrumbClick = (index: number) => {
    const newBreadcrumbs = breadcrumbs.slice(0, index + 1);
    setBreadcrumbs(newBreadcrumbs);
    setCurrentFolderId(newBreadcrumbs[index].id);
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
      await api.post('/website/folders', {
        name: newFolderName,
        parentId: currentFolderId,
      });
      showSnackbar('Folder created successfully', 'success');
      setCreateFolderOpen(false);
      setNewFolderName('');
      fetchFolderContents(currentFolderId);
    } catch (error) {
      showSnackbar('Failed to create folder', 'error');
    }
  };

  const handleRenameFolder = async () => {
    if (!renamingFolder || !renameValue.trim()) return;

    try {
      await api.put(`/website/folders/${renamingFolder.id}`, {
        name: renameValue,
      });
      showSnackbar('Folder renamed successfully', 'success');
      setRenameFolderOpen(false);
      setRenamingFolder(null);
      setRenameValue('');
      fetchFolderContents(currentFolderId);
    } catch (error) {
      showSnackbar('Failed to rename folder', 'error');
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setUploading(true);
    const formData = new FormData();

    if (currentFolderId) {
      formData.append('folderId', currentFolderId);
    }

    Array.from(selectedFiles).forEach((file) => {
      formData.append('files', file);
    });

    try {
      await api.post('/website/files/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      showSnackbar('Files uploaded successfully', 'success');
      fetchFolderContents(currentFolderId);
    } catch (error) {
      showSnackbar('Failed to upload files', 'error');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;

    try {
      if (itemToDelete.type === 'folder') {
        await api.delete(`/website/folders/${itemToDelete.id}`);
        showSnackbar('Folder deleted successfully', 'success');
      } else {
        await api.delete(`/website/files/${itemToDelete.id}`);
        showSnackbar('File deleted successfully', 'success');
      }
      setDeleteDialogOpen(false);
      setItemToDelete(null);
      fetchFolderContents(currentFolderId);
    } catch (error) {
      showSnackbar(`Failed to delete ${itemToDelete.type}`, 'error');
    }
  };

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(window.location.origin + url);
    showSnackbar('URL copied to clipboard', 'success');
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
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
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FolderIcon sx={{ fontSize: 32, color: 'primary.main' }} />
          <Typography variant="h4" sx={{ fontWeight: 600 }}>
            Files & Folders
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_, newView) => newView && setViewMode(newView)}
            size="small"
          >
            <ToggleButton value="grid" aria-label="grid view">
              <GridViewIcon />
            </ToggleButton>
            <ToggleButton value="list" aria-label="list view">
              <ViewListIcon />
            </ToggleButton>
          </ToggleButtonGroup>
          <Button
            variant="outlined"
            startIcon={<CreateNewFolderIcon />}
            onClick={() => setCreateFolderOpen(true)}
          >
            New Folder
          </Button>
          <Button
            variant="contained"
            component="label"
            startIcon={<UploadFileIcon />}
            disabled={uploading}
          >
            {uploading ? 'Uploading...' : 'Upload Files'}
            <input
              type="file"
              hidden
              multiple
              onChange={handleFileSelect}
            />
          </Button>
        </Box>
      </Box>

      {/* Breadcrumbs */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Breadcrumbs>
          {breadcrumbs.map((crumb, index) => (
            <Link
              key={crumb.id || 'root'}
              component="button"
              variant="body1"
              onClick={() => handleBreadcrumbClick(index)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                cursor: 'pointer',
                textDecoration: 'none',
                color: index === breadcrumbs.length - 1 ? 'primary.main' : 'text.primary',
                fontWeight: index === breadcrumbs.length - 1 ? 600 : 400,
                '&:hover': {
                  textDecoration: 'underline',
                },
              }}
            >
              {index === 0 && <HomeIcon fontSize="small" />}
              {crumb.name}
            </Link>
          ))}
        </Breadcrumbs>
      </Paper>

      {/* Folders and Files Display */}
      {loading ? (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <Typography>Loading...</Typography>
        </Paper>
      ) : folders.length === 0 && files.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <FolderIcon sx={{ fontSize: 64, color: '#cbd5e1', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom sx={{ fontWeight: 500 }}>
            This folder is empty
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Create a new folder or upload files to get started
          </Typography>
        </Paper>
      ) : viewMode === 'grid' ? (
        <Grid container spacing={2}>
          {/* Folders */}
          {folders.map((folder) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={folder.id}>
              <Card
                sx={{
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  border: '1px solid #e2e8f0',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                    borderColor: 'primary.main',
                  },
                }}
              >
                <Box
                  onClick={() => handleNavigateToFolder(folder)}
                  sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}
                >
                  <FolderIcon sx={{ fontSize: 48, color: 'primary.main' }} />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {folder.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {folder._count.subfolders} folders, {folder._count.files} files
                    </Typography>
                  </Box>
                </Box>
                <CardActions sx={{ justifyContent: 'flex-end', pt: 0 }}>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      setRenamingFolder(folder);
                      setRenameValue(folder.name);
                      setRenameFolderOpen(true);
                    }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      setItemToDelete({ type: 'folder', id: folder.id });
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </CardActions>
              </Card>
            </Grid>
          ))}

          {/* Files */}
          {files.map((file) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={file.id}>
              <Card sx={{ border: '1px solid #e2e8f0' }}>
                <CardContent sx={{ pb: 1 }}>
                  {file.mimeType.startsWith('image/') ? (
                    <CardMedia
                      component="img"
                      height="160"
                      image={getFileUrl(file.url)}
                      alt={file.name}
                      onClick={() => setPreviewFile(file)}
                      sx={{
                        objectFit: 'cover',
                        borderRadius: 1,
                        mb: 1,
                        border: '1px solid #e2e8f0',
                        cursor: 'pointer',
                        transition: 'transform 0.2s',
                        '&:hover': {
                          transform: 'scale(1.02)'
                        }
                      }}
                    />
                  ) : (
                    <Box
                      sx={{
                        height: 160,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: '#f8fafc',
                        borderRadius: 1,
                        mb: 1,
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      <InsertDriveFileIcon sx={{ fontSize: 64, color: '#94a3b8' }} />
                    </Box>
                  )}
                  <Typography variant="subtitle2" noWrap title={file.originalName}>
                    {file.originalName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatFileSize(file.size)}
                  </Typography>
                </CardContent>
                <CardActions sx={{ justifyContent: 'flex-end', pt: 0 }}>
                  <IconButton size="small" onClick={() => handleCopyUrl(file.url)}>
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => {
                      setItemToDelete({ type: 'file', id: file.id });
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f8fafc' }}>
                <TableCell sx={{ fontWeight: 600, width: '50%' }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Size</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {/* Folders */}
              {folders.map((folder) => (
                <TableRow
                  key={folder.id}
                  hover
                  sx={{
                    cursor: 'pointer',
                    '&:hover': { backgroundColor: '#f8fafc' },
                  }}
                  onClick={() => handleNavigateToFolder(folder)}
                >
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <FolderIcon sx={{ fontSize: 32, color: 'primary.main' }} />
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {folder.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {folder._count.subfolders} folders, {folder._count.files} files
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      Folder
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      —
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRenamingFolder(folder);
                        setRenameValue(folder.name);
                        setRenameFolderOpen(true);
                      }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        setItemToDelete({ type: 'folder', id: folder.id });
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}

              {/* Files */}
              {files.map((file) => (
                <TableRow key={file.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      {file.mimeType.startsWith('image/') ? (
                        <Avatar
                          src={getFileUrl(file.url)}
                          alt={file.name}
                          variant="rounded"
                          onClick={() => setPreviewFile(file)}
                          sx={{
                            width: 40,
                            height: 40,
                            cursor: 'pointer',
                            transition: 'transform 0.2s',
                            '&:hover': {
                              transform: 'scale(1.1)'
                            }
                          }}
                        />
                      ) : (
                        <Avatar variant="rounded" sx={{ width: 40, height: 40, bgcolor: 'grey.200' }}>
                          <InsertDriveFileIcon sx={{ color: 'grey.600', fontSize: 20 }} />
                        </Avatar>
                      )}
                      <Typography variant="body2">{file.originalName}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {file.mimeType.split('/')[0].charAt(0).toUpperCase() + file.mimeType.split('/')[0].slice(1)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {formatFileSize(file.size)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => handleCopyUrl(file.url)}>
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setItemToDelete({ type: 'file', id: file.id });
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Create Folder Dialog */}
      <Dialog
        open={createFolderOpen}
        onClose={() => setCreateFolderOpen(false)}
        maxWidth="xs"
        fullWidth
        disableEnforceFocus
      >
        <DialogTitle>Create New Folder</DialogTitle>
        <DialogContent>
          <TextField
            margin="dense"
            label="Folder Name"
            fullWidth
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleCreateFolder()}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateFolderOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateFolder} variant="contained">
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Rename Folder Dialog */}
      <Dialog
        open={renameFolderOpen}
        onClose={() => setRenameFolderOpen(false)}
        maxWidth="xs"
        fullWidth
        disableEnforceFocus
      >
        <DialogTitle>Rename Folder</DialogTitle>
        <DialogContent>
          <TextField
            margin="dense"
            label="Folder Name"
            fullWidth
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleRenameFolder()}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenameFolderOpen(false)}>Cancel</Button>
          <Button onClick={handleRenameFolder} variant="contained">
            Rename
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="xs"
        disableEnforceFocus
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this {itemToDelete?.type}?
            {itemToDelete?.type === 'folder' && ' All files and subfolders will also be deleted.'}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* File Preview Dialog */}
      <Dialog
        open={!!previewFile}
        onClose={() => setPreviewFile(null)}
        maxWidth="lg"
        fullWidth
      >
        {previewFile && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">{previewFile.originalName}</Typography>
                <IconButton onClick={() => setPreviewFile(null)}>
                  <CloseIcon />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent sx={{ textAlign: 'center', p: 2 }}>
              {previewFile.mimeType.startsWith('image/') ? (
                <Box
                  component="img"
                  src={getFileUrl(previewFile.url)}
                  alt={previewFile.name}
                  sx={{
                    maxWidth: '100%',
                    maxHeight: '70vh',
                    objectFit: 'contain',
                    borderRadius: 1
                  }}
                />
              ) : (
                <Box sx={{ p: 4 }}>
                  <InsertDriveFileIcon sx={{ fontSize: 64, color: '#94a3b8', mb: 2 }} />
                  <Typography>Preview not available for this file type</Typography>
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              <Button
                startIcon={<ContentCopyIcon />}
                onClick={() => {
                  handleCopyUrl(previewFile.url);
                  setPreviewFile(null);
                }}
              >
                Copy URL
              </Button>
              <Button
                component="a"
                href={getFileUrl(previewFile.url)}
                download={previewFile.originalName}
                target="_blank"
              >
                Download
              </Button>
              <Button onClick={() => setPreviewFile(null)}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Files;
