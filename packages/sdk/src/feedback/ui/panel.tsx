import { type ComponentType, useEffect, useRef } from "react";
import type { FeedbackWidgetCategory, FeedbackWidgetLabels } from "../types";
import {
  BugIcon,
  CameraIcon,
  CheckIcon,
  CloseIcon,
  IdeaIcon,
  PencilIcon,
  QuestionIcon,
  TargetIcon,
  TrashIcon,
} from "./icons";
import type { WidgetState } from "./use-widget-state";

const CATEGORY_META: Record<
  FeedbackWidgetCategory,
  { icon: ComponentType; labelKey: keyof FeedbackWidgetLabels }
> = {
  bug: { icon: BugIcon, labelKey: "categoryBug" },
  idea: { icon: IdeaIcon, labelKey: "categoryIdea" },
  question: { icon: QuestionIcon, labelKey: "categoryQuestion" },
};

function Attachment({
  labels,
  state,
}: {
  labels: FeedbackWidgetLabels;
  state: WidgetState;
}) {
  if (state.isCapturing) {
    return (
      <div className="attachment">
        <div className="thumb" />
        <div className="meta">
          <strong>{labels.retakeHint}</strong>
          <span>…</span>
        </div>
      </div>
    );
  }

  if (!state.capture) {
    return (
      <button
        className="ghost-btn"
        onClick={() => state.takeCapture()}
        type="button"
      >
        <CameraIcon />
        {labels.attachScreenshot}
      </button>
    );
  }

  const annotationCount = state.annotations.length;

  return (
    <div className="attachment">
      <div className="thumb">
        <img
          alt=""
          height={state.capture.height}
          src={state.capture.objectUrl}
          width={state.capture.width}
        />
      </div>
      <div className="meta">
        <strong>{labels.retakeHint}</strong>
        <span>
          {state.capture.width}×{state.capture.height}
          {annotationCount > 0 ? ` · ${annotationCount} marks` : ""}
        </span>
      </div>
      <div className="actions">
        <button
          aria-label={labels.annotateHint}
          className="icon-btn"
          onClick={() => state.setStep("annotate")}
          title={labels.annotateHint}
          type="button"
        >
          <PencilIcon />
        </button>
        <button
          aria-label={labels.recapture}
          className="icon-btn"
          onClick={() => state.takeCapture()}
          title={labels.recapture}
          type="button"
        >
          <CameraIcon />
        </button>
        <button
          aria-label={labels.removeScreenshot}
          className="icon-btn"
          onClick={state.removeCapture}
          title={labels.removeScreenshot}
          type="button"
        >
          <TrashIcon />
        </button>
      </div>
    </div>
  );
}

function SelectionChip({
  labels,
  state,
}: {
  labels: FeedbackWidgetLabels;
  state: WidgetState;
}) {
  const { selection } = state;
  if (!selection) {
    return (
      <button
        className="ghost-btn"
        onClick={() => state.setStep("picking")}
        type="button"
      >
        <TargetIcon />
        {labels.pickElement}
      </button>
    );
  }

  const component = selection.componentStack[0];

  return (
    <span className="chip">
      <TargetIcon />
      <span className="truncate">
        {component ? <strong>{`<${component}>`}</strong> : selection.label}{" "}
        <code>{selection.sourceLocation ?? selection.selector}</code>
      </span>
      <button
        aria-label={labels.cancel}
        className="icon-btn"
        onClick={state.clearSelection}
        type="button"
      >
        <CloseIcon />
      </button>
    </span>
  );
}

export function FeedbackPanel({
  categories,
  labels,
  state,
}: {
  categories: FeedbackWidgetCategory[];
  labels: FeedbackWidgetLabels;
  state: WidgetState;
}) {
  const messageRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messageRef.current?.focus();
  }, []);

  if (state.step === "success") {
    return (
      <section aria-live="polite" className="panel">
        <div className="done">
          <CheckIcon />
          <h2>{labels.successTitle}</h2>
          <p>{labels.successMessage}</p>
        </div>
      </section>
    );
  }

  return (
    <section aria-label={labels.title} className="panel">
      <header className="head">
        <h2>{labels.title}</h2>
        <span className="spacer" />
        <button
          aria-label={labels.cancel}
          className="icon-btn"
          onClick={state.close}
          type="button"
        >
          <CloseIcon />
        </button>
      </header>

      <form
        className="body"
        onSubmit={(event) => {
          event.preventDefault();
          state.submit();
        }}
      >
        {categories.length > 1 && (
          <fieldset className="segmented">
            {categories.map((value) => {
              const { icon: Icon, labelKey } = CATEGORY_META[value];
              return (
                <button
                  aria-pressed={state.category === value}
                  key={value}
                  onClick={() => state.setCategory(value)}
                  type="button"
                >
                  <Icon />
                  {labels[labelKey]}
                </button>
              );
            })}
          </fieldset>
        )}

        <textarea
          aria-label={labels.descriptionPlaceholder}
          maxLength={4000}
          onChange={(event) => state.setMessage(event.target.value)}
          placeholder={labels.descriptionPlaceholder}
          ref={messageRef}
          value={state.message}
        />

        <Attachment labels={labels} state={state} />
        <SelectionChip labels={labels} state={state} />

        {state.isAnonymous && (
          <input
            aria-label={labels.emailLabel}
            autoComplete="email"
            onChange={(event) => state.setEmail(event.target.value)}
            placeholder={labels.emailPlaceholder}
            type="email"
            value={state.email}
          />
        )}

        <div aria-hidden="true" className="hp">
          <input
            autoComplete="off"
            name="company-website"
            onChange={(event) => state.setHoneypot(event.target.value)}
            tabIndex={-1}
            value={state.honeypot}
          />
        </div>

        {state.error && <p className="error">{state.error}</p>}

        <button
          className="submit"
          disabled={state.isSubmitting || !state.message.trim()}
          type="submit"
        >
          {state.isSubmitting ? <span className="spinner" /> : labels.submit}
        </button>
      </form>

      <footer className="footer" data-dismissible={state.canDismiss}>
        {state.canDismiss && (
          <button className="dismiss-btn" onClick={state.dismiss} type="button">
            {labels.dismissForDays.replace(
              "{days}",
              String(state.dismissForDays)
            )}
          </button>
        )}
        <span>
          Powered by{" "}
          <a
            href="https://reflet.app"
            rel="noopener noreferrer"
            target="_blank"
          >
            Reflet
          </a>
        </span>
      </footer>
    </section>
  );
}
