"use client";

import { useState, useTransition, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import { DollarSign, Send } from "lucide-react";
import { toast } from "sonner";
import { recordEmployeePayout } from "@/actions/employees";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDateInput } from "@/lib/format";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface RecordPayoutDialogProps {
  employeeId: string;
  employeeName: string;
  suggestedAmount?: number;
  projects?: Array<{ id: string; name: string }>;
  defaultProjectId?: string;
  trigger?: ReactElement;
}

export function RecordPayoutDialog({
  employeeId,
  employeeName,
  suggestedAmount = 0,
  projects = [],
  defaultProjectId,
  trigger,
}: RecordPayoutDialogProps) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(formData: FormData) {
    const input = {
      employeeId,
      projectId: (formData.get("projectId") as string) || null,
      amount: Number(formData.get("amount") ?? 0),
      reason: String(formData.get("reason") ?? ""),
      date: String(formData.get("date") ?? formatDateInput(new Date())),
    };

    if (input.amount <= 0) {
      toast.error("Please enter a valid payout amount.");
      return;
    }

    startTransition(async () => {
      try {
        await recordEmployeePayout(input);
        toast.success(`Recorded payout to ${employeeName}`);
        setOpen(false);
        router.refresh();
      } catch {
        toast.error("Failed to record payout.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        nativeButton
        render={
          trigger ?? (
            <Button size="sm" variant="outline" className="gap-1.5 text-xs">
              <DollarSign className="h-3.5 w-3.5" /> Record Payout
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Process Payout to {employeeName}</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">
              Payout Amount <span className="text-destructive">*</span>
            </Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              min={0.01}
              step="0.01"
              defaultValue={suggestedAmount > 0 ? suggestedAmount : undefined}
              placeholder="e.g. 15000"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Linked Project (Optional)</Label>
            <Select name="projectId" defaultValue={defaultProjectId ?? undefined}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="General Payroll (No project)" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason / Note</Label>
            <Input
              id="reason"
              name="reason"
              placeholder="e.g. Website Redesign Milestone 1 Payout"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">
              Payment Date <span className="text-destructive">*</span>
            </Label>
            <Input
              id="date"
              name="date"
              type="date"
              defaultValue={formatDateInput(new Date())}
              required
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="submit" disabled={pending} className="gap-2">
              <Send className="h-4 w-4" />
              {pending ? "Processing..." : "Confirm Payout"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
