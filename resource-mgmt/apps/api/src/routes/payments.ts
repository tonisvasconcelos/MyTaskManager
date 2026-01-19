import { Router } from 'express';
import * as paymentsController from '../controllers/payments.js';
import { validateRequest } from '../middlewares/validateRequest.js';
import {
  createPaymentSchema,
  updatePaymentSchema,
  getPaymentSchema,
  deletePaymentSchema,
} from '../validators/payments.js';

export const paymentsRouter = Router();

paymentsRouter.get('/', paymentsController.getPayments);
paymentsRouter.get('/:id', validateRequest(getPaymentSchema), paymentsController.getPayment);
paymentsRouter.post(
  '/',
  validateRequest(createPaymentSchema),
  paymentsController.createPayment
);
paymentsRouter.put(
  '/:id',
  validateRequest(updatePaymentSchema),
  paymentsController.updatePayment
);
paymentsRouter.delete(
  '/:id',
  validateRequest(deletePaymentSchema),
  paymentsController.deletePayment
);
