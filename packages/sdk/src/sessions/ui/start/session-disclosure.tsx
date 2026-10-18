import { useState } from "react";

const SEEN_KEY_PREFIX = "reflet-sessions-disclosure:";

export function hasSeenDisclosure(accountKey: string): boolean {
  try {
    return localStorage.getItem(`${SEEN_KEY_PREFIX}${accountKey}`) !== null;
  } catch {
    return false;
  }
}

export function markDisclosureSeen(accountKey: string): void {
  try {
    localStorage.setItem(`${SEEN_KEY_PREFIX}${accountKey}`, "1");
  } catch {
    // Storage blocked: the explanation simply shows again next time.
  }
}

function DisclosureList() {
  return (
    <section aria-labelledby="rf-session-disclosure" className="dt-hint">
      <h3 className="dt-ses-subhead" id="rf-session-disclosure">
        What a session records
      </h3>
      <ul className="dt-ses-list">
        <li>
          Your voice while recording. It is sent to Reflet and transcribed by
          ElevenLabs Scribe through OpenRouter with zero data retention. The
          audio is deleted as soon as its transcript is saved, within 24 hours
          at most.
        </li>
        <li>
          The page: its address without sensitive parameters, its title, the
          scroll position and the window size.
        </li>
        <li>
          What you click, point at and mark: element names and positions, never
          your keystrokes.
        </li>
        <li>
          Screenshots of this tab at the start, when you mark a moment and when
          the page changes. Form fields appear empty; password fields and
          elements marked <code>data-reflet-redact</code> are hidden. Other text
          on screen, rich-text editors included, stays visible.
        </li>
        <li>
          With each screenshot, the names and positions of the buttons, links,
          headings and images it shows, so the AI can frame the one you talk
          about. Hidden elements and anything in or around typed text are left
          out.
        </li>
        <li>Not recorded: keystrokes, other tabs or apps, network calls.</li>
        <li>Pausing stops everything.</li>
        <li>A session stays private to you until you share it.</li>
      </ul>
    </section>
  );
}

export function SessionDisclosure({ accountKey }: { accountKey: string }) {
  const [isOpen, setIsOpen] = useState(() => !hasSeenDisclosure(accountKey));
  if (isOpen) {
    return <DisclosureList />;
  }
  return (
    <button
      aria-expanded={false}
      className="dt-ses-link"
      onClick={() => setIsOpen(true)}
      type="button"
    >
      What a session records
    </button>
  );
}
