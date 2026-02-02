"use client";

import { EditorContent } from "@tiptap/react";
import { useCallback } from "react";
import { cn } from "@/lib/utils";
import { useTiptapMarkdownEditor } from "./hooks/use-editor";
import { ImageBubbleMenu } from "./image-bubble-menu";
import "./styles.css";

interface TiptapMarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  maxLength?: number;
  autoFocus?: boolean;
  editable?: boolean;
  minimal?: boolean;
  debounceMs?: number;
}

export function TiptapMarkdownEditor({
  value,
  onChange,
  placeholder = "Write something... Type '/' for commands",
  disabled = false,
  className,
  maxLength,
  autoFocus = false,
  editable = true,
  minimal = false,
  debounceMs = 0,
}: TiptapMarkdownEditorProps) {
  const {
    editor,
    imageInputRef,
    videoInputRef,
    handleImageChange,
    handleVideoChange,
    isUploading,
    uploadProgress,
    characterCount,
    isNearLimit,
    isAtLimit,
  } = useTiptapMarkdownEditor({
    value,
    onChange,
    placeholder,
    disabled,
    maxLength,
    autoFocus,
    editable,
    minimal,
    debounceMs,
  });

  const handleContainerClick = useCallback(() => {
    if (editable && !disabled) {
      editor?.commands.focus();
    }
  }, [editor, editable, disabled]);

  if (minimal) {
    return (
      <div
        className={cn(
          "w-full",
          disabled && "cursor-not-allowed opacity-50",
          className
        )}
        data-slot="tiptap-markdown-editor"
        onClick={handleContainerClick}
      >
        <div className="relative">
          <EditorContent editor={editor} />
          {editor && <ImageBubbleMenu editor={editor} />}
        </div>

        <input
          accept="image/*"
          className="hidden"
          onChange={handleImageChange}
          ref={imageInputRef}
          type="file"
        />
        <input
          accept="video/*"
          className="hidden"
          onChange={handleVideoChange}
          ref={videoInputRef}
          type="file"
        />

        {(isUploading || maxLength) && (
          <div className="mt-2 flex items-center justify-between text-xs">
            {isUploading && (
              <span className="text-muted-foreground">{uploadProgress}</span>
            )}
            {!isUploading && <span />}

            {maxLength && (
              <span
                className={cn(
                  isAtLimit
                    ? "text-destructive"
                    : isNearLimit
                      ? "text-amber-500"
                      : "text-muted-foreground"
                )}
              >
                {characterCount}/{maxLength}
              </span>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "border-input dark:bg-input/30 rounded-lg border bg-transparent px-2.5 py-2 text-base transition-colors md:text-sm",
        editable &&
          !disabled &&
          "focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]",
        disabled &&
          "bg-input/50 dark:bg-input/80 cursor-not-allowed opacity-50",
        className
      )}
      data-slot="tiptap-markdown-editor"
      onClick={handleContainerClick}
    >
      <div className="relative">
        <EditorContent editor={editor} />
        {editor && <ImageBubbleMenu editor={editor} />}
      </div>

      <input
        accept="image/*"
        className="hidden"
        onChange={handleImageChange}
        ref={imageInputRef}
        type="file"
      />
      <input
        accept="video/*"
        className="hidden"
        onChange={handleVideoChange}
        ref={videoInputRef}
        type="file"
      />

      <div className="mt-2 flex items-center justify-between text-xs">
        {isUploading && (
          <span className="text-muted-foreground">{uploadProgress}</span>
        )}
        {!isUploading && <span />}

        {maxLength && (
          <span
            className={cn(
              isAtLimit
                ? "text-destructive"
                : isNearLimit
                  ? "text-amber-500"
                  : "text-muted-foreground"
            )}
          >
            {characterCount}/{maxLength}
          </span>
        )}
      </div>
    </div>
  );
}
