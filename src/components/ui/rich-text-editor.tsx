"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect } from "react";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Link as LinkIcon,
  Unlink,
  Undo,
  Redo,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function RichTextEditor({
  value = "",
  onChange,
  placeholder = "Write notes or terms...",
  className,
  disabled = false,
}: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3],
        },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary underline cursor-pointer",
        },
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass:
          "before:content-[attr(data-placeholder)] before:text-muted-foreground/60 before:float-left before:pointer-events-none before:h-0",
      }),
    ],
    content: value,
    editable: !disabled,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      // If editor is empty HTML (<p></p>), normalize to empty string
      const cleanHtml = html === "<p></p>" ? "" : html;
      onChange?.(cleanHtml);
    },
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm dark:prose-invert max-w-none min-h-[110px] p-3 focus:outline-none text-foreground text-sm leading-relaxed",
          "[&_p]:my-1.5 [&_ul]:my-1.5 [&_ol]:my-1.5 [&_li]:my-0.5 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:my-2 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:my-1.5 [&_blockquote]:border-l-2 [&_blockquote]:border-primary/40 [&_blockquote]:pl-3 [&_blockquote]:italic"
        ),
      },
    },
  });

  // Keep internal state synced if value changes externally
  useEffect(() => {
    if (editor && value !== undefined) {
      const currentContent = editor.getHTML();
      const normalizedCurrent = currentContent === "<p></p>" ? "" : currentContent;
      if (normalizedCurrent !== value) {
        editor.commands.setContent(value, { emitUpdate: false });
      }
    }
  }, [value, editor]);

  useEffect(() => {
    if (editor) {
      editor.setEditable(!disabled);
    }
  }, [disabled, editor]);

  if (!editor) {
    return (
      <div className={cn("min-h-[150px] w-full rounded-md border border-input bg-background p-3 text-sm text-muted-foreground animate-pulse", className)}>
        Loading editor...
      </div>
    );
  }

  const setLink = () => {
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("URL", previousUrl);

    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  return (
    <div
      className={cn(
        "group rounded-lg border border-input bg-background shadow-xs transition-all focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30",
        disabled && "opacity-60 cursor-not-allowed",
        className
      )}
    >
      {/* Formatting Toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-b border-input/60 bg-muted/30 px-2 py-1.5 text-muted-foreground">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={!editor.can().chain().focus().toggleBold().run() || disabled}
          className={cn(
            "rounded p-1.5 text-xs hover:bg-muted hover:text-foreground transition-colors cursor-pointer",
            editor.isActive("bold") && "bg-accent text-accent-foreground font-semibold"
          )}
          title="Bold"
        >
          <Bold className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editor.can().chain().focus().toggleItalic().run() || disabled}
          className={cn(
            "rounded p-1.5 text-xs hover:bg-muted hover:text-foreground transition-colors cursor-pointer",
            editor.isActive("italic") && "bg-accent text-accent-foreground font-semibold"
          )}
          title="Italic"
        >
          <Italic className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          disabled={!editor.can().chain().focus().toggleUnderline().run() || disabled}
          className={cn(
            "rounded p-1.5 text-xs hover:bg-muted hover:text-foreground transition-colors cursor-pointer",
            editor.isActive("underline") && "bg-accent text-accent-foreground font-semibold"
          )}
          title="Underline"
        >
          <UnderlineIcon className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          disabled={!editor.can().chain().focus().toggleStrike().run() || disabled}
          className={cn(
            "rounded p-1.5 text-xs hover:bg-muted hover:text-foreground transition-colors cursor-pointer",
            editor.isActive("strike") && "bg-accent text-accent-foreground font-semibold"
          )}
          title="Strikethrough"
        >
          <Strikethrough className="h-4 w-4" />
        </button>

        <div className="mx-1 h-4 w-[1px] bg-border" />

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={cn(
            "rounded p-1.5 text-xs hover:bg-muted hover:text-foreground transition-colors cursor-pointer",
            editor.isActive("heading", { level: 2 }) && "bg-accent text-accent-foreground font-semibold"
          )}
          title="Heading 2"
        >
          <Heading2 className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={cn(
            "rounded p-1.5 text-xs hover:bg-muted hover:text-foreground transition-colors cursor-pointer",
            editor.isActive("heading", { level: 3 }) && "bg-accent text-accent-foreground font-semibold"
          )}
          title="Heading 3"
        >
          <Heading3 className="h-4 w-4" />
        </button>

        <div className="mx-1 h-4 w-[1px] bg-border" />

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={cn(
            "rounded p-1.5 text-xs hover:bg-muted hover:text-foreground transition-colors cursor-pointer",
            editor.isActive("bulletList") && "bg-accent text-accent-foreground font-semibold"
          )}
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={cn(
            "rounded p-1.5 text-xs hover:bg-muted hover:text-foreground transition-colors cursor-pointer",
            editor.isActive("orderedList") && "bg-accent text-accent-foreground font-semibold"
          )}
          title="Numbered List"
        >
          <ListOrdered className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={cn(
            "rounded p-1.5 text-xs hover:bg-muted hover:text-foreground transition-colors cursor-pointer",
            editor.isActive("blockquote") && "bg-accent text-accent-foreground font-semibold"
          )}
          title="Quote"
        >
          <Quote className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={cn(
            "rounded p-1.5 text-xs hover:bg-muted hover:text-foreground transition-colors cursor-pointer",
            editor.isActive("codeBlock") && "bg-accent text-accent-foreground font-semibold"
          )}
          title="Code Block"
        >
          <Code className="h-4 w-4" />
        </button>

        <div className="mx-1 h-4 w-[1px] bg-border" />

        <button
          type="button"
          onClick={setLink}
          className={cn(
            "rounded p-1.5 text-xs hover:bg-muted hover:text-foreground transition-colors cursor-pointer",
            editor.isActive("link") && "bg-accent text-accent-foreground font-semibold"
          )}
          title="Add Link"
        >
          <LinkIcon className="h-4 w-4" />
        </button>

        {editor.isActive("link") && (
          <button
            type="button"
            onClick={() => editor.chain().focus().unsetLink().run()}
            className="rounded p-1.5 text-xs hover:bg-muted hover:text-foreground transition-colors cursor-pointer text-destructive"
            title="Remove Link"
          >
            <Unlink className="h-4 w-4" />
          </button>
        )}

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().chain().focus().undo().run() || disabled}
            className="rounded p-1.5 text-xs hover:bg-muted hover:text-foreground transition-colors cursor-pointer disabled:opacity-40"
            title="Undo"
          >
            <Undo className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().chain().focus().redo().run() || disabled}
            className="rounded p-1.5 text-xs hover:bg-muted hover:text-foreground transition-colors cursor-pointer disabled:opacity-40"
            title="Redo"
          >
            <Redo className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Editor Content Area */}
      <EditorContent editor={editor} />
    </div>
  );
}
