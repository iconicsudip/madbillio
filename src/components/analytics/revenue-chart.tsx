"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartTooltip } from "@/components/analytics/chart-tooltip";
import { formatCurrency } from "@/lib/format";

export function RevenueChart({
  data,
  currency,
}: {
  data: { month: string; revenue: number }[];
  currency: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid
          vertical={false}
          stroke="var(--color-border)"
          strokeDasharray="0"
        />
        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={false}
          tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={48}
          tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
          tickFormatter={(v: number) => formatCurrency(v ?? 0, currency).replace(/\.00$/, "")}
        />
        <Tooltip
          cursor={{ fill: "var(--color-secondary)" }}
          content={
            <ChartTooltip formatter={(v) => formatCurrency(v, currency)} />
          }
        />
        <Bar
          dataKey="revenue"
          name="Revenue"
          fill="var(--color-chart-1)"
          radius={[4, 4, 0, 0]}
          maxBarSize={28}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
