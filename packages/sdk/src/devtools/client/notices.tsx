import { useSyncExternalStore } from "react";
import { CloseIcon } from "../../feedback/ui/icons";

export interface NoticeAction {
  label: string;
  run: () => void;
}

export interface Notice {
  action?: NoticeAction;
  id: number;
  kind: "failure" | "status";
  message: string;
}

const STATUS_VISIBLE_MS = 2400;
const ACTION_VISIBLE_MS = 6000;

let notices: Notice[] = [];
let nextNoticeId = 1;
const listeners = new Set<() => void>();

function publish(next: Notice[]) {
  notices = next;
  for (const listener of listeners) {
    listener();
  }
}

export function dismissNotice(id: number) {
  publish(notices.filter((notice) => notice.id !== id));
}

/** Same message twice replaces the first, so a failing retry never stacks up. */
export function reportFailure(
  action: string,
  error: unknown,
  retry?: () => void
) {
  const reason = error instanceof Error ? error.message : "Unknown error.";
  const message = `${action}: ${reason}`;
  publish([
    ...notices.filter((notice) => notice.message !== message),
    {
      action: retry && { label: "Retry", run: retry },
      id: nextNoticeId++,
      kind: "failure",
      message,
    },
  ]);
}

/** An action (Undo) keeps the notice up long enough to reach it. */
export function announce(message: string, action?: NoticeAction) {
  const id = nextNoticeId++;
  publish([
    ...notices.filter((notice) => notice.message !== message),
    { action, id, kind: "status", message },
  ]);
  setTimeout(
    () => dismissNotice(id),
    action ? ACTION_VISIBLE_MS : STATUS_VISIBLE_MS
  );
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useNotices(): Notice[] {
  return useSyncExternalStore(
    subscribe,
    () => notices,
    () => notices
  );
}

export function Notices() {
  const current = useNotices();
  return (
    <div aria-live="polite" className="dt-notices">
      {current.map((notice) => (
        <div
          className="dt-notice glass"
          data-kind={notice.kind}
          key={notice.id}
          role={notice.kind === "failure" ? "alert" : undefined}
        >
          <p>{notice.message}</p>
          {notice.action && (
            <button
              className="dt-btn"
              onClick={() => {
                dismissNotice(notice.id);
                notice.action?.run();
              }}
              type="button"
            >
              {notice.action.label}
            </button>
          )}
          <button
            aria-label="Dismiss"
            className="icon-btn"
            onClick={() => dismissNotice(notice.id)}
            type="button"
          >
            <CloseIcon />
          </button>
        </div>
      ))}
    </div>
  );
}
