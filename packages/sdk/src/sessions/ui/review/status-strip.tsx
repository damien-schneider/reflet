import { useSyncStatus } from "../../local/local-sessions";
import type { SessionDetail } from "../../protocol";
import { useSessionAction, useSessionWorkspace } from "../session-workspace";
import { type ProcessingStep, processingSteps } from "./processing-steps";
import type { ReviewHandle } from "./use-session-detail";

function AnalyzeButton({
  detail,
  label,
  review,
}: {
  detail: SessionDetail;
  label: string;
  review: ReviewHandle;
}) {
  const { api } = useSessionWorkspace();
  const run = useSessionAction();

  const analyze = async () => {
    const status = await run("The analysis did not start", () =>
      api.analyze(detail.session.id)
    );
    if (status) {
      review.patch((current) => ({
        ...current,
        session: { ...current.session, analysis: status },
      }));
    }
  };

  return (
    <button className="dt-btn" onClick={analyze} type="button">
      {label}
    </button>
  );
}

function StepRow({
  detail,
  review,
  step,
}: {
  detail: SessionDetail;
  review: ReviewHandle;
  step: ProcessingStep;
}) {
  return (
    <li data-state={step.state}>
      <span>{step.label}</span>
      {step.analyzeLabel && detail.session.canEdit && (
        <AnalyzeButton
          detail={detail}
          label={step.analyzeLabel}
          review={review}
        />
      )}
    </li>
  );
}

export function StatusStrip({
  detail,
  review,
}: {
  detail: SessionDetail;
  review: ReviewHandle;
}) {
  const { account } = useSessionWorkspace();
  const sync = useSyncStatus(account.key);
  const pendingUploads = detail.session.isMine ? sync.pendingOperations : 0;
  const steps = processingSteps(detail, pendingUploads);
  const isProcessed = steps.every((step) => step.state === "done");

  return (
    <div aria-live="polite" className="dt-ses-strip">
      {!isProcessed && (
        <ol aria-label="Processing" className="dt-ses-steps">
          {steps.map((step) => (
            <StepRow
              detail={detail}
              key={step.key}
              review={review}
              step={step}
            />
          ))}
        </ol>
      )}
    </div>
  );
}
