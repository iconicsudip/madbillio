import { prisma } from "@/lib/prisma";
import { monthLabel } from "@/lib/format";

const OUTSTANDING_STATUSES = ["SENT", "PARTIALLY_PAID", "OVERDUE"] as const;

export async function getDashboardStats(userId: string) {
  const [revenueAgg, outstandingAgg, activeProjects, overdueCount, recentInvoices] =
    await Promise.all([
      prisma.payment.aggregate({
        where: { userId },
        _sum: { amount: true },
      }),
      prisma.invoice.aggregate({
        where: { userId, status: { in: [...OUTSTANDING_STATUSES] } },
        _sum: { amountDue: true },
      }),
      prisma.project.count({ where: { userId, status: "ACTIVE" } }),
      prisma.invoice.count({ where: { userId, status: "OVERDUE" } }),
      prisma.invoice.findMany({
        where: { userId },
        include: { client: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

  return {
    totalRevenue: revenueAgg._sum.amount ?? 0,
    outstanding: outstandingAgg._sum.amountDue ?? 0,
    activeProjects,
    overdueCount,
    recentInvoices,
  };
}

function monthBuckets(months: number) {
  const now = new Date();
  const buckets: { key: string; label: string; start: Date; end: Date }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    buckets.push({
      key: `${start.getFullYear()}-${start.getMonth()}`,
      label: monthLabel(start),
      start,
      end,
    });
  }
  return buckets;
}

export async function getAnalyticsData(userId: string, months = 6) {
  const buckets = monthBuckets(months);
  const rangeStart = buckets[0].start;

  const [payments, invoices, clients] = await Promise.all([
    prisma.payment.findMany({
      where: { userId, paidAt: { gte: rangeStart } },
      select: { amount: true, paidAt: true },
    }),
    prisma.invoice.findMany({
      where: { userId },
      select: { status: true, total: true, clientId: true, projectId: true },
    }),
    prisma.client.findMany({
      where: { userId },
      include: {
        invoices: { select: { total: true, amountPaid: true } },
      },
    }),
  ]);

  const revenueByMonth = buckets.map((bucket) => {
    const total = payments
      .filter((p) => p.paidAt >= bucket.start && p.paidAt < bucket.end)
      .reduce((sum, p) => sum + p.amount, 0);
    return { month: bucket.label, revenue: Math.round(total * 100) / 100 };
  });

  const statusCounts = invoices.reduce<Record<string, number>>((acc, inv) => {
    acc[inv.status] = (acc[inv.status] ?? 0) + 1;
    return acc;
  }, {});

  const topClients = clients
    .map((c) => ({
      name: c.name,
      revenue: c.invoices.reduce((sum, inv) => sum + inv.amountPaid, 0),
    }))
    .filter((c) => c.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  return { revenueByMonth, statusCounts, topClients };
}

export async function getPnlData(userId: string, months = 6) {
  const buckets = monthBuckets(months);
  const rangeStart = buckets[0].start;

  const [payments, expenses] = await Promise.all([
    prisma.payment.findMany({
      where: { userId, paidAt: { gte: rangeStart } },
      select: { amount: true, paidAt: true },
    }),
    prisma.expense.findMany({
      where: { userId, date: { gte: rangeStart } },
      select: { amount: true, date: true, category: true },
    }),
  ]);

  const rows = buckets.map((bucket) => {
    const income = payments
      .filter((p) => p.paidAt >= bucket.start && p.paidAt < bucket.end)
      .reduce((sum, p) => sum + p.amount, 0);
    const expense = expenses
      .filter((e) => e.date >= bucket.start && e.date < bucket.end)
      .reduce((sum, e) => sum + e.amount, 0);
    return {
      month: bucket.label,
      income: Math.round(income * 100) / 100,
      expense: Math.round(expense * 100) / 100,
      net: Math.round((income - expense) * 100) / 100,
    };
  });

  const totalIncome = rows.reduce((sum, r) => sum + r.income, 0);
  const totalExpense = rows.reduce((sum, r) => sum + r.expense, 0);

  const expenseByCategory = Object.entries(
    expenses.reduce<Record<string, number>>((acc, e) => {
      acc[e.category] = (acc[e.category] ?? 0) + e.amount;
      return acc;
    }, {})
  )
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);

  return {
    rows,
    totalIncome,
    totalExpense,
    netProfit: totalIncome - totalExpense,
    margin: totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0,
    expenseByCategory,
  };
}
