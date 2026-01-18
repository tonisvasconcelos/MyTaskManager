import { Request, Response, NextFunction } from 'express';
import * as taskRepo from '../repositories/tasks.js';
import { NotFoundError } from '../lib/errors.js';
import { createPaginationResult } from '../lib/pagination.js';

export async function getTasks(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.tenantId!;
    const { data, total, page, pageSize } = await taskRepo.findTasks(
      tenantId,
      req.query as Record<string, string | undefined>
    );
    const result = createPaginationResult(data, total, page, pageSize);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getOngoingTasks(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.tenantId!;
    const { data, total, page, pageSize } = await taskRepo.findOngoingTasks(
      tenantId,
      req.query as Record<string, string | undefined>
    );
    const result = createPaginationResult(data, total, page, pageSize);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getTask(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId!;
    const task = await taskRepo.findTaskByIdForTenant(tenantId, id);
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
    const tenantId = req.tenantId!;
    const data = req.body;
    
    // Verify project exists and belongs to tenant
    const { findProjectByIdForTenant } = await import('../repositories/projects.js');
    const project = await findProjectByIdForTenant(tenantId, data.projectId);
    if (!project) {
      throw new NotFoundError('Project', data.projectId);
    }
    
    // Verify assignee exists and belongs to tenant if provided
    if (data.assigneeId && data.assigneeId !== '' && data.assigneeId !== null) {
      const { findUserByIdForTenant } = await import('../repositories/users.js');
      const assignee = await findUserByIdForTenant(tenantId, data.assigneeId);
      if (!assignee) {
        throw new NotFoundError('User', data.assigneeId);
      }
    }
    
    // Prepare clean data object for Prisma
    const taskData: any = {
      projectId: data.projectId,
      title: data.title,
      description: data.description || null,
      status: data.status || 'Backlog',
      priority: data.priority || 'Medium',
      estimatedEffortHours: data.estimatedEffortHours || null,
    };
    
    // Convert date strings to Date objects or null
    if (data.startDate && data.startDate !== '' && data.startDate !== null) {
      const startDate = new Date(data.startDate);
      if (!isNaN(startDate.getTime())) {
        taskData.startDate = startDate;
      } else {
        taskData.startDate = null;
      }
    } else {
      taskData.startDate = null;
    }
    
    if (data.estimatedEndDate && data.estimatedEndDate !== '' && data.estimatedEndDate !== null) {
      const estimatedEndDate = new Date(data.estimatedEndDate);
      if (!isNaN(estimatedEndDate.getTime())) {
        taskData.estimatedEndDate = estimatedEndDate;
      } else {
        taskData.estimatedEndDate = null;
      }
    } else {
      taskData.estimatedEndDate = null;
    }
    
    // Normalize assigneeId
    if (data.assigneeId && data.assigneeId !== '' && data.assigneeId !== null) {
      taskData.assigneeId = data.assigneeId;
    } else {
      taskData.assigneeId = null;
    }
    
    const task = await taskRepo.createTask(tenantId, taskData);
    res.status(201).json(task);
  } catch (error) {
    next(error);
  }
}

export async function updateTask(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId!;
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
    
    const task = await taskRepo.findTaskByIdForTenant(tenantId, id);
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
    const tenantId = req.tenantId!;
    const task = await taskRepo.findTaskByIdForTenant(tenantId, id);
    if (!task) {
      throw new NotFoundError('Task', id);
    }
    
    await taskRepo.deleteTask(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
