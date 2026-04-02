"use client";

import { Check, Copy } from "@phosphor-icons/react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function CopyButton({ text, label }: { text: string; label: string }) {
  const [hasCopied, setHasCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2000);
  };

  return (
    <Button
      className="h-7 w-7"
      onClick={handleCopy}
      size="icon"
      variant="ghost"
    >
      {hasCopied ? (
        <Check className="h-3.5 w-3.5 text-green-500" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </Button>
  );
}

export function CodeBlock({
  code,
  fileName,
  label,
}: {
  code: string;
  fileName: string | null;
  label: string;
}) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-2">
        {fileName ? (
          <code className="text-muted-foreground text-xs">{fileName}</code>
        ) : (
          <span />
        )}
        <CopyButton label={label} text={code} />
      </div>
      <pre className="overflow-x-auto p-4 text-sm">
        <code>{code}</code>
      </pre>
    </div>
  );
}
