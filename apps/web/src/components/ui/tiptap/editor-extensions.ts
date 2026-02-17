"use client";

import { Extension } from "@tiptap/core";
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
  onSubmit?: () => void;
}

function createSubmitExtension(onSubmit: () => void) {
  return Extension.create({
    name: "submitShortcut",
    addKeyboardShortcuts() {
      return {
        "Mod-Enter": () => {
          onSubmit();
          return true;
        },
      };
    },
  });
}

// --- Image NodeView types ---

interface ImageNodeAttrs {
  src: string;
  alt: string;
  title: string;
  align: string;
  width: number | null;
}

interface ResizeDirection {
  xDir: number;
  yDir: number;
}

interface ImageNodeViewEditor {
  isEditable: boolean;
  chain: () => {
    focus: () => {
      updateAttributes: (
        type: string,
        attrs: Record<string, unknown>
      ) => { run: () => void };
    };
  };
}

export interface ImageNodeViewOptions {
  node: { attrs: ImageNodeAttrs | Record<string, unknown> };
  editor: ImageNodeViewEditor;
  getPos: () => number | undefined;
}

export interface ImageNodeViewResult {
  dom: HTMLDivElement;
  update: (updatedNode: {
    type: { name: string };
    attrs: Record<string, unknown>;
  }) => boolean;
  destroy: () => void;
}

function getImageAttrs(attrs: Record<string, unknown>): ImageNodeAttrs {
  return {
    src: (attrs.src as string) ?? "",
    alt: (attrs.alt as string) ?? "",
    title: (attrs.title as string) ?? "",
    align: (attrs.align as string) ?? "center",
    width: (attrs.width as number) ?? null,
  };
}

const MIN_RESIZE_WIDTH = 50;

function createErrorPlaceholder(): HTMLDivElement {
  const errorPlaceholder = document.createElement("div");
  errorPlaceholder.classList.add("tiptap-image-error");

  const errorIcon = document.createElement("span");
  errorIcon.classList.add("tiptap-image-error-icon");
  errorIcon.setAttribute("aria-hidden", "true");

  const errorText = document.createElement("span");
  errorText.textContent = "Image unavailable";

  errorPlaceholder.appendChild(errorIcon);
  errorPlaceholder.appendChild(errorText);
  return errorPlaceholder;
}

function createImageElement(attrs: ImageNodeAttrs): HTMLImageElement {
  const img = document.createElement("img");
  img.src = attrs.src;
  img.alt = attrs.alt || "";
  img.title = attrs.title || "";
  img.classList.add("tiptap-image");
  img.setAttribute("data-align", attrs.align || "center");
  if (attrs.width) {
    img.style.width = `${attrs.width}px`;
  }
  return img;
}

function attachResizeHandles(
  container: HTMLDivElement,
  img: HTMLImageElement,
  editor: ImageNodeViewEditor,
  getPos: () => number | undefined
): {
  onMouseMove: (e: MouseEvent) => void;
  onMouseUp: () => void;
  onTouchMove: (e: TouchEvent) => void;
  onTouchEnd: () => void;
} {
  const handlesContainer = document.createElement("div");
  handlesContainer.classList.add("tiptap-resize-handles");

  const handlePositions: Array<{ position: string } & ResizeDirection> = [
    { position: "top-left", xDir: -1, yDir: -1 },
    { position: "top-right", xDir: 1, yDir: -1 },
    { position: "bottom-left", xDir: -1, yDir: 1 },
    { position: "bottom-right", xDir: 1, yDir: 1 },
  ];

  let activeHandle: ResizeDirection | null = null;
  let startX = 0;
  let startY = 0;
  let startWidth = 0;
  let aspectRatio = 1;
  let isResizing = false;

  const startResize = (
    clientX: number,
    clientY: number,
    handle: ResizeDirection
  ) => {
    activeHandle = handle;
    isResizing = true;
    startX = clientX;
    startY = clientY;
    startWidth = img.offsetWidth;
    const startHeight = img.offsetHeight;
    aspectRatio = startWidth / startHeight;
    container.setAttribute("data-resizing", "true");
  };

  const moveResize = (clientX: number, clientY: number) => {
    if (!activeHandle) return;

    const diffX = (clientX - startX) * activeHandle.xDir;
    const diffY = (clientY - startY) * activeHandle.yDir;
    const maxDiff =
      Math.abs(diffX) > Math.abs(diffY) ? diffX : diffY * aspectRatio;
    const newWidth = Math.max(MIN_RESIZE_WIDTH, startWidth + maxDiff);

    img.style.width = `${newWidth}px`;
  };

  const endResize = () => {
    if (!activeHandle) return;
    activeHandle = null;
    container.removeAttribute("data-resizing");

    const pos = getPos();
    if (typeof pos === "number") {
      editor
        .chain()
        .focus()
        .updateAttributes("image", { width: img.offsetWidth })
        .run();
    }

    requestAnimationFrame(() => {
      isResizing = false;
    });
  };

  // Mouse handlers
  const onMouseMove = (e: MouseEvent) => {
    moveResize(e.clientX, e.clientY);
  };

  const onMouseUp = () => {
    endResize();
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
  };

  const onMouseDown = (e: MouseEvent, handle: ResizeDirection) => {
    e.preventDefault();
    e.stopPropagation();
    startResize(e.clientX, e.clientY, handle);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  // Touch handlers
  const onTouchMove = (e: TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    moveResize(touch.clientX, touch.clientY);
  };

  const onTouchEnd = () => {
    endResize();
    document.removeEventListener("touchmove", onTouchMove);
    document.removeEventListener("touchend", onTouchEnd);
    document.removeEventListener("touchcancel", onTouchEnd);
  };

  const onTouchStart = (e: TouchEvent, handle: ResizeDirection) => {
    e.preventDefault();
    e.stopPropagation();
    const touch = e.touches[0];
    startResize(touch.clientX, touch.clientY, handle);
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd);
    document.addEventListener("touchcancel", onTouchEnd);
  };

  // Prevent keyboard popup when tapping images on mobile
  img.addEventListener("touchend", (e) => {
    if (!isResizing) {
      e.preventDefault();
    }
  });

  for (const { position, xDir, yDir } of handlePositions) {
    const handle = document.createElement("div");
    handle.classList.add("tiptap-resize-handle", position);
    handle.addEventListener("mousedown", (e) => onMouseDown(e, { xDir, yDir }));
    handle.addEventListener(
      "touchstart",
      (e) => onTouchStart(e, { xDir, yDir }),
      { passive: false }
    );
    handlesContainer.appendChild(handle);
  }

  container.appendChild(handlesContainer);

  return { onMouseMove, onMouseUp, onTouchMove, onTouchEnd };
}

export function createImageNodeView({
  node,
  editor,
  getPos,
}: ImageNodeViewOptions): ImageNodeViewResult {
  const attrs = getImageAttrs(node.attrs as Record<string, unknown>);

  const container = document.createElement("div");
  container.classList.add("tiptap-image-wrapper");
  container.setAttribute("data-align", attrs.align || "center");

  const img = createImageElement(attrs);
  const errorPlaceholder = createErrorPlaceholder();

  img.addEventListener("error", () => {
    img.style.display = "none";
    errorPlaceholder.style.display = "flex";
    container.setAttribute("data-error", "true");
  });

  img.addEventListener("load", () => {
    img.style.display = "block";
    errorPlaceholder.style.display = "none";
    container.removeAttribute("data-error");
  });

  container.appendChild(img);
  container.appendChild(errorPlaceholder);

  const eventHandlers = editor.isEditable
    ? attachResizeHandles(container, img, editor, getPos)
    : null;

  return {
    dom: container,
    update: (updatedNode) => {
      if (updatedNode.type.name !== "image") return false;

      const attrs = getImageAttrs(updatedNode.attrs);

      if (img.src !== attrs.src) {
        img.style.display = "block";
        errorPlaceholder.style.display = "none";
        container.removeAttribute("data-error");
      }

      img.src = attrs.src;
      img.alt = attrs.alt || "";
      img.setAttribute("data-align", attrs.align || "center");
      container.setAttribute("data-align", attrs.align || "center");

      if (attrs.width) {
        img.style.width = `${attrs.width}px`;
      }

      return true;
    },
    destroy: () => {
      if (!eventHandlers) return;
      document.removeEventListener("mousemove", eventHandlers.onMouseMove);
      document.removeEventListener("mouseup", eventHandlers.onMouseUp);
      document.removeEventListener("touchmove", eventHandlers.onTouchMove);
      document.removeEventListener("touchend", eventHandlers.onTouchEnd);
      document.removeEventListener("touchcancel", eventHandlers.onTouchEnd);
    },
  };
}

export function createExtensions(options: CreateExtensionsOptions) {
  const { placeholder, maxLength, onImageUpload, onVideoUpload, onSubmit } =
    options;

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
        return ({ node, editor, getPos }) =>
          createImageNodeView({ node, editor, getPos });
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
    ...(onSubmit ? [createSubmitExtension(onSubmit)] : []),
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
