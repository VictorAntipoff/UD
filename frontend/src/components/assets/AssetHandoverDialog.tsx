import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Box,
  Typography,
  CircularProgress
} from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { format } from 'date-fns';
import api from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { AssetHandoverReport } from '../reports/AssetHandoverReport';

interface AssetHandoverDialogProps {
  open: boolean;
  onClose: () => void;
  /** Single asset (e.g. from the detail page) */
  asset?: any;
  /** Multiple assets (e.g. from a list multi-select) */
  assets?: any[];
}

interface UserOption {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

const userLabel = (u: UserOption) => {
  const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
  return name ? `${name} (${u.email})` : u.email;
};

export const AssetHandoverDialog = ({ open, onClose, asset, assets }: AssetHandoverDialogProps) => {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [receiverId, setReceiverId] = useState('');
  const [locationName, setLocationName] = useState('');
  const [notes, setNotes] = useState('');

  // Normalize to a list; single `asset` and multi `assets` both supported
  const assetList: any[] = assets && assets.length > 0 ? assets : asset ? [asset] : [];
  const isSingle = assetList.length === 1;

  // Pre-fill location only when all assets share the same one (otherwise leave blank)
  const sharedLocation = (() => {
    const names = Array.from(
      new Set(assetList.map((a) => a?.location?.name).filter(Boolean))
    );
    return names.length === 1 ? (names[0] as string) : '';
  })();

  useEffect(() => {
    if (!open) return;
    // Reset per-open state and prefill location from the asset(s)
    setReceiverId('');
    setNotes('');
    setLocationName(sharedLocation);
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await api.get('/users');
      const list: UserOption[] = (response.data || []).filter((u: any) => u.isActive !== false);
      setUsers(list);
    } catch (error) {
      console.error('Error fetching users for handover:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const receiver = users.find((u) => u.id === receiverId);
  const receiverName = receiver ? userLabel(receiver).replace(/\s*\(.*\)$/, '') : '';
  const issuedByName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.email
    : '';
  const timestamp = format(new Date(), 'MMM dd, yyyy');

  const fileName = isSingle
    ? `handover-${assetList[0]?.assetTag || 'asset'}.pdf`
    : `handover-${assetList.length}-assets.pdf`;
  const canGenerate = Boolean(receiverId && locationName.trim() && assetList.length > 0);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ borderBottom: '1px solid #e2e8f0', fontWeight: 600, color: '#1e293b' }}>
        Generate Handover / Receipt PDF
        {isSingle && assetList[0] && (
          <Typography variant="caption" sx={{ display: 'block', color: '#64748b' }}>
            {assetList[0].assetTag} — {assetList[0].name}
          </Typography>
        )}
        {!isSingle && assetList.length > 0 && (
          <Typography variant="caption" sx={{ display: 'block', color: '#64748b' }}>
            {assetList.length} assets selected
          </Typography>
        )}
      </DialogTitle>
      <DialogContent sx={{ pt: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
          <TextField
            select
            fullWidth
            required
            label="Received by"
            value={receiverId}
            onChange={(e) => setReceiverId(e.target.value)}
            helperText={loadingUsers ? 'Loading users…' : 'Person at the location who receives the asset'}
            disabled={loadingUsers}
          >
            {users.length === 0 && !loadingUsers && (
              <MenuItem value="" disabled>
                No users found
              </MenuItem>
            )}
            {users.map((u) => (
              <MenuItem key={u.id} value={u.id}>
                {userLabel(u)}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            fullWidth
            required
            label="Location"
            value={locationName}
            onChange={(e) => setLocationName(e.target.value)}
            helperText={
              isSingle
                ? 'Pre-filled from the asset; edit if handing over elsewhere'
                : 'Where the assets are being handed over'
            }
          />

          <TextField
            fullWidth
            multiline
            rows={3}
            label="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ borderTop: '1px solid #e2e8f0', px: 3, py: 2 }}>
        <Button onClick={onClose} sx={{ color: '#64748b' }}>
          Cancel
        </Button>
        {canGenerate ? (
          <PDFDownloadLink
            document={
              <AssetHandoverReport
                assets={assetList}
                receiverName={receiverName}
                locationName={locationName.trim()}
                notes={notes}
                issuedByName={issuedByName}
                timestamp={timestamp}
              />
            }
            fileName={fileName}
            style={{ textDecoration: 'none' }}
          >
            {({ loading }) => (
              <Button
                variant="contained"
                startIcon={loading ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <PictureAsPdfIcon />}
                disabled={loading}
                sx={{
                  backgroundColor: '#dc2626',
                  textTransform: 'none',
                  '&:hover': { backgroundColor: '#b91c1c' }
                }}
              >
                {loading ? 'Preparing…' : 'Download PDF'}
              </Button>
            )}
          </PDFDownloadLink>
        ) : (
          <Button
            variant="contained"
            startIcon={<PictureAsPdfIcon />}
            disabled
            sx={{ backgroundColor: '#cbd5e1', textTransform: 'none' }}
          >
            Download PDF
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default AssetHandoverDialog;
