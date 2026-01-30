"use client";

import { useDebouncedCallback } from "@tanstack/react-pacer";
import CharacterCount from "@tiptap/extension-character-count";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Typography from "@tiptap/extension-typography";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useCallback, useEffect, useRef } from "react";
import { Markdown } from "tiptap-markdown";
import { cn } from "@/lib/utils";
import { ImageBubbleMenu } from "./image-bubble-menu";
import { ImageExtension } from "./image-extension";
import { createSlashCommandExtension } from "./slash-command";
import { useMediaUpload } from "./use-media-upload";
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
  minimal?: boolean;
  /**
   * Debounce delay in milliseconds for the onChange callback.
   * Use this when saving to a real-time database like Convex to prevent
   * race conditions where the external value updates overwrite user input.
   * Recommended: 300-500ms for real-time saves, 0 for local state.
   * @default 0 (no debounce)
   */
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
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<ReturnType<typeof useEditor>>(null);

  // Track whether this is the initial mount - only sync external value once on mount
  // After that, local content is authoritative and external updates are ignored.
  // This prevents real-time database updates from overwriting user edits.
  const hasInitializedRef = useRef(false);
  const initialValueRef = useRef(value);

  // Debounced onChange for real-time database scenarios
  const debouncedOnChange = useDebouncedCallback(onChange, {
    wait: debounceMs,
  });
  const effectiveOnChange = debounceMs > 0 ? debouncedOnChange : onChange;

  const { uploadMedia, isUploading, uploadProgress } = useMediaUpload({
    onSuccess: (result) => {
      const ed = editorRef.current;
      if (!ed) return;

      if (result.type === "image") {
        ed.chain().focus().setImage({ src: result.url }).run();
      } else if (result.type === "video") {
        // Insert video as HTML since tiptap doesn't have native video support
        ed.chain()
          .focus()
          .insertContent(
            `<p><video src="${result.url}" controls class="tiptap-video"></video></p>`
          )
          .run();
      }
    },
    onError: (error) => {
      console.error("Media upload failed:", error);
    },
  });

  const handleImageUpload = useCallback(() => {
    imageInputRef.current?.click();
  }, []);

  const handleVideoUpload = useCallback(() => {
    videoInputRef.current?.click();
  }, []);

  const handleImageChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        await uploadMedia(file);
      }
      event.target.value = "";
    },
    [uploadMedia]
  );

  const handleVideoChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        await uploadMedia(file);
      }
      event.target.value = "";
    },
    [uploadMedia]
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
      ImageExtension.configure({
        HTMLAttributes: {
          class: "tiptap-image",
        },
      }).extend({
        addNodeView() {
          return ({ node, editor, getPos }) => {
            const container = document.createElement("div");
            container.classList.add("tiptap-image-wrapper");
            container.setAttribute("data-align", node.attrs.align || "center");

            const img = document.createElement("img");
            img.src = node.attrs.src;
            img.alt = node.attrs.alt || "";
            img.title = node.attrs.title || "";
            img.classList.add("tiptap-image");
            img.setAttribute("data-align", node.attrs.align || "center");
            if (node.attrs.width) {
              img.style.width = `${node.attrs.width}px`;
            }

            // Resize handle
            const resizeHandle = document.createElement("div");
            resizeHandle.classList.add("tiptap-resize-handle", "bottom-right");

            let isResizing = false;
            let startX = 0;
            let startWidth = 0;

            const onMouseDown = (e: MouseEvent) => {
              e.preventDefault();
              isResizing = true;
              startX = e.clientX;
              startWidth = img.offsetWidth;
              document.addEventListener("mousemove", onMouseMove);
              document.addEventListener("mouseup", onMouseUp);
            };

            const onMouseMove = (e: MouseEvent) => {
              if (!isResizing) return;
              const diff = e.clientX - startX;
              const newWidth = Math.max(50, startWidth + diff);
              img.style.width = `${newWidth}px`;
            };

            const onMouseUp = () => {
              if (!isResizing) return;
              isResizing = false;
              document.removeEventListener("mousemove", onMouseMove);
              document.removeEventListener("mouseup", onMouseUp);

              // Save the new width
              const pos = getPos();
              if (typeof pos === "number") {
                editor
                  .chain()
                  .focus()
                  .updateAttributes("image", { width: img.offsetWidth })
                  .run();
              }
            };

            resizeHandle.addEventListener("mousedown", onMouseDown);

            container.appendChild(img);
            container.appendChild(resizeHandle);

            return {
              dom: container,
              update: (updatedNode) => {
                if (updatedNode.type.name !== "image") return false;
                img.src = updatedNode.attrs.src;
                img.alt = updatedNode.attrs.alt || "";
                img.setAttribute(
                  "data-align",
                  updatedNode.attrs.align || "center"
                );
                container.setAttribute(
                  "data-align",
                  updatedNode.attrs.align || "center"
                );
                if (updatedNode.attrs.width) {
                  img.style.width = `${updatedNode.attrs.width}px`;
                }
                return true;
              },
              destroy: () => {
                resizeHandle.removeEventListener("mousedown", onMouseDown);
              },
            };
          };
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
        html: true, // Enable HTML for video support
        transformPastedText: true,
        transformCopiedText: true,
      }),
      createSlashCommandExtension({
        onImageUpload: handleImageUpload,
        onVideoUpload: handleVideoUpload,
      }),
    ],
    content: value,
    editable: editable && !disabled,
    autofocus: autoFocus,
    editorProps: {
      attributes: {
        class: cn(
          "outline-none w-full",
          minimal
            ? "tiptap-minimal-editor min-h-24"
            : "tiptap-markdown-editor min-h-32"
        ),
      },
      handlePaste: (_view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;

        for (const item of items) {
          if (
            item.type.startsWith("image/") ||
            item.type.startsWith("video/")
          ) {
            const file = item.getAsFile();
            if (file) {
              event.preventDefault();
              uploadMedia(file);
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
        if (
          file?.type.startsWith("image/") ||
          file?.type.startsWith("video/")
        ) {
          event.preventDefault();
          uploadMedia(file);
          return true;
        }

        return false;
      },
    },
    onUpdate: ({ editor: ed }) => {
      const markdown = getMarkdown(ed.storage);
      effectiveOnChange(markdown);
    },
  });

  // Store editor ref for use in callbacks
  useEffect(() => {
    (editorRef as React.MutableRefObject<typeof editor>).current = editor;
  }, [editor]);

  // Initialize editor content only on first mount
  // After initialization, external value changes are IGNORED to prevent
  // real-time database updates from overwriting local edits.
  // This is intentional - local content is always authoritative.
  useEffect(() => {
    if (!editor) return;

    // Only set content on initial mount, not on subsequent value changes
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      // Only set if the initial value differs from the current content
      const currentMarkdown = getMarkdown(editor.storage);
      if (initialValueRef.current !== currentMarkdown) {
        editor.commands.setContent(initialValueRef.current);
      }
    }
    // Intentionally NOT including `value` in dependencies
    // External value updates should NOT overwrite local edits
  }, [editor]);

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
