import { type ReactNode, useCallback, useState } from "react";
import { AccountFooter } from "../../devtools/client/account/account-footer";
import {
  DevtoolsBar,
  DevtoolsBarButtons,
  SessionsBarButton,
  type SheetTab,
} from "../../devtools/client/devtools-bar";
import { DevtoolsSheet } from "../../devtools/client/devtools-sheet";
import { usePageHighlight } from "../../devtools/client/find-on-page";
import { InboxPanel } from "../../devtools/client/inbox/inbox-panel";
import { NotePicker } from "../../devtools/client/notes/note-picker";
import {
  unsentNoteCount,
  useNotes,
} from "../../devtools/client/notes/note-store";
import { NotesPanel } from "../../devtools/client/notes/notes-panel";
import { reportFailure } from "../../devtools/client/notices";
import { NotePins } from "../../devtools/client/pins/note-pins";
import type { BoardCall } from "../../devtools/client/route/dev-route";
import {
  FIRST_SHEET_TAB,
  useSheetTab,
} from "../../devtools/client/use-sheet-tab";
import { SelectionOutline } from "../../feedback/ui/selection-outline";
import type { SessionTransport } from "../api/session-api";
import { purgeAccount } from "../local/local-sessions";
import { RecordingLayer } from "../ui/recording/recording-layer";
import {
  SessionWorkspaceProvider,
  useWorkspaceLoader,
  type WorkspaceState,
} from "../ui/session-workspace";
import {
  type SessionNavigation,
  SessionsPanel,
  sessionSheetPlace,
  useSessionNavigation,
} from "../ui/sessions-panel";

const TEAM_TOOLS_LABEL = "Reflet team tools";
export const REFUSED_SIGN_IN_COPY =
  "Reflet no longer accepts this sign-in. Sign in again to record.";
const SESSIONS_TABS: SheetTab[] = ["sessions"];
const BOARD_TABS: SheetTab[] = ["inbox", "notes", "sessions"];

export interface TeamPlacement {
  edge: "bottom" | "top";
  side: "left" | "right";
}

export interface SignedInTeam {
  /** Null where the credential only reaches sessions, like a browser's team token. */
  boardCall: BoardCall | null;
  onSignOut: (reason: string | null) => void;
  organizationName: string;
  transport: SessionTransport;
}

interface TeamAccount {
  onSignOut: () => void;
  organizationName: string;
  state: WorkspaceState;
}

function SessionsBody({
  navigation,
  onStarted,
  onWriteNote,
  state,
}: {
  navigation: SessionNavigation;
  onStarted: () => void;
  onWriteNote?: () => void;
  state: WorkspaceState;
}) {
  if (state.kind === "ready") {
    return (
      <SessionsPanel
        navigation={navigation}
        onStarted={onStarted}
        onWriteNote={onWriteNote}
      />
    );
  }
  if (state.kind === "failed") {
    return (
      <div className="dt-empty" role="alert">
        <p>Sessions did not open: {state.message}</p>
        <button className="dt-btn" onClick={state.retry} type="button">
          Try again
        </button>
      </div>
    );
  }
  return <p className="dt-status">Opening your sessions…</p>;
}

function TeamSheet({
  account,
  children,
  navigation,
  onClose,
  onSelectTab,
  side,
  tab,
  tabs,
}: {
  account: TeamAccount;
  children: ReactNode;
  navigation: SessionNavigation;
  onClose: () => void;
  onSelectTab: (tab: SheetTab) => void;
  side: TeamPlacement["side"];
  tab: SheetTab;
  tabs: SheetTab[];
}) {
  const { state } = account;
  const place =
    tab === "sessions" && state.kind === "ready"
      ? sessionSheetPlace(navigation)
      : null;
  return (
    <DevtoolsSheet
      footer={
        place === null && (
          <AccountFooter
            actions={[{ label: "Sign out", onSelect: account.onSignOut }]}
            organizationName={account.organizationName}
            person={
              state.kind === "ready" ? state.workspace.identity.user : null
            }
          />
        )
      }
      label={TEAM_TOOLS_LABEL}
      navigation={{ onSelectTab, place, tab, tabs }}
      onClose={onClose}
      side={side}
    >
      {children}
    </DevtoolsSheet>
  );
}

function TeamBar({
  children,
  organizationName,
  placement,
}: {
  children: ReactNode;
  organizationName: string;
  placement: TeamPlacement;
}) {
  return (
    <DevtoolsBar
      edge={placement.edge}
      label={`${TEAM_TOOLS_LABEL} · ${organizationName}`}
      side={placement.side}
    >
      {children}
    </DevtoolsBar>
  );
}

function useTeamWorkspace(team: SignedInTeam) {
  const { onSignOut } = team;
  const state = useWorkspaceLoader({
    onUnauthorized: () => onSignOut(REFUSED_SIGN_IN_COPY),
    surface: "app",
    transport: team.transport,
  });
  const workspace = state.kind === "ready" ? state.workspace : null;

  const signOut = async () => {
    if (workspace) {
      await purgeAccount(workspace.account.key).catch((error: unknown) =>
        reportFailure("This device's session data was not removed", error)
      );
    }
    onSignOut(null);
  };

  const account: TeamAccount = {
    onSignOut: signOut,
    organizationName: team.organizationName,
    state,
  };
  return { account, workspace };
}

function SessionsTeamTools({
  placement,
  team,
}: {
  placement: TeamPlacement;
  team: SignedInTeam;
}) {
  const { account, workspace } = useTeamWorkspace(team);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const navigation = useSessionNavigation();
  const closeSheet = () => setIsSheetOpen(false);

  return (
    <SessionWorkspaceProvider workspace={workspace}>
      {isSheetOpen && (
        <TeamSheet
          account={account}
          navigation={navigation}
          onClose={closeSheet}
          onSelectTab={() => undefined}
          side={placement.side}
          tab="sessions"
          tabs={SESSIONS_TABS}
        >
          <SessionsBody
            navigation={navigation}
            onStarted={closeSheet}
            state={account.state}
          />
        </TeamSheet>
      )}
      <TeamBar organizationName={team.organizationName} placement={placement}>
        <SessionsBarButton onOpen={() => setIsSheetOpen(true)} />
      </TeamBar>
      {workspace && (
        <RecordingLayer
          onFinished={(target) => {
            navigation.go({ target, view: "review" });
            setIsSheetOpen(true);
          }}
        />
      )}
    </SessionWorkspaceProvider>
  );
}

/** The devtools panel minus what needs the source code: no Code tab, no source lookup. */
function BoardTeamTools({
  boardCall,
  placement,
  team,
}: {
  boardCall: BoardCall;
  placement: TeamPlacement;
  team: SignedInTeam;
}) {
  const { account, workspace } = useTeamWorkspace(team);
  const sheet = useSheetTab();
  const { openTab } = sheet;
  const navigation = useSessionNavigation();
  const notes = useNotes();
  const { clearHighlight, highlighted, showSelector } = usePageHighlight();
  const [isPicking, setIsPicking] = useState(false);
  const startPick = useCallback(() => setIsPicking(true), []);
  const stopPick = useCallback(() => setIsPicking(false), []);

  const closeSheet = () => {
    sheet.close();
    clearHighlight();
  };
  const openPanel = (tab: SheetTab | null) =>
    sheet.select(
      tab ??
        (BOARD_TABS.includes(sheet.lastTab) ? sheet.lastTab : FIRST_SHEET_TAB)
    );
  const writeNoteFromSession = () => {
    closeSheet();
    startPick();
  };

  return (
    <SessionWorkspaceProvider workspace={workspace}>
      <div className="dt" data-recessed={isPicking}>
        <NotePins isVisible={!isPicking} notes={notes} />
        {openTab && (
          <TeamSheet
            account={account}
            navigation={navigation}
            onClose={closeSheet}
            onSelectTab={sheet.select}
            side={placement.side}
            tab={openTab}
            tabs={BOARD_TABS}
          >
            {openTab === "inbox" && (
              <InboxPanel boardCall={boardCall} onShowSelector={showSelector} />
            )}
            {openTab === "notes" && (
              <NotesPanel
                boardCall={boardCall}
                notes={notes}
                onPick={startPick}
                onShowSelector={showSelector}
                sendBlockedReason={null}
              />
            )}
            {openTab === "sessions" && (
              <SessionsBody
                navigation={navigation}
                onStarted={closeSheet}
                onWriteNote={writeNoteFromSession}
                state={account.state}
              />
            )}
          </TeamSheet>
        )}
        <TeamBar organizationName={team.organizationName} placement={placement}>
          <DevtoolsBarButtons
            canOpenCode={false}
            onOpen={openPanel}
            onPick={startPick}
            unsentNoteCount={unsentNoteCount(notes)}
          />
        </TeamBar>
        {openTab && <SelectionOutline node={highlighted} />}
        {workspace && (
          <RecordingLayer
            onFinished={(target) => {
              navigation.go({ target, view: "review" });
              sheet.select("sessions");
            }}
          />
        )}
        {isPicking && <NotePicker canReadSource={false} onDone={stopPick} />}
      </div>
    </SessionWorkspaceProvider>
  );
}

export function TeamTools({
  placement,
  team,
}: {
  placement: TeamPlacement;
  team: SignedInTeam;
}) {
  return team.boardCall ? (
    <BoardTeamTools
      boardCall={team.boardCall}
      placement={placement}
      team={team}
    />
  ) : (
    <SessionsTeamTools placement={placement} team={team} />
  );
}
