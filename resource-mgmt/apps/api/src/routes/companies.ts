import { Router } from 'express';
import * as companiesController from '../controllers/companies.js';
import { validateRequest } from '../middlewares/validateRequest.js';
import {
  createCompanySchema,
  updateCompanySchema,
  getCompanySchema,
  deleteCompanySchema,
} from '../validators/companies.js';

export const companiesRouter = Router();

companiesRouter.get('/', companiesController.getCompanies);
companiesRouter.get('/:id', validateRequest(getCompanySchema), companiesController.getCompany);
companiesRouter.post('/', validateRequest(createCompanySchema), companiesController.createCompany);
companiesRouter.put('/:id', validateRequest(updateCompanySchema), companiesController.updateCompany);
companiesRouter.post('/:id/logo', validateRequest(getCompanySchema), companiesController.uploadCompanyLogo);
companiesRouter.delete('/:id', validateRequest(deleteCompanySchema), companiesController.deleteCompany);
