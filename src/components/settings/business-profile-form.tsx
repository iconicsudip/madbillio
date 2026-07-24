"use client";

import { useState, useTransition, type ChangeEvent } from "react";
import { toast } from "sonner";
import { X, Zap } from "lucide-react";
import { updateBusinessProfile } from "@/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CURRENCIES } from "@/lib/format";

const MAX_LOGO_BYTES = 1.5 * 1024 * 1024;

type Profile = {
  businessName: string;
  address: string;
  phone: string;
  email: string;
  logoUrl: string | null;
  bankName: string;
  bankAccountNumber: string;
  wiseEmail: string;
  defaultCurrency: string;
  defaultTaxRate: number;
  invoiceNotes: string;
};

export function BusinessProfileForm({ profile }: { profile: Profile }) {
  const [pending, startTransition] = useTransition();
  const [logoUrl, setLogoUrl] = useState<string | null>(profile.logoUrl);
  const [invoiceNotes, setInvoiceNotes] = useState<string>(profile.invoiceNotes);

  function handleLogoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_LOGO_BYTES) {
      toast.error("Logo must be under 1.5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setLogoUrl(reader.result as string);
    reader.readAsDataURL(file);
  }

  function handleSubmit(formData: FormData) {
    const input = {
      businessName: String(formData.get("businessName") ?? ""),
      address: String(formData.get("address") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      email: String(formData.get("email") ?? ""),
      logoUrl,
      bankName: String(formData.get("bankName") ?? ""),
      bankAccountNumber: String(formData.get("bankAccountNumber") ?? ""),
      wiseEmail: String(formData.get("wiseEmail") ?? ""),
      defaultCurrency: String(formData.get("defaultCurrency") ?? "INR"),
      defaultTaxRate: Number(formData.get("defaultTaxRate") ?? 0),
      invoiceNotes: invoiceNotes,
    };
    startTransition(async () => {
      try {
        await updateBusinessProfile(input);
        toast.success("Settings saved");
      } catch {
        toast.error("Could not save settings");
      }
    });
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Business Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Logo</Label>
            <div className="flex items-center gap-3">
              <span className="flex size-14 items-center justify-center overflow-hidden rounded-full bg-primary text-primary-foreground">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoUrl}
                    alt="Business logo"
                    className="size-full object-cover rounded-full"
                  />
                ) : (
                  <Zap className="size-6" fill="currentColor" />
                )}
              </span>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="max-w-56"
                />
                {logoUrl && (
                  <button
                    type="button"
                    onClick={() => setLogoUrl(null)}
                    className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Shown on every invoice. Falls back to the default mark if left
              empty.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="businessName">
              Business Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="businessName"
              name="businessName"
              defaultValue={profile.businessName}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input id="address" name="address" defaultValue={profile.address} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" defaultValue={profile.phone} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={profile.email}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment Info</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="bankName">Bank Name</Label>
            <Input id="bankName" name="bankName" defaultValue={profile.bankName} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bankAccountNumber">Account Number</Label>
            <Input
              id="bankAccountNumber"
              name="bankAccountNumber"
              defaultValue={profile.bankAccountNumber}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wiseEmail">Wise Email</Label>
            <Input
              id="wiseEmail"
              name="wiseEmail"
              defaultValue={profile.wiseEmail}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invoice Defaults</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Default Currency</Label>
              <Select name="defaultCurrency" defaultValue={profile.defaultCurrency}>
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(value: string | null) => {
                      const c = CURRENCIES.find((c) => c.code === value);
                      return c ? `${c.flag} ${c.label}` : value;
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
            <div className="space-y-2">
              <Label htmlFor="defaultTaxRate">Default Tax Rate (%)</Label>
              <Input
                id="defaultTaxRate"
                name="defaultTaxRate"
                type="number"
                min={0}
                step="0.1"
                defaultValue={profile.defaultTaxRate}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="invoiceNotes">Default Notes / Terms</Label>
            <RichTextEditor
              value={invoiceNotes}
              onChange={setInvoiceNotes}
              placeholder="Default notes or terms for new invoices..."
            />
            <input type="hidden" name="invoiceNotes" value={invoiceNotes} />
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  );
}
