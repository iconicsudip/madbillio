"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import type { ProjectStatus } from "@prisma/client";

export type ProjectDocumentInput = {
  id?: string;
  name: string;
  url: string;
  fileType?: string;
};

export type ProjectInput = {
  name: string;
  description?: string;
  clientId?: string | null;
  status: ProjectStatus;
  budget: number;
  startDate: string;
  endDate?: string | null;
  documents?: ProjectDocumentInput[];
};

export async function listProjects() {
  const userId = await requireUserId();
  const projects = await prisma.project.findMany({
    where: { userId },
    include: {
      client: true,
      documents: true,
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
      documents: { orderBy: { createdAt: "desc" } },
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
  const docsToCreate = (input.documents ?? []).filter(
    (d) => d.name.trim() && d.url.trim()
  );

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
      documents:
        docsToCreate.length > 0
          ? {
              create: docsToCreate.map((doc) => ({
                name: doc.name.trim(),
                url: doc.url.trim(),
                fileType: doc.fileType ?? "DOCUMENT",
              })),
            }
          : undefined,
    },
  });

  if (docsToCreate.length > 0) {
    const { syncProjectDocumentToFolder } = await import("./folders");
    for (const doc of docsToCreate) {
      await syncProjectDocumentToFolder({
        projectId: project.id,
        projectName: project.name,
        docName: doc.name,
        url: doc.url,
        fileType: doc.fileType,
      });
    }
  }

  revalidatePath("/dashboard/projects");
  return project;
}

export async function updateProject(id: string, input: ProjectInput) {
  const userId = await requireUserId();
  // Verify ownership
  const existing = await prisma.project.findFirst({ where: { id, userId } });
  if (!existing) throw new Error("Project not found");

  const docsToCreate = (input.documents ?? []).filter(
    (d) => d.name.trim() && d.url.trim()
  );

  await prisma.$transaction([
    prisma.project.update({
      where: { id },
      data: {
        name: input.name.trim(),
        description: input.description?.trim() ?? "",
        clientId: input.clientId || null,
        status: input.status,
        budget: input.budget,
        startDate: new Date(input.startDate),
        endDate: input.endDate ? new Date(input.endDate) : null,
      },
    }),
    prisma.projectDocument.deleteMany({ where: { projectId: id } }),
    ...(docsToCreate.length > 0
      ? [
          prisma.projectDocument.createMany({
            data: docsToCreate.map((doc) => ({
              projectId: id,
              name: doc.name.trim(),
              url: doc.url.trim(),
              fileType: doc.fileType ?? "DOCUMENT",
            })),
          }),
        ]
      : []),
  ]);

  if (docsToCreate.length > 0) {
    const { syncProjectDocumentToFolder } = await import("./folders");
    for (const doc of docsToCreate) {
      await syncProjectDocumentToFolder({
        projectId: id,
        projectName: input.name.trim(),
        docName: doc.name,
        url: doc.url,
        fileType: doc.fileType,
      });
    }
  }

  revalidatePath("/dashboard/projects");
  revalidatePath(`/dashboard/projects/${id}`);
}

export async function deleteProject(id: string) {
  const userId = await requireUserId();
  await prisma.project.deleteMany({ where: { id, userId } });
  revalidatePath("/dashboard/projects");
}

export async function addProjectDocument(
  projectId: string,
  doc: { name: string; url: string; fileType?: string }
) {
  const userId = await requireUserId();
  const project = await prisma.project.findFirst({ where: { id: projectId, userId } });
  if (!project) throw new Error("Project not found");

  const created = await prisma.projectDocument.create({
    data: {
      projectId,
      name: doc.name.trim(),
      url: doc.url.trim(),
      fileType: doc.fileType ?? "DOCUMENT",
    },
  });
  revalidatePath(`/dashboard/projects/${projectId}`);
  return created;
}

export async function deleteProjectDocument(documentId: string, projectId: string) {
  const userId = await requireUserId();
  const project = await prisma.project.findFirst({ where: { id: projectId, userId } });
  if (!project) throw new Error("Project not found");

  await prisma.projectDocument.delete({ where: { id: documentId } });
  revalidatePath(`/dashboard/projects/${projectId}`);
}
