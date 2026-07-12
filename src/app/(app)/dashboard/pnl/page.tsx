import { requireUserId, getBusinessProfile } from "@/lib/session";
import { getPnlData } from "@/lib/stats";
import { listExpenses } from "@/actions/expenses";
import { listProjects } from "@/actions/projects";
import { formatCurrency, formatDate } from "@/lib/format";
import { StatCard } from "@/components/dashboard/stat-card";
import { PnlChart } from "@/components/pnl/pnl-chart";
import { NetProfitChart } from "@/components/pnl/net-profit-chart";
import { ExpenseFormDialog } from "@/components/pnl/expense-form-dialog";
import { DeleteExpenseButton } from "@/components/pnl/delete-expense-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TrendingUp, TrendingDown, Landmark, Percent, Pencil } from "lucide-react";

export default async function PnlPage() {
  const userId = await requireUserId();
  const [profile, pnl, expenses, projects] = await Promise.all([
    getBusinessProfile(userId),
    getPnlData(userId, 6),
    listExpenses(),
    listProjects(),
  ]);
  const currency = profile.defaultCurrency;
  const maxCategory = Math.max(
    ...pnl.expenseByCategory.map((c) => c.amount),
    1
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            P&amp;L Tracker
          </h1>
          <p className="text-sm text-muted-foreground">
            Income collected vs. expenses logged, over the last 6 months.
          </p>
        </div>
        <ExpenseFormDialog
          projects={projects.map((p) => ({ id: p.id, name: p.name }))}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Income"
          value={formatCurrency(pnl.totalIncome, currency)}
          icon={TrendingUp}
          tone="success"
        />
        <StatCard
          label="Total Expenses"
          value={formatCurrency(pnl.totalExpense, currency)}
          icon={TrendingDown}
          tone="destructive"
        />
        <StatCard
          label="Net Profit"
          value={formatCurrency(pnl.netProfit, currency)}
          icon={Landmark}
          tone={pnl.netProfit >= 0 ? "success" : "destructive"}
        />
        <StatCard
          label="Margin"
          value={`${pnl.margin.toFixed(1)}%`}
          icon={Percent}
          tone="primary"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Income vs Expense</CardTitle>
          </CardHeader>
          <CardContent>
            <PnlChart data={pnl.rows} currency={currency} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Net Profit Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <NetProfitChart data={pnl.rows} currency={currency} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Expenses by Category</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pnl.expenseByCategory.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No expenses logged yet.
              </p>
            ) : (
              pnl.expenseByCategory.map((c) => (
                <div key={c.category} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span>{c.category}</span>
                    <span className="font-medium text-muted-foreground">
                      {formatCurrency(c.amount, currency)}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-destructive"
                      style={{ width: `${(c.amount / maxCategory) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Expenses</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {expenses.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-muted-foreground">
                No expenses logged yet.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.slice(0, 8).map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="text-muted-foreground">
                        {formatDate(e.date)}
                      </TableCell>
                      <TableCell>{e.category}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {e.project?.name ?? "—"}
                      </TableCell>
                      <TableCell className="text-right font-medium text-destructive">
                        -{formatCurrency(e.amount, currency)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <ExpenseFormDialog
                            key={e.updatedAt.toISOString()}
                            projects={projects.map((p) => ({ id: p.id, name: p.name }))}
                            expense={{
                              id: e.id,
                              category: e.category,
                              description: e.description,
                              amount: e.amount,
                              date: e.date,
                              projectId: e.projectId,
                            }}
                            trigger={
                              <button
                                type="button"
                                className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
                              >
                                <Pencil className="size-4" />
                              </button>
                            }
                          />
                          <DeleteExpenseButton id={e.id} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
