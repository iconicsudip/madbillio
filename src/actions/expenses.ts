"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

export type ExpenseInput = {
  category: string;
  description?: string;
  amount: number;
  date: string;
  projectId?: string | null;
};

export async function listExpenses() {
  const userId = await requireUserId();
  return prisma.expense.findMany({
    where: { userId },
    include: { project: true },
    orderBy: { date: "desc" },
  });
}

export async function createExpense(input: ExpenseInput) {
  const userId = await requireUserId();
  await prisma.expense.create({
    data: {
      userId,
      category: input.category,
      description: input.description ?? "",
      amount: input.amount,
      date: new Date(input.date),
      projectId: input.projectId || null,
    },
  });
  revalidatePath("/dashboard/pnl");
  revalidatePath("/dashboard/analytics");
  revalidatePath("/dashboard");
}

export async function updateExpense(id: string, input: ExpenseInput) {
  const userId = await requireUserId();
  await prisma.expense.updateMany({
    where: { id, userId },
    data: {
      category: input.category,
      description: input.description ?? "",
      amount: input.amount,
      date: new Date(input.date),
      projectId: input.projectId || null,
    },
  });
  revalidatePath("/dashboard/pnl");
  revalidatePath("/dashboard/analytics");
  revalidatePath("/dashboard");
}

export async function deleteExpense(id: string) {
  const userId = await requireUserId();
  await prisma.expense.deleteMany({ where: { id, userId } });
  revalidatePath("/dashboard/pnl");
  revalidatePath("/dashboard/analytics");
  revalidatePath("/dashboard");
}
