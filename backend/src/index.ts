import app from './app';
// Remove unused import
// import { calculateUptime } from './utils/uptime';

const port = process.env.PORT || 3010;

// Start server for local development
if (process.env.NODE_ENV !== 'production') {
  const server = app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log('Environment:', process.env.NODE_ENV);
    console.log('Start time:', new Date().toISOString());
    console.log('Database URL:', process.env.DATABASE_URL?.substring(0, 20) + '...');
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down...');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
}

// Add this to catch unhandled errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// Export for Vercel
export default app; 