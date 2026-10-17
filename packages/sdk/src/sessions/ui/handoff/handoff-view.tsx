import { useEffect, useState } from "react";
import { copyToClipboard } from "../../../devtools/client/clipboard";
import { announce } from "../../../devtools/client/notices";
import type { SessionDetail, SessionHandoff } from "../../protocol";
import type { ReviewHandle } from "../review/use-session-detail";
import {
  failureMessage,
  isUnauthorized,
  useSessionAction,
  useSessionWorkspace,
} from "../session-workspace";
import { buildBriefZip, saveBlob, zipFileName } from "./brief-export";
import { ChangedSinceBriefs, EarlierBriefs } from "./handoff-changes";
import {
  HandoffChoices,
  type HandoffSelection,
  initialSelection,
} from "./handoff-selection";

interface BriefRequest {
  clientKey: string;
  selection: HandoffSelection;
  sessionId: string;
}

type PreviewState =
  | { kind: "loading" }
  | { kind: "failed"; message: string }
  | { brief: string; kind: "ready" };

function useBriefPreview({ selection, sessionId }: BriefRequest): PreviewState {
  const { api, onUnauthorized } = useSessionWorkspace();
  const [state, setState] = useState<PreviewState>({ kind: "loading" });

  useEffect(() => {
    if (selection.proposalIds.length === 0) {
      return;
    }
    let isCurrent = true;
    api.previewBrief({ sessionId, ...selection }).then(
      (brief) => isCurrent && setState({ brief, kind: "ready" }),
      (error: unknown) => {
        if (isUnauthorized(error)) {
          onUnauthorized();
        } else if (isCurrent) {
          setState({ kind: "failed", message: failureMessage(error) });
        }
      }
    );
    return () => {
      isCurrent = false;
    };
  }, [api, onUnauthorized, selection, sessionId]);

  return state;
}

function useDelivery(options: {
  request: BriefRequest;
  review: ReviewHandle;
  title: string;
}) {
  const { api } = useSessionWorkspace();
  const run = useSessionAction();
  const { clientKey, selection, sessionId } = options.request;
  const recordHandoff = () =>
    api.createHandoff({ clientKey, sessionId, ...selection });

  const deliver = async (
    kind: "copied" | "exported",
    send: () => Promise<SessionHandoff>
  ) => {
    const handoff = await run(`The brief was not ${kind}`, send);
    if (!handoff) {
      return;
    }
    announce(kind === "copied" ? "Brief copied" : "Brief downloaded");
    await run("The delivery was not recorded", () =>
      api.markHandoffDelivered({ handoffId: handoff.id, kind })
    );
    options.review.reload();
  };

  return {
    copy: () =>
      deliver("copied", async () => {
        const recorded = recordHandoff();
        await copyToClipboard(recorded.then(({ handoff }) => handoff.brief));
        return (await recorded).handoff;
      }),
    exportZip: () =>
      deliver("exported", async () => {
        const { files, handoff } = await recordHandoff();
        const blob = await buildBriefZip({ brief: handoff.brief, files });
        saveBlob({ blob, fileName: zipFileName(options.title) });
        return handoff;
      }),
  };
}

function BriefPreview({
  hasIntention,
  preview,
}: {
  hasIntention: boolean;
  preview: PreviewState;
}) {
  if (!hasIntention) {
    return <p className="dt-hint">Tick an intention to brief your agent.</p>;
  }
  if (preview.kind === "failed") {
    return (
      <p className="dt-error">
        The brief could not be shown: {preview.message}
      </p>
    );
  }
  return (
    <textarea
      aria-busy={preview.kind === "loading"}
      aria-label="Brief"
      className="dt-field dt-ses-brief"
      readOnly
      rows={12}
      value={preview.kind === "ready" ? preview.brief : ""}
    />
  );
}

export function HandoffView({
  detail,
  review,
}: {
  detail: SessionDetail;
  review: ReviewHandle;
}) {
  const [request, setRequest] = useState<BriefRequest>(() => ({
    clientKey: crypto.randomUUID(),
    selection: initialSelection(detail),
    sessionId: detail.session.id,
  }));
  const preview = useBriefPreview(request);
  const { copy, exportZip } = useDelivery({
    request,
    review,
    title: detail.session.title,
  });
  const hasIntention = request.selection.proposalIds.length > 0;
  const select = (selection: HandoffSelection) =>
    setRequest({ ...request, clientKey: crypto.randomUUID(), selection });

  return (
    <section aria-labelledby="rf-handoff-title" className="dt-ses-handoff">
      <h2 className="dt-ses-title" id="rf-handoff-title" tabIndex={-1}>
        Brief for your agent
      </h2>
      <BriefPreview hasIntention={hasIntention} preview={preview} />
      <div className="dt-actions">
        <button
          className="dt-btn"
          data-variant="primary"
          disabled={!hasIntention}
          onClick={copy}
          type="button"
        >
          Copy brief
        </button>
        <button
          className="dt-btn"
          disabled={!hasIntention}
          onClick={exportZip}
          type="button"
        >
          Download .zip
        </button>
      </div>
      <p className="dt-hint">
        Nothing leaves Reflet until you copy or download the brief.
      </p>
      <HandoffChoices
        detail={detail}
        onChange={select}
        selection={request.selection}
      />
      <ChangedSinceBriefs
        detail={detail}
        proposalIds={request.selection.proposalIds}
      />
      <EarlierBriefs handoffs={detail.handoffs} />
    </section>
  );
}
