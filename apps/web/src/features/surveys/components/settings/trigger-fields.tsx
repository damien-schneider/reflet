"use client";

import { cn } from "@ctrl-ui/react/lib/cn";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@ctrl-ui/react/ui/field";
import { Input } from "@ctrl-ui/react/ui/input";
import { Check, X } from "@phosphor-icons/react";
import { matchesPageUrl } from "@reflet/survey-core";
import { useId, useState } from "react";
import { CodeSnippet } from "@/features/surveys/components/settings/code-snippet";
import {
  type SettingsDraft,
  type SettingsIssues,
  takesPageUrl,
} from "@/features/surveys/lib/settings/settings-draft";
import {
  scriptTriggerSnippet,
  sdkTriggerSnippet,
  triggerCallOf,
} from "@/features/surveys/lib/survey-install-snippets";

interface TriggerFieldsProps {
  draft: SettingsDraft;
  issues: SettingsIssues;
  onChange: (patch: Partial<SettingsDraft>) => void;
  surveyId: string;
}

export function TriggerFields({
  draft,
  issues,
  onChange,
  surveyId,
}: TriggerFieldsProps) {
  const call = triggerCallOf({
    _id: surveyId,
    triggerConfig: { eventName: draft.eventName },
    triggerType: draft.triggerType,
  });

  return (
    <div className="flex flex-col gap-5 rounded-lg border p-4">
      {draft.triggerType === "event" ? (
        <Field invalid={Boolean(issues.eventName)}>
          <FieldLabel htmlFor="settings-event-name">Event name</FieldLabel>
          <Input
            autoComplete="off"
            className="font-mono"
            id="settings-event-name"
            onChange={(event) => onChange({ eventName: event.target.value })}
            placeholder="checkout_completed"
            spellCheck={false}
            value={draft.eventName}
          />
          <FieldDescription>
            Your app sends this name when the moment happens. It must match
            exactly.
          </FieldDescription>
          <FieldError match={Boolean(issues.eventName)}>
            {issues.eventName}
          </FieldError>
        </Field>
      ) : null}

      {draft.triggerType === "time_delay" ? (
        <Field invalid={Boolean(issues.delaySeconds)}>
          <FieldLabel htmlFor="settings-delay">Delay in seconds</FieldLabel>
          <Input
            className="w-28 tabular-nums"
            id="settings-delay"
            inputMode="decimal"
            min="0"
            onChange={(event) => onChange({ delaySeconds: event.target.value })}
            step="0.5"
            type="number"
            value={draft.delaySeconds}
          />
          <FieldDescription>
            Counted from when the visitor lands on a matching page.
          </FieldDescription>
          <FieldError match={Boolean(issues.delaySeconds)}>
            {issues.delaySeconds}
          </FieldError>
        </Field>
      ) : null}

      {call ? (
        <div className="flex flex-col gap-2">
          <p className="font-medium text-sm">Show it from your code</p>
          <p className="text-pretty text-muted-foreground text-xs">
            With the script tag:
          </p>
          <CodeSnippet
            code={scriptTriggerSnippet(call)}
            copyLabel="Copy script tag call"
          />
          <p className="text-pretty text-muted-foreground text-xs">
            With the React SDK, inside <code>RefletProvider</code>:
          </p>
          <CodeSnippet
            code={sdkTriggerSnippet(call)}
            copyLabel="Copy SDK call"
          />
        </div>
      ) : null}

      {takesPageUrl(draft.triggerType) ? (
        <PageUrlFields
          onPageUrlChange={(pageUrl) => onChange({ pageUrl })}
          pageUrl={draft.pageUrl}
        />
      ) : null}
    </div>
  );
}

function PageUrlFields({
  onPageUrlChange,
  pageUrl,
}: {
  onPageUrlChange: (pageUrl: string) => void;
  pageUrl: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <Field>
        <FieldLabel htmlFor="settings-page-url">Only on these pages</FieldLabel>
        <Input
          autoComplete="off"
          className="font-mono"
          id="settings-page-url"
          onChange={(event) => onPageUrlChange(event.target.value)}
          placeholder="/pricing, /checkout/*"
          spellCheck={false}
          value={pageUrl}
        />
        <FieldDescription>
          Every trigger checks this first, so the survey only shows on matching
          pages. Separate patterns with commas and use * as a wildcard. Patterns
          starting with / match the path, like /pricing; others match the domain
          and path, like app.acme.com/pricing. Leave empty for every page.
        </FieldDescription>
      </Field>
      <PageUrlTester patterns={pageUrl} />
    </div>
  );
}

type UrlTestStatus = "empty" | "invalid" | "match" | "miss";

const URL_TEST_MESSAGES: Record<UrlTestStatus, string> = {
  empty: "",
  invalid: "Enter a full URL, starting with https://",
  match: "Shows on this page",
  miss: "Doesn’t show on this page",
};

function urlTestStatus(patterns: string, candidate: string): UrlTestStatus {
  if (candidate === "") {
    return "empty";
  }
  if (!URL.canParse(candidate)) {
    return "invalid";
  }
  return matchesPageUrl(patterns, candidate) ? "match" : "miss";
}

function PageUrlTester({ patterns }: { patterns: string }) {
  const [testUrl, setTestUrl] = useState("");
  const resultId = useId();
  const status = urlTestStatus(patterns, testUrl.trim());

  return (
    <div className="flex flex-col gap-1.5 rounded-md bg-muted/40 p-3">
      <label className="font-medium text-xs" htmlFor="settings-test-url">
        Test a URL
      </label>
      <Input
        aria-describedby={resultId}
        autoComplete="off"
        className="font-mono"
        id="settings-test-url"
        inputMode="url"
        onChange={(event) => setTestUrl(event.target.value)}
        placeholder="https://yourapp.com/pricing"
        size="sm"
        spellCheck={false}
        type="url"
        value={testUrl}
      />
      <p
        aria-live="polite"
        className={cn(
          "flex min-h-4 items-center gap-1 text-xs",
          status === "match" ? "text-success-text" : "text-muted-foreground"
        )}
        id={resultId}
      >
        {status === "match" ? <Check aria-hidden className="size-3.5" /> : null}
        {status === "miss" ? <X aria-hidden className="size-3.5" /> : null}
        {URL_TEST_MESSAGES[status]}
      </p>
    </div>
  );
}
