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
import { requireTenant } from './middlewares/tenant.js';

export function createApp(): Express {
  const app = express();

  // CORS
  app.use(
    cors({
      // No auth/cookies in v1 -> no credentials needed. Allow configured origins + localhost.
      origin: (origin, callback) => {
        const defaultOrigins = [
          'http://localhost:5173',
          'http://localhost:5174',
          'http://localhost:5175',
          // GitHub Pages (this repo)
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

        if (allowed.includes(origin)) {
          return callback(null, true);
        }

        // Allow GitHub Pages origins in general (optional convenience for MVP)
        if (/^https:\/\/[a-z0-9-]+\.github\.io$/i.test(origin)) {
          return callback(null, true);
        }

        return callback(new Error(`CORS blocked for origin: ${origin}`));
      },
      credentials: false,
    })
  );

  // Body parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Static file serving for uploads
  const uploadDir = process.env.UPLOAD_DIR || 'uploads';
  app.use('/uploads', express.static(path.resolve(process.cwd(), uploadDir)));

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // API routes
  // All v1 API routes are tenant-scoped (X-Tenant-Id header)
  app.use('/api', requireTenant);
  app.use('/api/companies', companiesRouter);
  app.use('/api/projects', projectsRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/tasks', tasksRouter);
  app.use('/api', attachmentsRouter);
  app.use('/api', timesheetRouter);

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
}
