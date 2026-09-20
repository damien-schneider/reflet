import { type ReactNode, useEffect, useRef } from "react";
import type { FeedbackWidgetLabels } from "../types";
import { Attachments } from "./composer/attachments";
import { ComposerControls } from "./composer/controls";
import { MessageInput } from "./composer/message-input";
import { CheckIcon } from "./icons";
import type { WidgetState } from "./use-widget-state";

export function FeedbackPanel({
  floatingControls,
  labels,
  state,
}: {
  floatingControls: ReactNode;
  labels: FeedbackWidgetLabels;
  state: WidgetState;
}) {
  const panelRef = useRef<HTMLElement>(null);
  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  if (state.step === "success") {
    return (
      <section aria-live="polite" className="panel">
        <div className="done success-panel glass">
          <CheckIcon />
          <h2>{labels.successTitle}</h2>
          <p>{labels.successMessage}</p>
        </div>
        <div className="composer-toolbar">{floatingControls}</div>
      </section>
    );
  }

  return (
    <section
      aria-label={labels.title}
      className="panel"
      ref={panelRef}
      tabIndex={-1}
    >
      <Attachments labels={labels} state={state} />
      <form
        className="composer"
        onSubmit={(event) => {
          event.preventDefault();
          state.submit();
        }}
      >
        <MessageInput labels={labels} state={state} />
        <ComposerControls
          floatingControls={floatingControls}
          labels={labels}
          state={state}
        />
        <div aria-hidden="true" className="hp">
          <input
            autoComplete="off"
            name="company-website"
            onChange={(event) => state.setHoneypot(event.target.value)}
            tabIndex={-1}
            value={state.honeypot}
          />
        </div>
        {state.error && (
          <p className="error glass" role="alert">
            {state.error}
          </p>
        )}
      </form>
    </section>
  );
}
