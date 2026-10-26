import { z } from "zod";
import { elementRefSchema } from "../../sessions/protocol";
import type {
  LiveApp,
  LiveCapture,
  LiveFrame,
  LiveHubFeed,
  LiveWindowMessage,
} from "../protocol";

export type SendToWindow = (message: LiveWindowMessage) => void;

const RECENT_FEED_ENTRIES = 5;

const forwardedEventsSchema = z.object({ events: z.array(z.unknown()) });
const capturedEventSchema = z.object({
  element: elementRefSchema.pick({ label: true, role: true }),
  kind: z.enum(["click", "select"]),
});

function lastCapture(appId: string, body: unknown): LiveCapture | null {
  const batch = forwardedEventsSchema.safeParse(body);
  if (!batch.success) {
    return null;
  }
  const captured = batch.data.events.flatMap((event) => {
    const parsed = capturedEventSchema.safeParse(event);
    return parsed.success ? [parsed.data] : [];
  });
  const chosen =
    captured.filter((event) => event.kind === "select").at(-1) ??
    captured.at(-1);
  if (!chosen) {
    return null;
  }
  return {
    appId,
    at: Date.now(),
    element: { label: chosen.element.label, role: chosen.element.role },
    kind: chosen.kind === "select" ? "pick" : "click",
  };
}

export class WindowChannel {
  #send: SendToWindow | null = null;
  #sentApps = "";
  #sentFeed = "";

  get isOpen(): boolean {
    return this.#send !== null;
  }

  attach(send: SendToWindow): boolean {
    if (this.#send) {
      return false;
    }
    this.#send = send;
    this.#sentApps = "";
    this.#sentFeed = "";
    return true;
  }

  detach(send: SendToWindow): boolean {
    if (this.#send !== send) {
      return false;
    }
    this.#send = null;
    return true;
  }

  close(): void {
    this.#send = null;
  }

  send(message: LiveWindowMessage): void {
    this.#send?.(message);
  }

  apps(
    apps: LiveApp[],
    focus: { app: LiveApp; frame: LiveFrame } | null
  ): void {
    this.#sentApps = this.#sendChanged(
      {
        apps,
        focus: focus ? { appId: focus.app.id, page: focus.frame } : null,
        kind: "apps",
      },
      this.#sentApps
    );
  }

  feed(feed: LiveHubFeed): void {
    this.#sentFeed = this.#sendChanged(
      {
        entries: feed.entries.slice(-RECENT_FEED_ENTRIES),
        kind: "feed",
        transcribing: feed.transcription.running,
      },
      this.#sentFeed
    );
  }

  capture(appId: string, forwardedEvents: unknown): void {
    const capture = lastCapture(appId, forwardedEvents);
    if (capture) {
      this.send({ capture, kind: "capture" });
    }
  }

  #sendChanged(message: LiveWindowMessage, sent: string): string {
    const serialized = JSON.stringify(message);
    if (!this.#send || serialized === sent) {
      return sent;
    }
    this.#send(message);
    return serialized;
  }
}
