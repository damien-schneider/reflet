"use client";

import { Check, Copy } from "@phosphor-icons/react";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { cn } from "@/lib/utils";

// ─── Copy Button ──────────────────────────────────────────────────────────────

const COPY_FEEDBACK_MS = 2000;

function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
  }, [text]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <button
      aria-label={copied ? "Copied" : "Copy to clipboard"}
      className={cn(
        "rounded-md p-1.5 transition-colors",
        copied
          ? "text-green-600 dark:text-green-400"
          : "text-muted-foreground hover:text-foreground",
        className
      )}
      onClick={handleCopy}
      type="button"
    >
      {copied ? (
        <Check className="size-3.5" weight="bold" />
      ) : (
        <Copy className="size-3.5" />
      )}
    </button>
  );
}

// ─── Component Preview ────────────────────────────────────────────────────────

interface ComponentPreviewProps {
  children: ReactNode;
  code: string;
  className?: string;
}

type PreviewTab = "preview" | "code";

function ComponentPreview({
  children,
  code,
  className,
}: ComponentPreviewProps) {
  const [activeTab, setActiveTab] = useState<PreviewTab>("preview");

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-border",
        className
      )}
    >
      <div className="flex items-center justify-between border-border border-b bg-muted/30">
        <div className="flex">
          <TabButton
            isActive={activeTab === "preview"}
            label="Preview"
            onClick={() => setActiveTab("preview")}
          />
          <TabButton
            isActive={activeTab === "code"}
            label="Code"
            onClick={() => setActiveTab("code")}
          />
        </div>
        {activeTab === "code" && <CopyButton className="mr-2" text={code} />}
      </div>
      {activeTab === "preview" ? (
        <div className="flex min-h-[200px] items-center justify-center bg-background p-8">
          {children}
        </div>
      ) : (
        <div className="relative overflow-auto bg-zinc-950 p-4 dark:bg-zinc-900/50">
          <pre className="text-sm leading-relaxed">
            <code className="text-zinc-100">{code}</code>
          </pre>
        </div>
      )}
    </div>
  );
}

// ─── Code Block with Copy ─────────────────────────────────────────────────────

interface CodeBlockProps {
  code: string;
  className?: string;
}

function CodeBlock({ code, className }: CodeBlockProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border border-border",
        className
      )}
    >
      <div className="absolute top-2 right-2 z-10">
        <CopyButton text={code} />
      </div>
      <div className="overflow-auto bg-zinc-950 p-4 dark:bg-zinc-900/50">
        <pre className="text-sm leading-relaxed">
          <code className="text-zinc-100">{code}</code>
        </pre>
      </div>
    </div>
  );
}

// ─── Install Tabs (CLI + Manual) ──────────────────────────────────────────────

interface InstallTabsProps {
  cliCommand: string;
  manualCode: string;
  className?: string;
}

type InstallTab = "cli" | "manual";

function InstallTabs({ cliCommand, manualCode, className }: InstallTabsProps) {
  const [activeTab, setActiveTab] = useState<InstallTab>("cli");

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-border",
        className
      )}
    >
      <div className="flex items-center justify-between border-border border-b bg-muted/30">
        <div className="flex">
          <TabButton
            isActive={activeTab === "cli"}
            label="CLI"
            onClick={() => setActiveTab("cli")}
          />
          <TabButton
            isActive={activeTab === "manual"}
            label="Manual"
            onClick={() => setActiveTab("manual")}
          />
        </div>
        <CopyButton
          className="mr-2"
          text={activeTab === "cli" ? cliCommand : manualCode}
        />
      </div>
      {activeTab === "cli" ? (
        <div className="overflow-auto bg-zinc-950 p-4 dark:bg-zinc-900/50">
          <pre className="text-sm leading-relaxed">
            <code className="text-zinc-100">{cliCommand}</code>
          </pre>
        </div>
      ) : (
        <div className="overflow-auto bg-zinc-950 p-4 dark:bg-zinc-900/50">
          <pre className="max-h-[400px] text-sm leading-relaxed">
            <code className="text-zinc-100">{manualCode}</code>
          </pre>
        </div>
      )}
    </div>
  );
}

// ─── Tab Button ───────────────────────────────────────────────────────────────

function TabButton({
  label,
  isActive,
  onClick,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "px-4 py-2 font-medium text-sm transition-colors",
        isActive
          ? "border-foreground border-b-2 text-foreground"
          : "text-muted-foreground hover:text-foreground"
      )}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

export { ComponentPreview, CodeBlock, InstallTabs, CopyButton };
