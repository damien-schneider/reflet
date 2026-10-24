import type { CodeTarget } from "../code/use-code-lookup";
import { InboxPanel } from "../inbox/inbox-panel";
import { callReflet } from "../route/dev-route";
import { MISSING_SECRET_KEY_HINT, MissingRouteHint } from "../route/route-hint";
import type { DevRouteState } from "../route/use-dev-route";

export function BoardTab({
  canConnect,
  onOpenCode,
  onShowSelector,
  route,
}: {
  canConnect: boolean;
  onOpenCode: (target: CodeTarget) => void;
  onShowSelector: (selector: string) => boolean;
  route: DevRouteState;
}) {
  if (route.kind === "missing") {
    return (
      <MissingRouteHint purpose="see your board's feedback for this page" />
    );
  }
  if (route.kind === "checking") {
    return null;
  }
  if (route.status.board.kind === "disconnected") {
    return (
      <p className="dt-empty">
        {canConnect
          ? "Connect to Reflet below to see this page's feedback and add notes to your board."
          : MISSING_SECRET_KEY_HINT}
      </p>
    );
  }
  return (
    <InboxPanel
      boardCall={callReflet}
      onOpenCode={onOpenCode}
      onShowSelector={onShowSelector}
    />
  );
}
