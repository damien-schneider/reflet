"use client";

import {
  ArrowSquareOut,
  Camera,
  Code,
  Copy,
  Crosshair,
  Robot,
} from "@phosphor-icons/react";
import Link from "next/link";
import { generateSetupPrompt } from "reflet-cli/prompt";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";

interface FeedbackCollectorCardProps {
  isLoading: boolean;
  orgSlug: string;
  publicKey?: string;
}

const CAPTURED_CONTEXT = [
  {
    description: "Current viewport, ready to draw on or redact",
    icon: Camera,
    label: "Screenshot",
  },
  {
    description: "URL, browser, viewport and recent console errors",
    icon: Code,
    label: "Page context",
  },
  {
    description: "CSS selector, React component and source location",
    icon: Crosshair,
    label: "Selected element",
  },
] as const;

function InstallationPanel({
  isLoading,
  orgSlug,
  publicKey,
}: FeedbackCollectorCardProps) {
  if (isLoading) {
    return (
      <div
        aria-label="Loading feedback collector setup"
        className="space-y-4 motion-safe:animate-pulse"
        role="status"
      >
        <div className="h-5 w-48 rounded bg-background" />
        <div className="h-10 rounded bg-background" />
        <div className="h-11 rounded bg-background" />
      </div>
    );
  }

  if (!publicKey) {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="font-medium">Create a public key first</h3>
          <p className="mt-1 text-muted-foreground text-sm">
            The browser-safe key sends feedback to this organization and cannot
            read private data.
          </p>
        </div>
        <Button
          className="min-h-11"
          render={<Link href={`/dashboard/${orgSlug}/project/api-keys`} />}
        >
          Create public key
        </Button>
      </div>
    );
  }

  const setupPrompt = generateSetupPrompt(publicKey);
  const installCommand = `npx reflet-cli init --public-key ${publicKey} --yes`;
  const copyToClipboard = async (value: string, label: string) => {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied to clipboard`);
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-medium">Install with your coding agent</h3>
        <p className="mt-1 text-muted-foreground text-sm">
          Copy a project-aware prompt for Claude Code, Cursor, Codex or another
          coding agent.
        </p>
      </div>
      <Button
        className="min-h-11 w-full"
        onClick={() => copyToClipboard(setupPrompt, "AI setup prompt")}
      >
        <Robot className="mr-2 h-4 w-4" />
        Copy AI setup prompt
      </Button>
      <div className="space-y-2">
        <p className="font-medium text-xs">Or run one command</p>
        <div className="flex min-w-0 items-center gap-2 rounded-md bg-background p-2">
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
    </div>
  );
}

export function FeedbackCollectorCard({
  isLoading,
  orgSlug,
  publicKey,
}: FeedbackCollectorCardProps) {
  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="font-medium text-base leading-snug">
                Feedback collector
              </h2>
              <Badge variant="secondary">Recommended</Badge>
            </div>
            <CardDescription className="max-w-2xl">
              Add a floating bubble to any React app. Reports arrive in your
              feed with the visual and technical context needed to reproduce
              them.
            </CardDescription>
          </div>
          <Button
            className="min-h-11"
            render={
              <Link
                href="/docs/widget/floating-feedback"
                rel="noopener"
                target="_blank"
              />
            }
            size="sm"
            variant="ghost"
          >
            View docs
            <ArrowSquareOut className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-8 py-6 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.9fr)]">
        <div className="space-y-5">
          <div>
            <h3 className="font-medium text-sm">Every report includes</h3>
            <ul className="mt-3 space-y-3">
              {CAPTURED_CONTEXT.map(({ description, icon: Icon, label }) => (
                <li className="flex gap-3" key={label}>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon aria-hidden="true" className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="block font-medium text-sm">{label}</span>
                    <span className="block text-muted-foreground text-sm">
                      {description}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <p className="max-w-xl text-muted-foreground text-sm">
            Use the <code>enabled</code> prop to assign the bubble to selected
            people. Set <code>dismissForDays</code> when reporters should be
            able to hide it temporarily.
          </p>
        </div>

        <div className="flex flex-col justify-center rounded-lg bg-muted/60 p-4 sm:p-5">
          <InstallationPanel
            isLoading={isLoading}
            orgSlug={orgSlug}
            publicKey={publicKey}
          />
        </div>
      </CardContent>
    </Card>
  );
}
