"use client";

import { useState, useTransition, useRef, type ChangeEvent, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Upload, FileText, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";
import { createProject, updateProject, type ProjectDocumentInput } from "@/actions/projects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DocumentViewerModal } from "@/components/projects/document-viewer-modal";
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
  documents?: Array<{ id?: string; name: string; url: string; fileType?: string | null }>;
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [documents, setDocuments] = useState<ProjectDocumentInput[]>(
    project?.documents?.map((d) => ({
      id: d.id,
      name: d.name,
      url: d.url,
      fileType: d.fileType ?? "DOCUMENT",
    })) ?? []
  );

  function handleAddEmptyDocument() {
    setDocuments((prev) => [
      ...prev,
      { name: "New Document", url: "", fileType: "LINK" },
    ]);
  }

  function handleFileUpload(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      // 5MB limit for inline file data URL storage
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`File "${file.name}" exceeds 5MB limit.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const fileExt = file.name.split(".").pop()?.toUpperCase() || "DOCUMENT";

        setDocuments((prev) => [
          ...prev,
          {
            name: file.name,
            url: dataUrl,
            fileType: fileExt,
          },
        ]);
        toast.success(`Attached ${file.name}`);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleDocumentChange(
    index: number,
    field: keyof ProjectDocumentInput,
    value: string
  ) {
    setDocuments((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  }

  function handleRemoveDocument(index: number) {
    setDocuments((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit(formData: FormData) {
    const validDocs = documents.filter((d) => d.name.trim() && d.url.trim());

    const input = {
      name: String(formData.get("name") ?? ""),
      description: String(formData.get("description") ?? ""),
      clientId: (formData.get("clientId") as string) || null,
      status: formData.get("status") as ProjectDefaults["status"],
      budget: Number(formData.get("budget") ?? 0),
      startDate: String(formData.get("startDate") ?? ""),
      endDate: (formData.get("endDate") as string) || null,
      documents: validDocs,
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
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Project" : "New Project"}</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              Project Name <span className="text-destructive">*</span>
            </Label>
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
              <Label htmlFor="startDate">
                Start Date <span className="text-destructive">*</span>
              </Label>
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
              rows={2}
            />
          </div>

          {/* Project Documents Section */}
          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-semibold">Project Documents</Label>
                <p className="text-xs text-muted-foreground">
                  Attach contracts, SOWs, or document links
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  multiple
                  className="hidden"
                  accept="image/*,application/pdf,text/*,.doc,.docx"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-8 gap-1 text-xs"
                >
                  <Upload className="h-3.5 w-3.5" /> Upload File
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleAddEmptyDocument}
                  className="h-8 gap-1 text-xs text-primary"
                >
                  <Plus className="h-3.5 w-3.5" /> Add URL
                </Button>
              </div>
            </div>

            {documents.length === 0 ? (
              <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                No documents attached yet. Click &quot;Upload File&quot; or &quot;Add URL&quot; to add project files.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[180px] overflow-y-auto pr-1">
                {documents.map((doc, index) => (
                  <div
                    key={index}
                    className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 rounded-md border p-2 bg-muted/20"
                  >
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Input
                        placeholder="Document Name (e.g. Contract v1)"
                        value={doc.name}
                        onChange={(e) =>
                          handleDocumentChange(index, "name", e.target.value)
                        }
                        className="h-8 text-xs bg-background"
                      />
                      <div className="flex items-center gap-1">
                        <Input
                          placeholder="Document URL or data"
                          value={doc.url}
                          onChange={(e) =>
                            handleDocumentChange(index, "url", e.target.value)
                          }
                          className="h-8 text-xs bg-background flex-1"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-1 shrink-0">
                      {doc.url ? (
                        <DocumentViewerModal
                          documentName={doc.name || "Untitled Document"}
                          documentUrl={doc.url}
                        />
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          disabled
                          className="h-8 w-8 text-muted-foreground opacity-50"
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveDocument(index)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : isEdit ? "Save Changes" : "Create Project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
