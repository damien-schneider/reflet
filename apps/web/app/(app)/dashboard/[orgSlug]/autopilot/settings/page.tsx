"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import {
  IconBolt,
  IconBrain,
  IconCode,
  IconCurrencyDollar,
  IconKey,
  IconLock,
  IconMail,
  IconPower,
  IconRobot,
  IconSettings,
  IconShieldCheck,
} from "@tabler/icons-react";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { H2, Muted } from "@/components/ui/typography";
import { useAutopilotContext } from "@/features/autopilot/components/autopilot-context";

const ADAPTER_OPTIONS = [
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

function SectionHeader({
  icon: Icon,
  title,
  description,
  badge,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  badge?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="rounded-lg bg-muted p-2">
        <Icon className="size-5 text-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-base tracking-tight">{title}</h3>
          {badge && (
            <Badge
              className="text-[10px] uppercase tracking-wider"
              variant="outline"
            >
              {badge}
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
    </div>
  );
}

export default function AutopilotSettingsPage() {
  const { isAdmin, organizationId } = useAutopilotContext();

  const config = useQuery(api.autopilot.queries.config.getConfig, {
    organizationId,
  });

  const initConfig = useMutation(api.autopilot.mutations.config.initConfig);
  const updateConfig = useMutation(api.autopilot.mutations.config.updateConfig);
  const upsertCreds = useMutation(
    api.autopilot.mutations.config.upsertCredentials
  );

  const [credentialInput, setCredentialInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  if (config === undefined) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton className="h-24 rounded-xl" key={`s-${String(i)}`} />
          ))}
        </div>
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  if (!config) {
    const handleInit = async () => {
      try {
        await initConfig({ organizationId });
        toast.success("Autopilot configured");
      } catch {
        toast.error("Failed to initialize autopilot");
      }
    };

    return (
      <div className="space-y-6">
        <H2 variant="card">Settings</H2>
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-4 py-16">
            <div className="rounded-2xl bg-muted p-4">
              <IconRobot className="size-8 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="font-medium">Autopilot not configured</p>
              <p className="mt-1 text-muted-foreground text-sm">
                Initialize Autopilot to start your AI-powered product team.
              </p>
            </div>
            {isAdmin && (
              <Button className="mt-2" onClick={handleInit} size="lg">
                <IconPower className="mr-2 size-4" />
                Initialize Autopilot
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleToggle = async (field: string, value: boolean) => {
    try {
      await updateConfig({
        configId: config._id,
        [field]: value,
      });
      toast.success("Setting updated");
    } catch {
      toast.error("Failed to update setting");
    }
  };

  const handleUpdate = async (
    field: string,
    value: string | number | undefined
  ) => {
    setIsSaving(true);
    try {
      await updateConfig({
        configId: config._id,
        [field]: value,
      });
      toast.success("Setting updated");
    } catch {
      toast.error("Failed to update setting");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveCredentials = async () => {
    if (!credentialInput.trim()) {
      toast.error("Credentials required");
      return;
    }

    try {
      await upsertCreds({
        organizationId,
        adapter: config.adapter as
          | "builtin"
          | "copilot"
          | "codex"
          | "claude_code",
        credentials: credentialInput.trim(),
      });
      toast.success("Credentials saved");
      setCredentialInput("");
    } catch {
      toast.error("Failed to save credentials");
    }
  };

  return (
    <div className="space-y-10">
      {/* Page header */}
      <div>
        <H2 variant="card">Settings</H2>
        <Muted className="mt-1">
          Configure your AI team&apos;s behavior, agents, and resource limits.
        </Muted>
      </div>

      {/* ── General ─────────────────────────────────── */}
      <section className="space-y-5">
        <SectionHeader
          description="Master controls for your Autopilot instance"
          icon={IconSettings}
          title="General"
        />

        <Card>
          <CardContent className="divide-y">
            {/* Auto-merge PRs */}
            <div className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-muted p-2 text-muted-foreground">
                  <IconCode className="size-4" />
                </div>
                <div>
                  <Label className="font-medium text-sm">Auto-merge PRs</Label>
                  <p className="text-muted-foreground text-xs">
                    Merge PRs automatically after CI passes
                  </p>
                </div>
              </div>
              <Switch
                checked={config.autoMergePRs}
                disabled={!isAdmin}
                onCheckedChange={(v) => handleToggle("autoMergePRs", v)}
              />
            </div>

            {/* Require Architect Review */}
            <div className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-muted p-2 text-muted-foreground">
                  <IconShieldCheck className="size-4" />
                </div>
                <div>
                  <Label className="font-medium text-sm">
                    Require Architect Review
                  </Label>
                  <p className="text-muted-foreground text-xs">
                    Architect agent reviews every PR
                  </p>
                </div>
              </div>
              <Switch
                checked={config.requireArchitectReview}
                disabled={!isAdmin}
                onCheckedChange={(v) =>
                  handleToggle("requireArchitectReview", v)
                }
              />
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ── Adapter ─────────────────────────────────── */}
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
                disabled={!isAdmin}
                onValueChange={(v) => handleUpdate("adapter", v ?? undefined)}
                value={config.adapter ?? undefined}
              >
                <SelectTrigger id="adapter-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ADAPTER_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex items-center gap-2">
                        <opt.icon className="size-4 text-muted-foreground" />
                        <span className="font-medium">{opt.label}</span>
                        <span className="text-muted-foreground text-xs">
                          — {opt.detail}
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
                  disabled={!isAdmin}
                  id="cred-input"
                  onChange={(e) => setCredentialInput(e.target.value)}
                  placeholder='{"apiKey": "sk-..."}'
                  type="password"
                  value={credentialInput}
                />
                <Button
                  disabled={!(isAdmin && credentialInput.trim()) || isSaving}
                  onClick={handleSaveCredentials}
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

      {/* ── Limits ──────────────────────────────────── */}
      <section className="space-y-5">
        <SectionHeader
          description="Guard-rails to prevent runaway costs and activity"
          icon={IconShieldCheck}
          title="Limits & Safeguards"
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <IconRobot className="size-4 text-muted-foreground" />
                Tasks / Day
              </CardTitle>
              <CardDescription className="text-xs">
                Max tasks agents can create daily
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                className="font-mono"
                defaultValue={config.maxTasksPerDay}
                disabled={!isAdmin}
                id="max-tasks"
                min={1}
                onBlur={(e) => {
                  const val = Number.parseInt(e.target.value, 10);
                  if (!Number.isNaN(val) && val > 0) {
                    handleUpdate("maxTasksPerDay", val);
                  }
                }}
                type="number"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <IconCurrencyDollar className="size-4 text-muted-foreground" />
                Cost Cap
              </CardTitle>
              <CardDescription className="text-xs">
                Daily spending limit in USD
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                className="font-mono"
                defaultValue={config.dailyCostCapUsd ?? ""}
                disabled={!isAdmin}
                id="cost-cap"
                min={0}
                onBlur={(e) => {
                  const val = Number.parseFloat(e.target.value);
                  if (!Number.isNaN(val) && val >= 0) {
                    handleUpdate("dailyCostCapUsd", val);
                  }
                }}
                step="0.01"
                type="number"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <IconMail className="size-4 text-muted-foreground" />
                Emails / Day
              </CardTitle>
              <CardDescription className="text-xs">
                Max outbound emails daily
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                className="font-mono"
                defaultValue={config.emailDailyLimit ?? 20}
                disabled={!isAdmin}
                id="email-limit"
                min={0}
                onBlur={(e) => {
                  const val = Number.parseInt(e.target.value, 10);
                  if (!Number.isNaN(val) && val >= 0) {
                    handleUpdate("emailDailyLimit", val);
                  }
                }}
                type="number"
              />
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
