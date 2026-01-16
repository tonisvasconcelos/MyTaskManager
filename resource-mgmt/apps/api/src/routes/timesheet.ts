import { Router } from 'express';
import * as timesheetController from '../controllers/timesheet.js';
import { validateRequest } from '../middlewares/validateRequest.js';
import {
  createTimeEntrySchema,
  updateTimeEntrySchema,
  getTimeEntrySchema,
  deleteTimeEntrySchema,
} from '../validators/timesheet.js';

export const timesheetRouter = Router();

timesheetRouter.get('/timesheet', timesheetController.getTimesheet);
timesheetRouter.get('/time-entries/:id', validateRequest(getTimeEntrySchema), timesheetController.getTimeEntry);
timesheetRouter.post('/time-entries', validateRequest(createTimeEntrySchema), timesheetController.createTimeEntry);
timesheetRouter.put('/time-entries/:id', validateRequest(updateTimeEntrySchema), timesheetController.updateTimeEntry);
timesheetRouter.delete('/time-entries/:id', validateRequest(deleteTimeEntrySchema), timesheetController.deleteTimeEntry);
