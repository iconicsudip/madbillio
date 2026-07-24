"use client";

import { useState, type ReactElement } from "react";
import { Eye, ExternalLink, Download, FileText, Image as ImageIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface DocumentViewerModalProps {
  documentName: string;
  documentUrl: string;
  fileType?: string;
  trigger?: ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function DocumentViewerModal({
  documentName,
  documentUrl,
  trigger,
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
}: DocumentViewerModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);

  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = externalOnOpenChange || setInternalOpen;

  const isDataUrl = documentUrl.startsWith("data:");
  const isImage =
    documentUrl.match(/\.(jpeg|jpg|gif|png|svg|webp)($|\?)/i) ||
    documentUrl.startsWith("data:image/");
  const isPdf =
    documentUrl.match(/\.pdf($|\?)/i) ||
    documentUrl.startsWith("data:application/pdf");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        nativeButton
        render={
          trigger ?? (
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
              title={`View ${documentName}`}
            >
              <Eye className="h-4 w-4" />
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col p-6">
        <DialogHeader className="flex flex-row items-center justify-between border-b pb-3 space-y-0">
          <div className="flex items-center gap-2 pr-6">
            {isImage ? (
              <ImageIcon className="h-5 w-5 text-primary" />
            ) : (
              <FileText className="h-5 w-5 text-primary" />
            )}
            <DialogTitle className="text-base font-semibold truncate max-w-md">
              {documentName}
            </DialogTitle>
          </div>
          <div className="flex items-center gap-2 pr-8">
            <a
              href={documentUrl}
              target="_blank"
              rel="noopener noreferrer"
              download={isDataUrl ? documentName : undefined}
            >
              <Button type="button" variant="outline" size="sm" className="gap-1.5 text-xs">
                {isDataUrl ? <Download className="h-3.5 w-3.5" /> : <ExternalLink className="h-3.5 w-3.5" />}
                {isDataUrl ? "Download" : "Open Full"}
              </Button>
            </a>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto py-4 flex items-center justify-center min-h-[350px] max-h-[70vh] bg-muted/20 rounded-lg border border-border/40">
          {isImage ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={documentUrl}
              alt={documentName}
              className="max-h-[65vh] max-w-full object-contain rounded shadow-xs"
            />
          ) : isPdf ? (
            <iframe
              src={documentUrl}
              title={documentName}
              className="w-full h-[65vh] rounded border-0"
            />
          ) : !isDataUrl ? (
            <iframe
              src={documentUrl}
              title={documentName}
              className="w-full h-[65vh] rounded border-0"
            />
          ) : (
            <div className="text-center p-8 space-y-3">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto" />
              <div>
                <p className="text-sm font-medium">{documentName}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Preview not directly embeddable for this file type.
                </p>
              </div>
              <a
                href={documentUrl}
                download={documentName}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button size="sm" className="gap-2 mt-2">
                  <Download className="h-4 w-4" /> Download File
                </Button>
              </a>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
