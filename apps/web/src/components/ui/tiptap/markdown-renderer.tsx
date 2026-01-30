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
