import { Request, Response, NextFunction } from 'express';
import * as saleRepo from '../repositories/sales.js';
import { NotFoundError } from '../lib/errors.js';
import { createPaginationResult } from '../lib/pagination.js';

export async function getSales(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.tenantId!;
    const { data, total, page, pageSize } = await saleRepo.findSales(
      tenantId,
      req.query as Record<string, string | undefined>
    );
    const result = createPaginationResult(data, total, page, pageSize);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getSale(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId!;
    const sale = await saleRepo.findSaleByIdForTenant(tenantId, id);
    if (!sale) {
      throw new NotFoundError('Sale', id);
    }
    res.json(sale);
  } catch (error) {
    next(error);
  }
}

export async function createSale(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.tenantId!;
    const data = req.body;

    // Verify company exists and belongs to tenant
    const { findCompanyByIdForTenant } = await import('../repositories/companies.js');
    const company = await findCompanyByIdForTenant(tenantId, data.companyId);
    if (!company) {
      throw new NotFoundError('Company', data.companyId);
    }

    const saleData: any = {
      companyId: data.companyId,
      invoiceNumber: data.invoiceNumber,
      date: data.date,
      totalAmount: data.totalAmount,
      status: data.status || 'PENDING',
      notes: data.notes || null,
    };

    const sale = await saleRepo.createSale(tenantId, saleData);
    res.status(201).json(sale);
  } catch (error) {
    next(error);
  }
}

export async function updateSale(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId!;
    const data = req.body;

    // Verify sale exists and belongs to tenant
    const sale = await saleRepo.findSaleByIdForTenant(tenantId, id);
    if (!sale) {
      throw new NotFoundError('Sale', id);
    }

    // If companyId is being updated, verify it exists and belongs to tenant
    if (data.companyId) {
      const { findCompanyByIdForTenant } = await import('../repositories/companies.js');
      const company = await findCompanyByIdForTenant(tenantId, data.companyId);
      if (!company) {
        throw new NotFoundError('Company', data.companyId);
      }
    }

    const updateData: any = {};
    if (data.companyId !== undefined) updateData.companyId = data.companyId;
    if (data.invoiceNumber !== undefined) updateData.invoiceNumber = data.invoiceNumber;
    if (data.date !== undefined) updateData.date = data.date;
    if (data.totalAmount !== undefined) updateData.totalAmount = data.totalAmount;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.notes !== undefined) updateData.notes = data.notes || null;

    const updated = await saleRepo.updateSale(tenantId, id, updateData);
    res.json(updated);
  } catch (error) {
    next(error);
  }
}

export async function deleteSale(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId!;
    const sale = await saleRepo.findSaleByIdForTenant(tenantId, id);
    if (!sale) {
      throw new NotFoundError('Sale', id);
    }

    await saleRepo.deleteSale(tenantId, id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
