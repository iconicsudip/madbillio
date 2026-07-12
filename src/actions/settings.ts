"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

export type BusinessProfileInput = {
  businessName: string;
  address: string;
  phone: string;
  email: string;
  logoUrl?: string | null;
  bankName: string;
  bankAccountNumber: string;
  wiseEmail: string;
  defaultCurrency: string;
  defaultTaxRate: number;
  invoiceNotes: string;
};

export async function updateBusinessProfile(input: BusinessProfileInput) {
  const userId = await requireUserId();
  await prisma.businessProfile.upsert({
    where: { userId },
    create: { userId, ...input },
    update: { ...input },
  });
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/invoices/new");
  revalidatePath("/dashboard/invoices");
}
