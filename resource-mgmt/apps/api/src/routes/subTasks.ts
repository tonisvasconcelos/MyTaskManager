import { Router } from 'express';
import * as subTasksController from '../controllers/subTasks.js';
import { validateRequest } from '../middlewares/validateRequest.js';
import {
  createSubTaskSchema,
  updateSubTaskSchema,
  getSubTaskSchema,
  deleteSubTaskSchema,
  getSubTasksByTaskSchema,
} from '../validators/subTasks.js';

export const subTasksRouter = Router();

subTasksRouter.get('/task/:taskId', validateRequest(getSubTasksByTaskSchema), subTasksController.getSubTasksByTask);
subTasksRouter.get('/:id', validateRequest(getSubTaskSchema), subTasksController.getSubTask);
subTasksRouter.post('/', validateRequest(createSubTaskSchema), subTasksController.createSubTask);
subTasksRouter.put('/:id', validateRequest(updateSubTaskSchema), subTasksController.updateSubTask);
subTasksRouter.delete('/:id', validateRequest(deleteSubTaskSchema), subTasksController.deleteSubTask);
