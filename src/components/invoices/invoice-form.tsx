"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createInvoice, updateInvoice, setInvoiceStatus } from "@/actions/invoices";
import { formatDateInput, CURRENCIES } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InvoicePreview } from "@/components/invoices/invoice-preview";
import { ClientQuickAdd } from "@/components/invoices/client-quick-add";

type ClientOption = {
  id: string;
  name: string;
  email: string;
  address: string;
  phone: string;
};

type ProjectOption = { id: string; name: string };

type Item = { name: string; quantity: number; unit: string; cost: number };

type BusinessProfileData = {
  businessName: string;
  address: string;
  phone: string;
  email: string;
  logoUrl?: string | null;
  bankName: string;
  bankAccountNumber: string;
  wiseEmail: string;
  defaultCurrency: string;
  defaultTaxRate: number;
  invoiceNotes: string;
};

type InitialInvoice = {
  id: string;
  clientId: string;
  projectId: string | null;
  invoiceNumber: string;
  currency: string;
  issuedDate: Date;
  dueDate: Date;
  taxRate: number;
  notes: string;
  items: Item[];
};

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

type PaymentDetailOption = {
  id: string;
  label: string;
  type: string;
  details: string;
  imageUrl: string | null;
};

export function InvoiceForm({
  clients,
  projects,
  profile,
  paymentDetails,
  initialInvoice,
  defaultProjectId,
  newInvoiceNumber,
}: {
  clients: ClientOption[];
  projects: ProjectOption[];
  profile: BusinessProfileData;
  paymentDetails?: PaymentDetailOption[];
  initialInvoice?: InitialInvoice;
  defaultProjectId?: string;
  newInvoiceNumber?: string;
}) {
  const router = useRouter();
  const isEdit = Boolean(initialInvoice);
  const [pending, startTransition] = useTransition();

  const [clientList, setClientList] = useState(clients);
  const [clientId, setClientId] = useState(
    initialInvoice?.clientId ?? clients[0]?.id ?? ""
  );
  const [projectId, setProjectId] = useState(
    initialInvoice?.projectId ?? defaultProjectId ?? ""
  );
  const invoiceNumber =
    initialInvoice?.invoiceNumber ?? newInvoiceNumber ?? "";
  const [currency, setCurrency] = useState(
    initialInvoice?.currency ?? profile.defaultCurrency
  );
  const [issuedDate, setIssuedDate] = useState(
    formatDateInput(initialInvoice?.issuedDate ?? new Date())
  );
  const [dueDate, setDueDate] = useState(
    formatDateInput(initialInvoice?.dueDate ?? addDays(new Date(), 14))
  );
  const [taxRate, setTaxRate] = useState(
    initialInvoice?.taxRate ?? profile.defaultTaxRate
  );
  const [notes, setNotes] = useState(
    initialInvoice?.notes ?? profile.invoiceNotes
  );
  const [items, setItems] = useState<Item[]>(
    initialInvoice?.items.length
      ? initialInvoice.items
      : [{ name: "", quantity: 1, unit: "hr", cost: 0 }]
  );

  const selectedClient = useMemo(
    () => clientList.find((c) => c.id === clientId) ?? null,
    [clientList, clientId]
  );
  const selectedProject = useMemo(
    () => projects.find((p) => p.id === projectId) ?? null,
    [projects, projectId]
  );

  function updateItem(index: number, patch: Partial<Item>) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item))
    );
  }

  function addItem() {
    setItems((prev) => [...prev, { name: "", quantity: 1, unit: "hr", cost: 0 }]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function buildInput() {
    return {
      clientId,
      projectId: projectId || null,
      invoiceNumber,
      currency,
      issuedDate,
      dueDate,
      taxRate: Number(taxRate),
      notes,
      items: items
        .filter((i) => i.name.trim().length > 0)
        .map((i) => ({
          name: i.name,
          quantity: Number(i.quantity) || 0,
          unit: i.unit,
          cost: Number(i.cost) || 0,
        })),
    };
  }

  function handleSave(status: "DRAFT" | "SENT") {
    if (!clientId) {
      toast.error("Select a client to bill");
      return;
    }
    const input = buildInput();
    if (input.items.length === 0) {
      toast.error("Add at least one line item");
      return;
    }

    startTransition(async () => {
      try {
        if (isEdit && initialInvoice) {
          await updateInvoice(initialInvoice.id, input);
          if (status === "SENT") {
            await setInvoiceStatus(initialInvoice.id, "SENT");
          }
          toast.success("Invoice updated");
          router.push(`/dashboard/invoices/${initialInvoice.id}`);
        } else {
          const invoice = await createInvoice(input, status);
          toast.success(status === "SENT" ? "Invoice sent" : "Draft saved");
          router.push(`/dashboard/invoices/${invoice.id}`);
        }
        router.refresh();
      } catch {
        toast.error("Something went wrong saving the invoice");
      }
    });
  }

  const previewData = {
    invoiceNumber,
    projectName: selectedProject?.name,
    currency,
    issuedDate,
    dueDate,
    taxRate: Number(taxRate) || 0,
    notes,
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
    client: selectedClient,
    items: items.map((i) => ({
      name: i.name,
      quantity: Number(i.quantity) || 0,
      unit: i.unit,
      cost: Number(i.cost) || 0,
    })),
    paymentDetails,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {isEdit ? "Edit Invoice" : "Create Invoice"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Generate and manage customer invoices quickly and accurately.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => handleSave("DRAFT")}
          >
            {isEdit ? "Save as Draft" : "Save Draft"}
          </Button>
          <Button disabled={pending} onClick={() => handleSave("SENT")}>
            Send Invoice
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Invoice Detail</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Billed To</Label>
                <ClientQuickAdd
                  onCreated={(client) => {
                    setClientList((prev) => [...prev, client]);
                    setClientId(client.id);
                  }}
                />
              </div>
              <Select
                value={clientId}
                onValueChange={(v) => setClientId(v ?? "")}
              >
                <SelectTrigger className="h-auto w-full py-2.5">
                  <SelectValue placeholder="Select a client">
                    {() =>
                      selectedClient
                        ? `${selectedClient.name} · ${selectedClient.email}`
                        : "Select a client"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {clientList.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} · {c.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Invoice Number</Label>
                <Input value={invoiceNumber} readOnly disabled />
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select
                  value={currency}
                  onValueChange={(v) => setCurrency(v ?? "INR")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {() => {
                        const c = CURRENCIES.find((c) => c.code === currency);
                        return c ? `${c.flag} ${c.label}` : currency;
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.flag} {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Issued Date</Label>
                <Input
                  type="date"
                  value={issuedDate}
                  onChange={(e) => setIssuedDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Project</Label>
                <Select
                  value={projectId || "none"}
                  onValueChange={(v) => setProjectId(!v || v === "none" ? "" : v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="No project">
                      {() => selectedProject?.name ?? "No project"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No project</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tax Rate (%)</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.1"
                  value={taxRate}
                  onChange={(e) => setTaxRate(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Items</Label>
              <div className="overflow-hidden rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/60 text-xs text-muted-foreground">
                    <tr>
                      <th className="w-6" />
                      <th className="px-3 py-2 text-left font-medium">Item</th>
                      <th className="px-3 py-2 text-left font-medium">Qty</th>
                      <th className="px-3 py-2 text-left font-medium">Cost</th>
                      <th className="px-3 py-2 text-right font-medium">
                        Amount
                      </th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr key={index} className="border-t">
                        <td className="pl-2 text-muted-foreground">
                          <GripVertical className="size-4" />
                        </td>
                        <td className="px-1 py-1.5">
                          <Input
                            className="h-9 border-0 shadow-none focus-visible:ring-1"
                            value={item.name}
                            placeholder="Website Design"
                            onChange={(e) =>
                              updateItem(index, { name: e.target.value })
                            }
                          />
                        </td>
                        <td className="px-1 py-1.5">
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              min={0}
                              className="h-9 w-16 border-0 shadow-none focus-visible:ring-1"
                              value={item.quantity}
                              onChange={(e) =>
                                updateItem(index, {
                                  quantity: Number(e.target.value),
                                })
                              }
                            />
                            <Input
                              className="h-9 w-16 border-0 shadow-none focus-visible:ring-1"
                              value={item.unit}
                              placeholder="hr"
                              onChange={(e) =>
                                updateItem(index, { unit: e.target.value })
                              }
                            />
                          </div>
                        </td>
                        <td className="px-1 py-1.5">
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            className="h-9 w-24 border-0 shadow-none focus-visible:ring-1"
                            value={item.cost}
                            onChange={(e) =>
                              updateItem(index, {
                                cost: Number(e.target.value),
                              })
                            }
                          />
                        </td>
                        <td className="px-3 py-1.5 text-right font-medium">
                          {(item.quantity * item.cost).toFixed(2)}
                        </td>
                        <td className="pr-2">
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={addItem}
                className="text-primary hover:text-primary"
              >
                <Plus /> Add Item
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Notes / Terms</Label>
              <Textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <div>
          <p className="mb-3 text-sm font-medium text-muted-foreground">
            Invoice Preview
          </p>
          <InvoicePreview data={previewData} />
        </div>
      </div>
    </div>
  );
}
