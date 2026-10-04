import { displayOf } from "@reflet/survey-core";
import type { SurveySession } from "@reflet/survey-core/client";
import { useEffect, useState, useSyncExternalStore } from "react";
import type { Reflet } from "../client";
import { useRefletContext } from "../react-context";
import { SurveyCard, type SurveyTheme } from "./card/survey-card";
import { type RefletSurveysCallbacks, surveyControllerFor } from "./controller";
import { SurveyPortal } from "./survey-portal";
import { useSessionHandle } from "./use-survey-session";

const ENDING_AUTO_CLOSE_MS = 6000;

export interface RefletSurveysProps extends RefletSurveysCallbacks {
  /** Turn delivery off without unmounting, e.g. on pages where surveys would interrupt. */
  enabled?: boolean;
  /** Defaults to your organization's brand color. */
  primaryColor?: string;
  theme?: SurveyTheme;
}

function useOrganizationColor(
  client: Reflet,
  override: string | undefined
): string | undefined {
  const [organizationColor, setOrganizationColor] = useState<string>();

  useEffect(() => {
    if (override) {
      return;
    }
    let cancelled = false;
    client
      .getConfig()
      .then((config) => {
        if (!cancelled) {
          setOrganizationColor(config.primaryColor);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [client, override]);

  return override ?? organizationColor;
}

function ActiveSurvey({
  primaryColor,
  session,
  theme,
}: {
  primaryColor?: string;
  session: SurveySession;
  theme: SurveyTheme;
}) {
  const handle = useSessionHandle(session);
  const { ending, phase } = handle.snapshot;
  const endsQuietly =
    ending !== null && !(ending.buttonUrl || ending.buttonLabel);

  useEffect(() => {
    if (!endsQuietly) {
      return;
    }
    const timer = window.setTimeout(
      () => session.dismiss(),
      ENDING_AUTO_CLOSE_MS
    );
    return () => window.clearTimeout(timer);
  }, [endsQuietly, session]);

  if (phase !== "question" && phase !== "ending") {
    return null;
  }
  return (
    <SurveyPortal
      position={displayOf(session.survey.display).position ?? "bottom_right"}
    >
      <SurveyCard
        primaryColor={primaryColor}
        session={handle}
        theme={theme}
        variant="floating"
      />
    </SurveyPortal>
  );
}

/**
 * In-app survey delivery. Mount once inside `RefletProvider`: it loads the
 * surveys this visitor is eligible for, arms their triggers and shows one at a time.
 */
export function RefletSurveys({
  enabled = true,
  onSurveyAnswer,
  onSurveyComplete,
  onSurveyDismiss,
  onSurveyStart,
  primaryColor,
  theme = "auto",
}: RefletSurveysProps) {
  const { baseUrl, client, publicKey } = useRefletContext();
  const controller = surveyControllerFor(publicKey, baseUrl);
  const color = useOrganizationColor(client, primaryColor);
  const session = useSyncExternalStore(
    controller.subscribe,
    controller.getActiveSession,
    () => null
  );

  useEffect(() => {
    controller.callbacks = {
      onSurveyAnswer,
      onSurveyComplete,
      onSurveyDismiss,
      onSurveyStart,
    };
  });

  useEffect(() => {
    if (!enabled) {
      return;
    }
    return controller.attach(client);
  }, [client, controller, enabled]);

  if (!session) {
    return null;
  }
  return (
    <ActiveSurvey
      key={session.survey._id}
      primaryColor={color}
      session={session}
      theme={theme}
    />
  );
}
