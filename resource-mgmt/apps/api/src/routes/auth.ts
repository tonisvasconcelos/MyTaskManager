import { Router } from 'express';
import { validateRequest } from '../middlewares/validateRequest.js';
import { loginSchema } from '../validators/auth.js';
import * as authController from '../controllers/auth.js';
import { requireTenantAuth } from '../middlewares/requireAuth.js';

export const authRouter = Router();

authRouter.post('/auth/login', validateRequest(loginSchema), authController.login);
authRouter.get('/auth/me', requireTenantAuth, authController.me);

