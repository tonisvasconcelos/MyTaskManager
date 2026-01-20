import { Router } from 'express';
import * as projectsController from '../controllers/projects.js';
import { validateRequest } from '../middlewares/validateRequest.js';
import { requireAdminOrManager } from '../middlewares/requireRole.js';
import {
  createProjectSchema,
  updateProjectSchema,
  getProjectSchema,
  deleteProjectSchema,
  getProjectUsersSchema,
  updateProjectUsersSchema,
} from '../validators/projects.js';

export const projectsRouter = Router();

projectsRouter.get('/', projectsController.getProjects);
projectsRouter.get('/:id/expenses', validateRequest(getProjectSchema), projectsController.getProjectExpenses);
projectsRouter.get('/:id/users', validateRequest(getProjectUsersSchema), requireAdminOrManager, projectsController.getProjectUsers);
projectsRouter.get('/:id', validateRequest(getProjectSchema), projectsController.getProject);
projectsRouter.post('/', validateRequest(createProjectSchema), projectsController.createProject);
projectsRouter.put('/:id/users', validateRequest(updateProjectUsersSchema), requireAdminOrManager, projectsController.updateProjectUsers);
projectsRouter.put('/:id', validateRequest(updateProjectSchema), projectsController.updateProject);
projectsRouter.delete('/:id', validateRequest(deleteProjectSchema), projectsController.deleteProject);
