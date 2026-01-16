import { Request, Response, NextFunction } from 'express';
import * as userRepo from '../repositories/users.js';
import { NotFoundError } from '../lib/errors.js';

export async function getUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const users = await userRepo.findUsers();
    res.json(users);
  } catch (error) {
    next(error);
  }
}

export async function getUser(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const user = await userRepo.findUserById(id);
    if (!user) {
      throw new NotFoundError('User', id);
    }
    res.json(user);
  } catch (error) {
    next(error);
  }
}

export async function createUser(req: Request, res: Response, next: NextFunction) {
  try {
    const data = req.body;
    // Normalize empty strings to null
    if (data.email === '') data.email = null;
    
    const user = await userRepo.createUser(data);
    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
}

export async function updateUser(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const data = req.body;
    
    // Normalize empty strings to null
    if (data.email === '') data.email = null;
    
    const user = await userRepo.findUserById(id);
    if (!user) {
      throw new NotFoundError('User', id);
    }
    
    const updated = await userRepo.updateUser(id, data);
    res.json(updated);
  } catch (error) {
    next(error);
  }
}

export async function deleteUser(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const user = await userRepo.findUserById(id);
    if (!user) {
      throw new NotFoundError('User', id);
    }
    
    await userRepo.deleteUser(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
