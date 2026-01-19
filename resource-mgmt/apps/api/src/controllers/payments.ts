import { Request, Response, NextFunction } from 'express';
import * as paymentRepo from '../repositories/payments.js';
import { NotFoundError } from '../lib/errors.js';
import { createPaginationResult } from '../lib/pagination.js';

export async function getPayments(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.tenantId!;
    const { data, total, page, pageSize } = await paymentRepo.findPayments(
      tenantId,
      req.query as Record<string, string | undefined>
    );
    const result = createPaginationResult(data, total, page, pageSize);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getPayment(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId!;
    const payment = await paymentRepo.findPaymentByIdForTenant(tenantId, id);
    if (!payment) {
      throw new NotFoundError('Payment', id);
    }
    res.json(payment);
  } catch (error) {
    next(error);
  }
}

export async function createPayment(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.tenantId!;
    const data = req.body;

    // Verify expense exists and belongs to tenant
    const { findProcurementByIdForTenant } = await import('../repositories/procurements.js');
    const expense = await findProcurementByIdForTenant(tenantId, data.expenseId);
    if (!expense) {
      throw new NotFoundError('Expense', data.expenseId);
    }

    const paymentData: any = {
      expenseId: data.expenseId,
      amount: data.amount,
      paymentCurrencyCode: data.paymentCurrencyCode || null,
      amountLCY: data.amountLCY || null,
      paymentDate: data.paymentDate,
      paymentMethod: data.paymentMethod,
      referenceNumber: data.referenceNumber || null,
      notes: data.notes || null,
    };

    const payment = await paymentRepo.createPayment(tenantId, paymentData);
    res.status(201).json(payment);
  } catch (error) {
    next(error);
  }
}

export async function updatePayment(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId!;
    const data = req.body;

    // Verify payment exists and belongs to tenant
    const payment = await paymentRepo.findPaymentByIdForTenant(tenantId, id);
    if (!payment) {
      throw new NotFoundError('Payment', id);
    }

    // If expenseId is being updated, verify it exists and belongs to tenant
    if (data.expenseId) {
      const { findProcurementByIdForTenant } = await import('../repositories/procurements.js');
      const expense = await findProcurementByIdForTenant(tenantId, data.expenseId);
      if (!expense) {
        throw new NotFoundError('Expense', data.expenseId);
      }
    }

    const updateData: any = {};
    if (data.expenseId !== undefined) updateData.expenseId = data.expenseId;
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.paymentCurrencyCode !== undefined) updateData.paymentCurrencyCode = data.paymentCurrencyCode || null;
    if (data.amountLCY !== undefined) updateData.amountLCY = data.amountLCY || null;
    if (data.paymentDate !== undefined) updateData.paymentDate = data.paymentDate;
    if (data.paymentMethod !== undefined) updateData.paymentMethod = data.paymentMethod;
    if (data.referenceNumber !== undefined) updateData.referenceNumber = data.referenceNumber || null;
    if (data.notes !== undefined) updateData.notes = data.notes || null;

    const updated = await paymentRepo.updatePayment(tenantId, id, updateData);
    res.json(updated);
  } catch (error) {
    next(error);
  }
}

export async function deletePayment(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId!;
    const payment = await paymentRepo.findPaymentByIdForTenant(tenantId, id);
    if (!payment) {
      throw new NotFoundError('Payment', id);
    }

    await paymentRepo.deletePayment(tenantId, id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
