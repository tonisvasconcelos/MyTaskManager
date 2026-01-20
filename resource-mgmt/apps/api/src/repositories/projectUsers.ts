import prisma from '../lib/prisma.js';
import type { User, Project } from '@prisma/client';

export interface ProjectUserWithUser extends User {
  projectUser: {
    id: string;
    createdAt: string;
    updatedAt: string;
  };
}

export async function findProjectUsers(projectId: string): Promise<User[]> {
  const projectUsers = await prisma.projectUser.findMany({
    where: { projectId },
    include: {
      user: true,
    },
  });

  return projectUsers.map((pu) => pu.user);
}

export async function findUserProjects(userId: string, tenantId: string): Promise<Project[]> {
  const projectUsers = await prisma.projectUser.findMany({
    where: {
      user: {
        id: userId,
        tenantId,
      },
    },
    include: {
      project: true,
    },
  });

  return projectUsers.map((pu) => pu.project);
}

export async function addProjectUser(projectId: string, userId: string): Promise<void> {
  await prisma.projectUser.create({
    data: {
      projectId,
      userId,
    },
  });
}

export async function removeProjectUser(projectId: string, userId: string): Promise<void> {
  await prisma.projectUser.deleteMany({
    where: {
      projectId,
      userId,
    },
  });
}

export async function setProjectUsers(projectId: string, userIds: string[]): Promise<void> {
  // Use a transaction to ensure atomicity
  await prisma.$transaction(async (tx) => {
    // Delete all existing project users
    await tx.projectUser.deleteMany({
      where: { projectId },
    });

    // Create new project users
    if (userIds.length > 0) {
      await tx.projectUser.createMany({
        data: userIds.map((userId) => ({
          projectId,
          userId,
        })),
      });
    }
  });
}

export async function userHasProjectAccess(userId: string, projectId: string): Promise<boolean> {
  const count = await prisma.projectUser.count({
    where: {
      projectId,
      userId,
    },
  });

  return count > 0;
}
