"use client";

import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import "./styles.css";

interface TiptapTitleEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  autoFocus?: boolean;
  onEnter?: () => void;
}

export function TiptapTitleEditor({
  value,
  onChange,
  placeholder = "Untitled",
  disabled = false,
  className,
  autoFocus = false,
  onEnter,
}: TiptapTitleEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        // Disable all block elements - title is single line
        heading: false,
        blockquote: false,
        bulletList: false,
        orderedList: false,
        codeBlock: false,
        horizontalRule: false,
        hardBreak: false,
        // Disable marks for clean title
        bold: false,
        italic: false,
        strike: false,
        code: false,
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass: "is-editor-empty",
      }),
    ],
    content: value ? `<p>${value}</p>` : "",
    editable: !disabled,
    autofocus: autoFocus,
    editorProps: {
      attributes: {
        class: "tiptap-title-editor outline-none w-full",
      },
      handleKeyDown: (_view, event) => {
        // Prevent Enter from creating new lines
        if (event.key === "Enter") {
          event.preventDefault();
          onEnter?.();
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor: ed }) => {
      // Get plain text content
      const text = ed.getText();
      onChange(text);
    },
  });

  // Sync external value changes
  useEffect(() => {
    if (!editor) return;

    const currentText = editor.getText();
    if (value !== currentText) {
      editor.commands.setContent(value ? `<p>${value}</p>` : "");
    }
  }, [editor, value]);

  // Update editable state
  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [editor, disabled]);

  const handleContainerClick = useCallback(() => {
    editor?.commands.focus();
  }, [editor]);

  return (
    <div
      className={cn(
        "w-full",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
      data-slot="tiptap-title-editor"
      onClick={handleContainerClick}
    >
      <EditorContent editor={editor} />
    </div>
  );
}
