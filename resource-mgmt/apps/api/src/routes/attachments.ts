import { Router } from 'express';
import * as attachmentsController from '../controllers/attachments.js';
import { z } from 'zod';
import { validateRequest } from '../middlewares/validateRequest.js';

export const attachmentsRouter = Router();

const getTaskAttachmentsSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

const deleteAttachmentSchema = z.object({
  params: z.object({
    attachmentId: z.string().uuid(),
  }),
});

attachmentsRouter.post(
  '/tasks/:id/attachments',
  attachmentsController.uploadAttachments
);
attachmentsRouter.get(
  '/tasks/:id/attachments',
  validateRequest(getTaskAttachmentsSchema),
  attachmentsController.getAttachments
);
attachmentsRouter.delete(
  '/attachments/:attachmentId',
  validateRequest(deleteAttachmentSchema),
  attachmentsController.deleteAttachment
);
