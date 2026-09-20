import { useEffect, useRef, useState } from "react";
import type { FeedbackWidgetLabels } from "../../types";
import type { WidgetState } from "../use-widget-state";

export function EmailPrompt({
  labels,
  state,
}: {
  labels: FeedbackWidgetLabels;
  state: WidgetState;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [invalid, setInvalid] = useState(false);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  return (
    <form
      className="email-prompt glass"
      onSubmit={(event) => {
        event.preventDefault();
        state.submit();
      }}
    >
      <h2>{labels.emailPromptTitle}</h2>
      <p>{labels.emailPromptBody}</p>
      <div className="email-field">
        <input
          aria-invalid={invalid}
          aria-label={labels.emailLabel}
          autoComplete="email"
          onChange={(event) => {
            setInvalid(false);
            state.setEmail(event.target.value);
          }}
          onInvalid={(event) => {
            event.preventDefault();
            setInvalid(true);
          }}
          placeholder={labels.emailPlaceholder}
          ref={inputRef}
          type="email"
          value={state.email}
        />
        {invalid && <span role="alert">{labels.emailInvalid}</span>}
      </div>
      <div className="email-prompt-actions">
        <button
          className="ghost-btn"
          onClick={() => {
            state.setEmail("");
            state.submit();
          }}
          type="button"
        >
          {labels.sendWithoutEmail}
        </button>
        <button className="primary-btn" type="submit">
          {labels.submit}
        </button>
      </div>
    </form>
  );
}
