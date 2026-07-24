import Link from "next/link";
import { ArrowLeft, Plus, FileText, ExternalLink, Download } from "lucide-react";
import { getProject } from "@/actions/projects";
import { listClients } from "@/actions/clients";
import { requireUserId, getBusinessProfile } from "@/lib/session";
import { formatCurrency, formatDate } from "@/lib/format";
import { ProjectStatusBadge } from "@/components/projects/status-badge";
import { InvoiceStatusBadge } from "@/components/invoices/status-badge";
import { ProjectFormDialog } from "@/components/projects/project-form-dialog";
import { ExpenseFormDialog } from "@/components/pnl/expense-form-dialog";
import { DeleteProjectButton } from "@/components/projects/delete-project-button";
import { DocumentViewerModal } from "@/components/projects/document-viewer-modal";
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
            key={project.updatedAt.toISOString()}
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
              documents: project.documents,
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

      {/* Project Documents Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Project Documents</CardTitle>
          </div>
          <ProjectFormDialog
            key={`docs-${project.updatedAt.toISOString()}`}
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
              documents: project.documents,
            }}
            trigger={
              <Button size="sm" variant="outline" className="gap-1 text-xs">
                <Plus className="h-3.5 w-3.5" /> Manage Documents
              </Button>
            }
          />
        </CardHeader>
        <CardContent className="p-0">
          {!project.documents || project.documents.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">
              No documents attached to this project. Click &quot;Manage Documents&quot; to upload contracts or links.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date Added</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {project.documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary shrink-0" />
                        <span className="truncate max-w-xs">{doc.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                        {doc.fileType || "Document"}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {formatDate(doc.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <DocumentViewerModal
                          documentName={doc.name}
                          documentUrl={doc.url}
                        />
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          download={doc.url.startsWith("data:") ? doc.name : undefined}
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            title="Open Link / Download"
                          >
                            {doc.url.startsWith("data:") ? (
                              <Download className="h-4 w-4" />
                            ) : (
                              <ExternalLink className="h-4 w-4" />
                            )}
                          </Button>
                        </a>
                      </div>
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
