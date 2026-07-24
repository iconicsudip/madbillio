"use client";

import { useState, useTransition, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { createExpense, updateExpense } from "@/actions/expenses";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { formatDateInput } from "@/lib/format";

const CATEGORIES = [
  "Software & Tools",
  "Contractors",
  "Marketing",
  "Office & Supplies",
  "Travel",
  "Hosting & Infrastructure",
  "Taxes & Fees",
  "Other",
];

type ExpenseDefaults = {
  id: string;
  category: string;
  description: string;
  amount: number;
  date: Date;
  projectId: string | null;
};

export function ExpenseFormDialog({
  projects,
  defaultProjectId,
  expense,
  trigger,
}: {
  projects: { id: string; name: string }[];
  defaultProjectId?: string;
  expense?: ExpenseDefaults;
  trigger?: ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const isEdit = Boolean(expense);

  function handleSubmit(formData: FormData) {
    const input = {
      category: String(formData.get("category") ?? "Other"),
      description: String(formData.get("description") ?? ""),
      amount: Number(formData.get("amount") ?? 0),
      date: String(formData.get("date") ?? ""),
      projectId: (formData.get("projectId") as string) || null,
    };

    startTransition(async () => {
      try {
        if (isEdit && expense) {
          await updateExpense(expense.id, input);
          toast.success("Expense updated");
        } else {
          await createExpense(input);
          toast.success("Expense added");
        }
        setOpen(false);
        router.refresh();
      } catch {
        toast.error("Something went wrong");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        nativeButton
        render={
          trigger ?? (
            <Button variant="outline">
              <Plus /> Add Expense
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Expense" : "Add Expense"}</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                Category <span className="text-destructive">*</span>
              </Label>
              <Select name="category" defaultValue={expense?.category ?? CATEGORIES[0]}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">
                Amount <span className="text-destructive">*</span>
              </Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                min={0}
                step="0.01"
                defaultValue={expense?.amount}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">
                Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="date"
                name="date"
                type="date"
                defaultValue={formatDateInput(expense?.date ?? new Date())}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Project</Label>
              <Select
                name="projectId"
                defaultValue={expense?.projectId ?? defaultProjectId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="None">
                    {(value: string | null) =>
                      projects.find((p) => p.id === value)?.name ?? "None"
                    }
                  </SelectValue>
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
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="What was this for?"
              defaultValue={expense?.description}
              rows={2}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : isEdit ? "Save Changes" : "Add Expense"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
