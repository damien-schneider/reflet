"use client";

import { Badge } from "@ctrl-ui/react/ui/badge";
import { Button } from "@ctrl-ui/react/ui/button";
import { Input } from "@ctrl-ui/react/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ctrl-ui/react/ui/select";
import { Switch } from "@ctrl-ui/react/ui/switch";
import { ArrowSquareOut } from "@phosphor-icons/react";
import { Label } from "@/components/ui/label";
import type { WizardConfig } from "../wizard-config";

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
        <Label htmlFor="auto-version">Auto-suggest version</Label>
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
              className="w-16"
              id="version-prefix"
              onChange={(e) => onChange({ versionPrefix: e.target.value })}
              placeholder="v"
              size="sm"
              value={config.versionPrefix}
            />
          </div>

          <div className="space-y-1">
            <span className="text-muted-foreground text-xs" id="default-bump">
              Default bump
            </span>
            <fieldset
              aria-labelledby="default-bump"
              className="inline-flex min-w-0 gap-1"
            >
              {INCREMENT_OPTIONS.map((option) => {
                const selected = config.versionIncrement === option.id;
                return (
                  <Button
                    active={selected}
                    aria-pressed={selected}
                    key={option.id}
                    onClick={() => onChange({ versionIncrement: option.id })}
                    size="sm"
                    tone={selected ? "primary" : "neutral"}
                    type="button"
                    variant={selected ? "solid" : "ghost"}
                  >
                    {option.label}
                  </Button>
                );
              })}
            </fieldset>
          </div>
        </div>
      )}
    </div>
  );
}

function AiPoweredConfig({ config, onChange }: ConfigureStepProps) {
  return (
    <div className="space-y-4">
      <p className="text-pretty text-muted-foreground text-xs">
        Reflet compares commits since your last tag on{" "}
        <code className="rounded-sm bg-muted px-1 font-mono">
          {config.targetBranch}
        </code>{" "}
        and generates notes with AI.
      </p>

      <VersioningSection config={config} onChange={onChange} />

      <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
        <Label htmlFor="push-to-github">Create GitHub Release on publish</Label>
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
  { bump: "minor", description: "A new feature", prefix: "feat:" },
  { bump: "patch", description: "A bug fix", prefix: "fix:" },
  { bump: "none", description: "Maintenance tasks", prefix: "chore:" },
  {
    bump: "major",
    description: "Breaking change",
    prefix: "feat!:",
  },
] as const;

function AutomatedConfig({ config, onChange }: ConfigureStepProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2 rounded-lg border p-3">
        <h3 className="font-medium text-sm">Conventional Commits</h3>
        <div className="space-y-1">
          {CONVENTIONAL_COMMIT_EXAMPLES.map((example) => (
            <div
              className="flex items-center justify-between gap-2"
              key={example.prefix}
            >
              <code className="rounded-sm bg-muted px-1.5 py-0.5 font-mono text-caption">
                {example.prefix}
              </code>
              <span className="flex-1 text-muted-foreground text-xs">
                {example.description}
              </span>
              <Badge size="sm" variant="outline">
                {example.bump}
              </Badge>
            </div>
          ))}
        </div>
        <a
          className="inline-flex items-center gap-1 text-primary text-xs hover:underline"
          href="https://www.conventionalcommits.org"
          rel="noopener noreferrer"
          target="_blank"
        >
          Read the Conventional Commits guide
          <ArrowSquareOut aria-hidden className="size-3" />
          <span className="sr-only">(opens in a new tab)</span>
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
            className="w-16"
            id="version-prefix-auto"
            onChange={(e) => onChange({ versionPrefix: e.target.value })}
            placeholder="v"
            size="sm"
            value={config.versionPrefix}
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
        <Label htmlFor="auto-publish-imported">
          Auto-publish imported releases
        </Label>
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
        <Label htmlFor="manual-sync">Sync with GitHub</Label>
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
              <SelectTrigger id="sync-direction" size="sm">
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
            <Label htmlFor="manual-auto-publish">
              Auto-publish imported releases
            </Label>
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
