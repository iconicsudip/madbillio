"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { recordPayment } from "@/actions/payments";
import { formatCurrency, formatDateInput } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type InvoiceOption = {
  id: string;
  invoiceNumber: string;
  clientName: string;
  amountDue: number;
  currency: string;
};

const METHODS = [
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "CARD", label: "Card" },
  { value: "CASH", label: "Cash" },
  { value: "WISE", label: "Wise" },
  { value: "OTHER", label: "Other" },
];

export function RecordPaymentGeneralDialog({
  invoices,
}: {
  invoices: InvoiceOption[];
}) {
  const [open, setOpen] = useState(false);
  const [invoiceId, setInvoiceId] = useState(invoices[0]?.id ?? "");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const selected = useMemo(
    () => invoices.find((i) => i.id === invoiceId) ?? null,
    [invoices, invoiceId]
  );

  function handleSubmit(formData: FormData) {
    if (!invoiceId) {
      toast.error("Select an invoice");
      return;
    }
    const input = {
      invoiceId,
      amount: Number(formData.get("amount") ?? 0),
      method: formData.get("method") as
        | "BANK_TRANSFER"
        | "CARD"
        | "CASH"
        | "WISE"
        | "OTHER",
      paidAt: String(formData.get("paidAt") ?? ""),
      reference: String(formData.get("reference") ?? ""),
      notes: String(formData.get("notes") ?? ""),
    };
    if (input.amount <= 0) {
      toast.error("Enter a valid payment amount");
      return;
    }
    startTransition(async () => {
      try {
        await recordPayment(input);
        toast.success("Payment recorded");
        setOpen(false);
        router.refresh();
      } catch {
        toast.error("Could not record payment");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        nativeButton
        render={<Button disabled={invoices.length === 0} />}
      >
        <Plus /> Record Payment
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Invoice</Label>
            <Select
              value={invoiceId}
              onValueChange={(v) => setInvoiceId(v ?? "")}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select invoice">
                  {() =>
                    selected
                      ? `${selected.invoiceNumber} · ${selected.clientName} · ${formatCurrency(selected.amountDue, selected.currency)} due`
                      : "Select invoice"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {invoices.map((inv) => (
                  <SelectItem key={inv.id} value={inv.id}>
                    {inv.invoiceNumber} · {inv.clientName} ·{" "}
                    {formatCurrency(inv.amountDue, inv.currency)} due
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                min={0}
                step="0.01"
                defaultValue={
                  selected && selected.amountDue > 0
                    ? selected.amountDue.toFixed(2)
                    : undefined
                }
                key={invoiceId}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Method</Label>
              <Select name="method" defaultValue="BANK_TRANSFER">
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(value: string | null) =>
                      METHODS.find((m) => m.value === value)?.label ?? "Bank Transfer"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="paidAt">Date Paid</Label>
              <Input
                id="paidAt"
                name="paidAt"
                type="date"
                defaultValue={formatDateInput(new Date())}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reference">Reference</Label>
              <Input id="reference" name="reference" placeholder="TX-1029" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={2} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : "Record Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
