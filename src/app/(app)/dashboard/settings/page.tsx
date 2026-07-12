import { Pencil } from "lucide-react";
import { requireUserId, getBusinessProfile } from "@/lib/session";
import { listPaymentDetails } from "@/actions/payment-details";
import { BusinessProfileForm } from "@/components/settings/business-profile-form";
import { PaymentDetailFormDialog } from "@/components/settings/payment-detail-form-dialog";
import { DeletePaymentDetailButton } from "@/components/settings/delete-payment-detail-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const TYPE_LABELS: Record<string, string> = {
  BANK: "Bank Account",
  UPI: "UPI",
  LINK: "Payment Link",
  QR_CODE: "QR Code",
  OTHER: "Other",
};

export default async function SettingsPage() {
  const userId = await requireUserId();
  const [profile, paymentDetails] = await Promise.all([
    getBusinessProfile(userId),
    listPaymentDetails(),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          These details appear on every invoice you generate.
        </p>
      </div>
      <BusinessProfileForm profile={profile} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Payment Methods</CardTitle>
          <PaymentDetailFormDialog />
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Add any bank account, UPI ID, payment link, or QR code you want
            shown on invoices. These appear read-only on every invoice.
          </p>
          {paymentDetails.length === 0 ? (
            <p className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
              No payment methods yet.
            </p>
          ) : (
            <div className="space-y-2">
              {paymentDetails.map((detail) => (
                <div
                  key={detail.id}
                  className="flex items-center gap-3 rounded-lg border p-3"
                >
                  {detail.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={detail.imageUrl}
                      alt={detail.label}
                      className="size-12 shrink-0 rounded-md border object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{detail.label}</span>
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                        {TYPE_LABELS[detail.type]}
                      </span>
                    </div>
                    {detail.details && (
                      <p className="truncate text-sm text-muted-foreground">
                        {detail.details}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <PaymentDetailFormDialog
                      detail={detail}
                      trigger={
                        <button
                          type="button"
                          className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
                        >
                          <Pencil className="size-4" />
                        </button>
                      }
                    />
                    <DeletePaymentDetailButton id={detail.id} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
