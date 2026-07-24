"use client";

import { useState, useTransition, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import { Plus, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { createEmployee, updateEmployee } from "@/actions/employees";
import type { PayoutType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

type EmployeeDefaults = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  baseSalary: number;
  defaultPayout: PayoutType;
};

export function EmployeeFormDialog({
  employee,
  trigger,
}: {
  employee?: EmployeeDefaults;
  trigger?: ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const isEdit = Boolean(employee);

  const [payoutType, setPayoutType] = useState<PayoutType>(
    employee?.defaultPayout ?? "FIXED_AMOUNT"
  );

  function handleSubmit(formData: FormData) {
    const input = {
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      role: String(formData.get("role") ?? ""),
      status: String(formData.get("status") ?? "ACTIVE"),
      baseSalary: Number(formData.get("baseSalary") ?? 0),
      defaultPayout: payoutType,
    };

    if (!input.name || !input.email) {
      toast.error("Name and Email are required.");
      return;
    }

    startTransition(async () => {
      try {
        if (isEdit && employee) {
          await updateEmployee(employee.id, input);
          toast.success("Employee updated");
        } else {
          await createEmployee(input);
          toast.success("Employee added");
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
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Add Employee
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Employee" : "Add Employee"}</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              Full Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              name="name"
              defaultValue={employee?.name}
              placeholder="John Doe"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={employee?.email}
                placeholder="john@company.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                name="phone"
                defaultValue={employee?.phone}
                placeholder="+1 555 0192"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="role">
                Role / Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="role"
                name="role"
                defaultValue={employee?.role ?? "Senior Developer"}
                placeholder="Developer / Designer"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select name="status" defaultValue={employee?.status ?? "ACTIVE"}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2 border-t">
            <div className="space-y-2">
              <Label>Compensation Model</Label>
              <Select
                value={payoutType}
                onValueChange={(val) => setPayoutType(val as PayoutType)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FIXED_AMOUNT">Fixed Project Fee</SelectItem>
                  <SelectItem value="PERCENTAGE">Project % Share</SelectItem>
                  <SelectItem value="HOURLY">Hourly Rate</SelectItem>
                  <SelectItem value="MONTHLY_SALARY">Monthly Salary</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="baseSalary">
                {payoutType === "PERCENTAGE"
                  ? "Default % Share"
                  : payoutType === "HOURLY"
                  ? "Hourly Rate"
                  : "Base Amount"}
              </Label>
              <Input
                id="baseSalary"
                name="baseSalary"
                type="number"
                min={0}
                step="0.01"
                defaultValue={employee?.baseSalary ?? 0}
                placeholder={payoutType === "PERCENTAGE" ? "20 (for 20%)" : "25000"}
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : isEdit ? "Save Changes" : "Add Employee"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
