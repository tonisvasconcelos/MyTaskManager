import { Request, Response, NextFunction } from 'express';
import * as projectRepo from '../repositories/projects.js';
import { NotFoundError, ConflictError } from '../lib/errors.js';
import { createPaginationResult } from '../lib/pagination.js';

export async function getProjects(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.tenantId!;
    const { data, total, page, pageSize } = await projectRepo.findProjects(
      tenantId,
      req.query as Record<string, string | undefined>
    );
    const result = createPaginationResult(data, total, page, pageSize);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getProject(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId!;
    const project = await projectRepo.findProjectByIdForTenant(tenantId, id);
    if (!project) {
      throw new NotFoundError('Project', id);
    }
    res.json(project);
  } catch (error) {
    next(error);
  }
}

export async function createProject(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.tenantId!;
    const data = req.body;
    // Convert date strings to Date objects
    if (data.startDate && data.startDate !== '') {
      data.startDate = new Date(data.startDate);
    } else {
      data.startDate = null;
    }
    if (data.targetEndDate && data.targetEndDate !== '') {
      data.targetEndDate = new Date(data.targetEndDate);
    } else {
      data.targetEndDate = null;
    }
    
    const project = await projectRepo.createProject(tenantId, data);
    res.status(201).json(project);
  } catch (error) {
    next(error);
  }
}

export async function updateProject(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId!;
    const data = req.body;
    
    // Convert date strings to Date objects
    if (data.startDate !== undefined) {
      data.startDate = data.startDate && data.startDate !== '' ? new Date(data.startDate) : null;
    }
    if (data.targetEndDate !== undefined) {
      data.targetEndDate = data.targetEndDate && data.targetEndDate !== '' ? new Date(data.targetEndDate) : null;
    }
    
    const project = await projectRepo.findProjectByIdForTenant(tenantId, id);
    if (!project) {
      throw new NotFoundError('Project', id);
    }
    
    const updated = await projectRepo.updateProject(id, data);
    res.json(updated);
  } catch (error) {
    next(error);
  }
}

export async function deleteProject(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId!;
    const project = await projectRepo.findProjectByIdForTenant(tenantId, id);
    if (!project) {
      throw new NotFoundError('Project', id);
    }
    
    const hasTasks = await projectRepo.projectHasTasks(tenantId, id);
    if (hasTasks) {
      throw new ConflictError('Cannot delete project with associated tasks');
    }
    
    await projectRepo.deleteProject(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
