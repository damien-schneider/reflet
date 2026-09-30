"use client";

import { useState } from "react";
import { TiptapMarkdownEditor } from "@/components/ui/tiptap/markdown-editor";

export default function TestTiptapPage() {
  const [content, setContent] = useState("");

  return (
    <main className="mx-auto min-h-dvh max-w-2xl space-y-4 bg-background p-8">
      <h1
        className="text-balance font-semibold text-2xl"
        data-testid="page-title"
      >
        Tiptap editor test page
      </h1>

      <div className="rounded-lg border p-4" data-testid="editor-container">
        <TiptapMarkdownEditor
          onChange={setContent}
          placeholder="Type / for commands…"
          value={content}
        />
      </div>

      <section className="rounded-lg border bg-muted/30 p-4">
        <h2 className="mb-2 font-medium text-sm">Markdown output</h2>
        <pre
          className="whitespace-pre-wrap font-mono text-xs"
          data-testid="markdown-output"
        >
          {content || "(empty)"}
        </pre>
      </section>
    </main>
  );
}
