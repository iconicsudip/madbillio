"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartTooltip } from "@/components/analytics/chart-tooltip";
import { formatCurrency } from "@/lib/format";

export function PnlChart({
  data,
  currency,
}: {
  data: { month: string; income: number; expense: number }[];
  currency: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={280}>
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
        <Tooltip
          cursor={{ fill: "var(--color-secondary)" }}
          content={
            <ChartTooltip formatter={(v) => formatCurrency(v, currency)} />
          }
        />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value) => (
            <span className="text-xs text-muted-foreground">{value}</span>
          )}
        />
        <Bar
          dataKey="income"
          name="Income"
          fill="var(--color-success)"
          radius={[4, 4, 0, 0]}
          maxBarSize={20}
        />
        <Bar
          dataKey="expense"
          name="Expense"
          fill="var(--color-destructive)"
          radius={[4, 4, 0, 0]}
          maxBarSize={20}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
