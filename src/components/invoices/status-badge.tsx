import { cn } from "@/lib/utils";
import type { InvoiceStatus } from "@/generated/prisma/client";

const STYLES: Record<InvoiceStatus, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  SENT: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  PARTIALLY_PAID: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  PAID: "bg-success/10 text-success",
  OVERDUE: "bg-destructive/10 text-destructive",
  CANCELLED: "bg-muted text-muted-foreground line-through",
};

const LABELS: Record<InvoiceStatus, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  PARTIALLY_PAID: "Partially Paid",
  PAID: "Paid",
  OVERDUE: "Overdue",
  CANCELLED: "Cancelled",
};

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        STYLES[status]
      )}
    >
      {LABELS[status]}
    </span>
  );
}
