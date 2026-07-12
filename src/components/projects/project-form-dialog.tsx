"use client";

import { useState, useTransition, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { createProject, updateProject } from "@/actions/projects";
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

type ClientOption = { id: string; name: string };

const STATUS_LABELS = {
  ACTIVE: "Active",
  ON_HOLD: "On Hold",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

type ProjectDefaults = {
  id: string;
  name: string;
  description: string;
  clientId: string | null;
  status: "ACTIVE" | "ON_HOLD" | "COMPLETED" | "CANCELLED";
  budget: number;
  startDate: Date;
  endDate: Date | null;
};

export function ProjectFormDialog({
  clients,
  project,
  trigger,
}: {
  clients: ClientOption[];
  project?: ProjectDefaults;
  trigger?: ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const isEdit = Boolean(project);

  function handleSubmit(formData: FormData) {
    const input = {
      name: String(formData.get("name") ?? ""),
      description: String(formData.get("description") ?? ""),
      clientId: (formData.get("clientId") as string) || null,
      status: formData.get("status") as ProjectDefaults["status"],
      budget: Number(formData.get("budget") ?? 0),
      startDate: String(formData.get("startDate") ?? ""),
      endDate: (formData.get("endDate") as string) || null,
    };

    startTransition(async () => {
      try {
        if (isEdit && project) {
          await updateProject(project.id, input);
          toast.success("Project updated");
        } else {
          await createProject(input);
          toast.success("Project created");
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
            <Button>
              <Plus /> New Project
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Project" : "New Project"}</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Project Name</Label>
            <Input
              id="name"
              name="name"
              defaultValue={project?.name}
              placeholder="Website Redesign"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Client</Label>
              <Select name="clientId" defaultValue={project?.clientId ?? undefined}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select client">
                    {(value: string | null) =>
                      clients.find((c) => c.id === value)?.name ?? "Select client"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select name="status" defaultValue={project?.status ?? "ACTIVE"}>
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(value: string | null) =>
                      STATUS_LABELS[value as keyof typeof STATUS_LABELS] ?? "Active"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="ON_HOLD">On Hold</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                name="startDate"
                type="date"
                defaultValue={
                  project ? formatDateInput(project.startDate) : formatDateInput(new Date())
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="budget">Budget</Label>
              <Input
                id="budget"
                name="budget"
                type="number"
                min={0}
                step="0.01"
                defaultValue={project?.budget ?? 0}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={project?.description}
              placeholder="Brief project scope..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : isEdit ? "Save Changes" : "Create Project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
