"use server";

import { revalidatePath } from "next/cache";
import { prisma, safePrismaQuery } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { uploadToS3 } from "@/lib/s3";

export type FolderItemInput = {
  name: string;
  folderPath?: string;
  url?: string;
  fileType?: string;
  sizeBytes?: number;
  projectId?: string | null;
  isFolder?: boolean;
};

export async function listFolderItems(options?: {
  path?: string;
  search?: string;
}) {
  const userId = await requireUserId();
  const folderPath = options?.path || "/";
  const search = options?.search?.trim()?.toLowerCase();

  return safePrismaQuery(async () => {
    const where: any = { userId };

    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    } else {
      where.folderPath = folderPath;
    }

    const items = await prisma.fileStorageItem.findMany({
      where,
      include: { project: true },
      orderBy: [{ isFolder: "desc" }, { name: "asc" }],
    });

    return items;
  });
}

export async function createFolder(input: {
  name: string;
  parentPath?: string;
  projectId?: string | null;
}) {
  const userId = await requireUserId();
  const name = input.name.trim();
  const parentPath = input.parentPath || "/";

  return safePrismaQuery(async () => {
    const folder = await prisma.fileStorageItem.create({
      data: {
        userId,
        name,
        isFolder: true,
        folderPath: parentPath,
        projectId: input.projectId || null,
        fileType: "FOLDER",
        sizeBytes: 0,
      },
    });

    revalidatePath("/dashboard/folders");
    return folder;
  });
}

export async function uploadFileToFolder(input: FolderItemInput) {
  const userId = await requireUserId();
  const folderPath = input.folderPath || "/";
  let finalUrl = input.url || null;

  if (finalUrl && finalUrl.startsWith("data:")) {
    try {
      finalUrl = await uploadToS3({
        fileName: input.name,
        fileData: finalUrl,
        contentType: input.fileType || "application/octet-stream",
      });
    } catch (err) {
      console.warn("S3 Upload fallback for folder item:", err);
    }
  }

  return safePrismaQuery(async () => {
    const file = await prisma.fileStorageItem.create({
      data: {
        userId,
        name: input.name.trim(),
        isFolder: false,
        folderPath,
        url: finalUrl,
        fileType: input.fileType || "FILE",
        sizeBytes: input.sizeBytes || 1024 * 50,
        projectId: input.projectId || null,
      },
    });

    revalidatePath("/dashboard/folders");
    return file;
  });
}

export async function batchUploadFilesToFolder(
  files: Array<{ name: string; url: string; fileType?: string; sizeBytes?: number }>,
  folderPath: string = "/"
) {
  const userId = await requireUserId();

  return safePrismaQuery(async () => {
    const createdFiles = [];
    for (const f of files) {
      let finalUrl = f.url || null;

      if (finalUrl && finalUrl.startsWith("data:")) {
        try {
          finalUrl = await uploadToS3({
            fileName: f.name,
            fileData: finalUrl,
            contentType: f.fileType || "application/octet-stream",
          });
        } catch (err) {
          console.warn("S3 Upload fallback for batch folder item:", err);
        }
      }

      const file = await prisma.fileStorageItem.create({
        data: {
          userId,
          name: f.name.trim(),
          isFolder: false,
          folderPath,
          url: finalUrl,
          fileType: f.fileType || "FILE",
          sizeBytes: f.sizeBytes || 1024 * 50,
        },
      });
      createdFiles.push(file);
    }

    revalidatePath("/dashboard/folders");
    return createdFiles;
  });
}

export async function renameFolderItem(id: string, newName: string) {
  const userId = await requireUserId();
  const cleanName = newName.trim();
  if (!cleanName) throw new Error("Name cannot be empty");

  return safePrismaQuery(async () => {
    const item = await prisma.fileStorageItem.findFirst({ where: { id, userId } });
    if (!item) throw new Error("Item not found");

    const oldName = item.name;

    // Update item name
    const updated = await prisma.fileStorageItem.update({
      where: { id },
      data: { name: cleanName },
    });

    // If it's a folder, update sub-items folder paths
    if (item.isFolder) {
      const oldFolderPath = item.folderPath === "/" ? `/${oldName}` : `${item.folderPath}/${oldName}`;
      const newFolderPath = item.folderPath === "/" ? `/${cleanName}` : `${item.folderPath}/${cleanName}`;

      const subItems = await prisma.fileStorageItem.findMany({
        where: { userId, folderPath: { startsWith: oldFolderPath } },
      });

      for (const sub of subItems) {
        const updatedPath = sub.folderPath.replace(oldFolderPath, newFolderPath);
        await prisma.fileStorageItem.update({
          where: { id: sub.id },
          data: { folderPath: updatedPath },
        });
      }
    }

    revalidatePath("/dashboard/folders");
    return updated;
  });
}

export async function deleteFolderItem(id: string) {
  const userId = await requireUserId();

  return safePrismaQuery(async () => {
    const item = await prisma.fileStorageItem.findFirst({ where: { id, userId } });
    if (!item) return;

    if (item.isFolder) {
      const folderPath = item.folderPath === "/" ? `/${item.name}` : `${item.folderPath}/${item.name}`;
      await prisma.fileStorageItem.deleteMany({
        where: { userId, folderPath: { startsWith: folderPath } },
      });
    }

    await prisma.fileStorageItem.delete({ where: { id } });
    revalidatePath("/dashboard/folders");
  });
}

export async function syncProjectDocumentToFolder(input: {
  projectId: string;
  projectName: string;
  docName: string;
  url: string;
  fileType?: string;
}) {
  const userId = await requireUserId();
  const projectFolderName = input.projectName.trim() || "Uncategorized Project";
  const targetPath = `/Projects/${projectFolderName}`;

  return safePrismaQuery(async () => {
    let projectsParent = await prisma.fileStorageItem.findFirst({
      where: { userId, name: "Projects", folderPath: "/", isFolder: true },
    });
    if (!projectsParent) {
      projectsParent = await prisma.fileStorageItem.create({
        data: {
          userId,
          name: "Projects",
          isFolder: true,
          folderPath: "/",
          fileType: "FOLDER",
        },
      });
    }

    let projectFolder = await prisma.fileStorageItem.findFirst({
      where: { userId, name: projectFolderName, folderPath: "/Projects", isFolder: true },
    });
    if (!projectFolder) {
      projectFolder = await prisma.fileStorageItem.create({
        data: {
          userId,
          name: projectFolderName,
          isFolder: true,
          folderPath: "/Projects",
          projectId: input.projectId,
          fileType: "FOLDER",
        },
      });
    }

    let finalUrl = input.url;
    if (finalUrl && finalUrl.startsWith("data:")) {
      try {
        finalUrl = await uploadToS3({
          fileName: input.docName,
          fileData: finalUrl,
          contentType: input.fileType || "application/octet-stream",
        });
      } catch (err) {
        console.warn("S3 Upload fallback for project doc sync:", err);
      }
    }

    const existingFile = await prisma.fileStorageItem.findFirst({
      where: { userId, name: input.docName.trim(), folderPath: targetPath },
    });

    if (!existingFile) {
      await prisma.fileStorageItem.create({
        data: {
          userId,
          name: input.docName.trim(),
          isFolder: false,
          folderPath: targetPath,
          url: finalUrl,
          fileType: input.fileType || "DOCUMENT",
          sizeBytes: 1024 * 128,
          projectId: input.projectId,
        },
      });
    }

    revalidatePath("/dashboard/folders");
  });
}
