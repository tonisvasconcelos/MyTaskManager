import { Router } from 'express';
import * as financeController from '../controllers/finance.js';

export const financeRouter = Router();

financeRouter.get('/project-entries', financeController.getProjectFinancialEntries);
