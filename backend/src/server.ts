import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import routes from './routes';
import docsRoutes from './routes/docs';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3010;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
app.use(express.json());

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// API Routes - mount before the docs route
app.use('/api', routes);

// Documentation route
app.use('/', docsRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Catch-all for undefined paths
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: `Cannot ${req.method} ${req.originalUrl}`,
    documentation: 'Visit / for API documentation'
  });
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Documentation available at http://localhost:${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
});