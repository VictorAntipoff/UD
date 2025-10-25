import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { Box, Button, Typography, Paper } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';

interface AssetQRCodeProps {
  assetTag: string;
  assetId: string;
  size?: number;
}

export const AssetQRCode: React.FC<AssetQRCodeProps> = ({ assetTag, assetId, size = 200 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      // Generate QR code with asset ID (for scanning to lookup)
      const qrData = JSON.stringify({
        id: assetId,
        tag: assetTag,
        type: 'asset'
      });

      QRCode.toCanvas(canvasRef.current, qrData, {
        width: size,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      }, (error: Error | null | undefined) => {
        if (error) console.error('Error generating QR code:', error);
      });
    }
  }, [assetId, assetTag, size]);

  const handleDownload = () => {
    if (canvasRef.current) {
      const url = canvasRef.current.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `asset-qr-${assetTag}.png`;
      link.href = url;
      link.click();
    }
  };

  return (
    <Paper sx={{ p: 2, textAlign: 'center' }}>
      <Typography variant="h6" gutterBottom>
        Asset QR Code
      </Typography>
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
        <canvas ref={canvasRef} />
      </Box>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        {assetTag}
      </Typography>
      <Button
        variant="outlined"
        startIcon={<DownloadIcon />}
        onClick={handleDownload}
        size="small"
        sx={{ mt: 1 }}
      >
        Download QR Code
      </Button>
    </Paper>
  );
};
