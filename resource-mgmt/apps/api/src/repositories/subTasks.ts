import prisma from '../lib/prisma.js';
import type { SubTask, Prisma } from '@prisma/client';

export async function findSubTasksByTaskId(taskId: string): Promise<SubTask[]> {
  return prisma.subTask.findMany({
    where: { taskId },
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
  });
}

export async function findSubTaskById(id: string): Promise<SubTask | null> {
  return prisma.subTask.findUnique({
    where: { id },
  });
}

export async function createSubTask(
  taskId: string,
  data: Omit<Prisma.SubTaskCreateInput, 'task'> & { order?: number }
): Promise<SubTask> {
  // Get the max order for this task to set default order
  const maxOrder = await prisma.subTask.findFirst({
    where: { taskId },
    orderBy: { order: 'desc' },
    select: { order: true },
  });

  const order = data.order !== undefined ? data.order : (maxOrder?.order ?? -1) + 1;

  return prisma.subTask.create({
    data: {
      title: data.title,
      completed: data.completed ?? false,
      order,
      task: { connect: { id: taskId } },
    },
  });
}

export async function updateSubTask(
  id: string,
  data: Prisma.SubTaskUpdateInput
): Promise<SubTask> {
  return prisma.subTask.update({
    where: { id },
    data,
  });
}

export async function deleteSubTask(id: string): Promise<SubTask> {
  return prisma.subTask.delete({
    where: { id },
  });
}

export async function reorderSubTasks(
  _taskId: string,
  subTaskIds: string[]
): Promise<void> {
  // Update order for all sub-tasks in the provided order
  await Promise.all(
    subTaskIds.map((subTaskId, index) =>
      prisma.subTask.update({
        where: { id: subTaskId },
        data: { order: index },
      })
    )
  );
}
