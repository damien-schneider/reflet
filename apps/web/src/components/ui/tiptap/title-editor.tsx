"use client";

import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import type React from "react";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import "./styles.css";

interface TiptapTitleEditorProps {
  autoFocus?: boolean;
  className?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  onEnter?: () => void;
  onSubmit?: () => void;
  placeholder?: string;
  style?: React.CSSProperties;
  value: string;
}

export function TiptapTitleEditor({
  value,
  onChange,
  placeholder = "Untitled",
  disabled = false,
  className,
  style,
  autoFocus = false,
  onEnter,
  onSubmit,
}: TiptapTitleEditorProps) {
  const onEnterRef = useRef(onEnter);
  const onSubmitRef = useRef(onSubmit);

  useEffect(() => {
    onEnterRef.current = onEnter;
  }, [onEnter]);

  useEffect(() => {
    onSubmitRef.current = onSubmit;
  }, [onSubmit]);

  const editor = useEditor({
    autofocus: autoFocus,
    content: value ? `<p>${value}</p>` : "",
    editable: !disabled,
    editorProps: {
      attributes: {
        class: "tiptap-title-editor outline-none w-full",
      },
      handleKeyDown: (_view, event) => {
        if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
          event.preventDefault();
          onSubmitRef.current?.();
          return true;
        }
        if (event.key === "Enter") {
          event.preventDefault();
          onEnterRef.current?.();
          return true;
        }
        return false;
      },
    },
    extensions: [
      StarterKit.configure({
        blockquote: false,
        bold: false,
        bulletList: false,
        code: false,
        codeBlock: false,
        hardBreak: false,
        heading: false,
        horizontalRule: false,
        italic: false,
        orderedList: false,
        strike: false,
      }),
      Placeholder.configure({
        emptyEditorClass: "is-editor-empty",
        placeholder,
      }),
    ],
    immediatelyRender: false,
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getText());
    },
  });

  useEffect(() => {
    if (!editor) return;

    const currentText = editor.getText();
    if (value !== currentText) {
      editor.commands.setContent(value ? `<p>${value}</p>` : "");
    }
  }, [editor, value]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [editor, disabled]);

  const handleContainerClick = () => {
    editor?.commands.focus();
  };

  return (
    <div
      className={cn(
        "w-full font-medium text-2xl leading-tight tracking-tight",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
      data-slot="tiptap-title-editor"
      onClick={handleContainerClick}
      style={style}
    >
      <EditorContent editor={editor} />
    </div>
  );
}
