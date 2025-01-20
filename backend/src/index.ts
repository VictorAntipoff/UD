import app from './app';

const port = process.env.PORT || 3010;

const server = app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  console.log('Available routes:');
  app._router.stack.forEach((r: any) => {
    if (r.route && r.route.path) {
      const methods = Object.keys(r.route.methods).map(m => m.toUpperCase()).join(',');
      console.log(`${methods} ${r.route.path}`);
    } else if (r.name === 'router') {
      console.log('Router:', r.regexp);
      r.handle.stack.forEach((h: any) => {
        if (h.route) {
          const methods = Object.keys(h.route.methods).map(m => m.toUpperCase()).join(',');
          console.log(`  ${methods} ${h.route.path}`);
        }
      });
    }
  });
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
}); 