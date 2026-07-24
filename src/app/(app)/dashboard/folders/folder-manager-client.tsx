"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Folder,
  FileText,
  Search,
  Upload,
  FolderPlus,
  MoreVertical,
  Eye,
  Trash2,
  ChevronRight,
  Home,
  FileCode,
  Image as ImageIcon,
  FileSpreadsheet,
  Check,
  Share2,
  HardDrive,
  RefreshCw,
  Grid,
  List,
  Pencil,
  Download,
  Copy,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  createFolder,
  uploadFileToFolder,
  batchUploadFilesToFolder,
  renameFolderItem,
  deleteFolderItem,
} from "@/actions/folders";
import { formatDate } from "@/lib/format";
import { DocumentViewerModal } from "@/components/projects/document-viewer-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface FolderItem {
  id: string;
  name: string;
  isFolder: boolean;
  folderPath: string;
  url: string | null;
  fileType: string | null;
  sizeBytes: number | null;
  createdAt: Date;
  updatedAt: Date;
  project?: { name: string } | null;
}

export function FolderManagerClient({
  items,
  currentPath,
  searchQuery,
  userName,
}: {
  items: FolderItem[];
  currentPath: string;
  searchQuery: string;
  userName: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // Selected item state
  const [selectedItemId, setSelectedItemId] = useState<string | null>(
    items.length > 0 ? items[0].id : null
  );

  // View Mode: "list" or "grid"
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  // Drag & Drop State
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const dragCounter = useRef(0);

  // Modal States
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [renameModalOpen, setRenameModalOpen] = useState(false);

  // Form Inputs
  const [newFolderName, setNewFolderName] = useState("");
  const [renameItemId, setRenameItemId] = useState<string | null>(null);
  const [renameItemName, setRenameItemName] = useState("");

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [search, setSearch] = useState(searchQuery);

  // Previewing document item state for double click preview
  const [previewItem, setPreviewItem] = useState<FolderItem | null>(null);

  // Inspector toggles
  const [fileSharing, setFileSharing] = useState(true);
  const [backup, setBackup] = useState(false);
  const [sync, setSync] = useState(false);

  const selectedItem = items.find((i) => i.id === selectedItemId) || items[0] || null;

  function navigateToPath(path: string) {
    router.push(`/dashboard/folders?path=${encodeURIComponent(path)}`);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    router.push(
      `/dashboard/folders?path=${encodeURIComponent(currentPath)}&search=${encodeURIComponent(search)}`
    );
  }

  /**
   * Google Drive Double-Click Handler:
   * - Double click Folder -> Open sub-folder
   * - Double click File -> Open preview modal
   */
  function handleItemDoubleClick(item: FolderItem) {
    if (item.isFolder) {
      const subPath =
        currentPath === "/" ? `/${item.name}` : `${currentPath}/${item.name}`;
      navigateToPath(subPath);
    } else {
      setPreviewItem(item);
    }
  }

  function handleCreateFolder() {
    if (!newFolderName.trim()) return;
    startTransition(async () => {
      try {
        await createFolder({ name: newFolderName, parentPath: currentPath });
        toast.success("Folder created successfully!");
        setNewFolderName("");
        setFolderModalOpen(false);
        router.refresh();
      } catch {
        toast.error("Could not create folder.");
      }
    });
  }

  function handleRenameItem() {
    if (!renameItemId || !renameItemName.trim()) return;
    startTransition(async () => {
      try {
        await renameFolderItem(renameItemId, renameItemName);
        toast.success("Item renamed successfully!");
        setRenameModalOpen(false);
        setRenameItemId(null);
        setRenameItemName("");
        router.refresh();
      } catch {
        toast.error("Could not rename item.");
      }
    });
  }

  function openRenameDialog(item: FolderItem) {
    setRenameItemId(item.id);
    setRenameItemName(item.name);
    setRenameModalOpen(true);
  }

  function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFiles(Array.from(e.target.files));
    }
  }

  async function processAndUploadFiles(fileList: File[]) {
    if (fileList.length === 0) return;
    toast.loading(`Uploading ${fileList.length} file(s) to ${currentPath}...`, {
      id: "folder-upload",
    });

    try {
      const payloadFiles = await Promise.all(
        fileList.map((file) => {
          return new Promise<{
            name: string;
            url: string;
            fileType: string;
            sizeBytes: number;
          }>((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              const url = (e.target?.result as string) || "";
              const fileType = file.name.endsWith(".pdf")
                ? "PDF"
                : file.name.match(/\.(png|jpg|jpeg|gif|webp|svg)$/i)
                ? "IMAGE"
                : file.name.match(/\.(csv|xlsx|xls)$/i)
                ? "SPREADSHEET"
                : "DOCUMENT";
              resolve({
                name: file.name,
                url,
                fileType,
                sizeBytes: file.size,
              });
            };
            reader.readAsDataURL(file);
          });
        })
      );

      await batchUploadFilesToFolder(payloadFiles, currentPath);
      toast.success(`Successfully uploaded ${fileList.length} file(s)!`, {
        id: "folder-upload",
      });
      setSelectedFiles([]);
      setUploadModalOpen(false);
      router.refresh();
    } catch {
      toast.error("Failed to upload files.", { id: "folder-upload" });
    }
  }

  function handleUploadModalSubmit() {
    processAndUploadFiles(selectedFiles);
  }

  /**
   * Drag and Drop Event Handlers for Google Drive style upload
   */
  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDraggingOver(true);
    }
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) {
      setIsDraggingOver(false);
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    dragCounter.current = 0;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      processAndUploadFiles(droppedFiles);
    }
  }

  function handleDelete(id: string, name: string) {
    startTransition(async () => {
      try {
        await deleteFolderItem(id);
        toast.success(`Deleted ${name}`);
        router.refresh();
      } catch {
        toast.error("Failed to delete item");
      }
    });
  }

  function copyShareLink(url: string | null) {
    if (!url) return;
    navigator.clipboard.writeText(url);
    toast.success("File link copied to clipboard!");
  }

  function formatBytes(bytes: number | null) {
    if (!bytes || bytes === 0) return "—";
    if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(0)} KB`;
  }

  const pathParts = currentPath.split("/").filter(Boolean);

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="relative space-y-6 min-h-[80vh]"
    >
      {/* Full-Screen Google Drive Drag & Drop Overlay */}
      {isDraggingOver && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-md border-4 border-dashed border-primary animate-in fade-in duration-200">
          <div className="flex flex-col items-center gap-4 text-center p-8 rounded-3xl bg-card shadow-2xl border border-border">
            <span className="flex size-20 items-center justify-center rounded-full bg-primary/15 text-primary animate-bounce">
              <Upload className="size-10" />
            </span>
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-foreground">
                Drop files to upload to <span className="text-primary font-mono">{currentPath}</span>
              </h2>
              <p className="text-xs text-muted-foreground">
                Supports multiple files (PDF, Images, Spreadsheets, Documents up to 50MB each)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Top Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Folders</h1>
          {/* Breadcrumbs */}
          <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <button
              onClick={() => navigateToPath("/")}
              className="flex items-center gap-1 hover:text-foreground font-medium transition-colors cursor-pointer"
            >
              <Home className="size-3.5 text-amber-500" /> My Files
            </button>
            {pathParts.map((part, index) => {
              const fullPath = "/" + pathParts.slice(0, index + 1).join("/");
              return (
                <div key={fullPath} className="flex items-center gap-1.5">
                  <ChevronRight className="size-3 opacity-50" />
                  <button
                    onClick={() => navigateToPath(fullPath)}
                    className="hover:text-foreground font-medium transition-colors cursor-pointer"
                  >
                    {part}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search Input */}
          <form onSubmit={handleSearch} className="relative w-56 sm:w-64">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search in Drive..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 text-xs rounded-xl"
            />
          </form>

          {/* View Mode Switcher (List / Grid) */}
          <div className="flex items-center rounded-xl border bg-muted/30 p-1">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                viewMode === "list"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="List View"
            >
              <List className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                viewMode === "grid"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Grid View"
            >
              <Grid className="size-4" />
            </button>
          </div>

          {/* New Folder Modal */}
          <Dialog open={folderModalOpen} onOpenChange={setFolderModalOpen}>
            <DialogTrigger
              nativeButton
              render={
                <Button variant="outline" size="sm" className="rounded-xl cursor-pointer gap-1.5">
                  <FolderPlus className="size-4 text-amber-500" /> New Folder
                </Button>
              }
            />
            <DialogContent className="sm:max-w-sm rounded-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FolderPlus className="size-5 text-amber-500" /> Create Folder
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Folder Name</Label>
                  <Input
                    placeholder="e.g. Design, Contracts, Invoices"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreateFolder();
                    }}
                    className="rounded-xl text-xs"
                  />
                </div>
                <DialogFooter>
                  <Button
                    onClick={handleCreateFolder}
                    disabled={pending || !newFolderName.trim()}
                    className="rounded-xl text-xs cursor-pointer"
                  >
                    {pending ? "Creating..." : "Create Folder"}
                  </Button>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>

          {/* Upload File Modal */}
          <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
            <DialogTrigger
              nativeButton
              render={
                <Button size="sm" className="rounded-xl cursor-pointer gap-1.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white">
                  <Upload className="size-4" /> Upload
                </Button>
              }
            />
            <DialogContent className="sm:max-w-md rounded-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Upload className="size-5 text-primary" /> Upload Files to {currentPath}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Choose Files from Computer</Label>
                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-2xl p-6 bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer text-center space-y-2">
                    <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Upload className="size-6" />
                    </span>
                    <div>
                      <p className="text-xs font-semibold text-foreground">
                        {selectedFiles.length > 0
                          ? `${selectedFiles.length} file(s) selected`
                          : "Click or drag & drop files here"}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Supports PDF, PNG, JPG, CSV, DOCX, ZIP files up to 50MB each
                      </p>
                    </div>
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      onChange={handleFilesSelected}
                    />
                  </label>
                  {selectedFiles.length > 0 && (
                    <div className="max-h-28 overflow-y-auto space-y-1 rounded-xl border bg-muted/30 p-2 text-xs">
                      {selectedFiles.map((f, idx) => (
                        <div key={idx} className="flex items-center justify-between text-[11px]">
                          <span className="truncate max-w-[240px] font-medium">{f.name}</span>
                          <span className="text-muted-foreground">{(f.size / 1024).toFixed(1)} KB</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <DialogFooter>
                  <Button
                    onClick={handleUploadModalSubmit}
                    disabled={pending || selectedFiles.length === 0}
                    className="rounded-xl text-xs cursor-pointer"
                  >
                    {pending ? "Uploading..." : `Upload ${selectedFiles.length > 0 ? selectedFiles.length : ""} File(s)`}
                  </Button>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Rename Dialog */}
      <Dialog open={renameModalOpen} onOpenChange={setRenameModalOpen}>
        <DialogContent className="sm:max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="size-4 text-primary" /> Rename Item
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-xs font-medium">New Name</Label>
              <Input
                value={renameItemName}
                onChange={(e) => setRenameItemName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRenameItem();
                }}
                className="rounded-xl text-xs"
              />
            </div>
            <DialogFooter>
              <Button
                onClick={handleRenameItem}
                disabled={pending || !renameItemName.trim()}
                className="rounded-xl text-xs cursor-pointer"
              >
                {pending ? "Renaming..." : "Save Name"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Main Content Area */}
      <div className="grid gap-6 lg:grid-cols-12 items-start">
        {/* Left Folder Contents Area (70%) */}
        <div className="lg:col-span-8 space-y-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-24 text-center rounded-3xl border border-dashed border-border bg-card/50 p-8">
              <span className="flex size-16 items-center justify-center rounded-3xl bg-amber-500/15 text-amber-500 shadow-inner">
                <Folder className="size-8" />
              </span>
              <div className="space-y-1">
                <p className="font-bold text-base text-foreground">This folder is empty</p>
                <p className="text-xs text-muted-foreground max-w-sm">
                  Drag and drop files from your computer anywhere on this screen, or click <strong className="text-foreground">Upload</strong> to add files.
                </p>
              </div>
            </div>
          ) : viewMode === "list" ? (
            /* Table List View */
            <div className="rounded-2xl border bg-card p-2 shadow-xs overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent text-xs">
                    <TableHead>Name</TableHead>
                    <TableHead>Date Modified</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead className="w-12 text-center">Owner</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => {
                    const isSelected = item.id === selectedItemId;

                    return (
                      <TableRow
                        key={item.id}
                        onClick={() => setSelectedItemId(item.id)}
                        onDoubleClick={() => handleItemDoubleClick(item)}
                        className={`cursor-pointer transition-colors select-none ${
                          isSelected ? "bg-muted/70 font-medium" : "hover:bg-muted/40"
                        }`}
                      >

                        {/* Icon & Item Name */}
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {item.isFolder ? (
                              <span className="flex size-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0">
                                <Folder className="size-5" fill="currentColor" />
                              </span>
                            ) : (
                              <span className="flex size-9 items-center justify-center rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 shrink-0">
                                <FileText className="size-5" />
                              </span>
                            )}

                            <div className="truncate">
                              <p className="font-semibold text-foreground truncate text-left">
                                {item.name}
                              </p>
                              {item.project && (
                                <span className="text-[10px] text-muted-foreground">
                                  Linked: {item.project.name}
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        {/* Date */}
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDate(item.createdAt)}
                        </TableCell>

                        {/* Size */}
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {item.isFolder ? "—" : formatBytes(item.sizeBytes)}
                        </TableCell>

                        {/* Owner Avatar */}
                        <TableCell className="text-center">
                          <div className="flex size-7 items-center justify-center rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold text-xs mx-auto">
                            {userName.charAt(0).toUpperCase()}
                          </div>
                        </TableCell>

                        {/* Actions Dropdown */}
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <button
                                  type="button"
                                  className="p-1 text-muted-foreground hover:text-foreground cursor-pointer rounded-lg hover:bg-muted"
                                >
                                  <MoreVertical className="size-4" />
                                </button>
                              }
                            />
                            <DropdownMenuContent align="end" className="rounded-xl w-48 text-xs">
                              {item.isFolder ? (
                                <DropdownMenuItem
                                  onClick={() => handleItemDoubleClick(item)}
                                >
                                  <Folder className="size-4 mr-2 text-amber-500" /> Open Folder
                                </DropdownMenuItem>
                              ) : (
                                <>
                                  <DropdownMenuItem onClick={() => setPreviewItem(item)}>
                                    <Eye className="size-4 mr-2 text-primary" /> Preview File
                                  </DropdownMenuItem>
                                  {item.url && (
                                    <DropdownMenuItem onClick={() => copyShareLink(item.url)}>
                                      <Copy className="size-4 mr-2" /> Copy File Link
                                    </DropdownMenuItem>
                                  )}
                                  {item.url && (
                                    <DropdownMenuItem
                                      onClick={() => window.open(item.url!, "_blank")}
                                    >
                                      <Download className="size-4 mr-2" /> Download
                                    </DropdownMenuItem>
                                  )}
                                </>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => openRenameDialog(item)}>
                                <Pencil className="size-4 mr-2" /> Rename
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDelete(item.id, item.name)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="size-4 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            /* Card Grid View (Google Drive standard) */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
              {items.map((item) => {
                const isSelected = item.id === selectedItemId;

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItemId(item.id)}
                    onDoubleClick={() => handleItemDoubleClick(item)}
                    className={`group relative flex flex-col justify-between p-3.5 rounded-2xl border transition-all cursor-pointer select-none ${
                      isSelected
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border bg-card hover:bg-muted/30 hover:border-primary/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      {item.isFolder ? (
                        <span className="flex size-11 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                          <Folder className="size-6" fill="currentColor" />
                        </span>
                      ) : (
                        <span className="flex size-11 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-600 dark:text-blue-400">
                          <FileText className="size-6" />
                        </span>
                      )}

                      <div onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <button
                                type="button"
                                className="p-1 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground cursor-pointer rounded-lg hover:bg-muted transition-opacity"
                              >
                                <MoreVertical className="size-4" />
                              </button>
                            }
                          />
                          <DropdownMenuContent align="end" className="rounded-xl w-48 text-xs">
                            {item.isFolder ? (
                              <DropdownMenuItem onClick={() => handleItemDoubleClick(item)}>
                                <Folder className="size-4 mr-2 text-amber-500" /> Open Folder
                              </DropdownMenuItem>
                            ) : (
                              <>
                                <DropdownMenuItem onClick={() => setPreviewItem(item)}>
                                  <Eye className="size-4 mr-2 text-primary" /> Preview File
                                </DropdownMenuItem>
                                {item.url && (
                                  <DropdownMenuItem onClick={() => copyShareLink(item.url)}>
                                    <Copy className="size-4 mr-2" /> Copy Link
                                  </DropdownMenuItem>
                                )}
                              </>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => openRenameDialog(item)}>
                              <Pencil className="size-4 mr-2" /> Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(item.id, item.name)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="size-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    <div className="mt-3 space-y-1">
                      <p className="text-xs font-bold text-foreground truncate">{item.name}</p>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>{item.isFolder ? "Folder" : formatBytes(item.sizeBytes)}</span>
                        <span>{formatDate(item.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Details Inspector Panel (30%) */}
        <div className="lg:col-span-4 rounded-2xl border bg-card p-6 space-y-6 shadow-xs">
          {selectedItem ? (
            <>
              {/* Card Header Preview */}
              <div className="flex flex-col items-center justify-center p-8 rounded-2xl bg-amber-500/10 dark:bg-amber-950/30 text-center space-y-3">
                {selectedItem.isFolder ? (
                  <span className="flex size-20 items-center justify-center rounded-2xl bg-amber-400/30 text-amber-500 shadow-inner">
                    <Folder className="size-12" fill="currentColor" />
                  </span>
                ) : (
                  <span className="flex size-20 items-center justify-center rounded-2xl bg-blue-500/20 text-blue-500 shadow-inner">
                    <FileText className="size-12" />
                  </span>
                )}
                <div className="space-y-1 w-full px-2">
                  <h3 className="text-lg font-bold truncate text-foreground">
                    {selectedItem.name}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {selectedItem.isFolder ? "Folder Directory" : "File Storage Item"}
                  </p>
                </div>

                {selectedItem.isFolder ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleItemDoubleClick(selectedItem)}
                    className="gap-1.5 text-xs mt-2 rounded-xl cursor-pointer"
                  >
                    <Folder className="size-3.5 text-amber-500" /> Open Folder
                  </Button>
                ) : (
                  selectedItem.url && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setPreviewItem(selectedItem)}
                      className="gap-1.5 text-xs mt-2 rounded-xl cursor-pointer"
                    >
                      <Eye className="size-3.5" /> Preview File
                    </Button>
                  )
                )}
              </div>

              {/* Info Section */}
              <div className="space-y-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  INFO
                </p>
                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Type</span>
                    <span className="font-semibold text-foreground">
                      {selectedItem.isFolder ? "Folder" : selectedItem.fileType || "File"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Size</span>
                    <span className="font-semibold text-foreground">
                      {selectedItem.isFolder ? "—" : formatBytes(selectedItem.sizeBytes)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Owner</span>
                    <span className="font-semibold text-foreground">{userName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Location</span>
                    <span className="font-semibold text-primary">
                      {selectedItem.folderPath === "/" ? "My Files" : selectedItem.folderPath}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Modified</span>
                    <span className="font-medium text-muted-foreground">
                      {formatDate(selectedItem.updatedAt)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Created</span>
                    <span className="font-medium text-muted-foreground">
                      {formatDate(selectedItem.createdAt)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Settings Section */}
              <div className="space-y-3 pt-4 border-t">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  SETTINGS
                </p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-medium">
                      <Share2 className="size-3.5 text-muted-foreground" />
                      <span>File Sharing</span>
                    </div>
                    <Switch checked={fileSharing} onCheckedChange={setFileSharing} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-medium">
                      <HardDrive className="size-3.5 text-muted-foreground" />
                      <span>Backup</span>
                    </div>
                    <Switch checked={backup} onCheckedChange={setBackup} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-medium">
                      <RefreshCw className="size-3.5 text-muted-foreground" />
                      <span>Sync</span>
                    </div>
                    <Switch checked={sync} onCheckedChange={setSync} />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="py-12 text-center text-xs text-muted-foreground">
              Select a folder or file to view details
            </div>
          )}
        </div>
      </div>

      {/* Double Click Document Viewer Modal */}
      {previewItem && previewItem.url && (
        <DocumentViewerModal
          documentName={previewItem.name}
          documentUrl={previewItem.url}
          fileType={previewItem.fileType ?? "DOCUMENT"}
          open={!!previewItem}
          onOpenChange={(open) => {
            if (!open) setPreviewItem(null);
          }}
        />
      )}
    </div>
  );
}
