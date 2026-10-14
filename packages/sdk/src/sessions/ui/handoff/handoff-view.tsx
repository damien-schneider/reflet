import { useState } from "react";
import { copyToClipboard } from "../../../devtools/client/clipboard";
import { announce, reportFailure } from "../../../devtools/client/notices";
import type {
  HandoffFile,
  SessionDetail,
  SessionHandoff,
} from "../../protocol";
import type { ReviewHandle } from "../review/use-session-detail";
import { useSessionAction, useSessionWorkspace } from "../session-workspace";
import { buildBriefZip, saveBlob, zipFileName } from "./brief-export";
import { ChangedSinceBriefs, EarlierBriefs } from "./handoff-changes";
import {
  HandoffChoices,
  type HandoffSelection,
  initialSelection,
} from "./handoff-selection";

interface PreparedHandoff {
  files: HandoffFile[];
  handoff: SessionHandoff;
}

function useDelivery(options: { prepared: PreparedHandoff; title: string }) {
  const { api } = useSessionWorkspace();
  const run = useSessionAction();
  const { files, handoff } = options.prepared;

  const deliver = async (
    kind: "copied" | "exported",
    send: () => Promise<void>
  ) => {
    try {
      await send();
    } catch (error) {
      reportFailure(`The brief was not ${kind}`, error);
      return;
    }
    announce(kind === "copied" ? "Brief copied" : "Brief downloaded");
    await run("The delivery was not recorded", () =>
      api.markHandoffDelivered({ handoffId: handoff.id, kind })
    );
  };

  return {
    copy: () =>
      deliver("copied", () => copyToClipboard(Promise.resolve(handoff.brief))),
    exportZip: () =>
      deliver("exported", async () => {
        const blob = await buildBriefZip({ brief: handoff.brief, files });
        saveBlob({ blob, fileName: zipFileName(options.title) });
      }),
  };
}

function PreparedBrief({
  onChangeSelection,
  prepared,
  title,
}: {
  onChangeSelection: () => void;
  prepared: PreparedHandoff;
  title: string;
}) {
  const { copy, exportZip } = useDelivery({ prepared, title });
  return (
    <>
      <textarea
        aria-label="Brief"
        className="dt-field dt-ses-brief"
        readOnly
        rows={12}
        value={prepared.handoff.brief}
      />
      <div className="dt-actions">
        <button
          className="dt-btn"
          data-variant="primary"
          onClick={copy}
          type="button"
        >
          Copy brief
        </button>
        <button className="dt-btn" onClick={exportZip} type="button">
          Download .zip
        </button>
        <button className="dt-btn" onClick={onChangeSelection} type="button">
          Edit selection
        </button>
      </div>
    </>
  );
}

interface PrepareHandoff {
  clear: () => void;
  isPreparing: boolean;
  prepare: () => Promise<void>;
  prepared: PreparedHandoff | null;
  select: (selection: HandoffSelection) => void;
  selection: HandoffSelection;
}

function usePrepareHandoff(options: {
  detail: SessionDetail;
  review: ReviewHandle;
}): PrepareHandoff {
  const { api } = useSessionWorkspace();
  const run = useSessionAction();
  const [request, setRequest] = useState(() => ({
    clientKey: crypto.randomUUID(),
    selection: initialSelection(options.detail),
  }));
  const [prepared, setPrepared] = useState<PreparedHandoff | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);

  const prepare = async () => {
    setIsPreparing(true);
    const result = await run("The brief was not prepared", () =>
      api.createHandoff({
        clientKey: request.clientKey,
        sessionId: options.detail.session.id,
        ...request.selection,
      })
    );
    setIsPreparing(false);
    if (result) {
      setPrepared(result);
      options.review.reload();
    }
  };
  return {
    clear: () => setPrepared(null),
    isPreparing,
    prepare,
    prepared,
    select: (selection: HandoffSelection) =>
      setRequest({ clientKey: crypto.randomUUID(), selection }),
    selection: request.selection,
  };
}

function SelectionStep({
  detail,
  handoff,
}: {
  detail: SessionDetail;
  handoff: PrepareHandoff;
}) {
  const count = handoff.selection.proposalIds.length;
  return (
    <>
      <p className="dt-hint">
        Tick what your agent should get. Nothing leaves Reflet until you copy or
        download the brief.
      </p>
      <HandoffChoices
        detail={detail}
        onChange={handoff.select}
        selection={handoff.selection}
      />
      <ChangedSinceBriefs
        detail={detail}
        proposalIds={handoff.selection.proposalIds}
      />
      <div className="dt-actions">
        <button
          className="dt-btn"
          data-variant="primary"
          disabled={count === 0 || handoff.isPreparing}
          onClick={handoff.prepare}
          type="button"
        >
          Build brief
        </button>
      </div>
    </>
  );
}

export function HandoffView({
  detail,
  review,
}: {
  detail: SessionDetail;
  review: ReviewHandle;
}) {
  const handoff = usePrepareHandoff({ detail, review });
  return (
    <section aria-labelledby="rf-handoff-title" className="dt-ses-handoff">
      <h2 className="dt-ses-title" id="rf-handoff-title" tabIndex={-1}>
        Brief for your agent
      </h2>
      {handoff.prepared ? (
        <PreparedBrief
          onChangeSelection={handoff.clear}
          prepared={handoff.prepared}
          title={detail.session.title}
        />
      ) : (
        <SelectionStep detail={detail} handoff={handoff} />
      )}
      <EarlierBriefs handoffs={detail.handoffs} />
    </section>
  );
}
