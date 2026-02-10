"use client";

import { ArrowsClockwise, Code, Copy, Sparkle } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface AIClarificationProps {
  feedbackId: Id<"feedback">;
  isAdmin: boolean;
}

export function AIClarification({ feedbackId, isAdmin }: AIClarificationProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);
  const [showPromptDialog, setShowPromptDialog] = useState(false);

  const clarificationStatus = useQuery(
    api.feedback_clarification.getClarificationStatus,
    { feedbackId }
  );

  const codingPrompt = useQuery(
    api.feedback_clarification.generateCodingPrompt,
    isAdmin ? { feedbackId } : "skip"
  );

  const initiateClarification = useMutation(
    api.feedback_clarification.initiateClarification
  );

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await initiateClarification({ feedbackId });
    } finally {
      // Keep generating state until the query updates with new data
      setTimeout(() => setIsGenerating(false), 500);
    }
  };

  const handleCopy = async () => {
    if (clarificationStatus?.aiClarification) {
      await navigator.clipboard.writeText(clarificationStatus.aiClarification);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyPrompt = async () => {
    if (codingPrompt?.prompt) {
      await navigator.clipboard.writeText(codingPrompt.prompt);
      setPromptCopied(true);
      setTimeout(() => setPromptCopied(false), 2000);
    }
  };

  // Show nothing if not admin
  if (!isAdmin) {
    return null;
  }

  // Loading state
  if (clarificationStatus === undefined) {
    return (
      <div className="mb-6">
        <h3 className="mb-2 font-medium">AI Clarification</h3>
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  // No data available
  if (clarificationStatus === null) {
    return null;
  }

  const hasExisting = clarificationStatus.hasAiClarification;
  const isLoading = isGenerating && !clarificationStatus.aiClarification;

  return (
    <div className="mb-6">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-medium">
          <Sparkle className="h-4 w-4 text-olive-600" />
          AI Clarification
        </h3>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowPromptDialog(true)}
            size="sm"
            variant="outline"
          >
            <Code className="mr-1 h-3 w-3" />
            Coding Prompt
          </Button>
          <Button
            disabled={isGenerating}
            onClick={handleGenerate}
            size="sm"
            variant="outline"
          >
            {isGenerating ? (
              <ArrowsClockwise className="mr-1 h-3 w-3 animate-spin" />
            ) : (
              <Sparkle className="mr-1 h-3 w-3" />
            )}
            {hasExisting ? "Regenerate" : "Generate"}
          </Button>
        </div>
      </div>

      {isLoading && (
        <Card>
          <CardContent className="pt-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </CardContent>
        </Card>
      )}

      {hasExisting && !isLoading && (
        <Card className="bg-olive-50/50 dark:bg-olive-950/20">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="font-medium text-olive-700 text-sm dark:text-olive-300">
                Enhanced feedback summary
              </CardTitle>
              <Button
                className={cn(
                  "h-6 gap-1 px-2 text-xs",
                  copied && "text-olive-600"
                )}
                onClick={handleCopy}
                size="xs"
                variant="ghost"
              >
                <Copy className="h-3 w-3" />
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-muted-foreground text-sm">
              {clarificationStatus.aiClarification}
            </p>
            {clarificationStatus.aiClarificationGeneratedAt && (
              <p className="mt-2 text-muted-foreground/60 text-xs">
                Generated{" "}
                {new Date(
                  clarificationStatus.aiClarificationGeneratedAt
                ).toLocaleDateString()}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {!(hasExisting || isLoading) && (
        <p className="text-muted-foreground text-sm">
          Click &quot;Generate&quot; to create an AI-enhanced clarification of
          this feedback.
        </p>
      )}

      {/* Coding Prompt Dialog */}
      <Dialog onOpenChange={setShowPromptDialog} open={showPromptDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              Coding Prompt
            </DialogTitle>
            <DialogDescription>
              Copy this prompt to use with Claude Code, Copilot, Cursor, or any
              AI coding assistant.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {codingPrompt?.prompt ? (
              <>
                <div className="relative">
                  <pre className="max-h-96 overflow-auto rounded-lg bg-muted p-4 font-mono text-sm">
                    {codingPrompt.prompt}
                  </pre>
                  <Button
                    className={cn(
                      "absolute top-2 right-2",
                      promptCopied && "text-olive-600"
                    )}
                    onClick={handleCopyPrompt}
                    size="sm"
                    variant="secondary"
                  >
                    <Copy className="mr-1 h-3 w-3" />
                    {promptCopied ? "Copied!" : "Copy Prompt"}
                  </Button>
                </div>
                {!codingPrompt.hasRepoContext && (
                  <p className="text-muted-foreground text-xs">
                    Tip: Run a repository analysis in the AI tab to add codebase
                    context to your prompts.
                  </p>
                )}
              </>
            ) : (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
