import { Users, Pencil, Trash2, DollarSign, Sparkles } from "lucide-react";
import { listEmployees, deleteEmployee } from "@/actions/employees";
import { listProjects } from "@/actions/projects";
import { requireUserId, getBusinessProfile } from "@/lib/session";
import { formatCurrency, formatDate } from "@/lib/format";
import { EmployeeFormDialog } from "@/components/employees/employee-form-dialog";
import { RecordPayoutDialog } from "@/components/employees/payout-dialog";
import { Button } from "@/components/ui/button";
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

const PAYOUT_LABELS: Record<string, string> = {
  FIXED_AMOUNT: "Fixed Fee",
  PERCENTAGE: "% Share",
  HOURLY: "Hourly Rate",
  MONTHLY_SALARY: "Monthly Salary",
};

export default async function EmployeesPage() {
  const userId = await requireUserId();
  const [employees, projects, profile] = await Promise.all([
    listEmployees(),
    listProjects(),
    getBusinessProfile(userId),
  ]);

  const currency = profile.defaultCurrency;
  const projectsList = Array.isArray(projects) ? projects : (projects as unknown as { projects: Array<{ id: string; name: string }> }).projects;
  const projectOptions = projectsList.map((p) => ({ id: p.id, name: p.name }));

  const employeeList = Array.isArray(employees) ? employees : employees.employees;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Employee & Team Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage team members, project percentage payouts, hourly rates, and payroll.
          </p>
        </div>
        <EmployeeFormDialog />
      </div>

      <Card>
        <CardContent className="p-0">
          {employeeList.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                <Users className="size-5" />
              </span>
              <p className="text-sm text-muted-foreground">
                No employees added yet. Add your team members to manage project-based salaries and payouts.
              </p>
              <EmployeeFormDialog />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Compensation Model</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total Paid</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employeeList.map((emp) => {
                  const totalPaid = emp.payouts.reduce(
                    (sum, p) => sum + p.amount,
                    0
                  );

                  return (
                    <TableRow key={emp.id}>
                      <TableCell className="font-medium">
                        <div>
                          <p className="font-semibold text-foreground">{emp.name}</p>
                          <p className="text-xs text-muted-foreground">{emp.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {emp.role}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                            {PAYOUT_LABELS[emp.defaultPayout] || emp.defaultPayout}
                          </span>
                          {emp.baseSalary > 0 && (
                            <span className="text-xs text-muted-foreground">
                              (
                              {emp.defaultPayout === "PERCENTAGE"
                                ? `${emp.baseSalary}%`
                                : formatCurrency(emp.baseSalary, currency)}
                              )
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            emp.status === "ACTIVE"
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {emp.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(totalPaid, currency)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <RecordPayoutDialog
                            employeeId={emp.id}
                            employeeName={emp.name}
                            suggestedAmount={
                              emp.defaultPayout !== "PERCENTAGE" ? emp.baseSalary : 0
                            }
                            projects={projectOptions}
                          />
                          <EmployeeFormDialog
                            employee={{
                              id: emp.id,
                              name: emp.name,
                              email: emp.email,
                              phone: emp.phone,
                              role: emp.role,
                              status: emp.status,
                              baseSalary: emp.baseSalary,
                              defaultPayout: emp.defaultPayout,
                            }}
                            trigger={
                              <button
                                type="button"
                                className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer"
                                title="Edit Employee"
                              >
                                <Pencil className="size-4" />
                              </button>
                            }
                          />
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
