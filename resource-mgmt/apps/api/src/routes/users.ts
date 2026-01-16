import { Router } from 'express';
import * as usersController from '../controllers/users.js';
import { validateRequest } from '../middlewares/validateRequest.js';
import {
  createUserSchema,
  updateUserSchema,
  getUserSchema,
  deleteUserSchema,
} from '../validators/users.js';

export const usersRouter = Router();

usersRouter.get('/', usersController.getUsers);
usersRouter.get('/:id', validateRequest(getUserSchema), usersController.getUser);
usersRouter.post('/', validateRequest(createUserSchema), usersController.createUser);
usersRouter.put('/:id', validateRequest(updateUserSchema), usersController.updateUser);
usersRouter.delete('/:id', validateRequest(deleteUserSchema), usersController.deleteUser);
