"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TiptapMarkdownEditor } from "@/components/ui/tiptap/markdown-editor";
import { Muted } from "@/components/ui/typography";
import { useAutopilotContext } from "@/features/autopilot/components/autopilot-context";

export default function ProductPage() {
  const { organizationId } = useAutopilotContext();

  const doc = useQuery(api.autopilot.queries.knowledge.getProductDefinition, {
    organizationId,
  });
  const upsert = useMutation(
    api.autopilot.mutations.knowledge.upsertProductDefinition
  );

  const [pendingContent, setPendingContent] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  if (doc === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  const displayContent = pendingContent ?? doc?.contentFull ?? "";
  const isDirty = pendingContent !== null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await upsert({ organizationId, content: displayContent });
      setPendingContent(null);
      toast.success("Product definition saved");
    } catch {
      toast.error("Failed to save product definition");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <Muted>
          Describe your product in plain language. Agents use this to understand
          context when making decisions.
        </Muted>
        <Button
          className="shrink-0"
          disabled={!isDirty || isSaving}
          onClick={handleSave}
          size="sm"
        >
          {isSaving ? "Saving…" : "Save"}
        </Button>
      </div>
      <TiptapMarkdownEditor
        className="min-h-96"
        onChange={(value) => setPendingContent(value)}
        placeholder="Describe your product: what it does, who it's for, the core value proposition, and anything else that helps agents understand your context…"
        value={displayContent}
      />
    </div>
  );
}
