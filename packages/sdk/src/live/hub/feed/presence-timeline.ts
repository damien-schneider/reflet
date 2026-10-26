import type { LiveApp, LiveFrame, LivePresence } from "../../protocol";
import type { FocusTransition } from "./attribution";

const STALE_PRESENCE_MS = 15_000;

interface FocusHolder {
  app: LiveApp;
  clientId: string;
  frame: LiveFrame;
  lastSeenAt: number;
}

export class PresenceTimeline {
  #holder: FocusHolder | null = null;
  #transitions: FocusTransition[] = [];

  report(app: LiveApp, presence: LivePresence): void {
    this.#expire(presence.at);
    const holder = this.#holder;
    const isHolder = holder?.clientId === presence.clientId;
    if (presence.focused) {
      this.#holder = {
        app,
        clientId: presence.clientId,
        frame: presence.frame,
        lastSeenAt: presence.at,
      };
      const isSameFrame =
        isHolder &&
        holder.frame.path === presence.frame.path &&
        holder.frame.title === presence.frame.title;
      if (!isSameFrame) {
        this.#push({ app, atMs: presence.at, frame: presence.frame });
      }
    } else if (isHolder) {
      this.#holder = null;
      this.#push({ app: null, atMs: presence.at, frame: null });
    }
  }

  focus(now: number): { app: LiveApp; frame: LiveFrame } | null {
    this.#expire(now);
    const holder = this.#holder;
    return holder ? { app: holder.app, frame: holder.frame } : null;
  }

  since(startedAt: number, now: number): FocusTransition[] {
    this.#expire(now);
    return this.#transitions
      .slice(this.#openingIndex(startedAt))
      .map((transition) => ({
        ...transition,
        atMs: Math.max(transition.atMs - startedAt, 0),
      }));
  }

  forgetBefore(startedAt: number): void {
    this.#transitions = this.#transitions.slice(this.#openingIndex(startedAt));
  }

  #openingIndex(startedAt: number): number {
    const firstAfter = this.#transitions.findIndex(
      (transition) => transition.atMs > startedAt
    );
    const lastAtOrBefore =
      (firstAfter === -1 ? this.#transitions.length : firstAfter) - 1;
    return Math.max(lastAtOrBefore, 0);
  }

  #expire(now: number): void {
    const holder = this.#holder;
    if (holder && now - holder.lastSeenAt > STALE_PRESENCE_MS) {
      this.#holder = null;
      this.#push({ app: null, atMs: holder.lastSeenAt, frame: null });
    }
  }

  #push(transition: FocusTransition): void {
    const last = this.#transitions.at(-1);
    this.#transitions.push({
      ...transition,
      atMs: Math.max(transition.atMs, last?.atMs ?? transition.atMs),
    });
  }
}
