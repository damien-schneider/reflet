"use client";

import { Copy, Key, Robot, Warning } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { generateChangelogWidgetPrompt } from "../lib/generate-changelog-widget-prompt";

const DEFAULT_PRIMARY_COLOR = "#5c6d4f";

interface ChangelogWidgetTabProps {
  publicKey: string;
  hasApiKeys: boolean;
  organizationId: Id<"organizations">;
  orgSlug: string;
  primaryColor?: string;
}

type WidgetMode = "card" | "popup" | "trigger";
type WidgetPosition = "bottom-right" | "bottom-left";
type WidgetTheme = "light" | "dark" | "auto";

const isWidgetMode = (value: string): value is WidgetMode =>
  value === "card" || value === "popup" || value === "trigger";

const isWidgetPosition = (value: string): value is WidgetPosition =>
  value === "bottom-right" || value === "bottom-left";

const isWidgetTheme = (value: string): value is WidgetTheme =>
  value === "light" || value === "dark" || value === "auto";

export function ChangelogWidgetTab({
  publicKey,
  hasApiKeys,
  organizationId,
  orgSlug,
  primaryColor,
}: ChangelogWidgetTabProps) {
  const brandColor = primaryColor ?? DEFAULT_PRIMARY_COLOR;
  const [mode, setMode] = useState<WidgetMode>("card");
  const [position, setPosition] = useState<WidgetPosition>("bottom-right");
  const [theme, setTheme] = useState<WidgetTheme>("auto");

  // API key generation
  const generateApiKeysMutation = useMutation(
    api.feedback_api_admin.generateApiKeys
  );
  const [keyName, setKeyName] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateKeys = useCallback(async () => {
    const name = keyName.trim() || "Default";
    setIsGenerating(true);
    try {
      await generateApiKeysMutation({ organizationId, name });
      setKeyName("");
      toast.success("API keys generated");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to generate API keys"
      );
    } finally {
      setIsGenerating(false);
    }
  }, [organizationId, keyName, generateApiKeysMutation]);

  const copyToClipboard = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  }, []);

  const scriptTagCode = useMemo(() => {
    const attrs = [
      `src="https://cdn.reflet.app/widget/reflet-changelog.v1.js"`,
      `data-public-key="${publicKey}"`,
      `data-mode="${mode}"`,
      `data-theme="${theme}"`,
    ];
    if (mode !== "trigger") {
      attrs.push(`data-position="${position}"`);
    }
    if (brandColor !== DEFAULT_PRIMARY_COLOR) {
      attrs.push(`data-color="${brandColor}"`);
    }
    return `<script\n  ${attrs.join("\n  ")}>\n</script>`;
  }, [publicKey, mode, position, theme, brandColor]);

  const reactCode = useMemo(() => {
    const props = [
      `publicKey="${publicKey}"`,
      `mode="${mode}"`,
      `theme="${theme}"`,
    ];
    if (mode !== "trigger") {
      props.push(`position="${position}"`);
    }
    if (mode === "trigger") {
      props.push(`triggerSelector="[data-reflet-changelog]"`);
    }
    if (brandColor !== DEFAULT_PRIMARY_COLOR) {
      props.push(`primaryColor="${brandColor}"`);
    }
    return `import { ChangelogWidget } from 'reflet-sdk/react';

export function MyApp() {
  return (
    <ChangelogWidget
      ${props.join("\n      ")}
    />
  );
}`;
  }, [publicKey, mode, position, theme, brandColor]);

  const triggerCode = `<button data-reflet-changelog>What's New</button>`;

  const aiPrompt = useMemo(
    () => generateChangelogWidgetPrompt(publicKey),
    [publicKey]
  );

  return (
    <div className="space-y-8">
      {/* Missing API Keys Banner */}
      {!hasApiKeys && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950">
          <div className="flex items-start gap-3">
            <Warning className="mt-0.5 h-5 w-5 text-amber-600" />
            <div className="flex-1">
              <h4 className="font-medium text-amber-800 dark:text-amber-200">
                API keys required
              </h4>
              <p className="mt-1 text-amber-700 text-sm dark:text-amber-300">
                Generate API keys to get your public key. The embed code below
                uses a placeholder until keys are created.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <Input
                  className="max-w-xs"
                  onChange={(e) => setKeyName(e.target.value)}
                  placeholder="Key name (e.g., Production)"
                  value={keyName}
                />
                <Button
                  disabled={isGenerating}
                  onClick={handleGenerateKeys}
                  size="sm"
                >
                  <Key className="mr-2 h-4 w-4" />
                  {isGenerating ? "Generating..." : "Generate API Keys"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section 1: Configuration Controls */}
      <div>
        <h3 className="font-semibold text-lg">Embed Configuration</h3>
        <p className="mt-1 text-muted-foreground">
          Customize the widget appearance. The embed code below updates
          automatically.
          {brandColor !== DEFAULT_PRIMARY_COLOR &&
            " Your organization brand color is applied."}
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Mode */}
          <div className="space-y-2">
            <label className="font-medium text-sm" htmlFor="widget-mode">
              Mode
            </label>
            <select
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              id="widget-mode"
              onChange={(e) => {
                const { value } = e.target;
                if (isWidgetMode(value)) {
                  setMode(value);
                }
              }}
              value={mode}
            >
              <option value="card">Card</option>
              <option value="popup">Popup</option>
              <option value="trigger">Trigger</option>
            </select>
            <p className="text-muted-foreground text-xs">
              {mode === "card" && "Floating notification card in corner"}
              {mode === "popup" && "Full modal overlay with all entries"}
              {mode === "trigger" && "Dropdown attached to your button"}
            </p>
          </div>

          {/* Position */}
          <div className="space-y-2">
            <label className="font-medium text-sm" htmlFor="widget-position">
              Position
            </label>
            <select
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              disabled={mode === "trigger"}
              id="widget-position"
              onChange={(e) => {
                const { value } = e.target;
                if (isWidgetPosition(value)) {
                  setPosition(value);
                }
              }}
              value={position}
            >
              <option value="bottom-right">Bottom Right</option>
              <option value="bottom-left">Bottom Left</option>
            </select>
            <p className="text-muted-foreground text-xs">
              {mode === "trigger"
                ? "Not applicable in trigger mode"
                : "Where the widget appears on screen"}
            </p>
          </div>

          {/* Theme */}
          <div className="space-y-2">
            <label className="font-medium text-sm" htmlFor="widget-theme">
              Theme
            </label>
            <select
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              id="widget-theme"
              onChange={(e) => {
                const { value } = e.target;
                if (isWidgetTheme(value)) {
                  setTheme(value);
                }
              }}
              value={theme}
            >
              <option value="auto">Auto (match system)</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
        </div>

        {/* Brand color indicator */}
        <div className="mt-4 flex items-center gap-2 text-muted-foreground text-sm">
          <div
            className="h-4 w-4 rounded-full border"
            style={{ backgroundColor: brandColor }}
          />
          <span>
            Brand color:{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
              {brandColor}
            </code>
          </span>
          <Link
            className="text-primary text-xs hover:underline"
            href={`/dashboard/${orgSlug}/settings/branding`}
          >
            Change in branding settings
          </Link>
        </div>
      </div>

      {/* Section 2: Script Tag Embed Code */}
      <div>
        <h3 className="font-semibold text-lg">Script Tag</h3>
        <p className="mt-1 text-muted-foreground">
          Add this script to your HTML. Works with any website.
        </p>
        <div className="relative mt-3">
          <Button
            className="absolute top-3 right-3 z-10"
            onClick={() => copyToClipboard(scriptTagCode, "Script tag")}
            size="sm"
            variant="secondary"
          >
            <Copy className="mr-2 h-4 w-4" />
            Copy
          </Button>
          <pre className="overflow-x-auto rounded-lg bg-muted p-4 font-mono text-sm">
            <code>{scriptTagCode}</code>
          </pre>
        </div>
      </div>

      {/* Section 3: React SDK Code */}
      <div>
        <h3 className="font-semibold text-lg">React SDK</h3>
        <p className="mt-1 text-muted-foreground">
          Use the React component for React or Next.js projects.
        </p>
        <div className="relative mt-3">
          <Button
            className="absolute top-3 right-3 z-10"
            onClick={() => copyToClipboard(reactCode, "React code")}
            size="sm"
            variant="secondary"
          >
            <Copy className="mr-2 h-4 w-4" />
            Copy
          </Button>
          <pre className="overflow-x-auto rounded-lg bg-muted p-4 font-mono text-sm">
            <code>{reactCode}</code>
          </pre>
        </div>
      </div>

      {/* Section 4: Trigger Mode Example */}
      {mode === "trigger" && (
        <div>
          <h3 className="font-semibold text-lg">Trigger Element</h3>
          <p className="mt-1 text-muted-foreground">
            Add this attribute to any button or element to open the changelog on
            click.
          </p>
          <div className="relative mt-3">
            <Button
              className="absolute top-3 right-3 z-10"
              onClick={() => copyToClipboard(triggerCode, "Trigger code")}
              size="sm"
              variant="secondary"
            >
              <Copy className="mr-2 h-4 w-4" />
              Copy
            </Button>
            <pre className="overflow-x-auto rounded-lg bg-muted p-4 font-mono text-sm">
              <code>{triggerCode}</code>
            </pre>
          </div>
        </div>
      )}

      {/* Section 5: AI Prompt */}
      <div>
        <div className="rounded-lg border border-purple-200 bg-purple-50 p-4 dark:border-purple-900 dark:bg-purple-950">
          <div className="flex items-start gap-3">
            <Robot className="mt-0.5 h-5 w-5 text-purple-600" />
            <div className="flex-1">
              <h4 className="font-medium text-purple-800 dark:text-purple-200">
                AI Integration Prompt
              </h4>
              <p className="mt-1 text-purple-700 text-sm dark:text-purple-300">
                Copy this prompt and paste it into Claude Code, Cursor, or any
                AI coding assistant to automatically integrate the changelog
                widget into your project.
              </p>
            </div>
          </div>
        </div>

        <div className="relative mt-3">
          <Button
            className="absolute top-3 right-3 z-10"
            onClick={() => copyToClipboard(aiPrompt, "AI prompt")}
            size="sm"
            variant="secondary"
          >
            <Copy className="mr-2 h-4 w-4" />
            Copy Prompt
          </Button>
          <div className="max-h-64 overflow-auto rounded-lg bg-muted p-4 font-mono text-sm">
            <pre className="whitespace-pre-wrap">{aiPrompt}</pre>
          </div>
        </div>

        <Button
          className="mt-3 w-full"
          onClick={() => copyToClipboard(aiPrompt, "AI prompt")}
          variant="default"
        >
          <Copy className="mr-2 h-4 w-4" />
          Copy Full AI Prompt
        </Button>
      </div>
    </div>
  );
}
