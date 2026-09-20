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

const getMarkdown = (storage: unknown): string => {
  const storageWithMarkdown = storage as {
    markdown?: { getMarkdown?: () => string };
  };
  return storageWithMarkdown?.markdown?.getMarkdown?.() ?? "";
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
    autofocus: autoFocus,
    content: value,
    editable: !disabled,
    editorProps: {
      attributes: {
        class: "tiptap-inline-editor outline-none min-h-16 w-full",
      },
      handleKeyDown: (_view, event) => {
        if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
          event.preventDefault();
          onSubmit?.();
          return true;
        }
        return false;
      },
    },
    extensions: [
      StarterKit.configure({
        blockquote: false,
        bulletList: false,
        codeBlock: false,
        hardBreak: {
          keepMarks: true,
        },
        heading: false,
        horizontalRule: false,
        link: false,
        orderedList: false,
      }),
      Placeholder.configure({
        emptyEditorClass: "is-editor-empty",
        placeholder,
      }),
      Link.configure({
        HTMLAttributes: {
          class: "tiptap-link",
        },
        openOnClick: false,
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
        transformCopiedText: true,
        transformPastedText: true,
      }),
    ],
    immediatelyRender: false,
    onUpdate: ({ editor: ed }) => {
      const markdown = getMarkdown(ed.storage);
      onChange(markdown);
    },
  });

  useEffect(() => {
    if (!editor) return;

    const currentMarkdown = getMarkdown(editor.storage);
    if (value !== currentMarkdown) {
      editor.commands.setContent(value);
    }
  }, [editor, value]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [editor, disabled]);

  const characterCount = editor?.storage.characterCount?.characters() ?? 0;
  const isNearLimit = maxLength && characterCount > maxLength * 0.9;
  const isAtLimit = maxLength && characterCount >= maxLength;

  const handleContainerClick = () => {
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
      onClick={handleContainerClick}
    >
      <EditorContent editor={editor} />

      {maxLength && (
        <div
          className={cn(
            "mt-1 text-right text-xs tabular-nums",
            isAtLimit && "text-destructive-text",
            !isAtLimit && isNearLimit && "text-warning-text",
            !(isAtLimit || isNearLimit) && "text-muted-foreground"
          )}
        >
          {characterCount}/{maxLength}
        </div>
      )}
    </div>
  );
}
