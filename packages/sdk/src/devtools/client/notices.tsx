import { useSyncExternalStore } from "react";
import { CloseIcon } from "../../feedback/ui/icons";

export interface Notice {
  id: number;
  kind: "failure" | "status";
  message: string;
  retry?: () => void;
}

const STATUS_VISIBLE_MS = 2400;

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
    { id: nextNoticeId++, kind: "failure", message, retry },
  ]);
}

export function announce(message: string) {
  const id = nextNoticeId++;
  publish([
    ...notices.filter((notice) => notice.message !== message),
    { id, kind: "status", message },
  ]);
  setTimeout(() => dismissNotice(id), STATUS_VISIBLE_MS);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function Notices() {
  const current = useSyncExternalStore(
    subscribe,
    () => notices,
    () => notices
  );
  if (current.length === 0) {
    return null;
  }
  return (
    <div className="dt-notices">
      {current.map((notice) => (
        <div
          className="dt-notice glass"
          data-kind={notice.kind}
          key={notice.id}
          role={notice.kind === "failure" ? "alert" : "status"}
        >
          <p>{notice.message}</p>
          {notice.retry && (
            <button
              className="dt-btn"
              onClick={() => {
                dismissNotice(notice.id);
                notice.retry?.();
              }}
              type="button"
            >
              Retry
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
