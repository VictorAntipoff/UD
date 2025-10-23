import { useState, useEffect } from 'react';
import { Box, Button, Paper, Typography, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import GetAppIcon from '@mui/icons-material/GetApp';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      // Only show on /dashboard route - check current URL
      const isDashboardRoute = window.location.pathname.startsWith('/dashboard');
      if (!isDashboardRoute) {
        return;
      }

      const dismissed = localStorage.getItem('pwa-install-dismissed');
      const dismissedTime = dismissed ? parseInt(dismissed) : 0;
      const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);

      if (!dismissed || daysSinceDismissed > 7) {
        setTimeout(() => setShowPrompt(true), 2000);
      }
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setShowPrompt(false);
      console.log('PWA was installed');
    };

    // Check on navigation change (for SPA routing)
    const checkRoute = () => {
      const isDashboardRoute = window.location.pathname.startsWith('/dashboard');
      if (!isDashboardRoute && showPrompt) {
        setShowPrompt(false);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('popstate', checkRoute);

    // Check route periodically for client-side navigation
    const intervalId = setInterval(checkRoute, 1000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('popstate', checkRoute);
      clearInterval(intervalId);
    };
  }, [showPrompt]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    }

    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
    setShowPrompt(false);
  };

  if (!showPrompt || !deferredPrompt) return null;

  return (
    <Paper
      elevation={8}
      sx={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        p: 2,
        maxWidth: 320,
        zIndex: 9999,
        borderRadius: 2,
        backgroundColor: 'background.paper',
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
        <Typography variant="h6" component="h3" sx={{ fontSize: '1rem', fontWeight: 600 }}>
          Install UDesign App
        </Typography>
        <IconButton size="small" onClick={handleDismiss} sx={{ mt: -1, mr: -1 }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Install our app for quick access and offline functionality
      </Typography>

      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button
          variant="contained"
          startIcon={<GetAppIcon />}
          onClick={handleInstall}
          fullWidth
          sx={{
            textTransform: 'none',
            fontWeight: 600,
          }}
        >
          Install
        </Button>
        <Button
          variant="outlined"
          onClick={handleDismiss}
          sx={{
            textTransform: 'none',
          }}
        >
          Later
        </Button>
      </Box>
    </Paper>
  );
}
