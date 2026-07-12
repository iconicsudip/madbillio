import { requireUserId, getBusinessProfile } from "@/lib/session";
import { getAnalyticsData, getDashboardStats } from "@/lib/stats";
import { formatCurrency } from "@/lib/format";
import { StatCard } from "@/components/dashboard/stat-card";
import { RevenueChart } from "@/components/analytics/revenue-chart";
import { TopClientsChart } from "@/components/analytics/top-clients-chart";
import { InvoiceStatusBadge } from "@/components/invoices/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Clock, Receipt, Users } from "lucide-react";
import type { InvoiceStatus } from "@prisma/client";

const STATUS_ORDER: InvoiceStatus[] = [
  "DRAFT",
  "SENT",
  "PARTIALLY_PAID",
  "PAID",
  "OVERDUE",
  "CANCELLED",
];

export default async function AnalyticsPage() {
  const userId = await requireUserId();
  const [profile, analytics, dashboardStats] = await Promise.all([
    getBusinessProfile(userId),
    getAnalyticsData(userId, 6),
    getDashboardStats(userId),
  ]);
  const currency = profile.defaultCurrency;

  const totalInvoices = STATUS_ORDER.reduce(
    (sum, s) => sum + (analytics.statusCounts[s] ?? 0),
    0
  );
  const avgInvoice =
    totalInvoices > 0 ? dashboardStats.totalRevenue / totalInvoices : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Revenue trends, top clients, and invoice performance.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Revenue"
          value={formatCurrency(dashboardStats.totalRevenue, currency)}
          icon={DollarSign}
          tone="success"
        />
        <StatCard
          label="Outstanding"
          value={formatCurrency(dashboardStats.outstanding, currency)}
          icon={Clock}
          tone="primary"
        />
        <StatCard
          label="Total Invoices"
          value={String(totalInvoices)}
          icon={Receipt}
        />
        <StatCard
          label="Avg. Invoice Value"
          value={formatCurrency(avgInvoice, currency)}
          icon={Users}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue — Last 6 Months</CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueChart data={analytics.revenueByMonth} currency={currency} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invoices by Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {STATUS_ORDER.map((status) => {
              const count = analytics.statusCounts[status] ?? 0;
              const pct = totalInvoices > 0 ? (count / totalInvoices) * 100 : 0;
              return (
                <div key={status} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <InvoiceStatusBadge status={status} />
                    <span className="text-muted-foreground">{count}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top Clients by Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          {analytics.topClients.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No collected revenue yet.
            </p>
          ) : (
            <TopClientsChart data={analytics.topClients} currency={currency} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
