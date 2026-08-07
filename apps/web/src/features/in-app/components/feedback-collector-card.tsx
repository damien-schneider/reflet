"use client";

import { ArrowSquareOut, Copy, Robot } from "@phosphor-icons/react";
import Link from "next/link";
import { generateSetupPrompt } from "reflet-cli/prompt";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FeedbackCollectorCardProps {
  isLoading: boolean;
  orgSlug: string;
  publicKey?: string;
}

function InstallationPanel({
  isLoading,
  orgSlug,
  publicKey,
}: FeedbackCollectorCardProps) {
  if (isLoading) {
    return (
      <div
        aria-label="Loading feedback collector setup"
        className="space-y-3 motion-safe:animate-pulse"
        role="status"
      >
        <div className="h-11 rounded-md bg-muted" />
        <div className="h-11 rounded-md bg-muted" />
      </div>
    );
  }

  if (!publicKey) {
    return (
      <Link
        className={cn(buttonVariants(), "min-h-11")}
        href={`/dashboard/${orgSlug}/project/api-keys`}
      >
        Create public key
      </Link>
    );
  }

  const setupPrompt = generateSetupPrompt(publicKey);
  const installCommand = `npx reflet-cli init --public-key ${publicKey} --yes`;
  const copyToClipboard = async (value: string, label: string) => {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied to clipboard`);
  };

  return (
    <div className="max-w-2xl space-y-3">
      <Button
        className="min-h-11"
        onClick={() => copyToClipboard(setupPrompt, "Setup prompt")}
      >
        <Robot className="mr-2 h-4 w-4" />
        Copy setup prompt
      </Button>
      <div className="flex min-w-0 items-center gap-2 rounded-md bg-muted p-2">
        <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap px-1 text-xs">
          {installCommand}
        </code>
        <Button
          aria-label="Copy install command"
          className="size-11"
          onClick={() => copyToClipboard(installCommand, "Install command")}
          size="icon"
          variant="ghost"
        >
          <Copy className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function FeedbackCollectorCard({
  isLoading,
  orgSlug,
  publicKey,
}: FeedbackCollectorCardProps) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-medium text-base">Feedback collector</h2>
        <Link
          className={cn(
            buttonVariants({ size: "sm", variant: "ghost" }),
            "min-h-11"
          )}
          href="/docs/widget/floating-feedback"
          rel="noopener"
          target="_blank"
        >
          View docs
          <ArrowSquareOut className="ml-2 h-4 w-4" />
        </Link>
      </div>
      <InstallationPanel
        isLoading={isLoading}
        orgSlug={orgSlug}
        publicKey={publicKey}
      />
    </section>
  );
}
