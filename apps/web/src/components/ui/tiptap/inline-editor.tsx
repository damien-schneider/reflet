"use client";

import CharacterCount from "@tiptap/extension-character-count";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useCallback, useEffect } from "react";
import { Markdown } from "tiptap-markdown";
import { cn } from "@/lib/utils";
import "./styles.css";

// Helper to get markdown from tiptap-markdown storage
// The tiptap-markdown extension adds a `markdown` storage that TypeScript doesn't know about
const getMarkdown = (storage: unknown): string => {
  const storageWithMarkdown = storage as {
    markdown?: { getMarkdown?: () => string };
  };
  return storageWithMarkdown?.markdown?.getMarkdown?.() ?? "";
};

interface TiptapInlineEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  maxLength?: number;
  onSubmit?: () => void;
  autoFocus?: boolean;
}

export function TiptapInlineEditor({
  value,
  onChange,
  placeholder = "Write something...",
  disabled = false,
  className,
  maxLength,
  onSubmit,
  autoFocus = false,
}: TiptapInlineEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        // Disable block-level elements for inline editor
        heading: false,
        blockquote: false,
        bulletList: false,
        orderedList: false,
        codeBlock: false,
        horizontalRule: false,
        hardBreak: {
          keepMarks: true,
        },
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass: "is-editor-empty",
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "tiptap-link",
        },
      }),
      ...(maxLength
        ? [
            CharacterCount.configure({
              limit: maxLength,
            }),
          ]
        : []),
      Markdown.configure({
        html: false,
        transformPastedText: true,
        transformCopiedText: true,
      }),
    ],
    content: value,
    editable: !disabled,
    autofocus: autoFocus,
    editorProps: {
      attributes: {
        class: "tiptap-inline-editor outline-none min-h-16 w-full",
      },
      handleKeyDown: (_view, event) => {
        // Handle Cmd/Ctrl + Enter to submit
        if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
          event.preventDefault();
          onSubmit?.();
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor: ed }) => {
      const markdown = getMarkdown(ed.storage);
      onChange(markdown);
    },
  });

  // Sync external value changes
  useEffect(() => {
    if (!editor) return;

    const currentMarkdown = getMarkdown(editor.storage);
    if (value !== currentMarkdown) {
      editor.commands.setContent(value);
    }
  }, [editor, value]);

  // Update editable state
  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [editor, disabled]);

  const characterCount = editor?.storage.characterCount?.characters() ?? 0;
  const isNearLimit = maxLength && characterCount > maxLength * 0.9;
  const isAtLimit = maxLength && characterCount >= maxLength;

  const handleContainerClick = useCallback(() => {
    editor?.commands.focus();
  }, [editor]);

  return (
    <div
      className={cn(
        "border-input dark:bg-input/30 rounded-lg border bg-transparent px-2.5 py-2 text-base transition-colors md:text-sm",
        "focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]",
        disabled &&
          "bg-input/50 dark:bg-input/80 cursor-not-allowed opacity-50",
        className
      )}
      data-slot="tiptap-inline-editor"
      onClick={handleContainerClick}
    >
      <EditorContent editor={editor} />

      {maxLength && (
        <div
          className={cn(
            "mt-1 text-right text-xs",
            isAtLimit
              ? "text-destructive"
              : isNearLimit
                ? "text-amber-500"
                : "text-muted-foreground"
          )}
        >
          {characterCount}/{maxLength}
        </div>
      )}
    </div>
  );
}
