"use client";

import { Input } from "@ctrl-ui/react/ui/input";
import { EditorContent } from "@tiptap/react";
import type React from "react";
import { cn } from "@/lib/utils";
import { useTiptapMarkdownEditor } from "./hooks/use-editor";
import { ImageBubbleMenu } from "./image-bubble-menu";
import "./styles.css";

interface MediaFileInputsProps {
  imageInputRef: React.RefObject<HTMLInputElement | null>;
  onImageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onVideoChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  videoInputRef: React.RefObject<HTMLInputElement | null>;
}

function MediaFileInputs({
  imageInputRef,
  videoInputRef,
  onImageChange,
  onVideoChange,
}: MediaFileInputsProps) {
  return (
    <>
      <Input
        accept="image/*"
        aria-label="Upload an image"
        className="hidden"
        onChange={onImageChange}
        ref={imageInputRef}
        type="file"
      />
      <Input
        accept="video/*"
        aria-label="Upload a video"
        className="hidden"
        onChange={onVideoChange}
        ref={videoInputRef}
        type="file"
      />
    </>
  );
}

interface CharacterCounterProps {
  characterCount: number;
  isAtLimit: boolean;
  isNearLimit: boolean;
  maxLength: number;
}

function CharacterCounter({
  characterCount,
  maxLength,
  isNearLimit,
  isAtLimit,
}: CharacterCounterProps) {
  return (
    <span
      className={cn(
        "tabular-nums",
        isAtLimit && "text-destructive-text",
        !isAtLimit && isNearLimit && "text-warning-text",
        !(isAtLimit || isNearLimit) && "text-muted-foreground"
      )}
    >
      {characterCount}/{maxLength}
    </span>
  );
}

interface TiptapMarkdownEditorProps {
  autoFocus?: boolean;
  className?: string;
  debounceMs?: number;
  disabled?: boolean;
  editable?: boolean;
  maxLength?: number;
  minimal?: boolean;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  value: string;
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
  onSubmit,
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
    autoFocus,
    debounceMs,
    disabled,
    editable,
    maxLength,
    minimal,
    onChange,
    onSubmit,
    placeholder,
    value,
  });

  const handleContainerClick = () => {
    if (editable && !disabled) {
      editor?.commands.focus();
    }
  };

  const containerClassName = cn(
    minimal
      ? "w-full"
      : "border-input dark:bg-input/30 rounded-lg border bg-transparent px-2.5 py-2 text-base transition-colors md:text-sm",
    !minimal &&
      editable &&
      !disabled &&
      "focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]",
    !minimal && disabled && "bg-input/50 dark:bg-input/80",
    disabled && "cursor-not-allowed opacity-50",
    className
  );

  const showFooter = minimal ? Boolean(isUploading || maxLength) : true;

  return (
    <div
      className={containerClassName}
      data-slot="tiptap-markdown-editor"
      onClick={handleContainerClick}
    >
      <div className="relative">
        <EditorContent editor={editor} />
        {editor && editable && !disabled && <ImageBubbleMenu editor={editor} />}
      </div>

      <MediaFileInputs
        imageInputRef={imageInputRef}
        onImageChange={handleImageChange}
        onVideoChange={handleVideoChange}
        videoInputRef={videoInputRef}
      />

      {showFooter && (
        <div className="mt-2 flex items-center justify-between text-xs">
          {isUploading ? (
            <span className="text-muted-foreground">{uploadProgress}</span>
          ) : (
            <span />
          )}
          {maxLength ? (
            <CharacterCounter
              characterCount={characterCount}
              isAtLimit={isAtLimit}
              isNearLimit={isNearLimit}
              maxLength={maxLength}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}
