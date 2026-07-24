"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintInvoiceButton({ invoiceId }: { invoiceId: string }) {
  function handlePrint() {
    const printWindow = window.open(`/dashboard/invoices/${invoiceId}`, "_blank");
    if (printWindow) {
      printWindow.addEventListener("load", () => {
        try {
          printWindow.print();
        } catch {
          // Ignore popup print blocking
        }
      });
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={handlePrint}
      title="Print Invoice"
      className="text-muted-foreground hover:text-foreground cursor-pointer"
    >
      <Printer className="size-4" />
    </Button>
  );
}
