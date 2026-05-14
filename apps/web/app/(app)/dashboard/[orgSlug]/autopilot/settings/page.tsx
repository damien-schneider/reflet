"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import { IconPower, IconRobot } from "@tabler/icons-react";
import { useMutation, useQuery } from "convex/react";
import { useReducer } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { H2, Muted } from "@/components/ui/typography";
import { useAutopilotContext } from "@/features/autopilot/components/autopilot-context";
import {
  BillingSection,
  BillingSectionSkeleton,
  BillingUnavailableSection,
} from "@/features/autopilot/components/settings/billing-section";
import { BudgetSettings } from "@/features/autopilot/components/settings/budget-settings";
import { DangerZone } from "@/features/autopilot/components/settings/danger-zone";
import { LimitSettings } from "@/features/autopilot/components/settings/limit-settings";
import {
  AUTOPILOT_PRO_REQUIRED_MESSAGE,
  getAutopilotErrorMessage,
} from "@/features/autopilot/lib/error-messages";

type ConfigValue = number | string | undefined;
type BillingStatus = { tier: string } | null | undefined;
type PendingKey = "initializing" | "savingSettings" | "resetting";

type PendingState = Record<PendingKey, boolean>;

const INITIAL_PENDING_STATE: PendingState = {
  initializing: false,
  savingSettings: false,
  resetting: false,
};

function pendingReducer(
  state: PendingState,
  action: { key: PendingKey; value: boolean }
) {
  return {
    ...state,
    [action.key]: action.value,
  };
}

interface UnconfiguredAutopilotSettingsProps {
  billing: BillingStatus;
  isAdmin: boolean;
  isInitializing: boolean;
  onInitialize: () => Promise<void>;
  orgSlug: string;
}

function getSetupCopy(billing: BillingStatus) {
  if (billing === undefined) {
    return {
      canInitialize: false,
      description:
        "Plan status is loading before Autopilot can be initialized.",
      title: "Checking billing access",
    };
  }

  if (billing?.tier === "pro") {
    return {
      canInitialize: true,
      description:
        "Initialize Autopilot to start your AI-powered product team.",
      title: "Autopilot not configured",
    };
  }

  return {
    canInitialize: false,
    description:
      "Upgrade or restore billing access before initializing Autopilot.",
    title: "Autopilot requires Pro",
  };
}

function BillingStatusSection({
  billing,
  orgSlug,
}: {
  billing: BillingStatus;
  orgSlug: string;
}) {
  if (billing === undefined) {
    return <BillingSectionSkeleton />;
  }

  if (billing === null) {
    return <BillingUnavailableSection orgSlug={orgSlug} />;
  }

  return <BillingSection orgSlug={orgSlug} tier={billing.tier} />;
}

function UnconfiguredAutopilotSettings({
  billing,
  isAdmin,
  isInitializing,
  onInitialize,
  orgSlug,
}: UnconfiguredAutopilotSettingsProps) {
  const setup = getSetupCopy(billing);

  return (
    <div className="space-y-6">
      <H2 variant="card">Settings</H2>
      <BillingStatusSection billing={billing} orgSlug={orgSlug} />
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-4 py-16">
          <div className="rounded-2xl bg-muted p-4">
            <IconRobot className="size-8 text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="font-medium">{setup.title}</p>
            <p className="mt-1 text-muted-foreground text-sm">
              {setup.description}
            </p>
          </div>
          {isAdmin && setup.canInitialize && (
            <Button
              className="mt-2"
              disabled={isInitializing}
              onClick={onInitialize}
              size="lg"
            >
              <IconPower className="mr-2 size-4" />
              {isInitializing ? "Initializing…" : "Initialize Autopilot"}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function LockedSettingsNotice({ billing }: { billing: BillingStatus }) {
  if (billing?.tier === "pro") {
    return null;
  }

  const copy =
    billing === undefined
      ? {
          title: "Checking billing access",
          description:
            "Autopilot controls stay locked until your plan status is confirmed.",
        }
      : {
          title: "Autopilot requires Pro",
          description:
            "Upgrade or restore billing access to edit Autopilot settings.",
        };

  return (
    <Card>
      <CardContent className="py-4">
        <p className="font-medium text-sm">{copy.title}</p>
        <p className="mt-1 text-muted-foreground text-xs">{copy.description}</p>
      </CardContent>
    </Card>
  );
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
  const resetAll = useMutation(api.autopilot.mutations.routines.resetAllData);

  const [pending, setPending] = useReducer(
    pendingReducer,
    INITIAL_PENDING_STATE
  );
  const setPendingFlag = (key: PendingKey, value: boolean) => {
    setPending({ key, value });
  };

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
      setPendingFlag("initializing", true);
      try {
        await initConfig({ organizationId });
        toast.success("Autopilot configured");
      } catch (error) {
        toast.error(
          getAutopilotErrorMessage(error, {
            fallback: "Failed to initialize autopilot",
          })
        );
      } finally {
        setPendingFlag("initializing", false);
      }
    };

    return (
      <UnconfiguredAutopilotSettings
        billing={billing}
        isAdmin={isAdmin}
        isInitializing={pending.initializing}
        onInitialize={handleInit}
        orgSlug={orgSlug}
      />
    );
  }

  const canEditSettings = isAdmin && billing?.tier === "pro";

  const handleUpdate = async (field: string, value: ConfigValue) => {
    if (!canEditSettings) {
      throw new Error(AUTOPILOT_PRO_REQUIRED_MESSAGE);
    }
    setPendingFlag("savingSettings", true);
    try {
      await updateConfig({ configId: config._id, [field]: value });
      toast.success("Setting updated");
    } catch (error) {
      toast.error(
        getAutopilotErrorMessage(error, {
          fallback: "Failed to update setting",
        })
      );
      throw error;
    } finally {
      setPendingFlag("savingSettings", false);
    }
  };

  const handleResetAll = async () => {
    if (!canEditSettings) {
      toast.error(AUTOPILOT_PRO_REQUIRED_MESSAGE);
      return;
    }
    setPendingFlag("resetting", true);
    try {
      await resetAll({ organizationId });
      toast.success("Autopilot data has been reset");
    } catch (error) {
      toast.error(
        getAutopilotErrorMessage(error, {
          fallback: "Failed to reset autopilot data",
        })
      );
    } finally {
      setPendingFlag("resetting", false);
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

      <BillingStatusSection billing={billing} orgSlug={orgSlug} />
      <LockedSettingsNotice billing={billing} />

      <LimitSettings
        dailyCostCapUsd={config.dailyCostCapUsd}
        disabled={!canEditSettings || pending.savingSettings}
        emailDailyLimit={config.emailDailyLimit}
        maxTasksPerDay={config.maxTasksPerDay}
        onInvalidValue={(message) => toast.error(message)}
        onUpdate={handleUpdate}
      />

      <BudgetSettings
        disabled={!canEditSettings || pending.savingSettings}
        onSave={(json) => handleUpdate("perAgentDailyCapUsd", json)}
        storedValue={config.perAgentDailyCapUsd}
      />

      {canEditSettings && (
        <DangerZone
          isResetting={pending.resetting}
          onReset={handleResetAll}
          resetScope={resetScope}
        />
      )}
    </div>
  );
}
