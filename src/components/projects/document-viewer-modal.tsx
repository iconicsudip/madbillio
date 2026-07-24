"use client";

import { useState, useEffect, type ReactElement } from "react";
import { Eye, ExternalLink, Download, FileText, Image as ImageIcon, FileSpreadsheet, Loader2 } from "lucide-react";
import { getPresignedUrlAction } from "@/actions/folders";
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
  const [signedUrl, setSignedUrl] = useState(documentUrl);
  const [loadingUrl, setLoadingUrl] = useState(false);

  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = externalOnOpenChange || setInternalOpen;

  useEffect(() => {
    if (open && documentUrl && !documentUrl.startsWith("data:")) {
      setLoadingUrl(true);
      getPresignedUrlAction(documentUrl)
        .then((url) => {
          if (url) setSignedUrl(url);
        })
        .catch((err) => console.warn("Failed to get presigned URL:", err))
        .finally(() => setLoadingUrl(false));
    } else {
      setSignedUrl(documentUrl);
    }
  }, [open, documentUrl]);

  const activeUrl = signedUrl || documentUrl;
  const isDataUrl = activeUrl.startsWith("data:");
  const isImage =
    documentName.match(/\.(jpeg|jpg|gif|png|svg|webp)$/i) ||
    activeUrl.match(/\.(jpeg|jpg|gif|png|svg|webp)($|\?)/i) ||
    activeUrl.startsWith("data:image/");

  const isPdf =
    documentName.match(/\.pdf$/i) ||
    activeUrl.match(/\.pdf($|\?)/i) ||
    activeUrl.startsWith("data:application/pdf");

  const isSpreadsheet =
    documentName.match(/\.(xlsx|xls|csv)$/i) ||
    activeUrl.match(/\.(xlsx|xls|csv)($|\?)/i);

  const isOfficeDoc =
    documentName.match(/\.(docx|doc|pptx|ppt)$/i) ||
    activeUrl.match(/\.(docx|doc|pptx|ppt)($|\?)/i);

  function handleDirectOpen() {
    window.open(activeUrl, "_blank", "noopener,noreferrer");
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
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
              title={`View ${documentName}`}
            >
              <Eye className="h-4 w-4" />
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col p-6 rounded-2xl">
        <DialogHeader className="flex flex-row items-center justify-between border-b pb-3 space-y-0">
          <div className="flex items-center gap-2 pr-6">
            {isImage ? (
              <ImageIcon className="h-5 w-5 text-primary" />
            ) : isSpreadsheet ? (
              <FileSpreadsheet className="h-5 w-5 text-emerald-500" />
            ) : (
              <FileText className="h-5 w-5 text-primary" />
            )}
            <DialogTitle className="text-base font-semibold truncate max-w-md">
              {documentName}
            </DialogTitle>
          </div>
          <div className="flex items-center gap-2 pr-8">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDirectOpen}
              disabled={loadingUrl}
              className="gap-1.5 text-xs rounded-xl cursor-pointer"
            >
              {loadingUrl ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ExternalLink className="h-3.5 w-3.5" />
              )}
              Open Full (S3 Presigned)
            </Button>
            <a
              href={activeUrl}
              target="_blank"
              rel="noopener noreferrer"
              download={documentName}
            >
              <Button type="button" variant="outline" size="sm" className="gap-1.5 text-xs rounded-xl cursor-pointer">
                <Download className="h-3.5 w-3.5" /> Download
              </Button>
            </a>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto py-4 flex items-center justify-center min-h-[350px] max-h-[70vh] bg-muted/20 rounded-2xl border border-border/40">
          {loadingUrl ? (
            <div className="flex flex-col items-center gap-2 text-xs text-muted-foreground animate-pulse">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span>Generating AWS S3 Presigned URL...</span>
            </div>
          ) : isImage ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={activeUrl}
              alt={documentName}
              className="max-h-[65vh] max-w-full object-contain rounded shadow-xs"
            />
          ) : isPdf ? (
            <iframe
              src={activeUrl}
              title={documentName}
              className="w-full h-[65vh] rounded border-0"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-8 space-y-4 max-w-md">
              <span className="flex size-20 items-center justify-center rounded-3xl bg-amber-500/15 text-amber-500 shadow-inner">
                {isSpreadsheet ? (
                  <FileSpreadsheet className="h-10 w-10 text-emerald-500" />
                ) : (
                  <FileText className="h-10 w-10 text-primary" />
                )}
              </span>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-foreground truncate max-w-xs mx-auto">
                  {documentName}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {isSpreadsheet
                    ? "Excel / CSV Spreadsheet Document"
                    : isOfficeDoc
                    ? "Microsoft Office Document"
                    : "File Storage Document"}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <Button
                  onClick={handleDirectOpen}
                  size="sm"
                  className="gap-2 rounded-xl cursor-pointer bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white"
                >
                  <ExternalLink className="h-4 w-4" /> Open File directly
                </Button>
                <a
                  href={activeUrl}
                  download={documentName}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button size="sm" variant="outline" className="gap-2 rounded-xl cursor-pointer">
                    <Download className="h-4 w-4" /> Download
                  </Button>
                </a>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
