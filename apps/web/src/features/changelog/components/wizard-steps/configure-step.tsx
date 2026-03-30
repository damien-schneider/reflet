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
  { id: "patch" as const, label: "Patch" },
  { id: "minor" as const, label: "Minor" },
  { id: "major" as const, label: "Major" },
] as const;

const isSyncDirection = (
  val: string
): val is WizardConfig["manualSyncDirection"] =>
  val === "github_first" || val === "reflet_first" || val === "bidirectional";

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
        </div>
        <Switch
          checked={config.autoVersioning}
          id="auto-version"
          onCheckedChange={(checked) => onChange({ autoVersioning: checked })}
        />
      </div>

      {config.autoVersioning && (
        <div className="flex items-start gap-4">
          <div className="space-y-1">
            <Label
              className="text-muted-foreground text-xs"
              htmlFor="version-prefix"
            >
              Prefix
            </Label>
            <Input
              className="h-8 w-16 text-sm"
              id="version-prefix"
              onChange={(e) => onChange({ versionPrefix: e.target.value })}
              placeholder="v"
              value={config.versionPrefix}
            />
          </div>

          <div className="space-y-1">
            <Label className="text-muted-foreground text-xs">
              Default bump
            </Label>
            <div className="inline-flex rounded-md border">
              {INCREMENT_OPTIONS.map((option) => (
                <button
                  className={cn(
                    "px-3 py-1.5 text-xs transition-colors first:rounded-l-md last:rounded-r-md",
                    config.versionIncrement === option.id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  key={option.id}
                  onClick={() => onChange({ versionIncrement: option.id })}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AiPoweredConfig({ config, onChange }: ConfigureStepProps) {
  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-xs">
        Reflet compares commits since your last tag on{" "}
        <code className="rounded bg-muted px-1">{config.targetBranch}</code> and
        generates notes with AI.
      </p>

      <VersioningSection config={config} onChange={onChange} />

      <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
        <div>
          <Label className="text-sm" htmlFor="push-to-github">
            Create GitHub Release on publish
          </Label>
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
      <div className="space-y-2 rounded-lg border p-3">
        <p className="font-medium text-sm">Conventional Commits</p>
        <div className="space-y-1">
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
          className="inline-flex items-center gap-1 text-primary text-xs hover:underline"
          href="https://www.conventionalcommits.org"
          rel="noopener noreferrer"
          target="_blank"
        >
          Learn more
          <ArrowSquareOut className="h-3 w-3" />
        </a>
      </div>

      <div className="flex items-start gap-4">
        <div className="space-y-1">
          <Label
            className="text-muted-foreground text-xs"
            htmlFor="version-prefix-auto"
          >
            Prefix
          </Label>
          <Input
            className="h-8 w-16 text-sm"
            id="version-prefix-auto"
            onChange={(e) => onChange({ versionPrefix: e.target.value })}
            placeholder="v"
            value={config.versionPrefix}
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
        <div>
          <Label className="text-sm" htmlFor="auto-publish-imported">
            Auto-publish imported releases
          </Label>
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
      <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
        <div>
          <Label className="text-sm" htmlFor="manual-sync">
            Sync with GitHub
          </Label>
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
          <div className="space-y-1">
            <Label
              className="text-muted-foreground text-xs"
              htmlFor="sync-direction"
            >
              Direction
            </Label>
            <Select
              onValueChange={(val) => {
                if (val && isSyncDirection(val)) {
                  onChange({ manualSyncDirection: val });
                }
              }}
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
