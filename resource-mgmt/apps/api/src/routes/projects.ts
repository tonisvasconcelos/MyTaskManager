import { Router } from 'express';
import * as projectsController from '../controllers/projects.js';
import { validateRequest } from '../middlewares/validateRequest.js';
import {
  createProjectSchema,
  updateProjectSchema,
  getProjectSchema,
  deleteProjectSchema,
} from '../validators/projects.js';

export const projectsRouter = Router();

projectsRouter.get('/', projectsController.getProjects);
projectsRouter.get('/:id', validateRequest(getProjectSchema), projectsController.getProject);
projectsRouter.post('/', validateRequest(createProjectSchema), projectsController.createProject);
projectsRouter.put('/:id', validateRequest(updateProjectSchema), projectsController.updateProject);
projectsRouter.delete('/:id', validateRequest(deleteProjectSchema), projectsController.deleteProject);
