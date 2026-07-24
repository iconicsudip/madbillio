"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import type { PayoutType } from "@prisma/client";

export type EmployeeInput = {
  name: string;
  email: string;
  phone?: string;
  role: string;
  status?: string;
  baseSalary: number;
  defaultPayout: PayoutType;
};

export type PaginationOptions = {
  page?: number;
  pageSize?: number;
};

export async function listEmployees(options?: PaginationOptions) {
  const userId = await requireUserId();
  const page = Math.max(1, options?.page ?? 1);
  const pageSize = options?.pageSize ? Math.max(1, options.pageSize) : undefined;

  const where = { userId };

  if (!pageSize) {
    const employees = await prisma.employee.findMany({
      where,
      include: {
        assignments: { include: { project: true } },
        payouts: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return employees;
  }

  const [employees, total] = await Promise.all([
    prisma.employee.findMany({
      where,
      include: {
        assignments: { include: { project: true } },
        payouts: true,
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.employee.count({ where }),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  return {
    employees,
    total,
    page,
    pageSize,
    totalPages,
  };
}

export async function getEmployee(id: string) {
  const userId = await requireUserId();
  return prisma.employee.findFirst({
    where: { id, userId },
    include: {
      assignments: { include: { project: true } },
      payouts: { orderBy: { date: "desc" } },
    },
  });
}

export async function createEmployee(input: EmployeeInput) {
  const userId = await requireUserId();
  const employee = await prisma.employee.create({
    data: {
      userId,
      name: input.name.trim(),
      email: input.email.trim(),
      phone: input.phone?.trim() ?? "",
      role: input.role.trim() || "Team Member",
      status: input.status || "ACTIVE",
      baseSalary: input.baseSalary || 0,
      defaultPayout: input.defaultPayout || "FIXED_AMOUNT",
    },
  });
  revalidatePath("/dashboard/employees");
  return employee;
}

export async function updateEmployee(id: string, input: EmployeeInput) {
  const userId = await requireUserId();
  await prisma.employee.updateMany({
    where: { id, userId },
    data: {
      name: input.name.trim(),
      email: input.email.trim(),
      phone: input.phone?.trim() ?? "",
      role: input.role.trim() || "Team Member",
      status: input.status || "ACTIVE",
      baseSalary: input.baseSalary || 0,
      defaultPayout: input.defaultPayout || "FIXED_AMOUNT",
    },
  });
  revalidatePath("/dashboard/employees");
}

export async function deleteEmployee(id: string) {
  const userId = await requireUserId();
  await prisma.employee.deleteMany({ where: { id, userId } });
  revalidatePath("/dashboard/employees");
}

export async function assignEmployeeToProject(input: {
  employeeId: string;
  projectId: string;
  payoutType: PayoutType;
  rateOrValue: number;
  hoursWorked?: number;
}) {
  const userId = await requireUserId();
  const employee = await prisma.employee.findFirst({
    where: { id: input.employeeId, userId },
  });
  if (!employee) throw new Error("Employee not found");

  const existing = await prisma.projectAssignment.findFirst({
    where: { employeeId: input.employeeId, projectId: input.projectId },
  });

  if (existing) {
    await prisma.projectAssignment.update({
      where: { id: existing.id },
      data: {
        payoutType: input.payoutType,
        rateOrValue: input.rateOrValue,
        hoursWorked: input.hoursWorked ?? 0,
      },
    });
  } else {
    await prisma.projectAssignment.create({
      data: {
        projectId: input.projectId,
        employeeId: input.employeeId,
        payoutType: input.payoutType,
        rateOrValue: input.rateOrValue,
        hoursWorked: input.hoursWorked ?? 0,
      },
    });
  }

  revalidatePath("/dashboard/employees");
  revalidatePath(`/dashboard/projects/${input.projectId}`);
}

export async function recordEmployeePayout(input: {
  employeeId: string;
  projectId?: string | null;
  amount: number;
  reason: string;
  date: string;
}) {
  const userId = await requireUserId();
  const employee = await prisma.employee.findFirst({
    where: { id: input.employeeId, userId },
  });
  if (!employee) throw new Error("Employee not found");

  const payout = await prisma.employeePayout.create({
    data: {
      userId,
      employeeId: input.employeeId,
      projectId: input.projectId || null,
      amount: input.amount,
      reason: input.reason.trim() || `Payroll payout to ${employee.name}`,
      date: new Date(input.date),
      status: "PAID",
    },
  });

  // Auto-log matching expense in P&L
  await prisma.expense.create({
    data: {
      userId,
      projectId: input.projectId || null,
      category: "Payroll / Salary",
      description: `Payout to ${employee.name} (${input.reason.trim() || "Salary"})`,
      amount: input.amount,
      date: new Date(input.date),
    },
  });

  revalidatePath("/dashboard/employees");
  revalidatePath("/dashboard/pnl");
  revalidatePath("/dashboard/analytics");
  if (input.projectId) {
    revalidatePath(`/dashboard/projects/${input.projectId}`);
  }

  return payout;
}
