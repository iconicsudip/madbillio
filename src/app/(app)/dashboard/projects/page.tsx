import Link from "next/link";
import { Briefcase, Pencil } from "lucide-react";
import { listProjects } from "@/actions/projects";
import { listClients } from "@/actions/clients";
import { requireUserId, getBusinessProfile } from "@/lib/session";
import { formatCurrency, formatDate } from "@/lib/format";
import { ProjectStatusBadge } from "@/components/projects/status-badge";
import { ProjectFormDialog } from "@/components/projects/project-form-dialog";
import { DeleteProjectButton } from "@/components/projects/delete-project-button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function ProjectsPage() {
  const userId = await requireUserId();
  const [projects, clients, profile] = await Promise.all([
    listProjects(),
    listClients(),
    getBusinessProfile(userId),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground">
            Track scope, budget, and billing progress per project.
          </p>
        </div>
        <ProjectFormDialog clients={clients} />
      </div>

      <Card>
        <CardContent className="p-0">
          {projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                <Briefcase className="size-5" />
              </span>
              <p className="text-sm text-muted-foreground">
                No projects yet. Create your first project to start billing.
              </p>
              <ProjectFormDialog clients={clients} />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Budget</TableHead>
                  <TableHead>Invoiced</TableHead>
                  <TableHead>Collected</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((project) => {
                  const invoiced = project.invoices.reduce(
                    (sum, inv) => sum + inv.total,
                    0
                  );
                  const collected = project.invoices.reduce(
                    (sum, inv) => sum + inv.amountPaid,
                    0
                  );
                  return (
                    <TableRow key={project.id}>
                      <TableCell className="font-medium">
                        <Link href={`/dashboard/projects/${project.id}`}>
                          {project.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {project.client?.name ?? "—"}
                      </TableCell>
                      <TableCell>
                        <ProjectStatusBadge status={project.status} />
                      </TableCell>
                      <TableCell>
                        {formatCurrency(project.budget, profile.defaultCurrency)}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(invoiced, profile.defaultCurrency)}
                      </TableCell>
                      <TableCell className="text-success">
                        {formatCurrency(collected, profile.defaultCurrency)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(project.startDate)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <ProjectFormDialog
                            clients={clients}
                            project={project}
                            trigger={
                              <button
                                type="button"
                                className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
                              >
                                <Pencil className="size-4" />
                              </button>
                            }
                          />
                          <DeleteProjectButton id={project.id} iconOnly />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
