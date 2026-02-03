import { ChartBar, CheckCircle } from "@phosphor-icons/react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/components/ui/progress";
import { Text } from "@/components/ui/typography";

import type { LimitsData, UsageData } from "./billing-types";

// ============================================
// SUB-COMPONENTS
// ============================================

function UsageProgress({
  label,
  current,
  max,
  isUnlimited,
  atLimitMessage,
  nearLimitMessage,
}: {
  label: string;
  current: number;
  max: number;
  isUnlimited?: boolean;
  atLimitMessage: string;
  nearLimitMessage: string;
}) {
  const percentage = isUnlimited ? 0 : Math.min((current / max) * 100, 100);
  const isAtLimit = !isUnlimited && current >= max;
  const isNearLimit = !isUnlimited && current >= max * 0.8 && !isAtLimit;

  return (
    <div>
      <Progress
        className={isAtLimit ? "[&>div]:bg-red-500" : ""}
        value={percentage}
      >
        <ProgressLabel>{label}</ProgressLabel>
        <ProgressValue>
          {() =>
            isUnlimited ? `${current} (unlimited)` : `${current} / ${max}`
          }
        </ProgressValue>
      </Progress>
      {isAtLimit && (
        <Text className="mt-1 text-red-500" variant="bodySmall">
          {atLimitMessage}
        </Text>
      )}
      {isNearLimit && (
        <Text className="mt-1 text-amber-500" variant="bodySmall">
          {nearLimitMessage}
        </Text>
      )}
    </div>
  );
}

function FeatureStatus({
  label,
  enabled,
}: {
  label: string;
  enabled: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <CheckCircle
        className={`h-4 w-4 ${enabled ? "text-green-500" : "text-muted-foreground/30"}`}
        weight="fill"
      />
      <Text
        className={enabled ? "" : "text-muted-foreground/50"}
        variant="bodySmall"
      >
        {label}
      </Text>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function UsageCard({
  isPro,
  usage,
  limits,
}: {
  isPro: boolean;
  usage: UsageData;
  limits: LimitsData;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ChartBar className="h-5 w-5" />
          Usage
        </CardTitle>
        <CardDescription>
          Track your organization&apos;s usage against plan limits
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <UsageProgress
          atLimitMessage="Limit reached. Upgrade to Pro for unlimited members."
          current={usage.members}
          isUnlimited={isPro}
          label="Team members"
          max={limits.maxMembers}
          nearLimitMessage="Approaching limit. Consider upgrading to Pro."
        />

        <UsageProgress
          atLimitMessage="Limit reached. Upgrade to Pro for 5,000 feedback items."
          current={usage.feedback}
          label="Feedback items"
          max={limits.maxFeedback}
          nearLimitMessage="Approaching limit. Consider upgrading to Pro."
        />

        <div className="grid grid-cols-2 gap-4 border-t pt-4">
          <FeatureStatus
            enabled={limits.customBranding}
            label="Custom Branding"
          />
          <FeatureStatus enabled={limits.customDomain} label="Custom Domain" />
          <FeatureStatus enabled={limits.apiAccess} label="API Access" />
          <FeatureStatus
            enabled={limits.prioritySupport}
            label="Priority Support"
          />
        </div>
      </CardContent>
    </Card>
  );
}
