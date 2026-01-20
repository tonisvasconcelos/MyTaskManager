import { Router } from 'express';
import * as plannerController from '../controllers/planner.js';
import { validateRequest } from '../middlewares/validateRequest.js';
import {
  getBlocksSchema,
  createBlockSchema,
  updateBlockSchema,
  deleteBlockSchema,
  getLookupsSchema,
} from '../validators/planner.js';

export const plannerRouter = Router();

plannerRouter.get('/blocks', validateRequest(getBlocksSchema), plannerController.getBlocks);
plannerRouter.post('/blocks', validateRequest(createBlockSchema), plannerController.createBlock);
plannerRouter.put('/blocks/:id', validateRequest(updateBlockSchema), plannerController.updateBlock);
plannerRouter.delete('/blocks/:id', validateRequest(deleteBlockSchema), plannerController.deleteBlock);
plannerRouter.get('/lookups', validateRequest(getLookupsSchema), plannerController.getLookups);
