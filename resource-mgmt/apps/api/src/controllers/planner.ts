import { Request, Response, NextFunction } from 'express';
import * as plannerRepo from '../repositories/planner.js';
import { NotFoundError, ValidationError } from '../lib/errors.js';

export async function getBlocks(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.tenantId!;
    const auth = req.auth!;
    const { start, end, userId, projectId, taskId, status } = req.query as Record<string, string | undefined>;

    // Contributors can only see their own blocks
    const effectiveUserId = auth.role === 'Contributor' ? auth.userId : userId;

    const blocks = await plannerRepo.findBlocks(tenantId, {
      start,
      end,
      userId: effectiveUserId,
      projectId,
      taskId,
      status: status as any,
    });

    res.json(blocks);
  } catch (error) {
    next(error);
  }
}

export async function createBlock(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.tenantId!;
    const auth = req.auth!;
    const role = auth.role;
    const data = req.body;

    // Determine userId: Contributors can only create for themselves
    const userId = data.userId && (role === 'Admin' || role === 'Manager') 
      ? data.userId 
      : auth.userId;

    // Validate project if provided
    if (data.projectId) {
      const { findProjectByIdForTenant } = await import('../repositories/projects.js');
      const project = await findProjectByIdForTenant(tenantId, data.projectId);
      if (!project) {
        throw new NotFoundError('Project', data.projectId);
      }
    }

    // Validate task if provided
    if (data.taskId) {
      const { findTaskByIdForTenant } = await import('../repositories/tasks.js');
      const task = await findTaskByIdForTenant(tenantId, data.taskId);
      if (!task) {
        throw new NotFoundError('Task', data.taskId);
      }

      // If both projectId and taskId are provided, ensure they match
      if (data.projectId && task.projectId !== data.projectId) {
        throw new ValidationError('Task does not belong to the specified project');
      }

      // Auto-set projectId from task if not provided
      if (!data.projectId) {
        data.projectId = task.projectId;
      }
    }

    // Validate user belongs to tenant
    const { findUserByIdForTenant } = await import('../repositories/users.js');
    const user = await findUserByIdForTenant(tenantId, userId);
    if (!user) {
      throw new NotFoundError('User', userId);
    }

    // Prepare data for creation
    const blockData = {
      userId,
      title: data.title,
      startAt: new Date(data.startAt),
      endAt: new Date(data.endAt),
      type: data.type || 'Planned',
      status: data.status || 'Planned',
      notes: data.notes || null,
      location: data.location || null,
      projectId: data.projectId || null,
      taskId: data.taskId || null,
    };

    const block = await plannerRepo.createBlock(tenantId, blockData);
    res.status(201).json(block);
  } catch (error) {
    next(error);
  }
}

export async function updateBlock(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId!;
    const auth = req.auth!;
    const role = auth.role;
    const data = req.body;

    // Find the block and verify it belongs to tenant
    const block = await plannerRepo.findBlockByIdForTenant(tenantId, id);
    if (!block) {
      throw new NotFoundError('WorkBlock', id);
    }

    // Contributors can only update their own blocks
    if (role === 'Contributor' && block.userId !== auth.userId) {
      throw new ValidationError('You can only update your own work blocks');
    }

    // Validate project if provided
    if (data.projectId) {
      const { findProjectByIdForTenant } = await import('../repositories/projects.js');
      const project = await findProjectByIdForTenant(tenantId, data.projectId);
      if (!project) {
        throw new NotFoundError('Project', data.projectId);
      }
    }

    // Validate task if provided
    if (data.taskId) {
      const { findTaskByIdForTenant } = await import('../repositories/tasks.js');
      const task = await findTaskByIdForTenant(tenantId, data.taskId);
      if (!task) {
        throw new NotFoundError('Task', data.taskId);
      }

      // If both projectId and taskId are provided, ensure they match
      if (data.projectId && task.projectId !== data.projectId) {
        throw new ValidationError('Task does not belong to the specified project');
      }
    }

    // Prepare update data
    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.startAt !== undefined) updateData.startAt = new Date(data.startAt);
    if (data.endAt !== undefined) updateData.endAt = new Date(data.endAt);
    if (data.type !== undefined) updateData.type = data.type;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.notes !== undefined) updateData.notes = data.notes || null;
    if (data.location !== undefined) updateData.location = data.location || null;
    if (data.projectId !== undefined) {
      updateData.project = data.projectId 
        ? { connect: { id: data.projectId } }
        : { disconnect: true };
    }
    if (data.taskId !== undefined) {
      updateData.task = data.taskId
        ? { connect: { id: data.taskId } }
        : { disconnect: true };
    }

    // Only allow userId change for Admin/Manager
    if (data.userId && (role === 'Admin' || role === 'Manager')) {
      const { findUserByIdForTenant } = await import('../repositories/users.js');
      const user = await findUserByIdForTenant(tenantId, data.userId);
      if (!user) {
        throw new NotFoundError('User', data.userId);
      }
      updateData.user = { connect: { id: data.userId } };
    }

    const updated = await plannerRepo.updateBlock(id, updateData);
    res.json(updated);
  } catch (error) {
    next(error);
  }
}

export async function deleteBlock(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId!;
    const auth = req.auth!;
    const role = auth.role;

    // Find the block and verify it belongs to tenant
    const block = await plannerRepo.findBlockByIdForTenant(tenantId, id);
    if (!block) {
      throw new NotFoundError('WorkBlock', id);
    }

    // Contributors can only delete their own blocks
    if (role === 'Contributor' && block.userId !== auth.userId) {
      throw new ValidationError('You can only delete your own work blocks');
    }

    await plannerRepo.deleteBlock(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function getLookups(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.tenantId!;
    const { projectId } = req.query as Record<string, string | undefined>;

    const lookups = await plannerRepo.getLookups(tenantId, projectId);
    res.json(lookups);
  } catch (error) {
    next(error);
  }
}
