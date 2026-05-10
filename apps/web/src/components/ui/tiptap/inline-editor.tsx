"use client";

import CharacterCount from "@tiptap/extension-character-count";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";
import { Markdown } from "tiptap-markdown";
import { cn } from "@/lib/utils";
import "./styles.css";

interface MarkdownStorage {
  markdown?: {
    getMarkdown?: () => string;
  };
}

function hasMarkdownStorage(storage: unknown): storage is MarkdownStorage {
  return (
    typeof storage === "object" && storage !== null && "markdown" in storage
  );
}

const getMarkdown = (storage: unknown): string => {
  if (!hasMarkdownStorage(storage)) {
    return "";
  }
  const getValue = storage.markdown?.getMarkdown;
  return typeof getValue === "function" ? getValue() : "";
};

interface TiptapInlineEditorProps {
  autoFocus?: boolean;
  className?: string;
  disabled?: boolean;
  maxLength?: number;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  value: string;
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
        link: false,
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
      ...(typeof maxLength === "number" && maxLength > 0
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

  useEffect(
    function syncExternalValue() {
      if (!editor) return;

      const currentMarkdown = getMarkdown(editor.storage);
      if (value !== currentMarkdown) {
        editor.commands.setContent(value);
      }
    },
    [editor, value]
  );

  useEffect(
    function syncEditableState() {
      if (!editor) return;
      editor.setEditable(!disabled);
    },
    [editor, disabled]
  );

  const characterCount = editor?.storage.characterCount?.characters() ?? 0;
  const hasCharacterLimit = typeof maxLength === "number" && maxLength > 0;
  const isNearLimit = hasCharacterLimit && characterCount > maxLength * 0.9;
  const isAtLimit = hasCharacterLimit && characterCount >= maxLength;

  const handleContainerPointerDown = () => {
    if (disabled) {
      return;
    }
    editor?.commands.focus();
  };

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
      onPointerDown={handleContainerPointerDown}
    >
      <EditorContent editor={editor} />

      {hasCharacterLimit && (
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
