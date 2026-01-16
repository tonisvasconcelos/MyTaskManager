import { Request, Response, NextFunction } from 'express';
import * as timesheetRepo from '../repositories/timesheet.js';
import { NotFoundError, ValidationError } from '../lib/errors.js';

export async function getTimesheet(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.tenantId!;
    const { userId, from, to } = req.query;

    // Validate date format if provided
    if (from && typeof from === 'string' && !/^\d{4}-\d{2}-\d{2}$/.test(from)) {
      throw new ValidationError('Invalid from date format. Use YYYY-MM-DD');
    }
    if (to && typeof to === 'string' && !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      throw new ValidationError('Invalid to date format. Use YYYY-MM-DD');
    }

    const summary = await timesheetRepo.getTimesheetSummary(
      tenantId,
      userId as string | undefined,
      from as string | undefined,
      to as string | undefined
    );

    res.json(summary);
  } catch (error) {
    next(error);
  }
}

export async function getTimeEntry(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId!;
    const timeEntry = await timesheetRepo.findTimeEntryByIdForTenant(tenantId, id);
    if (!timeEntry) {
      throw new NotFoundError('Time entry', id);
    }
    res.json(timeEntry);
  } catch (error) {
    next(error);
  }
}

export async function createTimeEntry(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.tenantId!;
    const data = req.body;
    
    // Validate hours
    if (data.hours <= 0) {
      throw new ValidationError('Hours must be greater than 0');
    }
    if (data.hours > 24) {
      throw new ValidationError('Hours cannot exceed 24');
    }

    // Convert entryDate string to Date
    const entryDate = new Date(data.entryDate);
    if (isNaN(entryDate.getTime())) {
      throw new ValidationError('Invalid entry date');
    }

    const timeEntry = await timesheetRepo.createTimeEntry(tenantId, {
      task: { connect: { id: data.taskId } },
      user: { connect: { id: data.userId } },
      entryDate,
      hours: data.hours.toString(),
      notes: data.notes || null,
    });

    res.status(201).json(timeEntry);
  } catch (error) {
    next(error);
  }
}

export async function updateTimeEntry(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId!;
    const data = req.body;

    const timeEntry = await timesheetRepo.findTimeEntryByIdForTenant(tenantId, id);
    if (!timeEntry) {
      throw new NotFoundError('Time entry', id);
    }

    // Validate hours if provided
    if (data.hours !== undefined) {
      if (data.hours <= 0) {
        throw new ValidationError('Hours must be greater than 0');
      }
      if (data.hours > 24) {
        throw new ValidationError('Hours cannot exceed 24');
      }
      data.hours = data.hours.toString();
    }

    // Convert entryDate string to Date if provided
    if (data.entryDate) {
      const entryDate = new Date(data.entryDate);
      if (isNaN(entryDate.getTime())) {
        throw new ValidationError('Invalid entry date');
      }
      data.entryDate = entryDate;
    }

    const updateData: any = {};
    if (data.taskId) updateData.task = { connect: { id: data.taskId } };
    if (data.userId) updateData.user = { connect: { id: data.userId } };
    if (data.entryDate) updateData.entryDate = data.entryDate;
    if (data.hours) updateData.hours = data.hours;
    if (data.notes !== undefined) updateData.notes = data.notes || null;

    const updated = await timesheetRepo.updateTimeEntry(id, updateData);
    res.json(updated);
  } catch (error) {
    next(error);
  }
}

export async function deleteTimeEntry(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId!;
    const timeEntry = await timesheetRepo.findTimeEntryByIdForTenant(tenantId, id);
    if (!timeEntry) {
      throw new NotFoundError('Time entry', id);
    }

    await timesheetRepo.deleteTimeEntry(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
