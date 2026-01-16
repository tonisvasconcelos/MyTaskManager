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

export function createApp(): Express {
  const app = express();

  // CORS
  app.use(
    cors({
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
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
