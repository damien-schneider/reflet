"use client";

import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useCallback, useEffect, useRef } from "react";
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
  onSubmit?: () => void;
}

export function TiptapTitleEditor({
  value,
  onChange,
  placeholder = "Untitled",
  disabled = false,
  className,
  autoFocus = false,
  onEnter,
  onSubmit,
}: TiptapTitleEditorProps) {
  // Use refs to always access the latest callbacks
  const onEnterRef = useRef(onEnter);
  const onSubmitRef = useRef(onSubmit);

  useEffect(() => {
    onEnterRef.current = onEnter;
  }, [onEnter]);

  useEffect(() => {
    onSubmitRef.current = onSubmit;
  }, [onSubmit]);

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
        // Handle mod+enter for submit
        if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
          event.preventDefault();
          onSubmitRef.current?.();
          return true;
        }
        // Prevent Enter from creating new lines
        if (event.key === "Enter") {
          event.preventDefault();
          onEnterRef.current?.();
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
