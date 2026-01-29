"use client";

import CharacterCount from "@tiptap/extension-character-count";
import TiptapImage from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Typography from "@tiptap/extension-typography";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useCallback, useEffect, useRef } from "react";
import { Markdown } from "tiptap-markdown";
import { cn } from "@/lib/utils";
import { createSlashCommandExtension } from "./slash-command";
import { useImageUpload } from "./use-image-upload";
import "./styles.css";

// Helper to get markdown from tiptap-markdown storage
// The tiptap-markdown extension adds a `markdown` storage that TypeScript doesn't know about
const getMarkdown = (storage: unknown): string => {
  const storageWithMarkdown = storage as {
    markdown?: { getMarkdown?: () => string };
  };
  return storageWithMarkdown?.markdown?.getMarkdown?.() ?? "";
};

interface TiptapMarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  maxLength?: number;
  autoFocus?: boolean;
  editable?: boolean;
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
}: TiptapMarkdownEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { uploadImage, isUploading } = useImageUpload({
    onSuccess: (url) => {
      if (editor) {
        editor.chain().focus().setImage({ src: url }).run();
      }
    },
    onError: (error) => {
      console.error("Image upload failed:", error);
    },
  });

  const handleImageUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        await uploadImage(file);
      }
      // Reset input so the same file can be selected again
      event.target.value = "";
    },
    [uploadImage]
  );

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
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
      TiptapImage.configure({
        HTMLAttributes: {
          class: "tiptap-image",
        },
      }),
      Typography,
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
      createSlashCommandExtension({
        onImageUpload: handleImageUpload,
      }),
    ],
    content: value,
    editable: editable && !disabled,
    autofocus: autoFocus,
    editorProps: {
      attributes: {
        class: "tiptap-markdown-editor outline-none min-h-32 w-full",
      },
      handlePaste: (_view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;

        for (const item of items) {
          if (item.type.startsWith("image/")) {
            const file = item.getAsFile();
            if (file) {
              event.preventDefault();
              uploadImage(file);
              return true;
            }
          }
        }

        return false;
      },
      handleDrop: (_view, event, _slice, moved) => {
        if (moved) return false;

        const files = event.dataTransfer?.files;
        if (!files?.length) return false;

        const file = files[0];
        if (file?.type.startsWith("image/")) {
          event.preventDefault();
          uploadImage(file);
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
    editor.setEditable(editable && !disabled);
  }, [editor, editable, disabled]);

  const characterCount = editor?.storage.characterCount?.characters() ?? 0;
  const isNearLimit = maxLength && characterCount > maxLength * 0.9;
  const isAtLimit = maxLength && characterCount >= maxLength;

  const handleContainerClick = useCallback(() => {
    if (editable && !disabled) {
      editor?.commands.focus();
    }
  }, [editor, editable, disabled]);

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
      <EditorContent editor={editor} />

      {/* Hidden file input for image uploads */}
      <input
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
        ref={fileInputRef}
        type="file"
      />

      {/* Character count and upload indicator */}
      <div className="mt-2 flex items-center justify-between text-xs">
        {isUploading && (
          <span className="text-muted-foreground">Uploading image...</span>
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
