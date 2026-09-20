"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import { Input } from "@ctrl-ui/react/ui/input";
import {
  NativeSelect,
  type NativeSelectProps,
} from "@ctrl-ui/react/ui/native-select";
import { toast } from "@ctrl-ui/react/ui/toast";
import { Copy, Key, Robot, Warning } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import Link from "next/link";
import { useState } from "react";
import { DEFAULT_PRIMARY_COLOR } from "@/lib/branding";
import { cn } from "@/lib/utils";
import { generateChangelogWidgetPrompt } from "../lib/generate-changelog-widget-prompt";

interface ChangelogWidgetTabProps {
  hasApiKeys: boolean;
  organizationId: Id<"organizations">;
  orgSlug: string;
  primaryColor?: string;
  publicKey: string;
}

type WidgetMode = "card" | "popup" | "trigger";
type WidgetPosition = "bottom-right" | "bottom-left";
type WidgetTheme = "light" | "dark" | "auto";

interface WidgetConfig {
  brandColor: string;
  mode: WidgetMode;
  position: WidgetPosition;
  publicKey: string;
  theme: WidgetTheme;
}

const isWidgetMode = (value: string): value is WidgetMode =>
  value === "card" || value === "popup" || value === "trigger";

const isWidgetPosition = (value: string): value is WidgetPosition =>
  value === "bottom-right" || value === "bottom-left";

const isWidgetTheme = (value: string): value is WidgetTheme =>
  value === "light" || value === "dark" || value === "auto";

const MODE_HINTS: Record<WidgetMode, string> = {
  card: "Floating notification card in corner",
  popup: "Full modal overlay with all entries",
  trigger: "Dropdown attached to your button",
};

const TRIGGER_CODE = `<button data-reflet-changelog>What's New</button>`;

function copyToClipboard(text: string, label: string) {
  navigator.clipboard.writeText(text);
  toast.success(`${label} copied to clipboard`);
}

function buildScriptTagCode({
  brandColor,
  mode,
  position,
  publicKey,
  theme,
}: WidgetConfig): string {
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
}

function buildReactCode({
  brandColor,
  mode,
  position,
  publicKey,
  theme,
}: WidgetConfig): string {
  const props = [
    `publicKey="${publicKey}"`,
    `mode="${mode}"`,
    `theme="${theme}"`,
  ];
  if (mode === "trigger") {
    props.push(`triggerSelector="[data-reflet-changelog]"`);
  } else {
    props.push(`position="${position}"`);
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
}

function CodeSnippet({
  code,
  label,
  scroll,
}: {
  code: string;
  label: string;
  scroll?: boolean;
}) {
  return (
    <div className="relative mt-3">
      <Button
        className="absolute top-3 right-3 z-10"
        onClick={() => copyToClipboard(code, label)}
        size="xs"
        tone="primary"
        variant="surface"
      >
        <Copy className="mr-2 h-4 w-4" />
        Copy
      </Button>
      <pre
        className={cn(
          "overflow-x-auto rounded-lg bg-muted p-4 font-mono text-sm",
          scroll && "max-h-64 overflow-auto whitespace-pre-wrap"
        )}
      >
        <code>{code}</code>
      </pre>
    </div>
  );
}

function ApiKeysBanner({
  organizationId,
}: {
  organizationId: Id<"organizations">;
}) {
  const generateApiKeys = useMutation(api.feedback.api_admin.generateApiKeys);
  const [keyName, setKeyName] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateKeys = async () => {
    setIsGenerating(true);
    try {
      await generateApiKeys({
        name: keyName.trim() || "Default",
        organizationId,
      });
      setKeyName("");
      toast.success("API keys generated");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to generate API keys"
      );
    }
    setIsGenerating(false);
  };

  return (
    <div className="rounded-lg border border-border bg-warning-subtle p-4">
      <div className="flex items-start gap-3">
        <Warning className="mt-0.5 h-5 w-5 text-warning-text" />
        <div className="flex-1">
          <h4 className="font-medium text-warning-text">API keys required</h4>
          <p className="mt-1 text-muted-foreground text-sm">
            Generate API keys to get your public key. The embed code below uses
            a placeholder until keys are created.
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
              size="xs"
              tone="primary"
              variant="solid"
            >
              <Key className="mr-2 h-4 w-4" />
              {isGenerating ? "Generating..." : "Generate API Keys"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SelectField({
  children,
  hint,
  id,
  label,
  ...select
}: NativeSelectProps & { hint?: string; id: string; label: string }) {
  return (
    <div className="space-y-2">
      <label className="font-medium text-sm" htmlFor={id}>
        {label}
      </label>
      <NativeSelect className="w-full" id={id} {...select}>
        {children}
      </NativeSelect>
      {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
    </div>
  );
}

function AiPromptSection({ prompt }: { prompt: string }) {
  return (
    <div>
      <div className="rounded-lg border border-border bg-brand-subtle p-4">
        <div className="flex items-start gap-3">
          <Robot className="mt-0.5 h-5 w-5 text-brand-text" />
          <div className="flex-1">
            <h4 className="font-medium text-brand-text">
              AI Integration Prompt
            </h4>
            <p className="mt-1 text-muted-foreground text-sm">
              Copy this prompt and paste it into Claude Code, Cursor, or any AI
              coding assistant to automatically integrate the changelog widget
              into your project.
            </p>
          </div>
        </div>
      </div>

      <CodeSnippet code={prompt} label="AI prompt" scroll />

      <Button
        className="mt-3 w-full"
        onClick={() => copyToClipboard(prompt, "AI prompt")}
        tone="primary"
        variant="solid"
      >
        <Copy className="mr-2 h-4 w-4" />
        Copy Full AI Prompt
      </Button>
    </div>
  );
}

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

  const config: WidgetConfig = { brandColor, mode, position, publicKey, theme };

  return (
    <div className="space-y-8">
      {hasApiKeys ? null : <ApiKeysBanner organizationId={organizationId} />}

      <div>
        <h3 className="font-semibold text-lg">Embed Configuration</h3>
        <p className="mt-1 text-muted-foreground">
          Customize the widget appearance. The embed code below updates
          automatically.
          {brandColor !== DEFAULT_PRIMARY_COLOR &&
            " Your organization brand color is applied."}
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SelectField
            hint={MODE_HINTS[mode]}
            id="widget-mode"
            label="Mode"
            onChange={(e) => {
              if (isWidgetMode(e.target.value)) {
                setMode(e.target.value);
              }
            }}
            value={mode}
          >
            <option value="card">Card</option>
            <option value="popup">Popup</option>
            <option value="trigger">Trigger</option>
          </SelectField>

          <SelectField
            disabled={mode === "trigger"}
            hint={
              mode === "trigger"
                ? "Not applicable in trigger mode"
                : "Where the widget appears on screen"
            }
            id="widget-position"
            label="Position"
            onChange={(e) => {
              if (isWidgetPosition(e.target.value)) {
                setPosition(e.target.value);
              }
            }}
            value={position}
          >
            <option value="bottom-right">Bottom Right</option>
            <option value="bottom-left">Bottom Left</option>
          </SelectField>

          <SelectField
            id="widget-theme"
            label="Theme"
            onChange={(e) => {
              if (isWidgetTheme(e.target.value)) {
                setTheme(e.target.value);
              }
            }}
            value={theme}
          >
            <option value="auto">Auto (match system)</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </SelectField>
        </div>

        <div className="mt-4 flex items-center gap-2 text-muted-foreground text-sm">
          <div
            className="h-4 w-4 rounded-full border"
            style={{ backgroundColor: brandColor }}
          />
          <span>
            Brand color:{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs tabular-nums">
              {brandColor}
            </code>
          </span>
          <Link
            className="text-primary text-xs hover:underline"
            href={`/dashboard/${orgSlug}/project/general`}
          >
            Change in branding settings
          </Link>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-lg">Script Tag</h3>
        <p className="mt-1 text-muted-foreground">
          Add this script to your HTML. Works with any website.
        </p>
        <CodeSnippet code={buildScriptTagCode(config)} label="Script tag" />
      </div>

      <div>
        <h3 className="font-semibold text-lg">React SDK</h3>
        <p className="mt-1 text-muted-foreground">
          Use the React component for React or Next.js projects.
        </p>
        <CodeSnippet code={buildReactCode(config)} label="React code" />
      </div>

      {mode === "trigger" && (
        <div>
          <h3 className="font-semibold text-lg">Trigger Element</h3>
          <p className="mt-1 text-muted-foreground">
            Add this attribute to any button or element to open the changelog on
            click.
          </p>
          <CodeSnippet code={TRIGGER_CODE} label="Trigger code" />
        </div>
      )}

      <AiPromptSection prompt={generateChangelogWidgetPrompt(publicKey)} />
    </div>
  );
}
