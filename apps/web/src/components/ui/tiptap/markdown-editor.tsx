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

interface EditorFooterProps extends Omit<CharacterCounterProps, "maxLength"> {
  isUploading: boolean;
  maxLength?: number;
  uploadProgress: string | null;
}

function EditorFooter({
  isUploading,
  uploadProgress,
  maxLength,
  ...counter
}: EditorFooterProps) {
  return (
    <div className="mt-2 flex items-center justify-between text-xs">
      <span aria-live="polite" className="text-muted-foreground" role="status">
        {isUploading ? uploadProgress : null}
      </span>
      {maxLength ? (
        <CharacterCounter maxLength={maxLength} {...counter} />
      ) : null}
    </div>
  );
}

interface ContainerStyleOptions {
  className?: string;
  disabled: boolean;
  isInteractive: boolean;
  minimal: boolean;
}

function getContainerClassName({
  className,
  disabled,
  isInteractive,
  minimal,
}: ContainerStyleOptions) {
  if (minimal) {
    return cn("w-full", disabled && "cursor-not-allowed opacity-50", className);
  }
  return cn(
    "border-input dark:bg-input/30 rounded-lg border bg-transparent px-2.5 py-2 text-base md:text-sm",
    isInteractive &&
      "focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]",
    disabled && "bg-input/50 dark:bg-input/80 cursor-not-allowed opacity-50",
    className
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
  placeholder = "Write something… Type / for commands",
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

  const isInteractive = editable && !disabled;

  const handleContainerClick = () => {
    if (isInteractive) {
      editor?.commands.focus();
    }
  };

  const showFooter = !minimal || isUploading || Boolean(maxLength);

  return (
    <div
      className={getContainerClassName({
        className,
        disabled,
        isInteractive,
        minimal,
      })}
      data-slot="tiptap-markdown-editor"
      onClick={handleContainerClick}
      role="presentation"
    >
      <div className="relative">
        <EditorContent editor={editor} />
        {editor && isInteractive && <ImageBubbleMenu editor={editor} />}
      </div>

      <MediaFileInputs
        imageInputRef={imageInputRef}
        onImageChange={handleImageChange}
        onVideoChange={handleVideoChange}
        videoInputRef={videoInputRef}
      />

      {showFooter && (
        <EditorFooter
          characterCount={characterCount}
          isAtLimit={isAtLimit}
          isNearLimit={isNearLimit}
          isUploading={isUploading}
          maxLength={maxLength}
          uploadProgress={uploadProgress}
        />
      )}
    </div>
  );
}
