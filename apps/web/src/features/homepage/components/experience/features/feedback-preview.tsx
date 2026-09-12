"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import { Textarea } from "@ctrl-ui/react/ui/textarea";
import { ArrowUpRight, Check, MessageCircle } from "lucide-react";
import { type Ref, useId, useRef, useState } from "react";
import { flushSync } from "react-dom";

export function FeedbackPreview() {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const resetButtonRef = useRef<HTMLButtonElement>(null);
  const [submittedIdea, setSubmittedIdea] = useState("");
  function submitIdea(idea: string) {
    flushSync(() => setSubmittedIdea(idea));
    resetButtonRef.current?.focus();
  }
  function resetPreview() {
    flushSync(() => setSubmittedIdea(""));
    inputRef.current?.focus();
  }
  if (submittedIdea) {
    return (
      <FeedbackReceipt
        buttonRef={resetButtonRef}
        idea={submittedIdea}
        onReset={resetPreview}
      />
    );
  }
  return <FeedbackForm inputRef={inputRef} onSend={submitIdea} />;
}

function FeedbackReceipt({
  idea,
  onReset,
  buttonRef,
}: {
  idea: string;
  onReset: () => void;
  buttonRef: Ref<HTMLButtonElement>;
}) {
  return (
    <div className="feature-widget feature-widget-success">
      <div role="status">
        <span className="feature-success-icon">
          <Check aria-hidden="true" size={22} />
        </span>
        <h3>A good idea has a home.</h3>
        <p className="feature-submitted-idea">“{idea}”</p>
        <span className="marketing-status">Added to your preview board</span>
      </div>
      <Button onClick={onReset} ref={buttonRef} variant="surface">
        Try another idea
      </Button>
      <small>This is a preview. Nothing was sent.</small>
    </div>
  );
}

function FeedbackForm({
  onSend,
  inputRef,
}: {
  onSend: (idea: string) => void;
  inputRef: Ref<HTMLTextAreaElement>;
}) {
  const inputId = useId();
  const [idea, setIdea] = useState("");
  return (
    <form
      className="feature-widget"
      onSubmit={(event) => {
        event.preventDefault();
        if (idea.trim()) {
          onSend(idea.trim());
        }
      }}
    >
      <span className="feature-widget-icon">
        <MessageCircle aria-hidden="true" size={21} />
      </span>
      <h3>A little idea for us?</h3>
      <p>What could work better?</p>
      <label htmlFor={inputId}>Your idea</label>
      <Textarea
        id={inputId}
        maxLength={300}
        onChange={(event) => setIdea(event.target.value)}
        placeholder="Share your idea…"
        ref={inputRef}
        value={idea}
      />
      <FeedbackSend canSubmit={Boolean(idea.trim())} />
      <small>Try it out. Your idea stays in this preview.</small>
    </form>
  );
}

function FeedbackSend({ canSubmit }: { canSubmit: boolean }) {
  return (
    <div className="feature-widget-footer">
      <span className="marketing-status">Feature request</span>
      <Button
        aria-label="Send preview feedback"
        disabled={!canSubmit}
        size="sm"
        tone="primary"
        type="submit"
        variant="solid"
      >
        Send idea <ArrowUpRight aria-hidden="true" size={14} />
      </Button>
    </div>
  );
}
