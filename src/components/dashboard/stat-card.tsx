import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  tone = "default",
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  trend?: { value: string; positive: boolean };
  tone?: "default" | "primary" | "success" | "destructive";
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3 px-5 py-4">
        <div className="space-y-1.5">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold tracking-tight">{value}</p>
          {trend && (
            <p
              className={cn(
                "text-xs font-medium",
                trend.positive ? "text-success" : "text-destructive"
              )}
            >
              {trend.positive ? "+" : ""}
              {trend.value}
            </p>
          )}
        </div>
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl",
            tone === "primary" && "bg-primary/10 text-primary",
            tone === "success" && "bg-success/10 text-success",
            tone === "destructive" && "bg-destructive/10 text-destructive",
            tone === "default" && "bg-secondary text-muted-foreground"
          )}
        >
          <Icon className="size-5" />
        </span>
      </CardContent>
    </Card>
  );
}
