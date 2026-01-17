import { Router } from 'express';
import { validateRequest } from '../middlewares/validateRequest.js';
import { requireSuperAdmin } from '../middlewares/requireAuth.js';
import * as adminController from '../controllers/admin.js';
import {
  adminLoginSchema,
  adminListTenantsSchema,
  adminCreateTenantSchema,
  adminUpdateTenantSchema,
  adminCreateTenantUserSchema,
  adminListTenantUsersSchema,
  adminUpdateUserSchema,
} from '../validators/admin.js';

export const adminRouter = Router();

// Public admin login (super-admin only, credentials from env)
adminRouter.post('/admin/login', validateRequest(adminLoginSchema), adminController.adminLogin);

// Everything else requires SuperAdmin token
adminRouter.use('/admin', requireSuperAdmin);

adminRouter.get('/admin/tenants', validateRequest(adminListTenantsSchema), adminController.listTenants);
adminRouter.post('/admin/tenants', validateRequest(adminCreateTenantSchema), adminController.createTenant);
adminRouter.put('/admin/tenants/:id', validateRequest(adminUpdateTenantSchema), adminController.updateTenant);
adminRouter.get('/admin/tenants/:id/users', validateRequest(adminListTenantUsersSchema), adminController.listTenantUsers);
adminRouter.post('/admin/tenants/:id/users', validateRequest(adminCreateTenantUserSchema), adminController.createTenantUser);
adminRouter.put('/admin/users/:id', validateRequest(adminUpdateUserSchema), adminController.updateUser);

