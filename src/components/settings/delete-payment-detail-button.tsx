"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deletePaymentDetail } from "@/actions/payment-details";

export function DeletePaymentDetailButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await deletePaymentDetail(id);
          toast.success("Payment method removed");
          router.refresh();
        })
      }
      className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
    >
      <Trash2 className="size-4" />
    </button>
  );
}
