import { Request, Response, NextFunction } from 'express';
import * as procurementRepo from '../repositories/procurements.js';
import { NotFoundError, ValidationError } from '../lib/errors.js';
import { createPaginationResult } from '../lib/pagination.js';

export async function getProcurements(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.tenantId!;
    const { data, total, page, pageSize } = await procurementRepo.findProcurements(
      tenantId,
      req.query as Record<string, string | undefined>
    );
    const result = createPaginationResult(data, total, page, pageSize);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getProcurement(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId!;
    const expense = await procurementRepo.findProcurementByIdForTenant(tenantId, id);
    if (!expense) {
      throw new NotFoundError('Expense', id);
    }
    res.json(expense);
  } catch (error) {
    next(error);
  }
}

export async function createProcurement(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.tenantId!;
    const data = req.body;

    // Verify company exists and belongs to tenant
    const { findCompanyByIdForTenant } = await import('../repositories/companies.js');
    const company = await findCompanyByIdForTenant(tenantId, data.companyId);
    if (!company) {
      throw new NotFoundError('Company', data.companyId);
    }

    // Verify all projects exist and belong to tenant
    const { findProjectByIdForTenant } = await import('../repositories/projects.js');
    const projectIds = data.allocations.map((a: any) => a.projectId);
    const uniqueProjectIds = [...new Set(projectIds)];

    for (const projectId of uniqueProjectIds) {
      const project = await findProjectByIdForTenant(tenantId, projectId);
      if (!project) {
        throw new NotFoundError('Project', projectId);
      }
    }

    // Prepare clean data object
    const expenseData: any = {
      companyId: data.companyId,
      invoiceNumber: data.invoiceNumber,
      date: data.date,
      totalAmount: data.totalAmount,
      paymentMethod: data.paymentMethod,
      status: data.status || 'PENDING',
      notes: data.notes || null,
      allocations: data.allocations.map((alloc: any) => ({
        projectId: alloc.projectId,
        allocatedAmount: alloc.allocatedAmount,
      })),
    };

    const expense = await procurementRepo.createProcurement(tenantId, expenseData);
    res.status(201).json(expense);
  } catch (error) {
    next(error);
  }
}

export async function updateProcurement(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId!;
    const data = req.body;

    // Verify expense exists and belongs to tenant
    const expense = await procurementRepo.findProcurementByIdForTenant(tenantId, id);
    if (!expense) {
      throw new NotFoundError('Expense', id);
    }

    // If companyId is being updated, verify it exists and belongs to tenant
    if (data.companyId) {
      const { findCompanyByIdForTenant } = await import('../repositories/companies.js');
      const company = await findCompanyByIdForTenant(tenantId, data.companyId);
      if (!company) {
        throw new NotFoundError('Company', data.companyId);
      }
    }

    // If allocations are being updated, verify all projects exist and belong to tenant
    if (data.allocations) {
      const { findProjectByIdForTenant } = await import('../repositories/projects.js');
      const projectIds = data.allocations.map((a: any) => a.projectId);
      const uniqueProjectIds = [...new Set(projectIds)];

      for (const projectId of uniqueProjectIds) {
        const project = await findProjectByIdForTenant(tenantId, projectId);
        if (!project) {
          throw new NotFoundError('Project', projectId);
        }
      }
    }

    // Prepare update data
    const updateData: any = {};
    if (data.companyId !== undefined) updateData.companyId = data.companyId;
    if (data.invoiceNumber !== undefined) updateData.invoiceNumber = data.invoiceNumber;
    if (data.date !== undefined) updateData.date = data.date;
    if (data.totalAmount !== undefined) updateData.totalAmount = data.totalAmount;
    if (data.paymentMethod !== undefined) updateData.paymentMethod = data.paymentMethod;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.notes !== undefined) updateData.notes = data.notes || null;
    if (data.allocations !== undefined) {
      updateData.allocations = data.allocations.map((alloc: any) => ({
        projectId: alloc.projectId,
        allocatedAmount: alloc.allocatedAmount,
      }));
    }

    const updated = await procurementRepo.updateProcurement(id, updateData);
    res.json(updated);
  } catch (error) {
    next(error);
  }
}

export async function deleteProcurement(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId!;
    const expense = await procurementRepo.findProcurementByIdForTenant(tenantId, id);
    if (!expense) {
      throw new NotFoundError('Expense', id);
    }

    await procurementRepo.deleteProcurement(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
