import type { SessionEvent } from "../../protocol";

const FLUSH_INTERVAL_MS = 5000;
const NOTE_WAIT_MS = 60_000;

type MarkEvent = Extract<SessionEvent, { kind: "mark" }>;

export interface EventBatcher {
  add: (event: SessionEvent) => void;
  annotate: (key: string, note: string | null) => void;
  flush: () => void;
  flushAll: () => void;
  hold: (key: string, event: MarkEvent) => void;
  stop: () => void;
}

interface EventBatcherOptions {
  maxBatchEvents: number;
  onBatch: (events: SessionEvent[]) => void;
}

/** A mark waits for its note so it is sent once, complete. */
class TimedEventBatcher implements EventBatcher {
  private buffered: SessionEvent[] = [];
  private readonly held = new Map<
    string,
    { event: MarkEvent; timer: number }
  >();
  private readonly interval: number;
  private readonly options: EventBatcherOptions;

  constructor(options: EventBatcherOptions) {
    this.options = options;
    this.interval = window.setInterval(this.flush, FLUSH_INTERVAL_MS);
  }

  add = (event: SessionEvent): void => {
    this.buffered.push(event);
    if (this.buffered.length >= this.options.maxBatchEvents) {
      this.flush();
    }
  };

  annotate = (key: string, note: string | null): void => {
    const entry = this.held.get(key);
    if (!entry) {
      return;
    }
    this.held.delete(key);
    window.clearTimeout(entry.timer);
    this.add({ ...entry.event, note });
  };

  flush = (): void => {
    if (this.buffered.length === 0) {
      return;
    }
    const batch = this.buffered;
    this.buffered = [];
    this.options.onBatch(batch);
  };

  flushAll = (): void => {
    this.releaseAll();
    this.flush();
  };

  hold = (key: string, event: MarkEvent): void => {
    this.releaseAll();
    const timer = window.setTimeout(
      () => this.annotate(key, null),
      NOTE_WAIT_MS
    );
    this.held.set(key, { event, timer });
  };

  stop = (): void => {
    window.clearInterval(this.interval);
    for (const entry of this.held.values()) {
      window.clearTimeout(entry.timer);
    }
    this.held.clear();
  };

  private releaseAll(): void {
    for (const key of [...this.held.keys()]) {
      this.annotate(key, null);
    }
  }
}

export function createEventBatcher(options: EventBatcherOptions): EventBatcher {
  return new TimedEventBatcher(options);
}
