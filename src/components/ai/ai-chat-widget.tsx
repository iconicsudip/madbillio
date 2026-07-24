"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import ReactMarkdown from "react-markdown";
import {
  Sparkles,
  Send,
  X,
  Bot,
  User,
  RefreshCw,
  Paperclip,
  FileText,
  Upload,
  Mail,
  Copy,
  Briefcase,
  DollarSign,
  ArrowRight,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import {
  aiChatbotQuery,
  aiExecuteChatAction,
  getUserAiCreditStatus,
  AIFileAttachment,
  AIActionButton,
  AIRequestCategory,
} from "@/actions/ai";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  files?: AIFileAttachment[];
  detectedType?: AIRequestCategory;
  typeLabel?: string;
  actionButtons?: AIActionButton[];
}

const QUICK_PROMPTS = [
  "Draft an invoice for Website Design ₹45,000",
  "Write a firm payment reminder for overdues",
  "How to calculate employee percentage payouts?",
  "Tips to increase project net profit margins",
];

export function AIChatWidget() {
  const [open, setOpen] = useState(false);
  const [credits, setCredits] = useState<{ remainingCredits: number; maxDailyCredits: number } | null>(null);
  const [input, setInput] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<AIFileAttachment[]>([]);
  const [activeActionId, setActiveActionId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      getUserAiCreditStatus().then((res) => {
        setCredits({ remainingCredits: res.remainingCredits, maxDailyCredits: res.maxDailyCredits });
      });
    }
  }, [open]);

  const [pending, startTransition] = useTransition();

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hello! I am **Madko AI**, your billing & financial assistant. How can I help you draft invoices, analyze attached files, manage payment reminders, or calculate project margins today?",
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    Array.from(selectedFiles).forEach((file) => {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`File ${file.name} exceeds maximum 10MB limit.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setAttachedFiles((prev) => [
          ...prev,
          {
            name: file.name,
            type: file.type || "application/octet-stream",
            size: file.size,
            data: base64,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function removeAttachedFile(index: number) {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSend(textToSend?: string) {
    const query = textToSend || input.trim();
    if ((!query && attachedFiles.length === 0) || pending) return;

    const currentFiles = [...attachedFiles];
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: query || (currentFiles.length > 0 ? `[Analyzed ${currentFiles.length} file(s)]` : ""),
      files: currentFiles,
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setAttachedFiles([]);

    startTransition(async () => {
      try {
        const apiMessages = updatedMessages
          .filter((m) => m.id !== "welcome")
          .map((m) => ({
            role: m.role,
            content: m.content,
            files: m.files,
          }));

        const responsePayload = await aiChatbotQuery(apiMessages);

        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: responsePayload.content,
            detectedType: responsePayload.detectedType,
            typeLabel: responsePayload.typeLabel,
            actionButtons: responsePayload.actionButtons,
          },
        ]);

        // Refresh AI credits count
        const creditRes = await getUserAiCreditStatus();
        setCredits({ remainingCredits: creditRes.remainingCredits, maxDailyCredits: creditRes.maxDailyCredits });
      } catch (err) {
        console.error("AI Chat Query error:", err);
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: "Sorry, I ran into an issue connecting to AI service. Please try again.",
          },
        ]);
      }
    });
  }

  async function handleActionButtonClick(btn: AIActionButton) {
    setActiveActionId(btn.id);
    try {
      if (btn.actionType === "copy_text") {
        const textToCopy = btn.payload?.text || "";
        await navigator.clipboard.writeText(textToCopy);
        toast.success("Text copied to clipboard!");
        setActiveActionId(null);
        return;
      }

      if (btn.actionType === "send_email") {
        const bodyText = btn.payload?.body || "";
        await navigator.clipboard.writeText(bodyText);
        toast.success("Reminder email body copied! You can now paste and send.");
        setActiveActionId(null);
        return;
      }

      toast.loading(`Processing action: ${btn.label}...`, { id: "ai-action" });

      const res = await aiExecuteChatAction(btn.actionType, btn.payload);

      if (res.success) {
        toast.success(res.message || "Action executed successfully!", { id: "ai-action" });
        if (res.redirectUrl) {
          window.location.href = res.redirectUrl;
        }
      } else {
        toast.error(res.message || "Failed to execute action.", { id: "ai-action" });
      }
    } catch (err: any) {
      console.error("Button action execution error:", err);
      toast.error("An error occurred executing this action.", { id: "ai-action" });
    } finally {
      setActiveActionId(null);
    }
  }

  function getButtonIcon(iconName?: string) {
    switch (iconName) {
      case "sparkles":
        return <Sparkles className="size-3.5" />;
      case "invoice":
        return <FileText className="size-3.5" />;
      case "file":
        return <Upload className="size-3.5" />;
      case "email":
        return <Mail className="size-3.5" />;
      case "copy":
        return <Copy className="size-3.5" />;
      case "project":
        return <Briefcase className="size-3.5" />;
      case "client":
        return <User className="size-3.5" />;
      case "payout":
        return <DollarSign className="size-3.5" />;
      case "navigate":
        return <ArrowRight className="size-3.5" />;
      default:
        return <Sparkles className="size-3.5" />;
    }
  }

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 print:hidden">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-12 sm:h-13 items-center gap-2.5 rounded-full bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 px-4 sm:px-5 text-white shadow-xl transition-all hover:scale-105 hover:shadow-2xl cursor-pointer"
        >
          <Sparkles className="size-5 animate-pulse" />
          <span className="text-xs sm:text-sm font-bold tracking-tight">Madko AI</span>
        </button>
      ) : (
        <div className="flex h-[540px] w-[calc(100vw-32px)] max-w-[390px] sm:w-[440px] sm:max-w-none flex-col rounded-3xl border border-border bg-card shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between border-b bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 px-4 py-3.5 text-white">
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-full bg-white/20 backdrop-blur-xs">
                <Sparkles className="size-4 text-white" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-xs sm:text-sm font-bold leading-none">Madko AI</p>
                  <span className="rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-extrabold text-white">
                    ⚡ {credits?.remainingCredits ?? 20}/{credits?.maxDailyCredits ?? 20}
                  </span>
                </div>
                <p className="text-[10px] text-white/80 font-medium mt-1">
                  Billing, File Parsing & Financial AI
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex size-7 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white cursor-pointer"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 text-xs">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-2 ${
                  m.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {m.role === "assistant" && (
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary font-bold">
                    <Bot className="size-4" />
                  </span>
                )}
                <div
                  className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 leading-relaxed ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-xs"
                      : "bg-secondary/90 text-secondary-foreground rounded-tl-xs border border-border/50"
                  }`}
                >
                  {/* Category / Type Badge for Assistant Response */}
                  {m.role === "assistant" && m.typeLabel && (
                    <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary">
                      {m.typeLabel}
                    </div>
                  )}

                  {/* User attached files */}
                  {m.role === "user" && m.files && m.files.length > 0 && (
                    <div className="mb-2 space-y-1">
                      {m.files.map((f, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-1.5 rounded-lg bg-black/10 dark:bg-white/10 px-2 py-1 text-[10px] font-medium"
                        >
                          <Paperclip className="size-3" />
                          <span className="truncate max-w-[180px]">{f.name}</span>
                          <span className="opacity-70">({(f.size / 1024).toFixed(1)} KB)</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {m.role === "user" ? (
                    <span className="whitespace-pre-wrap">{m.content}</span>
                  ) : (
                    <div className="space-y-3">
                      <div className="prose prose-xs dark:prose-invert max-w-none text-xs leading-normal [&>p]:mb-1.5 font-sans">
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      </div>

                      {/* Dynamic AI Action Buttons based on Request/Response verification */}
                      {m.actionButtons && m.actionButtons.length > 0 && (
                        <div className="pt-2 border-t border-border/40 flex flex-wrap items-center gap-1.5">
                          {m.actionButtons.map((btn) => {
                            const isLoading = activeActionId === btn.id;
                            return (
                              <Button
                                key={btn.id}
                                size="sm"
                                variant={btn.variant || "secondary"}
                                onClick={() => handleActionButtonClick(btn)}
                                disabled={isLoading}
                                className={`h-7 px-2.5 text-[11px] font-semibold gap-1.5 rounded-xl cursor-pointer ${
                                  btn.variant === "default"
                                    ? "bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white border-0 shadow-xs"
                                    : ""
                                }`}
                              >
                                {isLoading ? (
                                  <RefreshCw className="size-3 animate-spin" />
                                ) : (
                                  getButtonIcon(btn.icon)
                                )}
                                <span>{btn.label}</span>
                              </Button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {m.role === "user" && (
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-[10px]">
                    <User className="size-3.5" />
                  </span>
                )}
              </div>
            ))}

            {pending && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="flex size-7 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <RefreshCw className="size-3.5 animate-spin" />
                </span>
                <span>Madko AI is analyzing request & parsing response...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Attached Files Preview Chips before Sending */}
          {attachedFiles.length > 0 && (
            <div className="px-3.5 py-1.5 border-t bg-muted/30 flex flex-wrap gap-1.5">
              {attachedFiles.map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-1.5 rounded-lg bg-secondary border px-2 py-1 text-[11px] font-medium"
                >
                  <Paperclip className="size-3 text-primary" />
                  <span className="truncate max-w-[140px] text-foreground">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => removeAttachedFile(idx)}
                    className="text-muted-foreground hover:text-destructive cursor-pointer"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Quick Suggestions */}
          {messages.length <= 2 && attachedFiles.length === 0 && (
            <div className="px-3.5 py-2 border-t bg-muted/40 space-y-1.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Quick Prompts
              </p>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_PROMPTS.map((qp, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSend(qp)}
                    className="rounded-lg bg-background border px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-secondary transition-colors cursor-pointer text-left"
                  >
                    {qp}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Footer Input */}
          <div className="border-t p-3 bg-card flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              multiple
              accept="image/*,.pdf,.csv,.txt,.docx,.json"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              size="icon"
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              title="Attach File (PDF, Image, CSV, Document)"
              className="size-9 rounded-xl shrink-0 border-border text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer"
            >
              <Paperclip className="size-4" />
            </Button>
            <Input
              placeholder="Ask AI or attach file..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              className="h-9 text-xs rounded-xl"
            />
            <Button
              size="icon"
              disabled={pending || (!input.trim() && attachedFiles.length === 0)}
              onClick={() => handleSend()}
              className="size-9 rounded-xl shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer"
            >
              <Send className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
