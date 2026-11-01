import { cn } from "@ctrl-ui/react/lib/cn";
import { Text } from "@ctrl-ui/react/ui/typography";
import { type ReactNode, useEffect, useMemo } from "react";
import { ArrowLeftIcon, CloseIcon } from "../../../feedback/ui/icons";
import type { RecorderSnapshot } from "../../../sessions/recorder/session-recorder";
import { PauseIcon, PlayIcon } from "../../../sessions/ui/session-icons";
import type { LiveCommand } from "../../protocol";
import type { LiveConnection } from "../hub-link/use-hub-connections";
import { closeWindow } from "../window-host";
import {
  DIAL_READOUT,
  type DialLayout,
  dialLayout,
} from "./dial/dial-geometry";
import { DialSegment } from "./dial/dial-segment";
import { DialTracks } from "./dial/dial-tracks";

export interface RecorderActions {
  onCommand: (action: LiveCommand) => void;
  onRecord: () => void;
}

export interface OrganizationChoice {
  connections: LiveConnection[];
  onSelect: (id: string) => void;
  selectedId: string;
}

export function selectedOrganizationName({
  connections,
  selectedId,
}: OrganizationChoice): string {
  return (
    connections.find((connection) => connection.id === selectedId)
      ?.organizationName ?? ""
  );
}

const HOME_LAYOUT = dialLayout([["record"], ["organization", "close"]]);
const SESSION_LAYOUT = dialLayout([["stop"], ["pause"]]);
const BACK_SLOT = "back";

function RecordGlyph({ shape }: { shape: "record" | "stop" }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "shrink-0 bg-destructive shadow-[0_0_10px_oklch(from_var(--destructive)_l_c_h_/_0.45)]",
        shape === "record" ? "size-4 rounded-full" : "size-3 rounded-xs"
      )}
    />
  );
}

function DialPage({
  caption = "Reflet Live",
  children,
  outline,
}: {
  caption?: string;
  children: ReactNode;
  outline: Pick<DialLayout<string>, "dividers" | "tracks">;
}) {
  return (
    <div className="live-dial-page absolute inset-0 rounded-full">
      <span
        className="live-dial-caption pointer-events-none absolute flex items-center justify-center"
        style={DIAL_READOUT}
      >
        <span className="live-dial-chip flex h-full items-center rounded-full px-2.5">
          <Text as="span" size="label" weight="medium">
            {caption}
          </Text>
        </span>
      </span>
      <DialTracks dividers={outline.dividers} tracks={outline.tracks} />
      {children}
    </div>
  );
}

export function HomePage({
  isStarting,
  onOrganizations,
  onRecord,
  organizationName,
}: {
  isStarting: boolean;
  onOrganizations: () => void;
  onRecord: () => void;
  organizationName: string;
}) {
  return (
    <DialPage outline={HOME_LAYOUT}>
      <DialSegment
        aria-label="Record"
        disabled={isStarting}
        onClick={onRecord}
        place={HOME_LAYOUT.slot("record")}
      >
        <RecordGlyph shape="record" />
      </DialSegment>
      <DialSegment
        aria-label={`Organization: ${organizationName}`}
        label={organizationName}
        onClick={onOrganizations}
        place={HOME_LAYOUT.slot("organization")}
        readout="Switch organization"
      />
      <DialSegment
        aria-label="Close"
        onClick={closeWindow}
        place={HOME_LAYOUT.slot("close")}
        tone="danger"
      >
        <CloseIcon />
      </DialSegment>
    </DialPage>
  );
}

export function OrganizationPage({
  connections,
  onBack,
  onSelect,
  selectedId,
}: OrganizationChoice & { onBack: () => void }) {
  const layout = useMemo(
    () =>
      dialLayout([
        [...connections.map((connection) => `org:${connection.id}`), BACK_SLOT],
      ]),
    [connections]
  );

  useEffect(() => {
    const backOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onBack();
      }
    };
    window.addEventListener("keydown", backOnEscape);
    return () => window.removeEventListener("keydown", backOnEscape);
  }, [onBack]);

  return (
    <DialPage caption="Record into" outline={layout}>
      {connections.map((connection) => (
        <DialSegment
          active={connection.id === selectedId}
          aria-label={connection.organizationName}
          aria-pressed={connection.id === selectedId}
          key={connection.id}
          label={connection.organizationName}
          onClick={() => {
            onSelect(connection.id);
            onBack();
          }}
          place={layout.slot(`org:${connection.id}`)}
        />
      ))}
      <DialSegment
        aria-label="Back"
        autoFocus
        onClick={onBack}
        place={layout.slot(BACK_SLOT)}
      >
        <ArrowLeftIcon />
      </DialSegment>
    </DialPage>
  );
}

export function SessionPage({
  onCommand,
  snapshot,
}: {
  onCommand: (action: LiveCommand) => void;
  snapshot: RecorderSnapshot;
}) {
  const { pauseReason, phase } = snapshot;
  const isFinishing = phase === "finishing";
  const isPaused = phase === "paused";
  return (
    <DialPage outline={SESSION_LAYOUT}>
      <DialSegment
        aria-label={isFinishing ? "Saving…" : "Stop"}
        disabled={isFinishing}
        onClick={() => onCommand("stop")}
        place={SESSION_LAYOUT.slot("stop")}
      >
        <RecordGlyph shape="stop" />
      </DialSegment>
      <DialSegment
        active={isPaused}
        aria-label={isPaused ? "Resume" : "Pause"}
        disabled={isFinishing || pauseReason === "limit"}
        onClick={() => onCommand(isPaused ? "resume" : "pause")}
        place={SESSION_LAYOUT.slot("pause")}
      >
        {isPaused ? <PlayIcon /> : <PauseIcon />}
      </DialSegment>
    </DialPage>
  );
}
