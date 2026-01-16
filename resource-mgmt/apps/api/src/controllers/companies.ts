import { Request, Response, NextFunction } from 'express';
import * as companyRepo from '../repositories/companies.js';
import { NotFoundError, ConflictError } from '../lib/errors.js';
import { createPaginationResult } from '../lib/pagination.js';

export async function getCompanies(req: Request, res: Response, next: NextFunction) {
  try {
    const { data, total, page, pageSize } = await companyRepo.findCompanies(req.query as Record<string, string | undefined>);
    const result = createPaginationResult(data, total, page, pageSize);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getCompany(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const company = await companyRepo.findCompanyById(id);
    if (!company) {
      throw new NotFoundError('Company', id);
    }
    res.json(company);
  } catch (error) {
    next(error);
  }
}

export async function createCompany(req: Request, res: Response, next: NextFunction) {
  try {
    const data = req.body;
    // Normalize empty strings to null
    if (data.email === '') data.email = null;
    if (data.website === '') data.website = null;
    
    const company = await companyRepo.createCompany(data);
    res.status(201).json(company);
  } catch (error) {
    next(error);
  }
}

export async function updateCompany(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const data = req.body;
    
    // Normalize empty strings to null
    if (data.email === '') data.email = null;
    if (data.website === '') data.website = null;
    
    const company = await companyRepo.findCompanyById(id);
    if (!company) {
      throw new NotFoundError('Company', id);
    }
    
    const updated = await companyRepo.updateCompany(id, data);
    res.json(updated);
  } catch (error) {
    next(error);
  }
}

export async function deleteCompany(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const company = await companyRepo.findCompanyById(id);
    if (!company) {
      throw new NotFoundError('Company', id);
    }
    
    const hasProjects = await companyRepo.companyHasProjects(id);
    if (hasProjects) {
      throw new ConflictError('Cannot delete company with associated projects');
    }
    
    await companyRepo.deleteCompany(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
