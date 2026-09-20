"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@ctrl-ui/react/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ctrl-ui/react/ui/tooltip";
import { Check, Copy } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { useState } from "react";

import { cn } from "@/lib/utils";
import { useCopyFeedback } from "./use-copy-feedback";

function CopyButton({ text, className }: { text: string; className?: string }) {
  const { copied, copy } = useCopyFeedback();
  const label = copied ? "Copied" : "Copy to clipboard";

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            aria-label={label}
            className={cn("size-10", copied && "text-success-text", className)}
            iconOnly
            onClick={() => copy(text)}
            size="sm"
            variant="ghost"
          >
            {copied ? (
              <Check className="size-3.5" weight="bold" />
            ) : (
              <Copy className="size-3.5" />
            )}
          </Button>
        }
      />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function CodeSurface({
  code,
  maxHeightClassName,
}: {
  code: string;
  maxHeightClassName?: string;
}) {
  return (
    <div className="overflow-auto bg-band p-4">
      <pre className={cn("text-sm leading-relaxed", maxHeightClassName)}>
        <code className="text-band-foreground">{code}</code>
      </pre>
    </div>
  );
}

interface ComponentPreviewProps {
  children: ReactNode;
  className?: string;
  code: string;
}

type PreviewTab = "preview" | "code";

function ComponentPreview({
  children,
  code,
  className,
}: ComponentPreviewProps) {
  const [activeTab, setActiveTab] = useState<PreviewTab>("preview");

  return (
    <Tabs
      className={cn(
        "overflow-hidden rounded-lg border border-border",
        className
      )}
      onValueChange={setActiveTab}
      value={activeTab}
    >
      <div className="flex items-center justify-between border-border border-b bg-muted/30 pr-2">
        <TabsList className="border-none bg-transparent">
          <TabsTab value="preview">Preview</TabsTab>
          <TabsTab value="code">Code</TabsTab>
        </TabsList>
        {activeTab === "code" && <CopyButton text={code} />}
      </div>
      <TabsPanel value="preview">
        <div className="flex min-h-[200px] items-center justify-center bg-background p-8">
          {children}
        </div>
      </TabsPanel>
      <TabsPanel value="code">
        <CodeSurface code={code} />
      </TabsPanel>
    </Tabs>
  );
}

interface CodeBlockProps {
  className?: string;
  code: string;
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
      <CodeSurface code={code} />
    </div>
  );
}

interface InstallTabsProps {
  className?: string;
  cliCommand: string;
  manualCode: string;
}

type InstallTab = "cli" | "manual";

function InstallTabs({ cliCommand, manualCode, className }: InstallTabsProps) {
  const [activeTab, setActiveTab] = useState<InstallTab>("cli");

  return (
    <Tabs
      className={cn(
        "overflow-hidden rounded-lg border border-border",
        className
      )}
      onValueChange={setActiveTab}
      value={activeTab}
    >
      <div className="flex items-center justify-between border-border border-b bg-muted/30 pr-2">
        <TabsList className="border-none bg-transparent">
          <TabsTab value="cli">CLI</TabsTab>
          <TabsTab value="manual">Manual</TabsTab>
        </TabsList>
        <CopyButton text={activeTab === "cli" ? cliCommand : manualCode} />
      </div>
      <TabsPanel value="cli">
        <CodeSurface code={cliCommand} />
      </TabsPanel>
      <TabsPanel value="manual">
        <CodeSurface code={manualCode} maxHeightClassName="max-h-[400px]" />
      </TabsPanel>
    </Tabs>
  );
}

export { CodeBlock, ComponentPreview, CopyButton, InstallTabs };
