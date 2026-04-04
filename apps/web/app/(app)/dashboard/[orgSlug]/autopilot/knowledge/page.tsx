"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import { IconEdit, IconFileText } from "@tabler/icons-react";
import { useMutation, useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { H2 } from "@/components/ui/typography";
import { useAutopilotContext } from "@/features/autopilot/components/autopilot-context";
import { cn } from "@/lib/utils";

const DOC_TYPE_LABELS: Record<string, string> = {
  product_definition: "Product Definition",
  user_personas_icp: "User Personas & ICP",
  competitive_landscape: "Competitive Landscape",
  brand_voice: "Brand Voice",
  technical_architecture: "Technical Architecture",
  goals_okrs: "Goals & OKRs",
  product_roadmap: "Product Roadmap",
};

const STALENESS_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000;

export default function KnowledgePage() {
  const { organizationId } = useAutopilotContext();

  const docs = useQuery(api.autopilot.queries.knowledge.listKnowledgeDocs, {
    organizationId,
  });

  const updateDoc = useMutation(
    api.autopilot.mutations.knowledge.updateKnowledgeDoc
  );

  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editSummary, setEditSummary] = useState("");

  if (docs === undefined) {
    return (
      <div className="space-y-6">
        <H2 variant="card">Knowledge Base</H2>
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton
              className="h-48 w-full rounded-lg"
              key={`skel-${String(i)}`}
            />
          ))}
        </div>
      </div>
    );
  }

  if (docs.length === 0) {
    return (
      <div className="space-y-6">
        <H2 variant="card">Knowledge Base</H2>
        <div className="flex h-40 items-center justify-center rounded-lg border border-dashed text-muted-foreground text-sm">
          No knowledge docs yet. They&apos;ll be generated when agents start
          working.
        </div>
      </div>
    );
  }

  const handleEdit = (doc: (typeof docs)[number]) => {
    setEditingDocId(doc._id);
    setEditContent(doc.contentFull);
    setEditSummary(doc.contentSummary);
  };

  const handleCancel = () => {
    setEditingDocId(null);
    setEditContent("");
    setEditSummary("");
  };

  const handleSave = async (docId: (typeof docs)[number]["_id"]) => {
    try {
      await updateDoc({
        docId,
        contentFull: editContent,
        contentSummary: editSummary,
      });
      toast.success("Knowledge doc updated");
      setEditingDocId(null);
      setEditContent("");
      setEditSummary("");
    } catch {
      toast.error("Failed to update knowledge doc");
    }
  };

  return (
    <div className="space-y-6">
      <H2 variant="card">Knowledge Base</H2>
      <div className="grid gap-4 md:grid-cols-2">
        {docs.map((doc) => {
          const isStale =
            Date.now() - doc.lastUpdatedAt > STALENESS_THRESHOLD_MS;
          const isEditing = editingDocId === doc._id;

          return (
            <Card key={doc._id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <IconFileText className="size-4 text-muted-foreground" />
                    <CardTitle className="text-base">
                      {isEditing ? (
                        <Input
                          className="h-7"
                          defaultValue={doc.title}
                          readOnly
                        />
                      ) : (
                        doc.title
                      )}
                    </CardTitle>
                  </div>
                  {!isEditing && (
                    <Button
                      onClick={() => handleEdit(doc)}
                      size="icon"
                      title="Edit document"
                      variant="ghost"
                    >
                      <IconEdit className="size-4" />
                    </Button>
                  )}
                </div>
                <CardDescription className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">
                    {DOC_TYPE_LABELS[doc.docType] ?? doc.docType}
                  </Badge>
                  {doc.userEdited && (
                    <Badge
                      className="bg-blue-500/10 text-blue-500"
                      variant="outline"
                    >
                      User edited
                    </Badge>
                  )}
                  {isStale && (
                    <Badge
                      className="bg-amber-500/10 text-amber-500"
                      variant="outline"
                    >
                      Stale
                    </Badge>
                  )}
                  <span className="text-muted-foreground text-xs">
                    v{doc.version} &middot; updated{" "}
                    {formatDistanceToNow(doc.lastUpdatedAt, {
                      addSuffix: true,
                    })}
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <div className="space-y-3">
                    <Textarea
                      className="min-h-32"
                      onChange={(e) => setEditContent(e.target.value)}
                      placeholder="Full content..."
                      value={editContent}
                    />
                    <Input
                      onChange={(e) => setEditSummary(e.target.value)}
                      placeholder="Summary..."
                      value={editSummary}
                    />
                    <div className="flex gap-2">
                      <Button onClick={() => handleSave(doc._id)} size="sm">
                        Save
                      </Button>
                      <Button
                        onClick={handleCancel}
                        size="sm"
                        variant="outline"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p
                    className={cn(
                      "line-clamp-4 text-muted-foreground text-sm",
                      isStale && "opacity-70"
                    )}
                  >
                    {doc.contentSummary}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
