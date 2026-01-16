import { Request, Response, NextFunction } from 'express';
import * as taskRepo from '../repositories/tasks.js';
import { NotFoundError } from '../lib/errors.js';
import { createPaginationResult } from '../lib/pagination.js';

export async function getTasks(req: Request, res: Response, next: NextFunction) {
  try {
    const { data, total, page, pageSize } = await taskRepo.findTasks(req.query as Record<string, string | undefined>);
    const result = createPaginationResult(data, total, page, pageSize);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getOngoingTasks(req: Request, res: Response, next: NextFunction) {
  try {
    const { data, total, page, pageSize } = await taskRepo.findOngoingTasks(req.query as Record<string, string | undefined>);
    const result = createPaginationResult(data, total, page, pageSize);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getTask(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const task = await taskRepo.findTaskById(id);
    if (!task) {
      throw new NotFoundError('Task', id);
    }
    res.json(task);
  } catch (error) {
    next(error);
  }
}

export async function createTask(req: Request, res: Response, next: NextFunction) {
  try {
    const data = req.body;
    // Convert date strings to Date objects
    if (data.startDate && data.startDate !== '') {
      data.startDate = new Date(data.startDate);
    } else {
      data.startDate = null;
    }
    if (data.estimatedEndDate && data.estimatedEndDate !== '') {
      data.estimatedEndDate = new Date(data.estimatedEndDate);
    } else {
      data.estimatedEndDate = null;
    }
    // Normalize empty strings to null
    if (data.assigneeId === '') data.assigneeId = null;
    
    const task = await taskRepo.createTask(data);
    res.status(201).json(task);
  } catch (error) {
    next(error);
  }
}

export async function updateTask(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const data = req.body;
    
    // Convert date strings to Date objects
    if (data.startDate !== undefined) {
      data.startDate = data.startDate && data.startDate !== '' ? new Date(data.startDate) : null;
    }
    if (data.estimatedEndDate !== undefined) {
      data.estimatedEndDate = data.estimatedEndDate && data.estimatedEndDate !== '' ? new Date(data.estimatedEndDate) : null;
    }
    // Normalize empty strings to null
    if (data.assigneeId === '') data.assigneeId = null;
    
    const task = await taskRepo.findTaskById(id);
    if (!task) {
      throw new NotFoundError('Task', id);
    }
    
    const updated = await taskRepo.updateTask(id, data);
    res.json(updated);
  } catch (error) {
    next(error);
  }
}

export async function deleteTask(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const task = await taskRepo.findTaskById(id);
    if (!task) {
      throw new NotFoundError('Task', id);
    }
    
    await taskRepo.deleteTask(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
