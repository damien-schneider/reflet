"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import { IconPower, IconRobot } from "@tabler/icons-react";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { H2, Muted } from "@/components/ui/typography";
import { useAutopilotContext } from "@/features/autopilot/components/autopilot-context";
import {
  AdapterSettings,
  isAdapterValue,
} from "@/features/autopilot/components/settings/adapter-settings";
import {
  BillingSection,
  BillingSectionSkeleton,
  BillingUnavailableSection,
} from "@/features/autopilot/components/settings/billing-section";
import { BudgetSettings } from "@/features/autopilot/components/settings/budget-settings";
import { DangerZone } from "@/features/autopilot/components/settings/danger-zone";
import { GeneralSettings } from "@/features/autopilot/components/settings/general-settings";
import { LimitSettings } from "@/features/autopilot/components/settings/limit-settings";

type ConfigValue = number | string | undefined;

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export default function AutopilotSettingsPage() {
  const { isAdmin, organizationId, orgSlug } = useAutopilotContext();

  const config = useQuery(api.autopilot.queries.config.getConfig, {
    organizationId,
  });
  const billing = useQuery(api.billing.queries.getStatus, {
    organizationId,
  });
  const resetScope = useQuery(
    api.autopilot.mutations.routines.getResetScope,
    {}
  );

  const initConfig = useMutation(api.autopilot.mutations.config.initConfig);
  const updateConfig = useMutation(api.autopilot.mutations.config.updateConfig);
  const upsertCreds = useMutation(
    api.autopilot.mutations.config.upsertCredentials
  );
  const resetAll = useMutation(api.autopilot.mutations.routines.resetAllData);

  const [credentialInput, setCredentialInput] = useState("");
  const [isSavingCredentials, setIsSavingCredentials] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  if (config === undefined) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton
              className="h-24 rounded-xl"
              key={`settings-skeleton-${String(index)}`}
            />
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
      } catch (error) {
        toast.error(getErrorMessage(error, "Failed to initialize autopilot"));
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
    setIsSavingSettings(true);
    try {
      await updateConfig({ configId: config._id, [field]: value });
      toast.success("Setting updated");
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to update setting"));
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleUpdate = async (field: string, value: ConfigValue) => {
    setIsSavingSettings(true);
    try {
      await updateConfig({ configId: config._id, [field]: value });
      toast.success("Setting updated");
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to update setting"));
      throw error;
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleSaveCredentials = async () => {
    if (!credentialInput.trim()) {
      toast.error("Credentials required");
      return;
    }

    if (!isAdapterValue(config.adapter)) {
      toast.error("Choose a valid coding adapter before saving credentials");
      return;
    }

    setIsSavingCredentials(true);
    try {
      await upsertCreds({
        organizationId,
        adapter: config.adapter,
        credentials: credentialInput.trim(),
      });
      toast.success("Credentials saved");
      setCredentialInput("");
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to save credentials"));
    } finally {
      setIsSavingCredentials(false);
    }
  };

  const handleResetAll = async () => {
    setIsResetting(true);
    try {
      await resetAll({ organizationId });
      toast.success("Autopilot data has been reset");
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to reset autopilot data"));
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-10">
      <div>
        <H2 variant="card">Settings</H2>
        <Muted className="mt-1">
          Configure your AI team&apos;s behavior, agents, and resource limits.
        </Muted>
      </div>

      {billing === undefined && <BillingSectionSkeleton />}
      {billing === null && <BillingUnavailableSection orgSlug={orgSlug} />}
      {billing && <BillingSection orgSlug={orgSlug} tier={billing.tier} />}

      <GeneralSettings
        autoMergePRs={config.autoMergePRs}
        disabled={!isAdmin || isSavingSettings}
        onAutoMergeChange={(value) => handleToggle("autoMergePRs", value)}
      />

      <AdapterSettings
        adapter={config.adapter ?? undefined}
        credentialInput={credentialInput}
        disabled={!isAdmin || isSavingSettings}
        isSaving={isSavingCredentials}
        onAdapterChange={(value) => handleUpdate("adapter", value)}
        onCredentialInputChange={setCredentialInput}
        onSaveCredentials={handleSaveCredentials}
      />

      <LimitSettings
        dailyCostCapUsd={config.dailyCostCapUsd}
        disabled={!isAdmin || isSavingSettings}
        emailDailyLimit={config.emailDailyLimit}
        maxTasksPerDay={config.maxTasksPerDay}
        onInvalidValue={(message) => toast.error(message)}
        onUpdate={handleUpdate}
      />

      <BudgetSettings
        disabled={!isAdmin || isSavingSettings}
        onSave={(json) => handleUpdate("perAgentDailyCapUsd", json)}
        storedValue={config.perAgentDailyCapUsd}
      />

      {isAdmin && (
        <DangerZone
          isResetting={isResetting}
          onReset={handleResetAll}
          resetScope={resetScope}
        />
      )}
    </div>
  );
}
