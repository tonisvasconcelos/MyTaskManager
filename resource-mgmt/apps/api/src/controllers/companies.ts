import { Request, Response, NextFunction } from 'express';
import * as companyRepo from '../repositories/companies.js';
import { NotFoundError, ConflictError } from '../lib/errors.js';
import { createPaginationResult } from '../lib/pagination.js';
import { uploadLogo } from '../middlewares/upload.js';

export async function getCompanies(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.tenantId!;
    const { data, total, page, pageSize } = await companyRepo.findCompanies(
      tenantId,
      req.query as Record<string, string | undefined>
    );
    const result = createPaginationResult(data, total, page, pageSize);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getCompany(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId!;
    const company = await companyRepo.findCompanyByIdForTenant(tenantId, id);
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
    const tenantId = req.tenantId!;
    const data = req.body;
    // Normalize empty strings to null
    if (data.email === '') data.email = null;
    if (data.website === '') data.website = null;
    if (data.countryCode === '') data.countryCode = null;
    if (data.invoicingCurrencyCode === '') data.invoicingCurrencyCode = null;
    if (data.taxRegistrationNo === '') data.taxRegistrationNo = null;
    
    const company = await companyRepo.createCompany(tenantId, data);
    res.status(201).json(company);
  } catch (error) {
    next(error);
  }
}

export async function updateCompany(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId!;
    const data = req.body;
    
    // Normalize empty strings to null
    if (data.email === '') data.email = null;
    if (data.website === '') data.website = null;
    if (data.countryCode === '') data.countryCode = null;
    if (data.invoicingCurrencyCode === '') data.invoicingCurrencyCode = null;
    if (data.taxRegistrationNo === '') data.taxRegistrationNo = null;
    
    const company = await companyRepo.findCompanyByIdForTenant(tenantId, id);
    if (!company) {
      throw new NotFoundError('Company', id);
    }
    
    const updated = await companyRepo.updateCompany(id, data);
    res.json(updated);
  } catch (error) {
    next(error);
  }
}

export const uploadCompanyLogo = [
  uploadLogo.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId!;

      const company = await companyRepo.findCompanyByIdForTenant(tenantId, id);
      if (!company) {
        throw new NotFoundError('Company', id);
      }

      const file = req.file as Express.Multer.File | undefined;
      if (!file || !file.buffer) {
        res.status(400).json({
          error: { code: 'VALIDATION_ERROR', message: 'No file uploaded' },
        });
        return;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        res.status(400).json({
          error: { code: 'VALIDATION_ERROR', message: 'File size exceeds 5MB limit' },
        });
        return;
      }

      // Store logo data as BLOB in database
      const baseUrl = process.env.BASE_URL || 'http://localhost:4000';
      const logoUrl = `${baseUrl}/api/companies/${id}/logo`;

      try {
        const updated = await companyRepo.updateCompany(id, {
          logoFileName: file.originalname, // Keep original name for reference
          logoOriginalName: file.originalname,
          logoMimeType: file.mimetype,
          logoSize: file.size,
          logoUrl,
          logoData: file.buffer, // Store image data as BLOB
        });

        res.json(updated);
      } catch (dbError: any) {
        // If logoData column doesn't exist yet (migration not applied), fall back gracefully
        if (dbError.message?.includes('logoData') || dbError.code === 'P2021') {
          console.warn('logoData column not found, migration may not be applied yet');
          // Still update metadata, but skip logoData
          const updated = await companyRepo.updateCompany(id, {
            logoFileName: file.originalname,
            logoOriginalName: file.originalname,
            logoMimeType: file.mimetype,
            logoSize: file.size,
            logoUrl: null, // Can't serve logo without logoData
          });
          res.json(updated);
        } else {
          throw dbError;
        }
      }
    } catch (error) {
      next(error);
    }
  },
];

export async function getCompanyLogo(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId!;

    // First verify company exists and belongs to tenant
    const companyExists = await companyRepo.findCompanyByIdForTenant(tenantId, id);
    if (!companyExists) {
      throw new NotFoundError('Company', id);
    }

    // Fetch only logo-related fields to avoid loading unnecessary data
    try {
      const company = await companyRepo.findCompanyLogo(tenantId, id);
      if (!company) {
        res.status(404).json({
          error: { code: 'NOT_FOUND', message: 'Logo not found' },
        });
        return;
      }

      if (!company.logoData || !company.logoMimeType) {
        res.status(404).json({
          error: { code: 'NOT_FOUND', message: 'Logo not found' },
        });
        return;
      }

      // Set appropriate headers and send the image data
      res.setHeader('Content-Type', company.logoMimeType);
      res.setHeader('Content-Length', company.logoSize || company.logoData.length);
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
      res.send(company.logoData);
    } catch (dbError: any) {
      // If logoData column doesn't exist yet (migration not applied), return 404
      if (dbError.message?.includes('logoData') || dbError.message?.includes('column') || dbError.code === 'P2021' || dbError.code === 'P2001') {
        res.status(404).json({
          error: { code: 'NOT_FOUND', message: 'Logo not available (migration pending)' },
        });
        return;
      }
      throw dbError;
    }
  } catch (error) {
    next(error);
  }
}

export async function deleteCompany(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId!;
    const company = await companyRepo.findCompanyByIdForTenant(tenantId, id);
    if (!company) {
      throw new NotFoundError('Company', id);
    }
    
    const hasProjects = await companyRepo.companyHasProjects(tenantId, id);
    if (hasProjects) {
      throw new ConflictError('Cannot delete company with associated projects');
    }
    
    await companyRepo.deleteCompany(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
