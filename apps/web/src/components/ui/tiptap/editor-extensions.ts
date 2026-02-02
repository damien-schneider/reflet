"use client";

import CharacterCount from "@tiptap/extension-character-count";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Typography from "@tiptap/extension-typography";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import { ImageExtension } from "./image-extension";
import { createSlashCommandExtension } from "./slash-command";
import type { useMediaUpload } from "./use-media-upload";

export interface CreateExtensionsOptions {
  placeholder: string;
  maxLength?: number;
  onImageUpload: () => void;
  onVideoUpload: () => void;
}

export function createExtensions(options: CreateExtensionsOptions) {
  const { placeholder, maxLength, onImageUpload, onVideoUpload } = options;

  return [
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

          const handlesContainer = document.createElement("div");
          handlesContainer.classList.add("tiptap-resize-handles");

          const handlePositions = [
            { position: "top-left", xDir: -1, yDir: -1 },
            { position: "top-right", xDir: 1, yDir: -1 },
            { position: "bottom-left", xDir: -1, yDir: 1 },
            { position: "bottom-right", xDir: 1, yDir: 1 },
          ];

          let activeHandle: { xDir: number; yDir: number } | null = null;
          let startX = 0;
          let startY = 0;
          let startWidth = 0;
          let startHeight = 0;
          let aspectRatio = 1;

          const onMouseDown = (
            e: MouseEvent,
            handle: { xDir: number; yDir: number }
          ) => {
            e.preventDefault();
            e.stopPropagation();
            activeHandle = handle;
            startX = e.clientX;
            startY = e.clientY;
            startWidth = img.offsetWidth;
            startHeight = img.offsetHeight;
            aspectRatio = startWidth / startHeight;
            container.setAttribute("data-resizing", "true");
            document.addEventListener("mousemove", onMouseMove);
            document.addEventListener("mouseup", onMouseUp);
          };

          const onMouseMove = (e: MouseEvent) => {
            if (!activeHandle) return;

            const diffX = (e.clientX - startX) * activeHandle.xDir;
            const diffY = (e.clientY - startY) * activeHandle.yDir;
            const maxDiff =
              Math.abs(diffX) > Math.abs(diffY) ? diffX : diffY * aspectRatio;
            const newWidth = Math.max(50, startWidth + maxDiff);

            img.style.width = `${newWidth}px`;
          };

          const onMouseUp = () => {
            if (!activeHandle) return;
            activeHandle = null;
            container.removeAttribute("data-resizing");
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);

            const pos = getPos();
            if (typeof pos === "number") {
              editor
                .chain()
                .focus()
                .updateAttributes("image", { width: img.offsetWidth })
                .run();
            }
          };

          for (const { position, xDir, yDir } of handlePositions) {
            const handle = document.createElement("div");
            handle.classList.add("tiptap-resize-handle", position);
            handle.addEventListener("mousedown", (e) =>
              onMouseDown(e, { xDir, yDir })
            );
            handlesContainer.appendChild(handle);
          }

          container.appendChild(img);
          container.appendChild(handlesContainer);

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
              document.removeEventListener("mousemove", onMouseMove);
              document.removeEventListener("mouseup", onMouseUp);
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
      html: true,
      transformPastedText: true,
      transformCopiedText: true,
    }),
    createSlashCommandExtension({
      onImageUpload,
      onVideoUpload,
    }),
  ];
}

export function createEditorProps(
  options: Pick<ReturnType<typeof useMediaUpload>, "uploadMedia"> & {
    minimal: boolean;
  }
) {
  const { uploadMedia, minimal } = options;

  return {
    attributes: {
      class: minimal
        ? "outline-none w-full tiptap-minimal-editor min-h-24"
        : "outline-none w-full tiptap-markdown-editor min-h-32",
    },
    handlePaste: (_view: unknown, event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return false;

      for (const item of items) {
        if (item.type.startsWith("image/") || item.type.startsWith("video/")) {
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
    handleDrop: (
      _view: unknown,
      event: DragEvent,
      _slice: unknown,
      moved: boolean
    ) => {
      if (moved) return false;

      const files = event.dataTransfer?.files;
      if (!files?.length) return false;

      const file = files[0];
      if (file?.type.startsWith("image/") || file?.type.startsWith("video/")) {
        event.preventDefault();
        uploadMedia(file);
        return true;
      }

      return false;
    },
  };
}
