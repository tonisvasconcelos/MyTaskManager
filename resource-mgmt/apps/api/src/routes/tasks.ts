import { Router } from 'express';
import * as tasksController from '../controllers/tasks.js';
import { validateRequest } from '../middlewares/validateRequest.js';
import {
  createTaskSchema,
  updateTaskSchema,
  getTaskSchema,
  deleteTaskSchema,
} from '../validators/tasks.js';

export const tasksRouter = Router();

tasksRouter.get('/', tasksController.getTasks);
tasksRouter.get('/ongoing', tasksController.getOngoingTasks);
tasksRouter.get('/:id', validateRequest(getTaskSchema), tasksController.getTask);
tasksRouter.post('/', validateRequest(createTaskSchema), tasksController.createTask);
tasksRouter.put('/:id', validateRequest(updateTaskSchema), tasksController.updateTask);
tasksRouter.delete('/:id', validateRequest(deleteTaskSchema), tasksController.deleteTask);
