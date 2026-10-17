import { useSyncStatus } from "../../local/local-sessions";
import type { SessionDetail } from "../../protocol";
import { useSessionAction, useSessionWorkspace } from "../session-workspace";
import {
  type ProcessingStep,
  processingSteps,
  type StepProgress,
} from "./processing-steps";
import type { ReviewHandle } from "./use-session-detail";

export function useProcessingSteps(detail: SessionDetail): ProcessingStep[] {
  const { account } = useSessionWorkspace();
  const sync = useSyncStatus(account.key);
  const pendingUploads = detail.session.isMine ? sync.pendingOperations : 0;
  return processingSteps(detail, pendingUploads);
}

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

function ProgressBar({
  label,
  progress,
}: {
  label: string;
  progress: StepProgress | undefined;
}) {
  if (!progress) {
    return (
      <span aria-label={label} className="dt-ses-bar" role="progressbar">
        <span data-indeterminate="true" />
      </span>
    );
  }
  const { done, total, valueText } = progress;
  return (
    <span
      aria-label={label}
      aria-valuemax={total}
      aria-valuemin={0}
      aria-valuenow={done}
      aria-valuetext={valueText}
      className="dt-ses-bar"
      role="progressbar"
      title={valueText}
    >
      <span style={{ width: `${(done / total) * 100}%` }} />
    </span>
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
      {step.state === "active" && (
        <ProgressBar label={step.label} progress={step.progress} />
      )}
    </li>
  );
}

export function ProcessingProgress({
  detail,
  fillsPanel,
  isProcessing,
  review,
  steps,
}: {
  detail: SessionDetail;
  fillsPanel: boolean;
  isProcessing: boolean;
  review: ReviewHandle;
  steps: ProcessingStep[];
}) {
  return (
    <div
      aria-live="polite"
      className="dt-ses-progress"
      data-fills-panel={fillsPanel}
    >
      {isProcessing && (
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
