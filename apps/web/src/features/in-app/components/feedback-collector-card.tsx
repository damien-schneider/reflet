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
      toast.error("Your browser blocked the clipboard");
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

function InstallPanel({ publicKey }: { publicKey: string }) {
  const { copied, copy } = useCopy();
  const setupPrompt = generateSetupPrompt(publicKey);
  const installCommand = `npx reflet-cli init --public-key ${publicKey} --yes`;

  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="relative border-b">
        <pre className="max-h-28 overflow-hidden whitespace-pre-wrap p-4 pr-40 font-sans text-muted-foreground text-xs leading-relaxed [mask-image:linear-gradient(to_bottom,#000_45%,transparent)]">
          {setupPrompt}
        </pre>
        <Button
          className="absolute top-3 right-3 min-h-11"
          onClick={() => copy("prompt", setupPrompt)}
          size="xs"
          tone="primary"
          variant="solid"
        >
          {copied === "prompt" ? (
            <Check className="mr-2 h-4 w-4" />
          ) : (
            <Copy className="mr-2 h-4 w-4" />
          )}
          {copied === "prompt" ? "Copied" : "Copy prompt"}
        </Button>
      </div>
      <div className="flex min-w-0 items-center gap-2 p-2">
        <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap px-2 text-xs">
          {installCommand}
        </code>
        <Button
          aria-label="Copy install command"
          className="size-11 shrink-0"
          iconOnly
          onClick={() => copy("command", installCommand)}
          variant="ghost"
        >
          {copied === "command" ? (
            <Check className="h-4 w-4" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}

function NoKeyPanel({
  orgSlug,
  waiting,
}: {
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

  return (
    <ButtonLink
      className="min-h-11"
      render={<Link href={`/dashboard/${orgSlug}/project/api-keys`} />}
      variant="surface"
    >
      Create public key
    </ButtonLink>
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
    <section className="space-y-4">
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-3">
          <H3 variant="card">Feedback collector</H3>
          <div className="flex items-center gap-2">
            <ButtonLink
              className="min-h-11"
              render={<Link href="/sdk-demo" rel="noopener" target="_blank" />}
              size="xs"
              variant="surface"
            >
              Try it
              <ArrowSquareOut className="ml-2 h-4 w-4" />
            </ButtonLink>
            <ButtonLink
              className="min-h-11"
              render={
                <Link
                  href="/docs/widget/floating-feedback"
                  rel="noopener"
                  target="_blank"
                />
              }
              size="xs"
            >
              View docs
              <ArrowSquareOut className="ml-2 h-4 w-4" />
            </ButtonLink>
          </div>
        </div>
        <Muted className="max-w-xl text-sm">
          A floating button in your app. Each report carries the screenshot, the
          console and the element the user pointed at.
        </Muted>
      </div>

      {publicKey ? (
        <InstallPanel publicKey={publicKey} />
      ) : (
        <NoKeyPanel orgSlug={orgSlug} waiting={isLoading || needsKey} />
      )}
    </section>
  );
}
