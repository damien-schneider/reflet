import { type SurveyEnding, safeLinkUrl } from "@reflet/survey-core";
import type { ReactNode, RefObject } from "react";

export const DEFAULT_BUTTON_LABEL = "Continue";

export function StepHeading({
  description,
  headingId,
  headingRef,
  title,
}: {
  description?: string;
  headingId: string;
  headingRef: RefObject<HTMLHeadingElement | null>;
  title: string;
}) {
  return (
    <div className="rfs-heading">
      <h2 className="rfs-title" id={headingId} ref={headingRef} tabIndex={-1}>
        {title}
      </h2>
      {description && <p className="rfs-description">{description}</p>}
    </div>
  );
}

export function ActionButton({
  children,
  disabled,
  onClick,
  url,
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick: () => void;
  url?: string;
}) {
  const safeUrl = safeLinkUrl(url);
  if (safeUrl) {
    return (
      <a
        className="rfs-button"
        data-tone="primary"
        href={safeUrl}
        onClick={onClick}
        rel="noopener noreferrer"
        target="_blank"
      >
        {children}
      </a>
    );
  }
  return (
    <button
      className="rfs-button"
      data-tone="primary"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function SuccessMark() {
  return (
    <span className="rfs-ending-mark">
      <svg
        aria-hidden="true"
        fill="none"
        height="20"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.5"
        viewBox="0 0 24 24"
        width="20"
      >
        <path d="M5 12.5l4.5 4.5L19 7.5" />
      </svg>
    </span>
  );
}

export function EndingStep({
  ending,
  headingId,
  headingRef,
  onClose,
}: {
  ending: SurveyEnding;
  headingId: string;
  headingRef: RefObject<HTMLHeadingElement | null>;
  onClose: () => void;
}) {
  const hasButton = Boolean(ending.buttonUrl || ending.buttonLabel);
  return (
    <div className="rfs-step rfs-ending">
      <SuccessMark />
      <StepHeading
        description={ending.description}
        headingId={headingId}
        headingRef={headingRef}
        title={ending.title}
      />
      {hasButton && (
        <ActionButton onClick={onClose} url={ending.buttonUrl}>
          {ending.buttonLabel ?? DEFAULT_BUTTON_LABEL}
        </ActionButton>
      )}
    </div>
  );
}

export function LoadingStep() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading survey"
      className="rfs-skeleton"
      role="status"
    >
      <span className="rfs-skeleton-line" />
      <span className="rfs-skeleton-line" />
      <span className="rfs-skeleton-line" />
    </div>
  );
}

export function StartFailedStep({
  message,
  onRetry,
}: {
  message: string | null;
  onRetry: () => void;
}) {
  return (
    <div className="rfs-step">
      <p className="rfs-error" role="alert">
        {message}
      </p>
      <div className="rfs-footer">
        <ActionButton onClick={onRetry}>Try again</ActionButton>
      </div>
    </div>
  );
}
