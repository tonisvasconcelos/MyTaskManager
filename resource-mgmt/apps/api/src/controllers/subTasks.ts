import { Request, Response, NextFunction } from 'express';
import * as subTaskRepo from '../repositories/subTasks.js';
import * as taskRepo from '../repositories/tasks.js';
import * as projectUserRepo from '../repositories/projectUsers.js';
import { NotFoundError, ValidationError } from '../lib/errors.js';

export async function getSubTasksByTask(req: Request, res: Response, next: NextFunction) {
  try {
    const { taskId } = req.params;
    const tenantId = req.tenantId!;
    
    // Verify task exists and belongs to tenant
    const task = await taskRepo.findTaskByIdForTenant(tenantId, taskId);
    if (!task) {
      throw new NotFoundError('Task', taskId);
    }
    
    const subTasks = await subTaskRepo.findSubTasksByTaskId(taskId);
    res.json(subTasks);
  } catch (error) {
    next(error);
  }
}

export async function getSubTask(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId!;
    
    const subTask = await subTaskRepo.findSubTaskById(id);
    if (!subTask) {
      throw new NotFoundError('SubTask', id);
    }
    
    // Verify task belongs to tenant
    const task = await taskRepo.findTaskByIdForTenant(tenantId, subTask.taskId);
    if (!task) {
      throw new NotFoundError('Task', subTask.taskId);
    }
    
    res.json(subTask);
  } catch (error) {
    next(error);
  }
}

export async function createSubTask(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.tenantId!;
    const auth = req.auth!;
    const role = auth.role;
    const data = req.body;
    
    // Verify task exists and belongs to tenant
    const task = await taskRepo.findTaskByIdForTenant(tenantId, data.taskId);
    if (!task) {
      throw new NotFoundError('Task', data.taskId);
    }
    
    // If user is Contributor, check if they have access to this project
    if (role === 'Contributor') {
      const hasAccess = await projectUserRepo.userHasProjectAccess(auth.userId, task.projectId);
      if (!hasAccess) {
        throw new ValidationError('You do not have access to this project');
      }
    }
    
    const subTask = await subTaskRepo.createSubTask(data.taskId, {
      title: data.title,
      order: data.order,
    });
    
    res.status(201).json(subTask);
  } catch (error) {
    next(error);
  }
}

export async function updateSubTask(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId!;
    const auth = req.auth!;
    const role = auth.role;
    const data = req.body;
    
    const subTask = await subTaskRepo.findSubTaskById(id);
    if (!subTask) {
      throw new NotFoundError('SubTask', id);
    }
    
    // Verify task belongs to tenant
    const task = await taskRepo.findTaskByIdForTenant(tenantId, subTask.taskId);
    if (!task) {
      throw new NotFoundError('Task', subTask.taskId);
    }
    
    // If user is Contributor, check if they have access to this project
    if (role === 'Contributor') {
      const hasAccess = await projectUserRepo.userHasProjectAccess(auth.userId, task.projectId);
      if (!hasAccess) {
        throw new ValidationError('You do not have access to this project');
      }
    }
    
    const updated = await subTaskRepo.updateSubTask(id, data);
    res.json(updated);
  } catch (error) {
    next(error);
  }
}

export async function deleteSubTask(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId!;
    
    const subTask = await subTaskRepo.findSubTaskById(id);
    if (!subTask) {
      throw new NotFoundError('SubTask', id);
    }
    
    // Verify task belongs to tenant
    const task = await taskRepo.findTaskByIdForTenant(tenantId, subTask.taskId);
    if (!task) {
      throw new NotFoundError('Task', subTask.taskId);
    }
    
    await subTaskRepo.deleteSubTask(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
