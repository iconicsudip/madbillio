"use client";

import {
  useState,
  useTransition,
  type ChangeEvent,
  type ReactElement,
} from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import {
  createPaymentDetail,
  updatePaymentDetail,
  type PaymentDetailInput,
} from "@/actions/payment-details";
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

const TYPES = [
  { value: "BANK", label: "Bank Account" },
  { value: "UPI", label: "UPI" },
  { value: "LINK", label: "Payment Link" },
  { value: "QR_CODE", label: "QR Code" },
  { value: "OTHER", label: "Other" },
];

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

type PaymentDetailDefaults = {
  id: string;
  label: string;
  type: string;
  details: string;
  imageUrl: string | null;
};

export function PaymentDetailFormDialog({
  detail,
  trigger,
}: {
  detail?: PaymentDetailDefaults;
  trigger?: ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [imageUrl, setImageUrl] = useState<string | null>(
    detail?.imageUrl ?? null
  );
  const router = useRouter();
  const isEdit = Boolean(detail);

  function handleImageChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("Image must be under 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImageUrl(reader.result as string);
    reader.readAsDataURL(file);
  }

  function handleSubmit(formData: FormData) {
    const input: PaymentDetailInput = {
      label: String(formData.get("label") ?? ""),
      type: formData.get("type") as PaymentDetailInput["type"],
      details: String(formData.get("details") ?? ""),
      imageUrl,
    };
    if (!input.label) {
      toast.error("Give this payment method a name");
      return;
    }

    startTransition(async () => {
      try {
        if (isEdit && detail) {
          await updatePaymentDetail(detail.id, input);
          toast.success("Payment method updated");
        } else {
          await createPaymentDetail(input);
          toast.success("Payment method added");
        }
        setOpen(false);
        router.refresh();
      } catch {
        toast.error("Something went wrong");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        nativeButton={trigger ? undefined : true}
        render={
          trigger ?? (
            <Button variant="outline">
              <Plus /> Add Payment Method
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Payment Method" : "Add Payment Method"}
          </DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="label">Name</Label>
              <Input
                id="label"
                name="label"
                defaultValue={detail?.label}
                placeholder="HDFC Bank"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select name="type" defaultValue={detail?.type ?? "BANK"}>
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(value: string | null) =>
                      TYPES.find((t) => t.value === value)?.label ??
                      "Bank Account"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="details">Details</Label>
            <Textarea
              id="details"
              name="details"
              defaultValue={detail?.details}
              placeholder="Account number, UPI ID, or payment link"
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label>QR Code / Image (optional)</Label>
            {imageUrl ? (
              <div className="relative inline-block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt="Payment QR"
                  className="size-28 rounded-lg border object-cover"
                />
                <button
                  type="button"
                  onClick={() => setImageUrl(null)}
                  className="absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ) : (
              <Input type="file" accept="image/*" onChange={handleImageChange} />
            )}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : isEdit ? "Save Changes" : "Add Method"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
