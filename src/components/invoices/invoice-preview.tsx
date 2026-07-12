import { Zap } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";

export type InvoicePreviewData = {
  invoiceNumber: string;
  projectName?: string;
  currency: string;
  issuedDate: string;
  dueDate: string;
  taxRate: number;
  notes: string;
  business: {
    name: string;
    address: string;
    phone: string;
    email: string;
    logoUrl?: string | null;
    bankName: string;
    bankAccountNumber: string;
    wiseEmail: string;
  };
  client: {
    name: string;
    email: string;
    address?: string;
    phone?: string;
  } | null;
  items: { name: string; quantity: number; unit: string; cost: number }[];
  paymentDetails?: {
    id: string;
    label: string;
    type: string;
    details: string;
    imageUrl: string | null;
  }[];
};

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  BANK: "Bank Account",
  UPI: "UPI",
  LINK: "Payment Link",
  QR_CODE: "QR Code",
  OTHER: "Other",
};

export function InvoicePreview({ data }: { data: InvoicePreviewData }) {
  const subtotal = data.items.reduce(
    (sum, item) => sum + item.quantity * item.cost,
    0
  );
  const taxAmount = subtotal * (data.taxRate / 100);
  const total = subtotal + taxAmount;

  return (
    <div
      id="invoice-preview"
      className="rounded-2xl border bg-card p-6 text-card-foreground sm:p-8"
    >
      <div className="flex items-center gap-2">
        <span className="flex size-9 items-center justify-center overflow-hidden rounded-lg bg-primary text-primary-foreground">
          {data.business.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.business.logoUrl}
              alt={data.business.name}
              className="size-full object-cover"
            />
          ) : (
            <Zap className="size-4.5" fill="currentColor" />
          )}
        </span>
      </div>

      <h2 className="mt-5 text-xl font-semibold">
        {data.projectName || "Invoice"}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Invoice Number : <span className="font-medium text-foreground">{data.invoiceNumber}</span>
      </p>

      <div className="mt-5 flex justify-between rounded-xl bg-secondary/60 px-4 py-3 text-sm">
        <span className="text-muted-foreground">
          Issued Date :{" "}
          <span className="font-medium text-foreground">
            {data.issuedDate ? formatDate(data.issuedDate) : "—"}
          </span>
        </span>
        <span className="text-muted-foreground">
          Due Date :{" "}
          <span className="font-medium text-foreground">
            {data.dueDate ? formatDate(data.dueDate) : "—"}
          </span>
        </span>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            From
          </p>
          <p className="mt-1.5 font-medium">{data.business.name}</p>
          <p className="text-muted-foreground">{data.business.address}</p>
          <p className="text-muted-foreground">{data.business.phone}</p>
          <p className="text-muted-foreground">{data.business.email}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Billed To
          </p>
          <p className="mt-1.5 font-medium">{data.client?.name || "—"}</p>
          <p className="text-muted-foreground">{data.client?.address}</p>
          <p className="text-muted-foreground">{data.client?.phone}</p>
          <p className="text-muted-foreground">{data.client?.email}</p>
        </div>
      </div>

      <div className="mt-6 border-t pt-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-muted-foreground">
              <th className="w-6 pb-2 text-left font-medium">#</th>
              <th className="pb-2 text-left font-medium">Item</th>
              <th className="pb-2 text-right font-medium">Qty</th>
              <th className="pb-2 text-right font-medium">Cost</th>
              <th className="pb-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.items.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-muted-foreground">
                  Add items to see them here
                </td>
              </tr>
            ) : (
              data.items.map((item, i) => (
                <tr key={i} className="border-t">
                  <td className="py-2.5 text-muted-foreground">{i + 1}</td>
                  <td className="py-2.5">{item.name || "Untitled item"}</td>
                  <td className="py-2.5 text-right text-muted-foreground">
                    {item.quantity} {item.unit}
                  </td>
                  <td className="py-2.5 text-right text-muted-foreground">
                    {formatCurrency(item.cost, data.currency)}
                  </td>
                  <td className="py-2.5 text-right font-medium">
                    {formatCurrency(item.quantity * item.cost, data.currency)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 space-y-1.5 border-t pt-4 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Sub Total</span>
          <span>{formatCurrency(subtotal, data.currency)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Tax ({data.taxRate}%)</span>
          <span>{formatCurrency(taxAmount, data.currency)}</span>
        </div>
        <div className="flex justify-between border-t pt-1.5 font-medium">
          <span>Total</span>
          <span>{formatCurrency(total, data.currency)}</span>
        </div>
        <div className="flex justify-between text-base font-semibold">
          <span>Amount Due</span>
          <span>{formatCurrency(total, data.currency)}</span>
        </div>
      </div>

      {data.notes && (
        <div className="mt-6 border-t pt-4 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Notes
          </p>
          <p className="mt-1.5 text-muted-foreground">{data.notes}</p>
        </div>
      )}

      <div className="mt-6 border-t pt-4 text-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Payment Info
        </p>
        {data.paymentDetails && data.paymentDetails.length > 0 ? (
          <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {data.paymentDetails.map((pd) => (
              <div key={pd.id} className="flex items-start gap-2">
                {pd.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={pd.imageUrl}
                    alt={pd.label}
                    className="size-12 shrink-0 rounded-md border object-cover"
                  />
                )}
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">
                    {pd.label} · {PAYMENT_TYPE_LABELS[pd.type] ?? pd.type}
                  </p>
                  <p className="break-words font-medium">
                    {pd.details || "—"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-1.5 grid grid-cols-3 gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Bank</p>
              <p className="font-medium">{data.business.bankName || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Account</p>
              <p className="font-medium">
                {data.business.bankAccountNumber || "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Wise</p>
              <p className="font-medium">{data.business.wiseEmail || "—"}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
