"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import type { PaymentDetailType } from "@/generated/prisma/client";

export type PaymentDetailInput = {
  label: string;
  type: PaymentDetailType;
  details: string;
  imageUrl?: string | null;
};

export async function listPaymentDetails() {
  const userId = await requireUserId();
  return prisma.paymentDetail.findMany({
    where: { userId },
    orderBy: { sortOrder: "asc" },
  });
}

export async function createPaymentDetail(input: PaymentDetailInput) {
  const userId = await requireUserId();
  const count = await prisma.paymentDetail.count({ where: { userId } });
  await prisma.paymentDetail.create({
    data: {
      userId,
      label: input.label.trim(),
      type: input.type,
      details: input.details.trim(),
      imageUrl: input.imageUrl || null,
      sortOrder: count,
    },
  });
  revalidatePath("/dashboard/settings");
}

export async function updatePaymentDetail(
  id: string,
  input: PaymentDetailInput
) {
  const userId = await requireUserId();
  await prisma.paymentDetail.updateMany({
    where: { id, userId },
    data: {
      label: input.label.trim(),
      type: input.type,
      details: input.details.trim(),
      imageUrl: input.imageUrl || null,
    },
  });
  revalidatePath("/dashboard/settings");
}

export async function deletePaymentDetail(id: string) {
  const userId = await requireUserId();
  await prisma.paymentDetail.deleteMany({ where: { id, userId } });
  revalidatePath("/dashboard/settings");
}
