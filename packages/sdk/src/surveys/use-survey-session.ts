import type { AnswerValue, PublicSurvey } from "@reflet/survey-core";
import {
  previewTransport,
  SurveySession,
  type SurveySessionCallbacks,
  type SurveySessionSnapshot,
  type SurveyTransport,
} from "@reflet/survey-core/client";
import {
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";
import { RefletContext } from "../react-context";
import { createRefletSurveyTransport } from "./client-transport";

/** A running survey: its current state plus the actions a UI needs. */
export interface SurveySessionHandle {
  back: () => void;
  dismiss: () => void;
  next: () => Promise<void>;
  setAnswer: (value: AnswerValue | undefined) => void;
  snapshot: SurveySessionSnapshot;
  start: () => Promise<void>;
  survey: PublicSurvey;
}

export interface UseSurveySessionOptions {
  /** Start the response on mount. Defaults to true. */
  autoStart?: boolean;
  callbacks?: SurveySessionCallbacks;
  /**
   * Where answers go. Defaults to the Reflet API inside `RefletProvider`,
   * otherwise to `previewTransport`, which saves nothing.
   */
  transport?: SurveyTransport;
}

const startedSessions = new WeakSet<SurveySession>();

/** Subscribes a component to an existing session. */
export function useSessionHandle(session: SurveySession): SurveySessionHandle {
  const snapshot = useSyncExternalStore(
    session.subscribe,
    session.getSnapshot,
    session.getSnapshot
  );
  return useMemo(
    () => ({
      back: () => session.back(),
      dismiss: () => session.dismiss(),
      next: () => session.next(),
      setAnswer: (value: AnswerValue | undefined) => session.setAnswer(value),
      snapshot,
      start: () => session.start(),
      survey: session.survey,
    }),
    [session, snapshot]
  );
}

/**
 * Headless survey runner for custom UIs. A new session begins whenever
 * `survey` or `transport` changes identity, so memoize them.
 */
export function useSurveySession(
  survey: PublicSurvey,
  options: UseSurveySessionOptions = {}
): SurveySessionHandle {
  const { autoStart = true, callbacks, transport } = options;
  const client = useContext(RefletContext)?.client;
  const callbacksRef = useRef(callbacks);

  useEffect(() => {
    callbacksRef.current = callbacks;
  });

  const resolvedTransport = useMemo(() => {
    if (transport) {
      return transport;
    }
    return client ? createRefletSurveyTransport(client) : previewTransport;
  }, [client, transport]);

  const session = useMemo(
    () =>
      new SurveySession({
        callbacks: {
          onAnswer: (event) => callbacksRef.current?.onAnswer?.(event),
          onComplete: (event) => callbacksRef.current?.onComplete?.(event),
          onDismiss: (event) => callbacksRef.current?.onDismiss?.(event),
          onStart: (event) => callbacksRef.current?.onStart?.(event),
        },
        survey,
        transport: resolvedTransport,
      }),
    [survey, resolvedTransport]
  );

  useEffect(() => {
    if (!autoStart || startedSessions.has(session)) {
      return;
    }
    startedSessions.add(session);
    session.start();
  }, [autoStart, session]);

  return useSessionHandle(session);
}
