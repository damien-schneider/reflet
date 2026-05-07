"use client";

import {
  IconBolt,
  IconBrain,
  IconCode,
  IconKey,
  IconLock,
  IconRobot,
} from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SectionHeader } from "@/features/autopilot/components/settings/section-header";

export const ADAPTER_OPTIONS = [
  {
    value: "builtin",
    label: "Built-in",
    detail: "AI SDK + GitHub API",
    icon: IconCode,
  },
  {
    value: "copilot",
    label: "GitHub Copilot",
    detail: "Copilot Workspace",
    icon: IconRobot,
  },
  {
    value: "codex",
    label: "OpenAI Codex",
    detail: "Codex CLI",
    icon: IconBolt,
  },
  {
    value: "claude_code",
    label: "Claude Code",
    detail: "Anthropic CLI",
    icon: IconBrain,
  },
] as const;

export type AdapterValue = (typeof ADAPTER_OPTIONS)[number]["value"];

export function isAdapterValue(
  value: string | undefined
): value is AdapterValue {
  return ADAPTER_OPTIONS.some((option) => option.value === value);
}

export function AdapterSettings({
  adapter,
  credentialInput,
  disabled,
  isSaving,
  onAdapterChange,
  onCredentialInputChange,
  onSaveCredentials,
}: {
  adapter: string | undefined;
  credentialInput: string;
  disabled: boolean;
  isSaving: boolean;
  onAdapterChange: (value: string | undefined) => void;
  onCredentialInputChange: (value: string) => void;
  onSaveCredentials: () => void;
}) {
  return (
    <section className="space-y-5">
      <SectionHeader
        description="Choose the engine that executes coding tasks"
        icon={IconBolt}
        title="Coding Adapter"
      />

      <Card>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="adapter-select">Active Adapter</Label>
            <Select
              disabled={disabled}
              onValueChange={(value) => onAdapterChange(value ?? undefined)}
              value={adapter}
            >
              <SelectTrigger id="adapter-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ADAPTER_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <option.icon className="size-4 text-muted-foreground" />
                      <span className="font-medium">{option.label}</span>
                      <span className="text-muted-foreground text-xs">
                        - {option.detail}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cred-input">
              <div className="flex items-center gap-1.5">
                <IconKey className="size-3.5" />
                Adapter Credentials
              </div>
            </Label>
            <div className="flex gap-2">
              <Input
                className="font-mono text-xs"
                disabled={disabled}
                id="cred-input"
                onChange={(event) =>
                  onCredentialInputChange(event.target.value)
                }
                placeholder='{"apiKey": "sk-..."}'
                type="password"
                value={credentialInput}
              />
              <Button
                disabled={disabled || !credentialInput.trim() || isSaving}
                onClick={onSaveCredentials}
                variant="outline"
              >
                <IconLock className="mr-1.5 size-3.5" />
                Save
              </Button>
            </div>
            <p className="text-muted-foreground text-xs">
              Credentials are encrypted at rest and never exposed in the UI.
            </p>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
