import { type ReactNode, useState } from "react";
import {
  dismissNotice,
  type Notice,
  useNotices,
} from "../../../devtools/client/notices";
import type {
  RecorderSnapshot,
  SessionRecorder,
} from "../../../sessions/recorder/session-recorder";
import type { HubActivity } from "../hub-link/use-hub-stream";
import { DialFrame } from "./dial/dial-frame";
import { DialNotice } from "./dial/dial-notice";
import { LiveLegend } from "./dial-news";
import {
  HomePage,
  type OrganizationChoice,
  OrganizationPage,
  type RecorderActions,
  SessionPage,
  selectedOrganizationName,
} from "./dial-pages";
import { BusyHub, IdleHub, RecorderHub } from "./hub-readout";

function isInSession({ phase }: RecorderSnapshot): boolean {
  return phase === "recording" || phase === "paused" || phase === "finishing";
}

function FailureNotice({ notice }: { notice: Notice }) {
  const { action } = notice;
  const dismiss = () => dismissNotice(notice.id);
  const retry = action && {
    label: action.label,
    onClick: () => {
      dismiss();
      action.run();
    },
  };
  return (
    <DialNotice
      actions={
        retry
          ? [retry, { label: "Dismiss", onClick: dismiss }]
          : [{ label: "Dismiss", onClick: dismiss }]
      }
      description={notice.message}
      isFailure
    />
  );
}

function RecorderPage({
  choice,
  onCommand,
  onRecord,
  snapshot,
}: RecorderActions & {
  choice: OrganizationChoice;
  snapshot: RecorderSnapshot;
}) {
  const [isChoosing, setIsChoosing] = useState(false);
  if (isInSession(snapshot)) {
    return <SessionPage onCommand={onCommand} snapshot={snapshot} />;
  }
  if (isChoosing) {
    return <OrganizationPage {...choice} onBack={() => setIsChoosing(false)} />;
  }
  return (
    <HomePage
      isStarting={snapshot.phase === "requesting"}
      onOrganizations={() => setIsChoosing(true)}
      onRecord={onRecord}
      organizationName={selectedOrganizationName(choice)}
    />
  );
}

export function RecorderDial({
  activity,
  choice,
  isLinkLost,
  recorder,
  snapshot,
  ...actions
}: RecorderActions & {
  activity: HubActivity;
  choice: OrganizationChoice;
  isLinkLost: boolean;
  recorder: SessionRecorder;
  snapshot: RecorderSnapshot;
}) {
  const failure = useNotices()
    .filter((notice) => notice.kind === "failure")
    .at(-1);
  return (
    <DialFrame
      hub={<RecorderHub recorder={recorder} snapshot={snapshot} />}
      legend={
        <LiveLegend
          activity={activity}
          isLinkLost={isLinkLost}
          snapshot={snapshot}
        />
      }
      notice={failure && <FailureNotice notice={failure} />}
    >
      <RecorderPage {...actions} choice={choice} snapshot={snapshot} />
    </DialFrame>
  );
}

export function WaitingDial({
  activity,
  busyLabel = null,
  children,
  isLinkLost,
  notice,
}: {
  activity: HubActivity | null;
  busyLabel?: string | null;
  children?: ReactNode;
  isLinkLost: boolean;
  notice?: ReactNode;
}) {
  return (
    <DialFrame
      hub={busyLabel ? <BusyHub label={busyLabel} /> : <IdleHub />}
      legend={
        activity && <LiveLegend activity={activity} isLinkLost={isLinkLost} />
      }
      notice={notice}
    >
      {children}
    </DialFrame>
  );
}
