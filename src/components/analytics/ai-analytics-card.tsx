"use client";

import { useState, useTransition, useEffect } from "react";
import { Sparkles, TrendingUp, ShieldAlert, CheckCircle2, RefreshCw, Zap } from "lucide-react";
import { toast } from "sonner";
import { getAiAnalyticsInsights, AIAnalyticsInsightsPayload } from "@/actions/ai";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";

export function AIAnalyticsCard({ currency }: { currency: string }) {
  const [insights, setInsights] = useState<AIAnalyticsInsightsPayload | null>(null);
  const [pending, startTransition] = useTransition();

  function loadInsights() {
    startTransition(async () => {
      try {
        const res = await getAiAnalyticsInsights();
        setInsights(res);
      } catch (err: any) {
        console.error("AI Analytics Insights error:", err);
      }
    });
  }

  useEffect(() => {
    loadInsights();
  }, []);

  return (
    <div className="rounded-3xl border border-primary/20 bg-gradient-to-br from-card via-card to-amber-500/5 p-6 shadow-md transition-all">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md">
            <Sparkles className="size-5 animate-pulse" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-foreground">Madko AI Financial Insights & Forecast</h2>
              <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                ⚡ Real-Time Intelligence
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Automated financial health evaluation, DSO rating, and revenue projections.
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={loadInsights}
          disabled={pending}
          className="h-8 text-xs gap-1.5 rounded-xl cursor-pointer"
        >
          <RefreshCw className={`size-3.5 ${pending ? "animate-spin" : ""}`} />
          {pending ? "Analyzing..." : "Refresh Insights"}
        </Button>
      </div>

      {pending && !insights ? (
        <div className="py-12 flex flex-col items-center justify-center gap-3 text-center text-xs text-muted-foreground animate-pulse">
          <RefreshCw className="size-6 animate-spin text-primary" />
          <span>Madko AI is calculating revenue forecasts & collection metrics...</span>
        </div>
      ) : insights ? (
        <div className="mt-5 space-y-5 text-xs">
          {/* Executive Summary */}
          <div className="rounded-2xl bg-muted/40 p-4 border border-border/40 space-y-1.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
              <Zap className="size-3.5" /> AI Executive Summary
            </p>
            <p className="text-foreground leading-relaxed font-medium">
              {insights.executiveSummary}
            </p>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid gap-3 sm:grid-cols-3">
            {/* Projected Next Month Revenue */}
            <div className="rounded-2xl border bg-card p-4 space-y-1 shadow-2xs">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase flex items-center gap-1">
                <TrendingUp className="size-3.5 text-emerald-500" /> Next Month Forecast
              </span>
              <p className="text-lg font-extrabold text-foreground">
                {formatCurrency(insights.projectedNextMonthRevenue, currency)}
              </p>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                Based on 6-mo trend & active budgets
              </p>
            </div>

            {/* DSO Collection Health */}
            <div className="rounded-2xl border bg-card p-4 space-y-1 shadow-2xs">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                Collection DSO Speed
              </span>
              <div className="flex items-center gap-2">
                <p className="text-lg font-extrabold text-foreground">
                  ~{insights.dsoDays} Days
                </p>
                <span
                  className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                    insights.dsoRating === "EXCELLENT"
                      ? "bg-emerald-500/15 text-emerald-600"
                      : insights.dsoRating === "GOOD"
                      ? "bg-blue-500/15 text-blue-600"
                      : "bg-amber-500/15 text-amber-600"
                  }`}
                >
                  {insights.dsoRating.replace("_", " ")}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground">Days Sales Outstanding rating</p>
            </div>

            {/* Client Concentration Risk */}
            <div className="rounded-2xl border bg-card p-4 space-y-1 shadow-2xs">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase flex items-center gap-1">
                <ShieldAlert className="size-3.5 text-amber-500" /> Client Concentration
              </span>
              <p className="text-xs font-semibold text-foreground truncate">
                {insights.clientConcentrationRisk}
              </p>
              <p className="text-[10px] text-muted-foreground">Account dependency level</p>
            </div>
          </div>

          {/* AI Recommendations */}
          <div className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Smart AI Action Recommendations
            </p>
            <div className="grid gap-2 sm:grid-cols-3">
              {insights.recommendations.map((rec, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 rounded-xl border bg-card p-3 shadow-2xs"
                >
                  <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-foreground font-medium leading-normal">{rec}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
