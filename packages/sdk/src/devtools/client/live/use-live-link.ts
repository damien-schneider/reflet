import {
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  LIVE_FRAME_PATH_MAX,
  LIVE_FRAME_TITLE_MAX,
  LIVE_STATUS_OFF,
  type LiveCommand,
  type LiveStatus,
} from "../../../live/protocol";
import { startNavigationWatch } from "../../../sessions/capture/page/navigation-watch";
import { newLocalId } from "../local-id";
import {
  type LiveCaptureKind,
  type LiveLink,
  type LiveLinkSession,
  startLiveLink,
} from "./live-link";
import { postPresence, sendLiveCommand } from "./live-route";

const PRESENCE_INTERVAL_MS = 5000;

export interface LiveLinkControls {
  command: (action: LiveCommand) => Promise<void>;
  select: (element: Element, note: string | null) => Promise<void>;
  status: LiveStatus;
}

function keepSession(previous: LiveStatus, next: LiveStatus): LiveStatus {
  return previous.session && next.session?.id === previous.session.id
    ? { ...next, session: previous.session }
    : next;
}

function useLinkWhileRecording(
  session: LiveLinkSession | null
): RefObject<LiveLink | null> {
  const linkRef = useRef<LiveLink | null>(null);
  const stoppedKinds = useRef<{
    kinds: Set<LiveCaptureKind>;
    sessionId: string;
  } | null>(null);

  useEffect(() => {
    if (!session) {
      return;
    }
    if (stoppedKinds.current?.sessionId !== session.id) {
      stoppedKinds.current = { kinds: new Set(), sessionId: session.id };
    }
    const link = startLiveLink(session, stoppedKinds.current.kinds);
    linkRef.current = link;
    return () => {
      link.stop();
      linkRef.current = null;
    };
  }, [session]);

  return linkRef;
}

export function useLiveLink(isRouteReady: boolean): LiveLinkControls {
  const [reported, setReported] = useState<LiveStatus>(LIVE_STATUS_OFF);
  const [clientId] = useState(newLocalId);
  const latestCall = useRef(0);
  const status = isRouteReady ? reported : LIVE_STATUS_OFF;
  const linkRef = useLinkWhileRecording(
    status.state === "recording" ? status.session : null
  );

  const apply = useCallback((call: number, next: LiveStatus) => {
    if (call === latestCall.current) {
      setReported((previous) => keepSession(previous, next));
    }
  }, []);

  useEffect(() => {
    if (!isRouteReady) {
      return;
    }
    const report = () => {
      latestCall.current += 1;
      const call = latestCall.current;
      postPresence({
        at: Date.now(),
        clientId,
        focused: document.hasFocus(),
        frame: {
          path: window.location.pathname.slice(0, LIVE_FRAME_PATH_MAX),
          title: document.title.slice(0, LIVE_FRAME_TITLE_MAX) || null,
        },
      })
        .catch(() => LIVE_STATUS_OFF)
        .then((next) => apply(call, next));
    };

    report();
    const listening = new AbortController();
    const listen = { signal: listening.signal };
    window.addEventListener("focus", report, listen);
    window.addEventListener("blur", report, listen);
    document.addEventListener("visibilitychange", report, listen);
    const heartbeat = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        report();
      }
    }, PRESENCE_INTERVAL_MS);
    const navigation = startNavigationWatch({ onNavigate: report });
    return () => {
      latestCall.current += 1;
      listening.abort();
      navigation.stop();
      window.clearInterval(heartbeat);
    };
  }, [apply, clientId, isRouteReady]);

  const command = useCallback(
    async (action: LiveCommand) => {
      const next = await sendLiveCommand(action);
      latestCall.current += 1;
      apply(latestCall.current, next);
    },
    [apply]
  );

  const select = useCallback(
    async (element: Element, note: string | null) => {
      const link = linkRef.current;
      if (!link) {
        throw new Error("Reflet Live is not recording.");
      }
      await link.select(element, note);
    },
    [linkRef]
  );

  return { command, select, status };
}
