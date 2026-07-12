import Link from "next/link";
import { FileText, Plus, Pencil } from "lucide-react";
import { listInvoices } from "@/actions/invoices";
import { formatCurrency, formatDate, initials } from "@/lib/format";
import { InvoiceStatusBadge } from "@/components/invoices/status-badge";
import { DeleteInvoiceButton } from "@/components/invoices/delete-invoice-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function InvoicesPage() {
  const invoices = await listInvoices();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Invoices</h1>
          <p className="text-sm text-muted-foreground">
            All invoices across every client and project.
          </p>
        </div>
        <Button render={<Link href="/dashboard/invoices/new" />}>
          <Plus /> New Invoice
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                <FileText className="size-5" />
              </span>
              <p className="text-sm text-muted-foreground">
                No invoices yet. Create your first invoice.
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
                  <TableHead>Project</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Due</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
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
                      {invoice.project?.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(invoice.issuedDate)}
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
                    <TableCell className="text-right text-muted-foreground">
                      {formatCurrency(invoice.amountDue, invoice.currency)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          render={<Link href={`/dashboard/invoices/${invoice.id}/edit`} />}
                          variant="ghost"
                          size="icon-sm"
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <DeleteInvoiceButton id={invoice.id} />
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
  );
}
