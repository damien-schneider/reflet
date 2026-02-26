"use client";

import { useState } from "react";
import { TiptapMarkdownEditor } from "@/components/ui/tiptap/markdown-editor";

/**
 * Test page for TiptapMarkdownEditor - used for E2E testing only.
 * This page is not linked from anywhere and is only accessible via direct URL.
 */
export default function TestTiptapPage() {
  const [content, setContent] = useState("");

  return (
    <div className="min-h-screen bg-background p-8">
      <h1 className="mb-4 font-bold text-2xl" data-testid="page-title">
        Tiptap Editor Test Page
      </h1>

      <div className="mx-auto max-w-2xl space-y-4">
        <div className="rounded-lg border p-4" data-testid="editor-container">
          <TiptapMarkdownEditor
            onChange={setContent}
            placeholder="Type '/' for slash commands..."
            value={content}
          />
        </div>

        <div className="rounded-lg border bg-muted/30 p-4">
          <h2 className="mb-2 font-semibold text-sm">Markdown Output:</h2>
          <pre
            className="whitespace-pre-wrap font-mono text-xs"
            data-testid="markdown-output"
          >
            {content || "(empty)"}
          </pre>
        </div>
      </div>
    </div>
  );
}
