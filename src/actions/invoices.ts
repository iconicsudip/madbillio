"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { generateInvoiceNumber } from "@/lib/invoice-number";
import type { InvoiceStatus } from "@prisma/client";

export type InvoiceItemInput = {
  name: string;
  quantity: number;
  unit: string;
  cost: number;
};

export type InvoiceInput = {
  clientId: string;
  projectId?: string | null;
  invoiceNumber?: string;
  currency: string;
  issuedDate: string;
  dueDate: string;
  taxRate: number;
  notes: string;
  items: InvoiceItemInput[];
};

function computeTotals(items: InvoiceItemInput[], taxRate: number) {
  const subtotal = items.reduce(
    (sum, item) => sum + item.quantity * item.cost,
    0
  );
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;
  return { subtotal, taxAmount, total };
}

export async function listInvoices() {
  const userId = await requireUserId();
  return prisma.invoice.findMany({
    where: { userId },
    include: { client: true, project: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getInvoice(id: string) {
  const userId = await requireUserId();
  const invoice = await prisma.invoice.findFirst({
    where: { id, userId },
    include: {
      client: true,
      project: true,
      items: { orderBy: { sortOrder: "asc" } },
      payments: { orderBy: { paidAt: "desc" } },
    },
  });
  if (!invoice) redirect("/dashboard/invoices");
  return invoice;
}

export async function createInvoice(
  input: InvoiceInput,
  status: InvoiceStatus = "DRAFT"
) {
  const userId = await requireUserId();
  const { subtotal, taxAmount, total } = computeTotals(
    input.items,
    input.taxRate
  );

  const invoiceNumber = input.invoiceNumber?.trim() || generateInvoiceNumber();

  const invoice = await prisma.invoice.create({
    data: {
      userId,
      clientId: input.clientId,
      projectId: input.projectId || null,
      invoiceNumber,
      currency: input.currency,
      status,
      issuedDate: new Date(input.issuedDate),
      dueDate: new Date(input.dueDate),
      taxRate: input.taxRate,
      subtotal,
      taxAmount,
      total,
      amountPaid: 0,
      amountDue: total,
      notes: input.notes,
      items: {
        create: input.items.map((item, index) => ({
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          cost: item.cost,
          amount: item.quantity * item.cost,
          sortOrder: index,
        })),
      },
    },
  });

  revalidatePath("/dashboard/invoices");
  revalidatePath("/dashboard");
  return invoice;
}

export async function updateInvoice(id: string, input: InvoiceInput) {
  const userId = await requireUserId();
  const existing = await prisma.invoice.findFirst({ where: { id, userId } });
  if (!existing) redirect("/dashboard/invoices");

  const { subtotal, taxAmount, total } = computeTotals(
    input.items,
    input.taxRate
  );
  const amountDue = Math.max(total - existing.amountPaid, 0);
  const status: InvoiceStatus =
    existing.amountPaid >= total && total > 0
      ? "PAID"
      : existing.amountPaid > 0
        ? "PARTIALLY_PAID"
        : existing.status === "DRAFT"
          ? "DRAFT"
          : existing.status;

  await prisma.$transaction([
    prisma.invoiceItem.deleteMany({ where: { invoiceId: id } }),
    prisma.invoice.update({
      where: { id },
      data: {
        clientId: input.clientId,
        projectId: input.projectId || null,
        invoiceNumber: input.invoiceNumber?.trim() || existing.invoiceNumber,
        currency: input.currency,
        issuedDate: new Date(input.issuedDate),
        dueDate: new Date(input.dueDate),
        taxRate: input.taxRate,
        subtotal,
        taxAmount,
        total,
        amountDue,
        status,
        notes: input.notes,
        items: {
          create: input.items.map((item, index) => ({
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            cost: item.cost,
            amount: item.quantity * item.cost,
            sortOrder: index,
          })),
        },
      },
    }),
  ]);

  revalidatePath("/dashboard/invoices");
  revalidatePath(`/dashboard/invoices/${id}`);
  revalidatePath("/dashboard");
}

export async function setInvoiceStatus(id: string, status: InvoiceStatus) {
  const userId = await requireUserId();
  await prisma.invoice.updateMany({ where: { id, userId }, data: { status } });
  revalidatePath("/dashboard/invoices");
  revalidatePath(`/dashboard/invoices/${id}`);
  revalidatePath("/dashboard");
}

export async function deleteInvoice(id: string) {
  const userId = await requireUserId();
  await prisma.invoice.deleteMany({ where: { id, userId } });
  revalidatePath("/dashboard/invoices");
  revalidatePath("/dashboard");
}
