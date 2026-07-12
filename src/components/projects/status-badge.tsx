import { cn } from "@/lib/utils";
import type { ProjectStatus } from "@prisma/client";

const STYLES: Record<ProjectStatus, string> = {
  ACTIVE: "bg-success/10 text-success",
  ON_HOLD: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  COMPLETED: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  CANCELLED: "bg-muted text-muted-foreground line-through",
};

const LABELS: Record<ProjectStatus, string> = {
  ACTIVE: "Active",
  ON_HOLD: "On Hold",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
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
