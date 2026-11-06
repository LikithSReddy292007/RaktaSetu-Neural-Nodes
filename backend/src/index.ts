import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import apiRoutes from './routes/index.js';

const app = express();

// Security Middleware
app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(','),
    credentials: true,
  })
);

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // limit each IP to 300 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests from this IP, please try again later.' },
});
app.use(limiter);

// Body Parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health Check
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'RakthaSetu Backend API',
    version: '1.0.0',
  });
});

import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mount API Routes
app.use('/api', apiRoutes);

// Serve Frontend SPA build if present
const frontendDist = path.resolve(__dirname, '../../project/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api') || req.path === '/health') {
      return next();
    }
    res.sendFile(path.resolve(frontendDist, 'index.html'));
  });
} else {
  app.get('/', (_req: Request, res: Response) => {
    res.status(200).json({
      message: 'Welcome to RakthaSetu Blood Donation Platform API.',
      documentation: '/api',
    });
  });
}

// 404 Handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
  });
});

// Global Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Internal Error]:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'An unexpected internal server error occurred.',
  });
});

const PORT = parseInt(env.PORT, 10) || 5000;
let serverInstance: any = null;

if (process.env.NODE_ENV !== 'test') {
  serverInstance = app
    .listen(PORT, () => {
      console.log(`[RakthaSetu Server] Running on http://localhost:${PORT}`);
    })
    .on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`[RakthaSetu Server] Port ${PORT} already active.`);
      } else {
        console.error(err);
      }
    });
}

export const server = serverInstance;
export default app;
