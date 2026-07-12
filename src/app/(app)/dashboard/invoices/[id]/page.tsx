import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getInvoice } from "@/actions/invoices";
import { listPaymentDetails } from "@/actions/payment-details";
import { requireUserId, getBusinessProfile } from "@/lib/session";
import { formatCurrency, formatDate } from "@/lib/format";
import { InvoiceStatusBadge } from "@/components/invoices/status-badge";
import { InvoicePreview } from "@/components/invoices/invoice-preview";
import { InvoiceActions } from "@/components/invoices/invoice-actions";
import { RecordPaymentDialog } from "@/components/payments/record-payment-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = await requireUserId();
  const [invoice, profile, paymentDetails] = await Promise.all([
    getInvoice(id),
    getBusinessProfile(userId),
    listPaymentDetails(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href="/dashboard/invoices"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back to Invoices
        </Link>
        <InvoiceActions id={invoice.id} status={invoice.status} />
      </div>

      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <h1 className="text-2xl font-semibold tracking-tight">
          {invoice.invoiceNumber}
        </h1>
        <InvoiceStatusBadge status={invoice.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <InvoicePreview
            data={{
              invoiceNumber: invoice.invoiceNumber,
              projectName: invoice.project?.name,
              currency: invoice.currency,
              issuedDate: invoice.issuedDate.toISOString(),
              dueDate: invoice.dueDate.toISOString(),
              taxRate: invoice.taxRate,
              notes: invoice.notes,
              business: {
                name: profile.businessName,
                address: profile.address,
                phone: profile.phone,
                email: profile.email,
                logoUrl: profile.logoUrl,
                bankName: profile.bankName,
                bankAccountNumber: profile.bankAccountNumber,
                wiseEmail: profile.wiseEmail,
              },
              client: invoice.client,
              items: invoice.items,
              paymentDetails,
            }}
          />
        </div>

        <div className="space-y-6 print:hidden">
          <Card>
            <CardHeader>
              <CardTitle>Balance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total</span>
                <span className="font-medium">
                  {formatCurrency(invoice.total, invoice.currency)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Paid</span>
                <span className="font-medium text-success">
                  {formatCurrency(invoice.amountPaid, invoice.currency)}
                </span>
              </div>
              <div className="flex justify-between border-t pt-3 text-sm font-semibold">
                <span>Amount Due</span>
                <span>{formatCurrency(invoice.amountDue, invoice.currency)}</span>
              </div>
              {invoice.amountDue > 0 && invoice.status !== "DRAFT" && (
                <RecordPaymentDialog
                  invoiceId={invoice.id}
                  amountDue={invoice.amountDue}
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {invoice.payments.length === 0 ? (
                <p className="px-6 py-6 text-center text-sm text-muted-foreground">
                  No payments recorded yet.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoice.payments.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="text-muted-foreground">
                          {formatDate(p.paidAt)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {p.method.replace("_", " ")}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(p.amount, invoice.currency)}
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
    </div>
  );
}
