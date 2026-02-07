"use client";

import Link from "@tiptap/extension-link";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";
import { Markdown } from "tiptap-markdown";
import { cn } from "@/lib/utils";
import { ImageExtension } from "./image-extension";
import "./styles.css";

// Helper to get markdown from tiptap-markdown storage
// The tiptap-markdown extension adds a `markdown` storage that TypeScript doesn't know about
const getMarkdown = (storage: unknown): string => {
  const storageWithMarkdown = storage as {
    markdown?: { getMarkdown?: () => string };
  };
  return storageWithMarkdown?.markdown?.getMarkdown?.() ?? "";
};

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({
  content,
  className,
}: MarkdownRendererProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Link.configure({
        openOnClick: true,
        HTMLAttributes: {
          class: "tiptap-link",
          target: "_blank",
          rel: "noopener noreferrer",
        },
      }),
      ImageExtension.configure({
        HTMLAttributes: {
          class: "tiptap-image",
        },
      }).extend({
        addNodeView() {
          return ({ node }) => {
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

            const errorPlaceholder = document.createElement("div");
            errorPlaceholder.classList.add("tiptap-image-error");
            const errorIcon = document.createElement("span");
            errorIcon.classList.add("tiptap-image-error-icon");
            errorIcon.setAttribute("aria-hidden", "true");
            const errorText = document.createElement("span");
            errorText.textContent = "Image unavailable";
            errorPlaceholder.appendChild(errorIcon);
            errorPlaceholder.appendChild(errorText);

            img.addEventListener("error", () => {
              img.style.display = "none";
              errorPlaceholder.style.display = "flex";
              container.setAttribute("data-error", "true");
            });

            container.appendChild(img);
            container.appendChild(errorPlaceholder);

            return {
              dom: container,
              update: (updatedNode) => {
                if (updatedNode.type.name !== "image") return false;
                if (img.src !== updatedNode.attrs.src) {
                  img.style.display = "block";
                  errorPlaceholder.style.display = "none";
                  container.removeAttribute("data-error");
                }
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
            };
          };
        },
      }),
      Markdown.configure({
        html: false,
      }),
    ],
    content,
    editable: false,
    editorProps: {
      attributes: {
        class: "tiptap-renderer",
      },
    },
  });

  // Sync external content changes
  useEffect(() => {
    if (!editor) return;

    // Only update if content actually changed
    const currentMarkdown = getMarkdown(editor.storage);
    if (content !== currentMarkdown) {
      editor.commands.setContent(content);
    }
  }, [editor, content]);

  if (!content) {
    return (
      <p className={cn("text-muted-foreground", className)}>
        No description provided.
      </p>
    );
  }

  return (
    <div className={cn("tiptap-renderer-container", className)}>
      <EditorContent editor={editor} />
    </div>
  );
}
