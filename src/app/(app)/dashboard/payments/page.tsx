import Link from "next/link";
import { Wallet } from "lucide-react";
import { listPayments } from "@/actions/payments";
import { listInvoices } from "@/actions/invoices";
import { formatCurrency, formatDate } from "@/lib/format";
import { RecordPaymentGeneralDialog } from "@/components/payments/record-payment-general-dialog";
import { DeletePaymentButton } from "@/components/payments/delete-payment-button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const METHOD_LABEL: Record<string, string> = {
  BANK_TRANSFER: "Bank Transfer",
  CARD: "Card",
  CASH: "Cash",
  WISE: "Wise",
  OTHER: "Other",
};

export default async function PaymentsPage() {
  const [payments, invoices] = await Promise.all([
    listPayments(),
    listInvoices(),
  ]);

  const payableInvoices = invoices
    .filter((inv) => inv.amountDue > 0 && inv.status !== "DRAFT" && inv.status !== "CANCELLED")
    .map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      clientName: inv.client.name,
      amountDue: inv.amountDue,
      currency: inv.currency,
    }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Payments</h1>
          <p className="text-sm text-muted-foreground">
            Every payment recorded against your invoices.
          </p>
        </div>
        <RecordPaymentGeneralDialog invoices={payableInvoices} />
      </div>

      <Card>
        <CardContent className="p-0">
          {payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                <Wallet className="size-5" />
              </span>
              <p className="text-sm text-muted-foreground">
                No payments recorded yet.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-muted-foreground">
                      {formatDate(p.paidAt)}
                    </TableCell>
                    <TableCell>{p.invoice.client.name}</TableCell>
                    <TableCell>
                      <Link
                        href={`/dashboard/invoices/${p.invoiceId}`}
                        className="text-primary hover:underline"
                      >
                        {p.invoice.invoiceNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {METHOD_LABEL[p.method]}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {p.reference || "—"}
                    </TableCell>
                    <TableCell className="text-right font-medium text-success">
                      {formatCurrency(p.amount, p.invoice.currency)}
                    </TableCell>
                    <TableCell>
                      <DeletePaymentButton id={p.id} />
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
