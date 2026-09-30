import {
  Meter,
  MeterIndicator,
  MeterLabel,
  MeterTrack,
  MeterValue,
} from "@ctrl-ui/react/ui/meter";
import { CheckCircle, MinusCircle } from "@phosphor-icons/react";
import { SettingsSection } from "../settings-page";

import type { LimitsData, UsageData } from "./billing-types";

const NEAR_LIMIT_RATIO = 0.8;
const AT_LIMIT_STYLE = {
  "--cui-range-indicator-background": "var(--destructive)",
} as const;
const NEAR_LIMIT_STYLE = {
  "--cui-range-indicator-background": "var(--warning)",
} as const;

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
  const isAtLimit = !isUnlimited && current >= max;
  const isNearLimit =
    !(isUnlimited || isAtLimit) && current >= max * NEAR_LIMIT_RATIO;
  const meterMax = isUnlimited ? Math.max(current, 1) : max;
  let indicatorStyle:
    | typeof AT_LIMIT_STYLE
    | typeof NEAR_LIMIT_STYLE
    | undefined;
  if (isAtLimit) {
    indicatorStyle = AT_LIMIT_STYLE;
  } else if (isNearLimit) {
    indicatorStyle = NEAR_LIMIT_STYLE;
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Meter
        getAriaValueText={() =>
          isUnlimited ? `${current}, unlimited` : `${current} of ${max}`
        }
        max={meterMax}
        value={isUnlimited ? 0 : Math.min(current, max)}
      >
        <MeterLabel>{label}</MeterLabel>
        <MeterValue className="tabular-nums">
          {() =>
            isUnlimited ? `${current} · Unlimited` : `${current} / ${max}`
          }
        </MeterValue>
        <MeterTrack>
          <MeterIndicator style={indicatorStyle} />
        </MeterTrack>
      </Meter>
      {isAtLimit && (
        <p className="text-body text-destructive-text">{atLimitMessage}</p>
      )}
      {isNearLimit && (
        <p className="text-body text-warning-text">{nearLimitMessage}</p>
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
    <li className="flex items-center gap-2 text-body">
      {enabled ? (
        <CheckCircle
          aria-hidden
          className="size-4 shrink-0 text-success-text"
          weight="fill"
        />
      ) : (
        <MinusCircle
          aria-hidden
          className="size-4 shrink-0 text-muted-foreground"
        />
      )}
      <span className={enabled ? undefined : "text-muted-foreground"}>
        {label}
        <span className="sr-only">
          {enabled ? " (included)" : " (not included)"}
        </span>
      </span>
    </li>
  );
}

export function UsageSection({
  isPro,
  usage,
  limits,
}: {
  isPro: boolean;
  usage: UsageData;
  limits: LimitsData;
}) {
  return (
    <SettingsSection
      description="Your organization’s usage against plan limits."
      title="Usage"
    >
      <div className="flex flex-col gap-6">
        <UsageProgress
          atLimitMessage="Limit reached. Upgrade to Pro for unlimited members."
          current={usage.members}
          isUnlimited={isPro}
          label="Team members"
          max={limits.maxMembers}
          nearLimitMessage="Almost at your limit. Upgrade to Pro for unlimited members."
        />
        <UsageProgress
          atLimitMessage="Limit reached. Upgrade to Pro for 5,000 feedback items."
          current={usage.feedback}
          label="Feedback items"
          max={limits.maxFeedback}
          nearLimitMessage="Almost at your limit. Upgrade to Pro for 5,000 feedback items."
        />
        <ul className="grid grid-cols-1 gap-3 border-t pt-4 sm:grid-cols-2">
          <FeatureStatus
            enabled={limits.customBranding}
            label="Custom branding"
          />
          <FeatureStatus enabled={limits.customDomain} label="Custom domain" />
          <FeatureStatus enabled={limits.apiAccess} label="API access" />
          <FeatureStatus
            enabled={limits.prioritySupport}
            label="Priority support"
          />
        </ul>
      </div>
    </SettingsSection>
  );
}
