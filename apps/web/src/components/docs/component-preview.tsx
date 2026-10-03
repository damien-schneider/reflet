"use client";

import { cn } from "@ctrl-ui/react/lib/cn";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@ctrl-ui/react/ui/tabs";
import type { ReactNode } from "react";
import { useState } from "react";
import { CopyButton } from "@/components/copy-button";
import { CodeSurface } from "./code-block";

const FRAME = "overflow-hidden rounded-lg border border-border";
const TAB_BAR =
  "flex items-center justify-between gap-2 border-border border-b bg-card p-1.5";

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
      className={cn(FRAME, className)}
      onValueChange={setActiveTab}
      value={activeTab}
    >
      <div className={TAB_BAR}>
        <TabsList size="sm">
          <TabsTab value="preview">Preview</TabsTab>
          <TabsTab value="code">Code</TabsTab>
        </TabsList>
        {activeTab === "code" && <CopyButton label="Copy code" value={code} />}
      </div>
      <TabsPanel value="preview">
        <div className="flex min-h-52 items-center justify-center bg-background p-6 sm:p-8">
          {children}
        </div>
      </TabsPanel>
      <TabsPanel className="bg-secondary" value="code">
        <CodeSurface code={code} maxHeightClassName="max-h-[28rem]" />
      </TabsPanel>
    </Tabs>
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
  const isCli = activeTab === "cli";

  return (
    <Tabs
      className={cn(FRAME, className)}
      onValueChange={setActiveTab}
      value={activeTab}
    >
      <div className={TAB_BAR}>
        <TabsList size="sm">
          <TabsTab value="cli">CLI</TabsTab>
          <TabsTab value="manual">Manual</TabsTab>
        </TabsList>
        <CopyButton
          label={isCli ? "Copy command" : "Copy source"}
          value={isCli ? cliCommand : manualCode}
        />
      </div>
      <TabsPanel className="bg-secondary" value="cli">
        <CodeSurface code={cliCommand} />
      </TabsPanel>
      <TabsPanel className="bg-secondary" value="manual">
        <CodeSurface code={manualCode} maxHeightClassName="max-h-[28rem]" />
      </TabsPanel>
    </Tabs>
  );
}

export { ComponentPreview, InstallTabs };
