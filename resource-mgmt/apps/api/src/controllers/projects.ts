import { Request, Response, NextFunction } from 'express';
import * as projectRepo from '../repositories/projects.js';
import * as procurementRepo from '../repositories/procurements.js';
import * as projectUserRepo from '../repositories/projectUsers.js';
import * as userRepo from '../repositories/users.js';
import { NotFoundError, ConflictError, ValidationError } from '../lib/errors.js';
import { createPaginationResult } from '../lib/pagination.js';

export async function getProjects(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.tenantId!;
    const auth = req.auth!;
    const role = auth.role;
    
    let { data, total, page, pageSize } = await projectRepo.findProjects(
      tenantId,
      req.query as Record<string, string | undefined>
    );
    
    // If user is Contributor, filter to only projects they have access to
    if (role === 'Contributor') {
      const userProjects = await projectUserRepo.findUserProjects(auth.userId, tenantId);
      const userProjectIds = new Set(userProjects.map((p) => p.id));
      data = data.filter((project) => userProjectIds.has(project.id));
      total = data.length;
    }
    
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
    const auth = req.auth!;
    const role = auth.role;
    
    const project = await projectRepo.findProjectByIdForTenant(tenantId, id);
    if (!project) {
      throw new NotFoundError('Project', id);
    }
    
    // If user is Contributor, check if they have access to this project
    if (role === 'Contributor') {
      const hasAccess = await projectUserRepo.userHasProjectAccess(auth.userId, id);
      if (!hasAccess) {
        throw new ValidationError('You do not have access to this project');
      }
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
    
    // Verify company exists and belongs to tenant
    const { findCompanyByIdForTenant } = await import('../repositories/companies.js');
    const company = await findCompanyByIdForTenant(tenantId, data.companyId);
    if (!company) {
      throw new NotFoundError('Company', data.companyId);
    }
    
    // Prepare clean data object for Prisma
    const projectData: any = {
      companyId: data.companyId,
      name: data.name,
      description: data.description || null,
      status: data.status || 'Planned',
    };
    
    // Convert date strings to Date objects or null
    if (data.startDate && data.startDate !== '' && data.startDate !== null) {
      const startDate = new Date(data.startDate);
      if (!isNaN(startDate.getTime())) {
        projectData.startDate = startDate;
      } else {
        projectData.startDate = null;
      }
    } else {
      projectData.startDate = null;
    }
    
    if (data.targetEndDate && data.targetEndDate !== '' && data.targetEndDate !== null) {
      const targetEndDate = new Date(data.targetEndDate);
      if (!isNaN(targetEndDate.getTime())) {
        projectData.targetEndDate = targetEndDate;
      } else {
        projectData.targetEndDate = null;
      }
    } else {
      projectData.targetEndDate = null;
    }
    
    const project = await projectRepo.createProject(tenantId, projectData);
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

export async function getProjectExpenses(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId!;
    
    // Verify project exists and belongs to tenant
    const project = await projectRepo.findProjectByIdForTenant(tenantId, id);
    if (!project) {
      throw new NotFoundError('Project', id);
    }
    
    const expenses = await procurementRepo.findExpensesByProject(tenantId, id);
    res.json(expenses);
  } catch (error) {
    next(error);
  }
}

export async function getProjectUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId!;
    
    // Verify project exists and belongs to tenant
    const project = await projectRepo.findProjectByIdForTenant(tenantId, id);
    if (!project) {
      throw new NotFoundError('Project', id);
    }
    
    const users = await projectUserRepo.findProjectUsers(id);
    res.json(users);
  } catch (error) {
    next(error);
  }
}

export async function updateProjectUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId!;
    const { userIds } = req.body;
    
    // Verify project exists and belongs to tenant
    const project = await projectRepo.findProjectByIdForTenant(tenantId, id);
    if (!project) {
      throw new NotFoundError('Project', id);
    }
    
    // Validate all users belong to tenant and have Contributor role
    if (userIds && userIds.length > 0) {
      const allUsers = await userRepo.findUsers(tenantId);
      const validUserIds = new Set(allUsers.map((u) => u.id));
      
      for (const userId of userIds) {
        if (!validUserIds.has(userId)) {
          throw new ValidationError(`User ${userId} does not belong to this tenant`);
        }
        
        const user = allUsers.find((u) => u.id === userId);
        if (user && user.role !== 'Contributor') {
          throw new ValidationError(`User ${user.fullName} must have Contributor role`);
        }
      }
    }
    
    // Update project users
    await projectUserRepo.setProjectUsers(id, userIds || []);
    
    // Return updated list
    const users = await projectUserRepo.findProjectUsers(id);
    res.json(users);
  } catch (error) {
    next(error);
  }
}
