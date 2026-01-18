import { Request, Response, NextFunction } from 'express';
import * as attachmentRepo from '../repositories/attachments.js';
import * as taskRepo from '../repositories/tasks.js';
import { NotFoundError } from '../lib/errors.js';
import { upload } from '../middlewares/upload.js';
import path from 'path';
import fs from 'fs';

export const uploadAttachments = [
  upload.array('files', 10), // Max 10 files
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id: taskId } = req.params;
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'No files uploaded',
          },
        });
        return;
      }

      // Verify task exists
      const tenantId = req.tenantId!;
      const task = await taskRepo.findTaskByIdForTenant(tenantId, taskId);
      if (!task) {
        throw new NotFoundError('Task', taskId);
      }

      const baseUrl = process.env.BASE_URL || 'http://localhost:4000';

      const attachments = await Promise.all(
        files.map(async (file) => {
          const url = `${baseUrl}/uploads/${file.filename}`;
          return attachmentRepo.createAttachment({
            task: { connect: { id: taskId } },
            fileName: file.filename,
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            url,
          });
        })
      );

      res.status(201).json(attachments);
    } catch (error) {
      next(error);
    }
  },
];

export async function getAttachments(req: Request, res: Response, next: NextFunction) {
  try {
    const { id: taskId } = req.params;
    const tenantId = req.tenantId!;
    const task = await taskRepo.findTaskByIdForTenant(tenantId, taskId);
    if (!task) {
      throw new NotFoundError('Task', taskId);
    }

    const attachments = await attachmentRepo.findAttachmentsByTaskId(taskId);
    res.json(attachments);
  } catch (error) {
    next(error);
  }
}

export async function deleteAttachment(req: Request, res: Response, next: NextFunction) {
  try {
    const { attachmentId } = req.params;
    const attachment = await attachmentRepo.findAttachmentById(attachmentId);
    if (!attachment) {
      throw new NotFoundError('Attachment', attachmentId);
    }

    // Delete file from filesystem (best effort)
    const uploadDir = process.env.UPLOAD_DIR || 'uploads';
    const filePath = path.resolve(process.cwd(), uploadDir, attachment.fileName);
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (fileError) {
      console.error('Error deleting file:', fileError);
      // Continue with DB deletion even if file deletion fails
    }

    await attachmentRepo.deleteAttachment(attachmentId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
