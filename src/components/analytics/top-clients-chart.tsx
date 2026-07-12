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

export function TopClientsChart({
  data,
  currency,
}: {
  data: { name: string; revenue: number }[];
  currency: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(data.length * 44, 120)}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
      >
        <CartesianGrid horizontal={false} stroke="var(--color-border)" />
        <XAxis
          type="number"
          tickLine={false}
          axisLine={false}
          tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
          tickFormatter={(v: number) => formatCurrency(v ?? 0, currency).replace(/\.00$/, "")}
        />
        <YAxis
          type="category"
          dataKey="name"
          tickLine={false}
          axisLine={false}
          width={110}
          tick={{ fill: "var(--color-foreground)", fontSize: 12 }}
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
          radius={[0, 4, 4, 0]}
          maxBarSize={20}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
