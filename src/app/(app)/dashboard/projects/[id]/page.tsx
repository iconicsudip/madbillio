import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { getProject } from "@/actions/projects";
import { listClients } from "@/actions/clients";
import { requireUserId, getBusinessProfile } from "@/lib/session";
import { formatCurrency, formatDate } from "@/lib/format";
import { ProjectStatusBadge } from "@/components/projects/status-badge";
import { InvoiceStatusBadge } from "@/components/invoices/status-badge";
import { ProjectFormDialog } from "@/components/projects/project-form-dialog";
import { ExpenseFormDialog } from "@/components/pnl/expense-form-dialog";
import { DeleteProjectButton } from "@/components/projects/delete-project-button";
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

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = await requireUserId();
  const [project, clients, profile] = await Promise.all([
    getProject(id),
    listClients(),
    getBusinessProfile(userId),
  ]);

  const currency = profile.defaultCurrency;
  const invoiced = project.invoices.reduce((sum, inv) => sum + inv.total, 0);
  const collected = project.invoices.reduce(
    (sum, inv) => sum + inv.amountPaid,
    0
  );
  const totalExpenses = project.expenses.reduce(
    (sum, e) => sum + e.amount,
    0
  );
  const netProfit = collected - totalExpenses;

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/projects"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to Projects
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              {project.name}
            </h1>
            <ProjectStatusBadge status={project.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {project.client?.name ?? "No client assigned"} · Started{" "}
            {formatDate(project.startDate)}
          </p>
        </div>
        <div className="flex gap-2">
          <ProjectFormDialog
            clients={clients}
            project={{
              id: project.id,
              name: project.name,
              description: project.description,
              clientId: project.clientId,
              status: project.status,
              budget: project.budget,
              startDate: project.startDate,
              endDate: project.endDate,
            }}
            trigger={<Button variant="outline">Edit Project</Button>}
          />
          <DeleteProjectButton
            id={project.id}
            redirectAfterDelete="/dashboard/projects"
          />
        </div>
      </div>

      {project.description && (
        <p className="max-w-2xl text-sm text-muted-foreground">
          {project.description}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="px-5 py-4">
            <p className="text-sm text-muted-foreground">Budget</p>
            <p className="text-xl font-semibold">
              {formatCurrency(project.budget, currency)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="px-5 py-4">
            <p className="text-sm text-muted-foreground">Invoiced</p>
            <p className="text-xl font-semibold">
              {formatCurrency(invoiced, currency)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="px-5 py-4">
            <p className="text-sm text-muted-foreground">Collected</p>
            <p className="text-xl font-semibold text-success">
              {formatCurrency(collected, currency)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="px-5 py-4">
            <p className="text-sm text-muted-foreground">Net Profit</p>
            <p
              className={`text-xl font-semibold ${netProfit >= 0 ? "text-success" : "text-destructive"}`}
            >
              {formatCurrency(netProfit, currency)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Invoices</CardTitle>
          <Button
            render={<Link href={`/dashboard/invoices/new?projectId=${project.id}`} />}
            size="sm"
          >
            <Plus /> New Invoice
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {project.invoices.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">
              No invoices for this project yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {project.invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell>
                      <Link
                        href={`/dashboard/invoices/${inv.id}`}
                        className="font-medium"
                      >
                        {inv.invoiceNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(inv.dueDate)}
                    </TableCell>
                    <TableCell>
                      <InvoiceStatusBadge status={inv.status} />
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(inv.total, inv.currency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Expenses</CardTitle>
          <ExpenseFormDialog
            projects={[{ id: project.id, name: project.name }]}
            defaultProjectId={project.id}
          />
        </CardHeader>
        <CardContent className="p-0">
          {project.expenses.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">
              No expenses logged for this project.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {project.expenses.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>{e.category}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {e.description || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(e.date)}
                    </TableCell>
                    <TableCell className="text-right font-medium text-destructive">
                      -{formatCurrency(e.amount, currency)}
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
