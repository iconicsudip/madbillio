"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MoreVertical, Pencil, Printer, Send, Trash2, Ban } from "lucide-react";
import { toast } from "sonner";
import { deleteInvoice, setInvoiceStatus } from "@/actions/invoices";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { InvoiceStatus } from "@/generated/prisma/client";

export function InvoiceActions({
  id,
  status,
}: {
  id: string;
  status: InvoiceStatus;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function changeStatus(next: InvoiceStatus) {
    startTransition(async () => {
      await setInvoiceStatus(id, next);
      toast.success(`Invoice marked ${next.toLowerCase().replace("_", " ")}`);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
      {status === "DRAFT" && (
        <Button size="sm" disabled={pending} onClick={() => changeStatus("SENT")}>
          <Send /> Send Invoice
        </Button>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={() => window.print()}
      >
        <Printer /> Print
      </Button>
      <Button
        render={<Link href={`/dashboard/invoices/${id}/edit`} />}
        variant="outline"
        size="sm"
      >
        <Pencil /> Edit
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger
          nativeButton
          render={<Button variant="outline" size="icon" className="size-9" />}
        >
          <MoreVertical />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {status !== "CANCELLED" && (
            <DropdownMenuItem onClick={() => changeStatus("CANCELLED")}>
              <Ban /> Cancel Invoice
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={(e) => e.preventDefault()}
                />
              }
            >
              <Trash2 /> Delete Invoice
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this invoice?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove the invoice and its payment
                  history. This can&apos;t be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() =>
                    startTransition(async () => {
                      await deleteInvoice(id);
                      toast.success("Invoice deleted");
                      router.push("/dashboard/invoices");
                    })
                  }
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
