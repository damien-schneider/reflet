import { Alert, AlertDescription } from "@ctrl-ui/react/ui/alert";
import { Badge } from "@ctrl-ui/react/ui/badge";
import { Heading, Text } from "@ctrl-ui/react/ui/typography";
import type { ReactNode } from "react";
import { AppsSection } from "./activity/apps-section";
import { PassagesSection } from "./activity/passages-section";
import {
  type ConnectionsState,
  useHubConnections,
} from "./hub-link/use-hub-connections";
import { type HubStream, useHubStream } from "./hub-link/use-hub-stream";
import { LiveNotices } from "./live-notices";
import { IdleStateReport, LiveRecorder } from "./recorder/live-recorder";

function WindowFrame({
  agentFollowing,
  children,
}: {
  agentFollowing: boolean | null;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 p-6">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <Heading level={1} size="heading-3">
          Reflet Live
        </Heading>
        {agentFollowing === true && (
          <Badge color="green">Agent following</Badge>
        )}
        {agentFollowing === false && (
          <Text size="caption" tone="muted">
            No agent following: run /reflet-live in your coding agent
          </Text>
        )}
      </header>
      {children}
      <LiveNotices />
    </main>
  );
}

function ConnectionSection({
  connections,
  onSelect,
  stream,
}: {
  connections: ConnectionsState;
  onSelect: (id: string) => void;
  stream: HubStream;
}) {
  if (connections.kind === "ready") {
    return (
      <LiveRecorder
        activity={stream.activity}
        commands={stream.commands}
        connections={connections.connections}
        epoch={stream.epoch}
        key={connections.selectedId}
        onSelect={onSelect}
        selectedId={connections.selectedId}
      />
    );
  }
  return (
    <>
      <IdleStateReport epoch={stream.epoch} />
      {connections.kind === "empty" && (
        <Text tone="muted">
          Connect Reflet from any app's devtools panel (footer → Connect), then
          come back here.
        </Text>
      )}
      {connections.kind === "failed" && (
        <Text tone="destructive">{connections.message}</Text>
      )}
      {connections.kind === "loading" && stream.link !== "lost" && (
        <Text tone="muted">Connecting to Reflet Live…</Text>
      )}
    </>
  );
}

export function LiveWindow() {
  const stream = useHubStream();
  const { select, state } = useHubConnections(stream.epoch);

  if (stream.link === "elsewhere") {
    return (
      <WindowFrame agentFollowing={null}>
        <Text tone="muted">
          Reflet Live is open in another window: use that one and close this
          tab.
        </Text>
      </WindowFrame>
    );
  }
  return (
    <WindowFrame agentFollowing={stream.activity.agentFollowing}>
      {stream.link === "lost" && (
        <Alert role="status" variant="destructive">
          <AlertDescription>
            Reflet Live stopped in the terminal: run npx reflet-cli live again.
          </AlertDescription>
        </Alert>
      )}
      <ConnectionSection
        connections={state}
        onSelect={select}
        stream={stream}
      />
      <AppsSection activity={stream.activity} />
      <PassagesSection activity={stream.activity} />
    </WindowFrame>
  );
}
