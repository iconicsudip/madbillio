"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

export type ClientInput = {
  name: string;
  email: string;
  address?: string;
  phone?: string;
};

export async function listClients() {
  const userId = await requireUserId();
  return prisma.client.findMany({
    where: { userId },
    orderBy: { name: "asc" },
  });
}

export async function listClientsWithStats() {
  const userId = await requireUserId();
  return prisma.client.findMany({
    where: { userId },
    include: {
      _count: { select: { projects: true, invoices: true } },
      invoices: { select: { total: true, amountPaid: true } },
    },
    orderBy: { name: "asc" },
  });
}

export async function getClient(id: string) {
  const userId = await requireUserId();
  const client = await prisma.client.findFirst({ where: { id, userId } });
  if (!client) redirect("/dashboard/clients");
  return client;
}

export async function createClient(input: ClientInput) {
  const userId = await requireUserId();
  const client = await prisma.client.create({
    data: {
      userId,
      name: input.name.trim(),
      email: input.email.trim(),
      address: input.address?.trim() ?? "",
      phone: input.phone?.trim() ?? "",
    },
  });
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/clients");
  return client;
}

export async function updateClient(id: string, input: ClientInput) {
  const userId = await requireUserId();
  await prisma.client.updateMany({
    where: { id, userId },
    data: {
      name: input.name.trim(),
      email: input.email.trim(),
      address: input.address?.trim() ?? "",
      phone: input.phone?.trim() ?? "",
    },
  });
  revalidatePath("/dashboard/clients");
}

export async function deleteClient(id: string) {
  const userId = await requireUserId();
  const invoiceCount = await prisma.invoice.count({
    where: { clientId: id, userId },
  });
  if (invoiceCount > 0) {
    throw new Error(
      "This client has existing invoices and can't be deleted."
    );
  }
  await prisma.client.deleteMany({ where: { id, userId } });
  revalidatePath("/dashboard/clients");
}
