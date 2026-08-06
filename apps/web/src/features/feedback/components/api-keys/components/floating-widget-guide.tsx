"use client";

import { Copy } from "@phosphor-icons/react";
import Link from "next/link";
import { useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

function Snippet({ label, value }: { label: string; value: string }) {
  const copy = useCallback(() => {
    navigator.clipboard.writeText(value);
    toast.success(`${label} copied to clipboard`);
  }, [label, value]);

  return (
    <div className="flex items-start gap-2">
      <pre className="flex-1 overflow-x-auto rounded-lg bg-muted p-4 font-mono text-sm">
        <code>{value}</code>
      </pre>
      <Button
        aria-label={`Copy ${label}`}
        onClick={copy}
        size="sm"
        variant="outline"
      >
        <Copy className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function FloatingWidgetGuide({ publicKey }: { publicKey: string }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-lg">Floating feedback button</h3>
        <p className="mt-1 text-muted-foreground text-sm">
          One command mounts the widget in your app: a floating button that
          screenshots the page, lets the reporter annotate it, and points at the
          React component behind the problem.
        </p>
      </div>

      <div className="space-y-2">
        <p className="font-medium text-sm">Install</p>
        <Snippet
          label="Install command"
          value={`npx reflet-cli init --public-key ${publicKey} --yes`}
        />
        <p className="text-muted-foreground text-xs">
          Detects Next.js, React Router or Vite, mounts the widget in your entry
          file and writes the key to the env file your framework reads.
        </p>
      </div>

      <div className="space-y-2">
        <p className="font-medium text-sm">Or mount it yourself</p>
        <Snippet
          label="Widget snippet"
          value={`import { RefletFeedback } from "reflet-sdk/feedback";

<RefletFeedback publicKey="${publicKey}" />`}
        />
      </div>

      <Link
        className="inline-block text-primary text-sm underline underline-offset-4"
        href="/docs/widget/floating-feedback"
      >
        Full setup guide and AI prompt
      </Link>
    </div>
  );
}
