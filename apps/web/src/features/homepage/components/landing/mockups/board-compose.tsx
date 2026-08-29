"use client";

import { PaperPlaneTilt } from "@phosphor-icons/react";
import { type FormEvent, useRef, useState } from "react";

interface BoardComposeProps {
  onSubmit: (title: string) => void;
}

export default function BoardCompose({ onSubmit }: BoardComposeProps) {
  const [draft, setDraft] = useState("");
  const field = useRef<HTMLInputElement>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const title = draft.trim();
    if (title.length === 0) {
      field.current?.focus();
      return;
    }
    onSubmit(title);
    setDraft("");
  };

  return (
    <form
      className="flex items-center gap-3 border-border/70 border-b px-5 py-3"
      onSubmit={submit}
    >
      <label className="sr-only" htmlFor="board-compose">
        Ask for a feature
      </label>
      <input
        autoComplete="off"
        className="h-10 min-w-0 flex-1 rounded-md bg-transparent text-[16px] text-foreground placeholder:text-foreground/60 sm:text-[15px]"
        id="board-compose"
        onChange={(event) => setDraft(event.target.value)}
        placeholder="Ask for a feature — try “dark mode”"
        ref={field}
        value={draft}
      />
      <button
        aria-label="Send request"
        className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-olive-600 text-olive-100 transition-colors hover:bg-olive-700 dark:bg-olive-400 dark:text-olive-950"
        type="submit"
      >
        <PaperPlaneTilt size={15} weight="fill" />
      </button>
    </form>
  );
}
