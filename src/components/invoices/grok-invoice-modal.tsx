"use client";

import { useState, useTransition, type ReactElement } from "react";
import { Sparkles, Bot, Loader2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { aiDraftInvoice } from "@/actions/ai";
import type { GrokInvoiceDraft } from "@/lib/grok";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

interface GrokInvoiceModalProps {
  onDraftGenerated: (draft: GrokInvoiceDraft) => void;
  trigger?: ReactElement;
}

const SAMPLE_PROMPTS = [
  "Invoice Acme Corp ₹25,000 for website redesign with 50% deposit and 2 milestones",
  "Bill TechCorp $4,500 for UI/UX Consulting (40 hrs @ $100/hr + $500 setup fee)",
  "Draft invoice for monthly SEO retainer ₹15,000 due in 15 days with tax included",
];

export function GrokInvoiceModal({
  onDraftGenerated,
  trigger,
}: GrokInvoiceModalProps) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [pending, startTransition] = useTransition();

  function handleGenerate() {
    if (!prompt.trim()) {
      toast.error("Please enter a description for Madbillio AI.");
      return;
    }

    startTransition(async () => {
      try {
        const draft = await aiDraftInvoice(prompt);
        if (draft.error) {
          toast.error(draft.error);
          return;
        }
        onDraftGenerated(draft);
        toast.success("Invoice drafted with Madko AI!");
        setOpen(false);
        setPrompt("");
      } catch (err) {
        console.error(err);
        toast.error("Failed to generate draft with Madko AI.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        nativeButton
        render={
          trigger ?? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2 border-primary/40 bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary cursor-pointer font-medium"
            >
              <Sparkles className="h-4 w-4 text-primary animate-pulse" />
              Draft with Madko AI
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2 text-primary">
            <Bot className="h-6 w-6" />
            <DialogTitle className="text-lg font-bold">Madko AI Billing Assistant</DialogTitle>
          </div>
          <p className="text-xs text-muted-foreground">
            Describe what you want to bill in plain language. Madko AI will auto-fill client details, itemized line items, rates, and terms.
          </p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Textarea
              placeholder="e.g., Bill Acme Corp $3,500 for Website Redesign (Design 20 hrs @ $100/hr, Backend Dev $1,500) due in 14 days"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              className="text-sm focus-visible:ring-primary/40"
            />
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <Wand2 className="h-3 w-3" /> Quick Examples:
            </p>
            <div className="flex flex-col gap-1.5">
              {SAMPLE_PROMPTS.map((sample, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPrompt(sample)}
                  className="text-left text-xs bg-muted/40 hover:bg-muted/80 p-2 rounded border border-border/40 transition-colors text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  &ldquo;{sample}&rdquo;
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleGenerate}
            disabled={pending || !prompt.trim()}
            className="gap-2"
          >
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Madbillio AI is thinking...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> Generate Invoice Draft
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
