import Link from "next/link";
import { DollarSign, Clock, Briefcase, AlertTriangle, Plus } from "lucide-react";
import { requireUserId, getBusinessProfile } from "@/lib/session";
import { getDashboardStats } from "@/lib/stats";
import { formatCurrency, formatDate } from "@/lib/format";
import { StatCard } from "@/components/dashboard/stat-card";
import { InvoiceStatusBadge } from "@/components/invoices/status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "@/lib/format";

export default async function DashboardPage() {
  const userId = await requireUserId();
  const [stats, profile] = await Promise.all([
    getDashboardStats(userId),
    getBusinessProfile(userId),
  ]);
  const currency = profile.defaultCurrency;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Home</h1>
          <p className="text-sm text-muted-foreground">
            Here&apos;s what&apos;s happening across your business.
          </p>
        </div>
        <div className="flex gap-2">
          <Button render={<Link href="/dashboard/projects" />} variant="outline">
            <Briefcase /> New Project
          </Button>
          <Button render={<Link href="/dashboard/invoices/new" />}>
            <Plus /> New Invoice
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Revenue"
          value={formatCurrency(stats.totalRevenue, currency)}
          icon={DollarSign}
          tone="success"
        />
        <StatCard
          label="Outstanding"
          value={formatCurrency(stats.outstanding, currency)}
          icon={Clock}
          tone="primary"
        />
        <StatCard
          label="Active Projects"
          value={String(stats.activeProjects)}
          icon={Briefcase}
        />
        <StatCard
          label="Overdue Invoices"
          value={String(stats.overdueCount)}
          icon={AlertTriangle}
          tone={stats.overdueCount > 0 ? "destructive" : "default"}
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Invoices</CardTitle>
          <Button render={<Link href="/dashboard/invoices" />} variant="ghost" size="sm">
            View all
          </Button>
        </CardHeader>
        <CardContent>
          {stats.recentInvoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
              <p className="text-sm text-muted-foreground">
                No invoices yet. Create your first invoice to get started.
              </p>
              <Button render={<Link href="/dashboard/invoices/new" />} size="sm">
                <Plus /> New Invoice
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.recentInvoices.map((invoice) => (
                  <TableRow
                    key={invoice.id}
                    className="cursor-pointer"
                  >
                    <TableCell>
                      <Link
                        href={`/dashboard/invoices/${invoice.id}`}
                        className="flex items-center gap-2"
                      >
                        <Avatar className="size-7">
                          <AvatarFallback className="text-[11px]">
                            {initials(invoice.client.name)}
                          </AvatarFallback>
                        </Avatar>
                        {invoice.client.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {invoice.invoiceNumber}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(invoice.dueDate)}
                    </TableCell>
                    <TableCell>
                      <InvoiceStatusBadge status={invoice.status} />
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(invoice.total, invoice.currency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
