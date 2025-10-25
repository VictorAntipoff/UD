import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Button,
  Typography,
  Alert,
  CircularProgress
} from '@mui/material';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import CloseIcon from '@mui/icons-material/Close';

interface QRScannerProps {
  open: boolean;
  onClose: () => void;
  onScan: (data: { id: string; tag: string; type: string }) => void;
}

export const QRScanner: React.FC<QRScannerProps> = ({ open, onClose, onScan }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string>('');
  const [scanning, setScanning] = useState(false);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);

  useEffect(() => {
    if (open && videoRef.current) {
      startScanning();
    }

    return () => {
      stopScanning();
    };
  }, [open]);

  const startScanning = async () => {
    try {
      setError('');
      setScanning(true);

      const codeReader = new BrowserMultiFormatReader();
      readerRef.current = codeReader;

      const videoInputDevices = await codeReader.listVideoInputDevices();

      if (videoInputDevices.length === 0) {
        setError('No camera found. Please ensure camera permissions are granted.');
        setScanning(false);
        return;
      }

      // Prefer back camera on mobile devices
      const selectedDevice = videoInputDevices.find(device =>
        device.label.toLowerCase().includes('back')
      ) || videoInputDevices[0];

      codeReader.decodeFromVideoDevice(
        selectedDevice.deviceId,
        videoRef.current!,
        (result, error) => {
          if (result) {
            try {
              const data = JSON.parse(result.getText());
              if (data.type === 'asset' && data.id && data.tag) {
                onScan(data);
                stopScanning();
                onClose();
              } else {
                setError('Invalid QR code. Please scan an asset QR code.');
              }
            } catch (err) {
              setError('Invalid QR code format.');
            }
          }

          if (error && !(error instanceof NotFoundException)) {
            console.error('QR Scanner error:', error);
          }
        }
      );
    } catch (err) {
      console.error('Error starting scanner:', err);
      setError('Failed to start camera. Please check permissions.');
      setScanning(false);
    }
  };

  const stopScanning = () => {
    if (readerRef.current) {
      readerRef.current.reset();
      readerRef.current = null;
    }
    setScanning(false);
  };

  const handleClose = () => {
    stopScanning();
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <QrCodeScannerIcon />
            <Typography variant="h6">Scan Asset QR Code</Typography>
          </Box>
          <Button onClick={handleClose} size="small">
            <CloseIcon />
          </Button>
        </Box>
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box
          sx={{
            position: 'relative',
            width: '100%',
            aspectRatio: '1',
            backgroundColor: '#000',
            borderRadius: 1,
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <video
            ref={videoRef}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
          />

          {!scanning && !error && (
            <Box
              sx={{
                position: 'absolute',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}
            >
              <CircularProgress size={24} sx={{ color: '#fff' }} />
              <Typography sx={{ color: '#fff' }}>Starting camera...</Typography>
            </Box>
          )}
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
          Position the QR code within the camera view to scan
        </Typography>
      </DialogContent>
    </Dialog>
  );
};
