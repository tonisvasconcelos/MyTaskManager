import express, { Express } from 'express';
import cors from 'cors';
import path from 'path';
import { errorHandler } from './middlewares/errorHandler.js';
import { companiesRouter } from './routes/companies.js';
import { projectsRouter } from './routes/projects.js';
import { usersRouter } from './routes/users.js';
import { tasksRouter } from './routes/tasks.js';
import { attachmentsRouter } from './routes/attachments.js';
import { timesheetRouter } from './routes/timesheet.js';
import { procurementsRouter } from './routes/procurements.js';
import { paymentsRouter } from './routes/payments.js';
import { salesRouter } from './routes/sales.js';
import { financeRouter } from './routes/finance.js';
import { authRouter } from './routes/auth.js';
import { requireTenantAuth } from './middlewares/requireAuth.js';
import { adminRouter } from './routes/admin.js';

export function createApp(): Express {
  const app = express();

  // CORS - Configure before other middleware
  const corsOptions = {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      const defaultOrigins = [
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:5175',
        // GitHub Pages (this repo) - exact match
        'https://tonisvasconcelos.github.io',
      ];
      const envOrigins = (process.env.CORS_ORIGINS || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const allowed = [...defaultOrigins, ...envOrigins];

      // Allow same-origin / curl / server-to-server (no Origin header)
      if (!origin) {
        return callback(null, true);
      }

      // Exact match first
      if (allowed.includes(origin)) {
        return callback(null, true);
      }

      // Allow GitHub Pages origins in general (optional convenience for MVP)
      // Match patterns like: https://username.github.io or https://username.github.io/MyTaskManager
      if (/^https:\/\/[a-z0-9-]+\.github\.io(\/.*)?$/i.test(origin)) {
        return callback(null, true);
      }

      // Log blocked origin for debugging
      console.warn(`CORS blocked for origin: ${origin}`);
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: false,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  };

  app.use(cors(corsOptions));
  
  // Explicitly handle OPTIONS requests for all routes (additional safety)
  app.options('*', cors(corsOptions));

  // Body parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Static file serving for uploads
  const uploadDir = process.env.UPLOAD_DIR || 'uploads';
  app.use('/uploads', express.static(path.resolve(process.cwd(), uploadDir)));

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // API routes
  // Public auth endpoints
  app.use('/api', authRouter);
  app.use('/api', adminRouter);

  // All other API endpoints require auth (JWT) and are tenant-scoped via token
  app.use('/api', requireTenantAuth);
  app.use('/api/companies', companiesRouter);
  app.use('/api/projects', projectsRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/tasks', tasksRouter);
  app.use('/api', attachmentsRouter);
  app.use('/api', timesheetRouter);
  app.use('/api/procurements', procurementsRouter);
  app.use('/api/payments', paymentsRouter);
  app.use('/api/sales', salesRouter);
  app.use('/api/finance', financeRouter);

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
}
