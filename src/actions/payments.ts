"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import type { PaymentMethod } from "@/generated/prisma/client";

export type PaymentInput = {
  invoiceId: string;
  amount: number;
  method: PaymentMethod;
  paidAt: string;
  reference?: string;
  notes?: string;
};

async function recalculateInvoice(invoiceId: string) {
  const invoice = await prisma.invoice.findUniqueOrThrow({
    where: { id: invoiceId },
    include: { payments: true },
  });
  const amountPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
  const amountDue = Math.max(invoice.total - amountPaid, 0);
  const isOverdue =
    amountDue > 0 &&
    invoice.dueDate < new Date() &&
    invoice.status !== "DRAFT" &&
    invoice.status !== "CANCELLED";

  const status =
    amountDue <= 0 && invoice.total > 0
      ? "PAID"
      : amountPaid > 0
        ? "PARTIALLY_PAID"
        : isOverdue
          ? "OVERDUE"
          : invoice.status === "DRAFT"
            ? "DRAFT"
            : "SENT";

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { amountPaid, amountDue, status },
  });
}

export async function listPayments() {
  const userId = await requireUserId();
  return prisma.payment.findMany({
    where: { userId },
    include: { invoice: { include: { client: true } } },
    orderBy: { paidAt: "desc" },
  });
}

export async function recordPayment(input: PaymentInput) {
  const userId = await requireUserId();
  const invoice = await prisma.invoice.findFirst({
    where: { id: input.invoiceId, userId },
  });
  if (!invoice) throw new Error("Invoice not found");

  await prisma.payment.create({
    data: {
      userId,
      invoiceId: input.invoiceId,
      amount: input.amount,
      method: input.method,
      paidAt: new Date(input.paidAt),
      reference: input.reference ?? "",
      notes: input.notes ?? "",
    },
  });

  await recalculateInvoice(input.invoiceId);

  revalidatePath("/dashboard/payments");
  revalidatePath("/dashboard/invoices");
  revalidatePath(`/dashboard/invoices/${input.invoiceId}`);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/analytics");
  revalidatePath("/dashboard/pnl");
}

export async function deletePayment(id: string) {
  const userId = await requireUserId();
  const payment = await prisma.payment.findFirst({ where: { id, userId } });
  if (!payment) return;

  await prisma.payment.delete({ where: { id } });
  await recalculateInvoice(payment.invoiceId);

  revalidatePath("/dashboard/payments");
  revalidatePath("/dashboard/invoices");
  revalidatePath(`/dashboard/invoices/${payment.invoiceId}`);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/analytics");
  revalidatePath("/dashboard/pnl");
}
