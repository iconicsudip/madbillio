"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartTooltip } from "@/components/analytics/chart-tooltip";
import { formatCurrency } from "@/lib/format";

export function NetProfitChart({
  data,
  currency,
}: {
  data: { month: string; net: number }[];
  currency: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--color-border)" />
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
        <ReferenceLine y={0} stroke="var(--color-baseline, var(--color-border))" />
        <Tooltip
          cursor={{ fill: "var(--color-secondary)" }}
          content={
            <ChartTooltip formatter={(v) => formatCurrency(v, currency)} />
          }
        />
        <Bar dataKey="net" name="Net Profit" radius={[4, 4, 4, 4]} maxBarSize={24}>
          {data.map((entry, index) => (
            <Cell
              key={index}
              fill={
                entry.net >= 0
                  ? "var(--color-success)"
                  : "var(--color-destructive)"
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
