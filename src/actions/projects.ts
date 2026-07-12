"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import type { ProjectStatus } from "@prisma/client";

export type ProjectInput = {
  name: string;
  description?: string;
  clientId?: string | null;
  status: ProjectStatus;
  budget: number;
  startDate: string;
  endDate?: string | null;
};

export async function listProjects() {
  const userId = await requireUserId();
  const projects = await prisma.project.findMany({
    where: { userId },
    include: {
      client: true,
      invoices: { select: { total: true, amountPaid: true, status: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return projects;
}

export async function getProject(id: string) {
  const userId = await requireUserId();
  const project = await prisma.project.findFirst({
    where: { id, userId },
    include: {
      client: true,
      invoices: {
        include: { client: true },
        orderBy: { createdAt: "desc" },
      },
      expenses: { orderBy: { date: "desc" } },
    },
  });
  if (!project) redirect("/dashboard/projects");
  return project;
}

export async function createProject(input: ProjectInput) {
  const userId = await requireUserId();
  const project = await prisma.project.create({
    data: {
      userId,
      name: input.name.trim(),
      description: input.description?.trim() ?? "",
      clientId: input.clientId || null,
      status: input.status,
      budget: input.budget,
      startDate: new Date(input.startDate),
      endDate: input.endDate ? new Date(input.endDate) : null,
    },
  });
  revalidatePath("/dashboard/projects");
  return project;
}

export async function updateProject(id: string, input: ProjectInput) {
  const userId = await requireUserId();
  await prisma.project.updateMany({
    where: { id, userId },
    data: {
      name: input.name.trim(),
      description: input.description?.trim() ?? "",
      clientId: input.clientId || null,
      status: input.status,
      budget: input.budget,
      startDate: new Date(input.startDate),
      endDate: input.endDate ? new Date(input.endDate) : null,
    },
  });
  revalidatePath("/dashboard/projects");
  revalidatePath(`/dashboard/projects/${id}`);
}

export async function deleteProject(id: string) {
  const userId = await requireUserId();
  await prisma.project.deleteMany({ where: { id, userId } });
  revalidatePath("/dashboard/projects");
}
