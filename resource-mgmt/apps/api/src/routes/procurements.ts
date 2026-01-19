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
  requireAdminOrManager,
  procurementsController.createProcurement
);
procurementsRouter.put(
  '/:id',
  validateRequest(updateProcurementSchema),
  requireAdminOrManager,
  procurementsController.updateProcurement
);
procurementsRouter.delete(
  '/:id',
  validateRequest(deleteProcurementSchema),
  requireAdminOrManager,
  procurementsController.deleteProcurement
);
