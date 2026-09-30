"use client";

import { Button, ButtonLink } from "@ctrl-ui/react/ui/button";
import { toast } from "@ctrl-ui/react/ui/toast";
import { ArrowSquareOut, Check, Copy } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { generateSetupPrompt } from "reflet-cli/prompt";
import { H3, Muted } from "@/components/ui/typography";

const COPIED_RESET_MS = 2000;

type CopyTarget = "command" | "prompt";

const COPIED_MESSAGES: Record<CopyTarget, string> = {
  command: "Install command copied",
  prompt: "Setup prompt copied",
};

interface FeedbackCollectorCardProps {
  canManageKeys: boolean;
  isLoading: boolean;
  organizationId: Id<"organizations">;
  orgSlug: string;
  publicKey?: string;
}

function useCopy() {
  const [copied, setCopied] = useState<CopyTarget | null>(null);

  const copy = async (target: CopyTarget, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      toast.error(
        "Your browser blocked the clipboard. Select the text and copy it manually."
      );
      return;
    }
    setCopied(target);
    setTimeout(
      () => setCopied((current) => (current === target ? null : current)),
      COPIED_RESET_MS
    );
  };

  return { copied, copy };
}

function CopyIcon({ copied }: { copied: boolean }) {
  return copied ? (
    <Check aria-hidden className="size-4" />
  ) : (
    <Copy aria-hidden className="size-4" />
  );
}

function InstallPanel({ publicKey }: { publicKey: string }) {
  const { copied, copy } = useCopy();
  const setupPrompt = generateSetupPrompt(publicKey);
  const installCommand = `npx reflet-cli init --public-key ${publicKey} --yes`;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-medium text-sm">
            With an AI coding agent
            <span className="font-normal text-muted-foreground">
              {" "}
              · paste this prompt into Claude Code, Cursor or similar
            </span>
          </p>
          <Button
            onClick={() => copy("prompt", setupPrompt)}
            size="sm"
            tone="primary"
            variant="solid"
          >
            <CopyIcon copied={copied === "prompt"} />
            {copied === "prompt" ? "Copied" : "Copy prompt"}
          </Button>
        </div>
        <pre className="max-h-28 overflow-hidden whitespace-pre-wrap rounded-lg border p-4 font-sans text-muted-foreground text-xs leading-relaxed [mask-image:linear-gradient(to_bottom,#000_45%,transparent)]">
          {setupPrompt}
        </pre>
      </div>
      <div className="space-y-2">
        <p className="font-medium text-sm">
          Or from your terminal
          <span className="font-normal text-muted-foreground">
            {" "}
            · run this in your project folder
          </span>
        </p>
        <div className="flex min-w-0 items-center gap-2 rounded-lg border p-1 pl-3">
          <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap text-xs">
            {installCommand}
          </code>
          <Button
            aria-label={
              copied === "command" ? "Copied" : "Copy install command"
            }
            className="shrink-0"
            iconOnly
            onClick={() => copy("command", installCommand)}
            variant="ghost"
          >
            <CopyIcon copied={copied === "command"} />
          </Button>
        </div>
      </div>
      <span aria-live="polite" className="sr-only">
        {copied ? COPIED_MESSAGES[copied] : ""}
      </span>
    </div>
  );
}

function NoKeyPanel({
  canManageKeys,
  orgSlug,
  waiting,
}: {
  canManageKeys: boolean;
  orgSlug: string;
  waiting: boolean;
}) {
  if (waiting) {
    return (
      <div
        aria-label="Preparing setup instructions"
        className="space-y-3 motion-safe:animate-pulse"
        role="status"
      >
        <div className="h-28 rounded-lg bg-muted" />
        <div className="h-11 rounded-md bg-muted" />
      </div>
    );
  }

  if (!canManageKeys) {
    return (
      <Muted className="rounded-lg border border-dashed p-4">
        Setup needs a public key. Ask an organization admin to create one.
      </Muted>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed p-4">
      <Muted className="flex-1">
        Setup needs a public key, and we couldn’t create one automatically.
      </Muted>
      <ButtonLink
        render={<Link href={`/dashboard/${orgSlug}/project/api-keys`} />}
        variant="surface"
      >
        Create public key
      </ButtonLink>
    </div>
  );
}

export function FeedbackCollectorCard({
  canManageKeys,
  isLoading,
  organizationId,
  orgSlug,
  publicKey,
}: FeedbackCollectorCardProps) {
  const ensurePublicKey = useMutation(api.feedback.api_admin.ensurePublicKey);
  const [keyFailed, setKeyFailed] = useState(false);

  const needsKey = canManageKeys && !(isLoading || publicKey || keyFailed);

  useEffect(() => {
    if (!needsKey) {
      return;
    }
    ensurePublicKey({ organizationId }).catch(() => setKeyFailed(true));
  }, [ensurePublicKey, needsKey, organizationId]);

  return (
    <section aria-labelledby="feedback-collector-heading" className="space-y-4">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <H3 id="feedback-collector-heading" variant="card">
            Feedback collector
          </H3>
          <div className="flex items-center gap-2">
            <ButtonLink
              render={<Link href="/sdk-demo" rel="noopener" target="_blank" />}
              size="sm"
              variant="surface"
            >
              Try it
              <ArrowSquareOut aria-hidden className="size-4" />
            </ButtonLink>
            <ButtonLink
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
              <ArrowSquareOut aria-hidden className="size-4" />
            </ButtonLink>
          </div>
        </div>
        <Muted className="max-w-xl text-pretty">
          A floating button in your app. Each report carries the screenshot, the
          console and the element the user pointed at.
        </Muted>
      </div>

      {publicKey ? (
        <InstallPanel publicKey={publicKey} />
      ) : (
        <NoKeyPanel
          canManageKeys={canManageKeys}
          orgSlug={orgSlug}
          waiting={isLoading || needsKey}
        />
      )}
    </section>
  );
}
