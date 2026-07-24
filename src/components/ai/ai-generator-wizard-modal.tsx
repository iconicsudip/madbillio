"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Wand2,
  Sparkles,
  Users,
  Briefcase,
  FileText,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  aiParseMultiStepEntities,
  aiExecuteMultiStepCreation,
  getUserAiCreditStatus,
  type ParsedEntities,
} from "@/actions/ai";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const SAMPLE_PROMPTS = [
  "Create client Acme Corp (acme@inc.com), project Mobile App Redesign with budget ₹1,20,000, and an advance invoice for ₹40,000",
  "Bill Sid Vicious $4,500 for Website Development and 10 hours consulting at $150/hr due in 14 days",
  "Create project Brand Identity for client Nike budget €15,000 and initial deposit invoice for €5,000",
];

export function AIGeneratorWizardModal() {
  const [open, setOpen] = useState(false);
  const [credits, setCredits] = useState<{ remainingCredits: number; maxDailyCredits: number } | null>(null);
  const [prompt, setPrompt] = useState("");
  const [step, setStep] = useState<"input" | "preview" | "done">("input");
  const [parsed, setParsed] = useState<ParsedEntities | null>(null);
  const [createdResult, setCreatedResult] = useState<{
    clientId?: string | null;
    projectId?: string | null;
    invoiceId?: string | null;
  } | null>(null);

  const [parsing, startParsingTransition] = useTransition();
  const [executing, startExecutingTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    if (open) {
      getUserAiCreditStatus().then((res) => {
        setCredits({ remainingCredits: res.remainingCredits, maxDailyCredits: res.maxDailyCredits });
      });
    }
  }, [open]);

  function handleAnalyzePrompt(textToAnalyze?: string) {
    const text = textToAnalyze || prompt.trim();
    if (!text || parsing) return;

    startParsingTransition(async () => {
      try {
        const result = await aiParseMultiStepEntities(text);
        setParsed(result);
        setStep("preview");
      } catch (err: any) {
        toast.error(err?.message || "Could not parse prompt with Madko AI.");
      }
    });
  }

  function handleConfirmAndExecute() {
    if (!parsed || executing) return;

    startExecutingTransition(async () => {
      try {
        const result = await aiExecuteMultiStepCreation(parsed);
        setCreatedResult(result);
        setStep("done");
        toast.success("Successfully created all items in database!");
        router.refresh();
      } catch {
        toast.error("Failed to execute multi-step creation.");
      }
    });
  }

  function handleReset() {
    setPrompt("");
    setParsed(null);
    setCreatedResult(null);
    setStep("input");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        nativeButton
        render={
          <Button className="gap-2 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold shadow-md">
            <Wand2 className="size-4" /> Madko AI Wizard
          </Button>
        }
      />
      <DialogContent className="w-[95vw] sm:max-w-xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl font-bold">
              <Sparkles className="size-5 text-primary" />
              Madko AI Step-by-Step Generator
            </DialogTitle>
            <span className="rounded-full bg-primary/15 px-3 py-1 text-[11px] font-bold text-primary flex items-center gap-1">
              ⚡ {credits?.remainingCredits ?? 20}/{credits?.maxDailyCredits ?? 20} Left Today
            </span>
          </div>
        </DialogHeader>

        {/* STEP 1: PROMPT INPUT */}
        {step === "input" && (
          <div className="space-y-4 pt-2 w-full">
            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-semibold text-foreground">
                Enter any text describing what you want Madko AI to create:
              </label>
              <Textarea
                placeholder="e.g. Create client Acme Corp (acme@inc.com), project Website Redesign with budget ₹80,000, and initial invoice for ₹30,000 advance..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                className="w-full rounded-xl border-border bg-background p-3 text-xs sm:text-sm focus-visible:ring-primary"
              />
            </div>

            {/* Sample Prompts */}
            <div className="space-y-2">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Sample Prompts
              </p>
              <div className="space-y-2">
                {SAMPLE_PROMPTS.map((sp, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setPrompt(sp);
                      handleAnalyzePrompt(sp);
                    }}
                    className="w-full rounded-xl border border-border bg-card p-3 text-left text-xs font-medium text-foreground hover:bg-secondary transition-all cursor-pointer flex items-center justify-between group gap-2 leading-relaxed"
                  >
                    <span className="whitespace-normal break-words">{sp}</span>
                    <ArrowRight className="size-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                disabled={parsing || !prompt.trim()}
                onClick={() => handleAnalyzePrompt()}
                className="w-full sm:w-auto gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              >
                {parsing ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Analyzing with Madko AI...
                  </>
                ) : (
                  <>
                    Analyze & Preview Steps <ArrowRight className="size-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: PREVIEW DETECTED ENTITIES STEP-BY-STEP */}
        {step === "preview" && parsed && (
          <div className="space-y-5 pt-2 w-full">
            <div className="rounded-xl bg-primary/10 border border-primary/20 p-3 text-xs text-primary font-medium leading-relaxed">
              Madko AI parsed your prompt into the following step-by-step creation plan. Review details below and click <strong>Confirm & Implement</strong> to save to database.
            </div>

            {/* Detected Entities List */}
            <div className="space-y-3">
              {/* STEP 1: CLIENT */}
              {parsed.client ? (
                <div className="rounded-2xl border bg-card p-4 space-y-2 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 font-bold text-xs">
                        1
                      </span>
                      <span className="flex items-center gap-1.5 font-bold text-sm text-foreground">
                        <Users className="size-4 text-emerald-500" /> Client Creation
                      </span>
                    </div>
                    <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 uppercase">
                      Client
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 text-xs border-t">
                    <div>
                      <span className="text-muted-foreground">Name:</span>{" "}
                      <strong className="text-foreground">{parsed.client.name}</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Email:</span>{" "}
                      <strong className="text-foreground break-all">{parsed.client.email}</strong>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed bg-muted/30 p-3 text-xs text-muted-foreground">
                  Step 1: Client — No new client specified (Will use existing or default client).
                </div>
              )}

              {/* STEP 2: PROJECT */}
              {parsed.project ? (
                <div className="rounded-2xl border bg-card p-4 space-y-2 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex size-7 items-center justify-center rounded-lg bg-primary/15 text-primary font-bold text-xs">
                        2
                      </span>
                      <span className="flex items-center gap-1.5 font-bold text-sm text-foreground">
                        <Briefcase className="size-4 text-primary" /> Project Setup
                      </span>
                    </div>
                    <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-[10px] font-bold text-primary uppercase">
                      Project
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 text-xs border-t">
                    <div>
                      <span className="text-muted-foreground">Project Name:</span>{" "}
                      <strong className="text-foreground">{parsed.project.name}</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Budget:</span>{" "}
                      <strong className="text-foreground font-semibold">
                        {formatCurrency(parsed.project.budget, parsed.invoice?.currency || "INR")}
                      </strong>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed bg-muted/30 p-3 text-xs text-muted-foreground">
                  Step 2: Project — No new project specified.
                </div>
              )}

              {/* STEP 3: INVOICE */}
              {parsed.invoice ? (
                <div className="rounded-2xl border bg-card p-4 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex size-7 items-center justify-center rounded-lg bg-orange-500/15 text-orange-600 font-bold text-xs">
                        3
                      </span>
                      <span className="flex items-center gap-1.5 font-bold text-sm text-foreground">
                        <FileText className="size-4 text-orange-500" /> Invoice Draft
                      </span>
                    </div>
                    <span className="rounded-full bg-orange-500/15 px-2.5 py-0.5 text-[10px] font-bold text-orange-600 uppercase">
                      Invoice
                    </span>
                  </div>

                  <div className="space-y-2 border-t pt-2">
                    <p className="text-xs font-semibold text-muted-foreground">Line Items:</p>
                    <div className="rounded-xl border overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-secondary text-muted-foreground">
                          <tr>
                            <th className="px-3 py-1.5 text-left font-medium">Item</th>
                            <th className="px-3 py-1.5 text-center font-medium">Qty</th>
                            <th className="px-3 py-1.5 text-right font-medium">Cost</th>
                          </tr>
                        </thead>
                        <tbody>
                          {parsed.invoice.items.map((item, idx) => (
                            <tr key={idx} className="border-t">
                              <td className="px-3 py-1.5 font-medium">{item.name}</td>
                              <td className="px-3 py-1.5 text-center">{item.quantity}</td>
                              <td className="px-3 py-1.5 text-right font-semibold">
                                {formatCurrency(item.cost, parsed.invoice?.currency || "INR")}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed bg-muted/30 p-3 text-xs text-muted-foreground">
                  Step 3: Invoice — No invoice items specified.
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep("input")}
                disabled={executing}
                className="gap-1.5 text-xs"
              >
                <ArrowLeft className="size-3.5" /> Back to Prompt
              </Button>

              <Button
                disabled={executing}
                onClick={handleConfirmAndExecute}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-md"
              >
                {executing ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Creating in Database...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="size-4" /> Confirm & Implement All
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: DONE / SUCCESS CONFIRMATION */}
        {step === "done" && createdResult && (
          <div className="space-y-5 pt-2 text-center w-full">
            <div className="flex flex-col items-center justify-center gap-3">
              <span className="flex size-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 shadow-md">
                <CheckCircle2 className="size-10" />
              </span>
              <h3 className="text-lg sm:text-xl font-bold tracking-tight">
                Items Successfully Created!
              </h3>
              <p className="text-xs text-muted-foreground max-w-md">
                Madko AI has created and saved the parsed entities directly into your database.
              </p>
            </div>

            <div className="grid gap-3 grid-cols-1 sm:grid-cols-3 pt-2 text-xs">
              {createdResult.clientId && (
                <a
                  href="/dashboard/clients"
                  className="flex flex-col items-center justify-center p-4 rounded-2xl border bg-card hover:bg-secondary transition-colors"
                >
                  <Users className="size-6 text-emerald-500 mb-1" />
                  <span className="font-semibold text-foreground">View Client</span>
                  <span className="text-[10px] text-muted-foreground">In Client Directory</span>
                </a>
              )}
              {createdResult.projectId && (
                <a
                  href={`/dashboard/projects/${createdResult.projectId}`}
                  className="flex flex-col items-center justify-center p-4 rounded-2xl border bg-card hover:bg-secondary transition-colors"
                >
                  <Briefcase className="size-6 text-primary mb-1" />
                  <span className="font-semibold text-foreground">View Project</span>
                  <span className="text-[10px] text-muted-foreground">Project Details</span>
                </a>
              )}
              {createdResult.invoiceId && (
                <a
                  href={`/dashboard/invoices/${createdResult.invoiceId}`}
                  className="flex flex-col items-center justify-center p-4 rounded-2xl border bg-card hover:bg-secondary transition-colors"
                >
                  <FileText className="size-6 text-orange-500 mb-1" />
                  <span className="font-semibold text-foreground">View Invoice</span>
                  <span className="text-[10px] text-muted-foreground">Invoice Editor & Preview</span>
                </a>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button onClick={handleReset} variant="outline" size="sm">
                Create Another Item
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
