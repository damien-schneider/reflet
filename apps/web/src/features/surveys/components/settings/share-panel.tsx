"use client";

import { Button, ButtonLink } from "@ctrl-ui/react/ui/button";
import { Input } from "@ctrl-ui/react/ui/input";
import { Switch } from "@ctrl-ui/react/ui/switch";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@ctrl-ui/react/ui/tabs";
import { toast } from "@ctrl-ui/react/ui/toast";
import { ArrowSquareOut, Check, Robot } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import { useMutation } from "convex/react";
import Link from "next/link";
import { type ReactNode, useState, useSyncExternalStore } from "react";
import { CopyButton } from "@/components/copy-button";
import { Label } from "@/components/ui/label";
import { H3 } from "@/components/ui/typography";
import { CodeSnippet } from "@/features/surveys/components/settings/code-snippet";
import {
  type OrgPublicKey,
  useOrgPublicKey,
} from "@/features/surveys/components/settings/use-org-public-key";
import { convexErrorMessage } from "@/features/surveys/lib/convex-error-message";
import { generateSurveySetupPrompt } from "@/features/surveys/lib/generate-survey-setup-prompt";
import type { SurveyDetail } from "@/features/surveys/lib/settings/settings-draft";
import {
  PUBLIC_KEY_PLACEHOLDER,
  reactSdkSnippet,
  scriptTagSnippet,
  scriptTriggerSnippet,
  sdkTriggerSnippet,
  triggerCallOf,
} from "@/features/surveys/lib/survey-install-snippets";
import { useCopyFeedback } from "@/hooks/use-copy-feedback";
import { BASE_URL } from "@/lib/seo-config";

type ShareSurvey = Pick<
  SurveyDetail,
  | "_id"
  | "linkEnabled"
  | "organizationId"
  | "status"
  | "title"
  | "triggerConfig"
  | "triggerType"
>;

const subscribeToNothing = () => () => undefined;

function ShareBlock({
  children,
  description,
  id,
  title,
}: {
  children: ReactNode;
  description: string;
  id: string;
  title: string;
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <H3 id={id} variant="card">
          {title}
        </H3>
        <p className="text-pretty text-muted-foreground text-sm">
          {description}
        </p>
      </div>
      {children}
    </section>
  );
}

function HostedLink({ survey }: { survey: ShareSurvey }) {
  const updateSurvey = useMutation(api.surveys.mutations.update);
  const [isSaving, setIsSaving] = useState(false);
  const origin = useSyncExternalStore(
    subscribeToNothing,
    () => window.location.origin,
    () => BASE_URL
  );
  const linkUrl = `${origin}/s/${survey._id}`;

  const toggleLink = async (linkEnabled: boolean) => {
    setIsSaving(true);
    try {
      await updateSurvey({ linkEnabled, surveyId: survey._id });
    } catch (error) {
      toast.error(
        convexErrorMessage(error, "Couldn’t update the link. Try again.")
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ShareBlock
      description="A page anyone can open, no install needed. Answers show up in Responses tagged “Link”."
      id="share-link"
      title="Hosted link"
    >
      <div className="flex items-center justify-between gap-4">
        <Label htmlFor="share-link-toggle">Share with a public link</Label>
        <Switch
          checked={survey.linkEnabled}
          disabled={isSaving}
          id="share-link-toggle"
          onCheckedChange={toggleLink}
        />
      </div>
      {survey.linkEnabled ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1">
            <Input
              aria-label="Survey link"
              className="font-mono"
              onFocus={(event) => event.currentTarget.select()}
              readOnly
              value={linkUrl}
            />
            <CopyButton label="Copy link" value={linkUrl} />
            <ButtonLink
              aria-label="Open the survey page in a new tab"
              href={linkUrl}
              iconOnly
              rel="noopener"
              size="sm"
              target="_blank"
              variant="ghost"
            >
              <ArrowSquareOut aria-hidden />
            </ButtonLink>
          </div>
          {survey.status === "active" ? null : (
            <p className="text-pretty text-muted-foreground text-xs">
              The link shows “not available” until the survey is active.
            </p>
          )}
        </div>
      ) : null}
    </ShareBlock>
  );
}

function MissingKeyNote({ publicKey }: { publicKey: OrgPublicKey }) {
  if (publicKey.status !== "missing") {
    return null;
  }
  if (!(publicKey.canManageKeys && publicKey.orgSlug)) {
    return (
      <p className="text-pretty text-muted-foreground text-xs">
        Replace <code>{PUBLIC_KEY_PLACEHOLDER}</code> with your public key. Ask
        an organization admin for it.
      </p>
    );
  }
  return (
    <p className="text-pretty text-muted-foreground text-xs">
      We couldn’t create a public key automatically.{" "}
      <Link
        className="text-primary-text underline-offset-4 hover:underline"
        href={`/dashboard/${publicKey.orgSlug}/project/api-keys`}
      >
        Create one in API keys
      </Link>
      , then replace <code>{PUBLIC_KEY_PLACEHOLDER}</code>.
    </p>
  );
}

function InAppInstall({
  publicKey,
  survey,
}: {
  publicKey: OrgPublicKey;
  survey: ShareSurvey;
}) {
  const key =
    publicKey.status === "ready" ? publicKey.publicKey : PUBLIC_KEY_PLACEHOLDER;
  const call = triggerCallOf(survey);
  const triggerHint =
    call?.method === "track"
      ? "Then track the event where it happens:"
      : "Then show it from your code:";

  return (
    <ShareBlock
      description="Install Reflet once in your app; every active survey then shows when its trigger fires."
      id="share-install"
      title="Show it in your app"
    >
      <Tabs defaultValue="script">
        <TabsList size="sm">
          <TabsTab value="script">Script tag</TabsTab>
          <TabsTab value="sdk">React SDK</TabsTab>
        </TabsList>
        <TabsPanel className="mt-3 flex flex-col gap-2" value="script">
          <p className="text-muted-foreground text-xs">
            Add before <code>&lt;/body&gt;</code> on every page:
          </p>
          <CodeSnippet
            code={scriptTagSnippet(key)}
            copyLabel="Copy script tag"
          />
          {call ? (
            <>
              <p className="text-muted-foreground text-xs">{triggerHint}</p>
              <CodeSnippet
                code={scriptTriggerSnippet(call)}
                copyLabel="Copy script tag call"
              />
            </>
          ) : null}
        </TabsPanel>
        <TabsPanel className="mt-3 flex flex-col gap-2" value="sdk">
          <p className="text-muted-foreground text-xs">
            Install <code>reflet-sdk</code>, then mount surveys once near your
            app root:
          </p>
          <CodeSnippet code={reactSdkSnippet(key)} copyLabel="Copy SDK setup" />
          {call ? (
            <>
              <p className="text-muted-foreground text-xs">{triggerHint}</p>
              <CodeSnippet
                code={sdkTriggerSnippet(call)}
                copyLabel="Copy SDK call"
              />
            </>
          ) : null}
        </TabsPanel>
      </Tabs>
      <MissingKeyNote publicKey={publicKey} />
    </ShareBlock>
  );
}

function SetupPromptButton({
  publicKey,
  survey,
}: {
  publicKey: OrgPublicKey;
  survey: ShareSurvey;
}) {
  const { copy, state } = useCopyFeedback();
  const prompt = generateSurveySetupPrompt({
    publicKey:
      publicKey.status === "ready"
        ? publicKey.publicKey
        : PUBLIC_KEY_PLACEHOLDER,
    survey,
  });

  const copyPrompt = async () => {
    try {
      await copy(prompt);
    } catch {
      toast.error("Couldn’t copy. Your browser blocked the clipboard.");
    }
  };

  return (
    <div className="flex flex-col gap-2 rounded-lg border p-4">
      <div className="flex items-start gap-3">
        <Robot aria-hidden className="mt-0.5 size-5 text-muted-foreground" />
        <div className="flex flex-1 flex-col gap-1">
          <p className="font-medium text-sm">Let your AI agent set it up</p>
          <p className="text-pretty text-muted-foreground text-xs">
            Paste the prompt into Claude Code, Cursor or similar. It installs
            Reflet and wires this survey’s trigger.
          </p>
        </div>
      </div>
      <Button
        disabled={publicKey.status === "loading"}
        onClick={copyPrompt}
        tone="primary"
        variant="solid"
      >
        {state === "copied" ? <Check aria-hidden /> : null}
        {state === "copied" ? "Prompt copied" : "Copy setup prompt"}
      </Button>
      <span className="sr-only" role="status">
        {state === "copied" ? "Setup prompt copied" : ""}
      </span>
    </div>
  );
}

export function SharePanel({ survey }: { survey: ShareSurvey }) {
  const publicKey = useOrgPublicKey(survey.organizationId);

  return (
    <div className="flex max-h-[70vh] flex-col gap-8 overflow-y-auto">
      <HostedLink survey={survey} />
      <InAppInstall publicKey={publicKey} survey={survey} />
      <SetupPromptButton publicKey={publicKey} survey={survey} />
    </div>
  );
}
