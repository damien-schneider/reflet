import type { AnswerValue } from "@reflet/survey-core";
import {
  type CSSProperties,
  type KeyboardEvent,
  useEffect,
  useId,
  useRef,
} from "react";
import type { SurveySessionHandle } from "../use-survey-session";
import { cardKeyAction } from "./card-keyboard";
import { SURVEY_CARD_STYLES } from "./card-styles";
import { QuestionStep } from "./question-step";
import { EndingStep, LoadingStep, StartFailedStep } from "./survey-steps";

export type SurveyCardVariant = "floating" | "inline" | "page";
export type SurveyTheme = "auto" | "dark" | "light";

export interface SurveyCardProps {
  className?: string;
  /** Shows a close button. Closing mid-survey dismisses the response first. */
  onClose?: () => void;
  /** Accent for buttons, selections and progress. Any CSS color. */
  primaryColor?: string;
  session: SurveySessionHandle;
  theme?: SurveyTheme;
  variant?: SurveyCardVariant;
}

const HEX_COLOR = /^#([\da-f]{3}|[\da-f]{6})$/i;
const LIGHT_LUMINANCE_THRESHOLD = 0.6;
const DARK_TEXT = "#18181b";
const LIGHT_TEXT = "#ffffff";

/** Dark text on light brand colors, white text otherwise. */
const readableTextOn = (color: string): string => {
  const match = HEX_COLOR.exec(color.trim());
  if (!match?.[1]) {
    return LIGHT_TEXT;
  }
  const hex =
    match[1].length === 3
      ? [...match[1]].map((digit) => digit + digit).join("")
      : match[1];
  const [red = 0, green = 0, blue = 0] = [0, 2, 4].map(
    (offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255
  );
  const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  return luminance > LIGHT_LUMINANCE_THRESHOLD ? DARK_TEXT : LIGHT_TEXT;
};

function CloseIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="16"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width="16"
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

/**
 * Renders any survey session: questions, branching, endings and errors.
 * Ships its own scoped styles, so it works in a shadow root or a page.
 */
export function SurveyCard({
  className,
  onClose,
  primaryColor,
  session,
  theme = "auto",
  variant = "inline",
}: SurveyCardProps) {
  const { snapshot } = session;
  const { ending, phase, question } = snapshot;
  const headingId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const hasInteracted = useRef(false);
  const stepKey = question?._id ?? phase;

  useEffect(() => {
    if (stepKey && hasInteracted.current) {
      headingRef.current?.focus({ preventScroll: true });
    }
  }, [stepKey]);

  if (phase === "dismissed") {
    return null;
  }

  const closable = onClose !== undefined || variant === "floating";
  const close = () => {
    session.dismiss();
    onClose?.();
  };
  const pick = (value: AnswerValue) => {
    session.setAnswer(value);
    session.next();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    hasInteracted.current = true;
    if (event.nativeEvent.isComposing) {
      return;
    }
    const action = cardKeyAction(
      {
        ctrlKey: event.ctrlKey,
        key: event.key,
        metaKey: event.metaKey,
        target: event.target,
      },
      question
    );
    if (!action || (action.kind === "close" && !closable)) {
      return;
    }
    event.preventDefault();
    if (action.kind === "close") {
      close();
    } else if (action.kind === "next") {
      session.next();
    } else {
      pick(action.value);
    }
  };

  const themeStyle: CSSProperties & Record<`--${string}`, string> = primaryColor
    ? {
        "--rf-survey-primary": primaryColor,
        "--rf-survey-primary-text": readableTextOn(primaryColor),
      }
    : {};
  const showsProgress = phase === "question" || phase === "ending";

  return (
    // biome-ignore lint/a11y/noNoninteractiveElementInteractions: keyboard shortcuts for the controls inside the card
    <section
      aria-label={question || ending ? undefined : session.survey.title}
      aria-labelledby={question || ending ? headingId : undefined}
      className={className ? `rf-survey ${className}` : "rf-survey"}
      data-theme={theme}
      data-variant={variant}
      onKeyDown={onKeyDown}
      onPointerDown={() => {
        hasInteracted.current = true;
      }}
      style={themeStyle}
    >
      <style>{SURVEY_CARD_STYLES}</style>
      {showsProgress && (
        <div
          aria-label="Survey progress"
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={Math.round(snapshot.progress * 100)}
          className="rfs-progress"
          role="progressbar"
        >
          <div
            className="rfs-progress-fill"
            style={{ transform: `scaleX(${snapshot.progress})` }}
          />
        </div>
      )}
      {closable && (
        <button
          aria-label="Close survey"
          className="rfs-close"
          onClick={close}
          type="button"
        >
          <CloseIcon />
        </button>
      )}
      {phase === "starting" && <LoadingStep />}
      {phase === "start_failed" && (
        <StartFailedStep
          message={snapshot.error}
          onRetry={() => session.start()}
        />
      )}
      {ending && (
        <EndingStep
          ending={ending}
          headingId={headingId}
          headingRef={headingRef}
          key={ending.id}
          onClose={close}
        />
      )}
      {question && (
        <QuestionStep
          headingId={headingId}
          headingRef={headingRef}
          key={question._id}
          onPick={pick}
          question={question}
          session={session}
        />
      )}
    </section>
  );
}
