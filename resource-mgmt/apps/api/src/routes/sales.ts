import { Router } from 'express';
import * as salesController from '../controllers/sales.js';
import { validateRequest } from '../middlewares/validateRequest.js';
import { requireAdminOrManager } from '../middlewares/requireRole.js';
import {
  createSaleSchema,
  updateSaleSchema,
  getSaleSchema,
  deleteSaleSchema,
} from '../validators/sales.js';

export const salesRouter = Router();

salesRouter.get('/', salesController.getSales);
salesRouter.get('/:id', validateRequest(getSaleSchema), salesController.getSale);
salesRouter.post(
  '/',
  requireAdminOrManager,
  validateRequest(createSaleSchema),
  salesController.createSale
);
salesRouter.put(
  '/:id',
  requireAdminOrManager,
  validateRequest(updateSaleSchema),
  salesController.updateSale
);
salesRouter.delete(
  '/:id',
  requireAdminOrManager,
  validateRequest(deleteSaleSchema),
  salesController.deleteSale
);
