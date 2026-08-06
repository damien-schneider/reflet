"use client";

import { Extension } from "@tiptap/core";
import CharacterCount from "@tiptap/extension-character-count";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Typography from "@tiptap/extension-typography";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import { ImageExtension } from "./image-extension";
import { createImageNodeView } from "./image-node-view";
import { createSlashCommandExtension } from "./slash-command";
import type { useMediaUpload } from "./use-media-upload";

export interface CreateExtensionsOptions {
  maxLength?: number;
  onImageUpload: () => void;
  onSubmit?: () => void;
  onVideoUpload: () => void;
  placeholder: string;
}

function createSubmitExtension(onSubmit: () => void) {
  return Extension.create({
    addKeyboardShortcuts() {
      return {
        "Mod-Enter": () => {
          onSubmit();
          return true;
        },
      };
    },
    name: "submitShortcut",
  });
}

// --- Image NodeView types ---

export function createExtensions(options: CreateExtensionsOptions) {
  const { placeholder, maxLength, onImageUpload, onVideoUpload, onSubmit } =
    options;

  return [
    StarterKit.configure({
      heading: {
        levels: [1, 2, 3],
      },
      link: false,
    }),
    Placeholder.configure({
      emptyEditorClass: "is-editor-empty",
      placeholder,
    }),
    Link.configure({
      HTMLAttributes: {
        class: "tiptap-link",
      },
      openOnClick: false,
    }),
    ImageExtension.configure({
      HTMLAttributes: {
        class: "tiptap-image",
      },
    }).extend({
      addNodeView() {
        return ({ node, editor, getPos }) =>
          createImageNodeView({ editor, getPos, node });
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
      transformCopiedText: true,
      transformPastedText: true,
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
  };
}
