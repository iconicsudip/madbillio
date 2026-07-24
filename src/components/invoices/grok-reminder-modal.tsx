"use client";

import { useState, useTransition, type ReactElement } from "react";
import { Sparkles, Mail, Copy, Check, Bot, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { aiGeneratePaymentReminder } from "@/actions/ai";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface GrokReminderModalProps {
  invoiceNumber: string;
  clientName: string;
  amountDue: string;
  dueDate: string;
  clientEmail?: string;
  trigger?: ReactElement;
}

export function GrokReminderModal({
  invoiceNumber,
  clientName,
  amountDue,
  dueDate,
  clientEmail,
  trigger,
}: GrokReminderModalProps) {
  const [open, setOpen] = useState(false);
  const [tone, setTone] = useState<"friendly" | "professional" | "firm" | "urgent">("professional");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleGenerateReminder(selectedTone = tone) {
    startTransition(async () => {
      try {
        const reminder = await aiGeneratePaymentReminder(
          invoiceNumber,
          clientName,
          amountDue,
          dueDate,
          selectedTone
        );
        setSubject(reminder.subject);
        setBody(reminder.body);
        toast.success("AI Payment reminder generated!");
      } catch (err) {
        console.error(err);
        toast.error("Failed to generate reminder.");
      }
    });
  }

  function handleOpenChange(isOpen: boolean) {
    setOpen(isOpen);
    if (isOpen && !body) {
      handleGenerateReminder(tone);
    }
  }

  function handleCopy() {
    const textToCopy = `Subject: ${subject}\n\n${body}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        nativeButton
        render={
          trigger ?? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2 border-primary/40 text-primary hover:bg-primary/10 cursor-pointer"
            >
              <Sparkles className="h-4 w-4 text-primary animate-pulse" />
              AI Reminder
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2 text-primary">
            <Bot className="h-5 w-5" />
            <DialogTitle className="text-base font-bold">
              Madko AI Payment Reminder Generator
            </DialogTitle>
          </div>
          <p className="text-xs text-muted-foreground">
            Generate customized, high-converting payment notice emails for {clientName}.
          </p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-center gap-4">
            <div className="flex-1 space-y-1.5">
              <Label className="text-xs">Select Tone</Label>
              <Select
                value={tone}
                onValueChange={(val) => {
                  const t = val as typeof tone;
                  setTone(t);
                  handleGenerateReminder(t);
                }}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select tone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="friendly">Friendly & Polite</SelectItem>
                  <SelectItem value="professional">Standard Professional</SelectItem>
                  <SelectItem value="firm">Firm & Formal</SelectItem>
                  <SelectItem value="urgent">Urgent Overdue Notice</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleGenerateReminder(tone)}
              disabled={pending}
              className="mt-6 h-9 gap-1.5 text-xs"
            >
              {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Regenerate
            </Button>
          </div>

          {pending ? (
            <div className="min-h-[160px] flex items-center justify-center rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground animate-pulse">
              <Loader2 className="h-5 w-5 animate-spin text-primary mr-2" />
              Madbillio AI is drafting reminder email...
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="rem-subject" className="text-xs font-semibold">
                  Email Subject
                </Label>
                <Input
                  id="rem-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="rem-body" className="text-xs font-semibold">
                  Email Body
                </Label>
                <Textarea
                  id="rem-body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={7}
                  className="text-xs font-sans leading-relaxed"
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {clientEmail && (
            <a
              href={`mailto:${clientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mr-auto"
            >
              <Button type="button" variant="outline" size="sm" className="gap-1.5 text-xs">
                <Mail className="h-3.5 w-3.5" /> Open in Email App
              </Button>
            </a>
          )}
          <Button
            type="button"
            onClick={handleCopy}
            disabled={pending || !body}
            size="sm"
            className="gap-1.5 text-xs"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied!" : "Copy Email"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
