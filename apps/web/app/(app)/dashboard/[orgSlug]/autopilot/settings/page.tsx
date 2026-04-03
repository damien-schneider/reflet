"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { H2 } from "@/components/ui/typography";
import { useAutopilotContext } from "@/features/autopilot/components/autopilot-context";

export default function AutopilotSettingsPage() {
  const { isAdmin, organizationId } = useAutopilotContext();

  const config = useQuery(api.autopilot.queries.getConfig, {
    organizationId,
  });

  const initConfig = useMutation(api.autopilot.mutations.initConfig);
  const updateConfig = useMutation(api.autopilot.mutations.updateConfig);
  const upsertCreds = useMutation(api.autopilot.mutations.upsertCredentials);

  const [credentialInput, setCredentialInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  if (config === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Show setup button if no config exists
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
        <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed p-8">
          <p className="text-muted-foreground text-sm">
            Autopilot hasn&apos;t been configured for this organization yet.
          </p>
          {isAdmin && (
            <Button onClick={handleInit}>Initialize Autopilot</Button>
          )}
        </div>
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
    <div className="space-y-8">
      <H2 variant="card">Settings</H2>

      <section className="space-y-4">
        <h3 className="font-semibold text-lg">General</h3>

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <Label>Enable Autopilot</Label>
            <p className="text-muted-foreground text-sm">
              Start the AI product team
            </p>
          </div>
          <Switch
            checked={config.enabled}
            disabled={!isAdmin}
            onCheckedChange={(v) => handleToggle("enabled", v)}
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <Label>Auto-merge PRs</Label>
            <p className="text-muted-foreground text-sm">
              Merge PRs automatically after CI passes
            </p>
          </div>
          <Switch
            checked={config.autoMergePRs}
            disabled={!isAdmin}
            onCheckedChange={(v) => handleToggle("autoMergePRs", v)}
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <Label>Require Architect Review</Label>
            <p className="text-muted-foreground text-sm">
              Architect agent reviews every PR
            </p>
          </div>
          <Switch
            checked={config.requireArchitectReview}
            disabled={!isAdmin}
            onCheckedChange={(v) => handleToggle("requireArchitectReview", v)}
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <Label>Enable Intelligence</Label>
            <p className="text-muted-foreground text-sm">
              Competitive intelligence scanning and insights
            </p>
          </div>
          <Switch
            checked={config.intelligenceEnabled ?? false}
            disabled={!isAdmin}
            onCheckedChange={(v) => handleToggle("intelligenceEnabled", v)}
          />
        </div>
      </section>

      <Separator />

      <section className="space-y-4">
        <h3 className="font-semibold text-lg">V5 Agents</h3>

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <Label>Support Agent</Label>
            <p className="text-muted-foreground text-sm">
              Triages conversations, drafts replies, escalates bugs
            </p>
          </div>
          <Switch
            checked={config.supportEnabled ?? false}
            disabled={!isAdmin}
            onCheckedChange={(v) => handleToggle("supportEnabled", v)}
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <Label>Analytics Agent</Label>
            <p className="text-muted-foreground text-sm">
              Daily snapshots, anomaly detection, weekly briefs
            </p>
          </div>
          <Switch
            checked={config.analyticsEnabled ?? false}
            disabled={!isAdmin}
            onCheckedChange={(v) => handleToggle("analyticsEnabled", v)}
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <Label>Docs Agent</Label>
            <p className="text-muted-foreground text-sm">
              Stale doc detection, FAQ generation, doc updates
            </p>
          </div>
          <Switch
            checked={config.docsEnabled ?? false}
            disabled={!isAdmin}
            onCheckedChange={(v) => handleToggle("docsEnabled", v)}
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <Label>QA Agent</Label>
            <p className="text-muted-foreground text-sm">
              E2E test generation, regression detection
            </p>
          </div>
          <Switch
            checked={config.qaEnabled ?? false}
            disabled={!isAdmin}
            onCheckedChange={(v) => handleToggle("qaEnabled", v)}
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <Label>Ops Agent</Label>
            <p className="text-muted-foreground text-sm">
              Deploy monitoring, error spikes, reliability reports
            </p>
          </div>
          <Switch
            checked={config.opsEnabled ?? false}
            disabled={!isAdmin}
            onCheckedChange={(v) => handleToggle("opsEnabled", v)}
          />
        </div>
      </section>

      <Separator />

      <section className="space-y-4">
        <h3 className="font-semibold text-lg">Adapter</h3>

        <div className="space-y-2">
          <Label htmlFor="adapter-select">Coding Adapter</Label>
          <Select
            disabled={!isAdmin}
            onValueChange={(v) => handleUpdate("adapter", v ?? undefined)}
            value={config.adapter ?? undefined}
          >
            <SelectTrigger id="adapter-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="builtin">
                Built-in (AI SDK + GitHub API)
              </SelectItem>
              <SelectItem value="copilot">GitHub Copilot</SelectItem>
              <SelectItem value="codex">OpenAI Codex</SelectItem>
              <SelectItem value="claude_code">Claude Code</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="cred-input">Adapter Credentials (JSON)</Label>
          <div className="flex gap-2">
            <Input
              disabled={!isAdmin}
              id="cred-input"
              onChange={(e) => setCredentialInput(e.target.value)}
              placeholder='{"apiKey": "..."}'
              type="password"
              value={credentialInput}
            />
            <Button
              disabled={!(isAdmin && credentialInput.trim()) || isSaving}
              onClick={handleSaveCredentials}
              variant="outline"
            >
              Save
            </Button>
          </div>
        </div>
      </section>

      <Separator />

      <section className="space-y-4">
        <h3 className="font-semibold text-lg">Autonomy</h3>

        <div className="space-y-2">
          <Label htmlFor="autonomy-select">Autonomy Level</Label>
          <Select
            disabled={!isAdmin}
            onValueChange={(v) => handleUpdate("autonomyLevel", v ?? undefined)}
            value={config.autonomyLevel ?? undefined}
          >
            <SelectTrigger id="autonomy-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="full_auto">
                Full Auto — everything runs autonomously
              </SelectItem>
              <SelectItem value="review_required">
                Review Required — outputs need approval
              </SelectItem>
              <SelectItem value="manual">
                Manual — agents only work when triggered
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>

      <Separator />

      <section className="space-y-4">
        <h3 className="font-semibold text-lg">Limits</h3>

        <div className="space-y-2">
          <Label htmlFor="max-tasks">Max Tasks Per Day</Label>
          <Input
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
        </div>

        <div className="space-y-2">
          <Label htmlFor="cost-cap">Daily Cost Cap ($)</Label>
          <Input
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
        </div>

        <div className="space-y-2">
          <Label htmlFor="email-limit">Daily Email Limit</Label>
          <Input
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
        </div>
      </section>
    </div>
  );
}
