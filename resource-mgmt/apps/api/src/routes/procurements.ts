import { Router } from 'express';
import * as procurementsController from '../controllers/procurements.js';
import { validateRequest } from '../middlewares/validateRequest.js';
import { requireAdminOrManager } from '../middlewares/requireRole.js';
import {
  createProcurementSchema,
  updateProcurementSchema,
  getProcurementSchema,
  deleteProcurementSchema,
} from '../validators/procurements.js';

export const procurementsRouter = Router();

procurementsRouter.get('/', procurementsController.getProcurements);
procurementsRouter.get('/:id', validateRequest(getProcurementSchema), procurementsController.getProcurement);
procurementsRouter.post(
  '/',
  validateRequest(createProcurementSchema),
  procurementsController.createProcurement
);
procurementsRouter.put(
  '/:id',
  validateRequest(updateProcurementSchema),
  procurementsController.updateProcurement
);
procurementsRouter.delete(
  '/:id',
  requireAdminOrManager,
  validateRequest(deleteProcurementSchema),
  procurementsController.deleteProcurement
);
