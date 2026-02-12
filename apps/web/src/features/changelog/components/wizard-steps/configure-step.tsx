"use client";

import { ArrowSquareOut } from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { WizardConfig } from "../release-setup-wizard";

interface ConfigureStepProps {
  config: WizardConfig;
  onChange: (partial: Partial<WizardConfig>) => void;
}

const INCREMENT_OPTIONS = [
  { id: "patch" as const, label: "Patch", example: "v1.0.0 → v1.0.1" },
  { id: "minor" as const, label: "Minor", example: "v1.0.0 → v1.1.0" },
  { id: "major" as const, label: "Major", example: "v1.0.0 → v2.0.0" },
] as const;

export function ConfigureStep({ config, onChange }: ConfigureStepProps) {
  if (config.workflow === "ai_powered") {
    return <AiPoweredConfig config={config} onChange={onChange} />;
  }

  if (config.workflow === "automated") {
    return <AutomatedConfig config={config} onChange={onChange} />;
  }

  return <ManualConfig config={config} onChange={onChange} />;
}

function VersioningSection({ config, onChange }: ConfigureStepProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
        <div>
          <Label className="text-sm" htmlFor="auto-version">
            Auto-suggest version
          </Label>
          <p className="text-muted-foreground text-xs">
            Suggest the next SemVer version based on your latest release
          </p>
        </div>
        <Switch
          checked={config.autoVersioning}
          id="auto-version"
          onCheckedChange={(checked) => onChange({ autoVersioning: checked })}
        />
      </div>

      {config.autoVersioning && (
        <>
          <div className="space-y-2">
            <Label className="text-sm" htmlFor="version-prefix">
              Version prefix
            </Label>
            <Input
              className="h-8 w-20 text-sm"
              id="version-prefix"
              onChange={(e) => onChange({ versionPrefix: e.target.value })}
              placeholder="v"
              value={config.versionPrefix}
            />
            <p className="text-muted-foreground text-xs">
              Set to &quot;v&quot; for v1.0.0 format, or leave empty for 1.0.0
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Default increment</Label>
            <div className="flex gap-2">
              {INCREMENT_OPTIONS.map((option) => (
                <button
                  className={cn(
                    "flex flex-col items-center rounded-lg border px-4 py-2 transition-colors",
                    config.versionIncrement === option.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                  key={option.id}
                  onClick={() => onChange({ versionIncrement: option.id })}
                  type="button"
                >
                  <span className="font-medium text-sm">{option.label}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {option.example}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function AiPoweredConfig({ config, onChange }: ConfigureStepProps) {
  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        Configure your AI-powered release workflow:
      </p>

      <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900 dark:bg-blue-950/20">
        <p className="text-blue-800 text-xs dark:text-blue-200">
          When you create a release, Reflet will compare commits between your
          last release tag and the HEAD of{" "}
          <code className="rounded bg-blue-100 px-1 dark:bg-blue-900/50">
            {config.targetBranch}
          </code>
          , then generate release notes using AI.
        </p>
      </div>

      <VersioningSection config={config} onChange={onChange} />

      <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
        <div>
          <Label className="text-sm" htmlFor="push-to-github">
            Push to GitHub on publish
          </Label>
          <p className="text-muted-foreground text-xs">
            Create a GitHub Release automatically when you publish in Reflet
          </p>
        </div>
        <Switch
          checked={config.pushToGithubOnPublish}
          id="push-to-github"
          onCheckedChange={(checked) =>
            onChange({ pushToGithubOnPublish: checked })
          }
        />
      </div>
    </div>
  );
}

const CONVENTIONAL_COMMIT_EXAMPLES = [
  { prefix: "feat:", description: "A new feature", bump: "minor" },
  { prefix: "fix:", description: "A bug fix", bump: "patch" },
  { prefix: "chore:", description: "Maintenance tasks", bump: "none" },
  {
    prefix: "feat!:",
    description: "Breaking change",
    bump: "major",
  },
] as const;

function AutomatedConfig({ config, onChange }: ConfigureStepProps) {
  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        Configure your automated release workflow:
      </p>

      <div className="space-y-2 rounded-lg border p-3">
        <p className="font-medium text-sm">Conventional Commits</p>
        <p className="text-muted-foreground text-xs">
          This workflow uses conventional commits to automatically determine
          version bumps. Structure your commit messages like this:
        </p>
        <div className="mt-2 space-y-1">
          {CONVENTIONAL_COMMIT_EXAMPLES.map((example) => (
            <div
              className="flex items-center justify-between gap-2"
              key={example.prefix}
            >
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">
                {example.prefix}
              </code>
              <span className="flex-1 text-muted-foreground text-xs">
                {example.description}
              </span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                {example.bump}
              </span>
            </div>
          ))}
        </div>
        <a
          className="mt-2 inline-flex items-center gap-1 text-primary text-xs hover:underline"
          href="https://www.conventionalcommits.org"
          rel="noopener noreferrer"
          target="_blank"
        >
          Learn more about conventional commits
          <ArrowSquareOut className="h-3 w-3" />
        </a>
      </div>

      <div className="space-y-2">
        <Label className="text-sm" htmlFor="version-prefix-auto">
          Version prefix
        </Label>
        <Input
          className="h-8 w-20 text-sm"
          id="version-prefix-auto"
          onChange={(e) => onChange({ versionPrefix: e.target.value })}
          placeholder="v"
          value={config.versionPrefix}
        />
        <p className="text-muted-foreground text-xs">
          Set to &quot;v&quot; for v1.0.0 format, or leave empty for 1.0.0
        </p>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
        <div>
          <Label className="text-sm" htmlFor="auto-publish-imported">
            Auto-publish imported releases
          </Label>
          <p className="text-muted-foreground text-xs">
            Immediately publish releases imported from GitHub. When off, they
            arrive as drafts for review.
          </p>
        </div>
        <Switch
          checked={config.autoPublishImported}
          id="auto-publish-imported"
          onCheckedChange={(checked) =>
            onChange({ autoPublishImported: checked })
          }
        />
      </div>
    </div>
  );
}

function ManualConfig({ config, onChange }: ConfigureStepProps) {
  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        Configure your manual release workflow:
      </p>

      <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
        <div>
          <Label className="text-sm" htmlFor="manual-sync">
            Sync with GitHub
          </Label>
          <p className="text-muted-foreground text-xs">
            Keep releases in sync between Reflet and GitHub
          </p>
        </div>
        <Switch
          checked={config.manualSyncEnabled}
          id="manual-sync"
          onCheckedChange={(checked) =>
            onChange({ manualSyncEnabled: checked })
          }
        />
      </div>

      {config.manualSyncEnabled && (
        <>
          <div className="space-y-2">
            <Label className="text-sm" htmlFor="sync-direction">
              Sync direction
            </Label>
            <Select
              onValueChange={(val) =>
                onChange({
                  manualSyncDirection:
                    val as WizardConfig["manualSyncDirection"],
                })
              }
              value={config.manualSyncDirection}
            >
              <SelectTrigger className="h-8 text-sm" id="sync-direction">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="github_first">GitHub → Reflet</SelectItem>
                <SelectItem value="reflet_first">Reflet → GitHub</SelectItem>
                <SelectItem value="bidirectional">Bidirectional</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
            <div>
              <Label className="text-sm" htmlFor="manual-auto-publish">
                Auto-publish imported releases
              </Label>
              <p className="text-muted-foreground text-xs">
                Immediately publish releases imported from GitHub. When off,
                they arrive as drafts for review.
              </p>
            </div>
            <Switch
              checked={config.autoPublishImported}
              id="manual-auto-publish"
              onCheckedChange={(checked) =>
                onChange({ autoPublishImported: checked })
              }
            />
          </div>
        </>
      )}

      <VersioningSection config={config} onChange={onChange} />
    </div>
  );
}
