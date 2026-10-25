import { useState } from "react";

const COPIED_FEEDBACK_MS = 1600;

export function CopyButton({
  label,
  text,
  variant,
}: {
  label: string;
  text: string;
  variant?: "primary";
}) {
  const [outcome, setOutcome] = useState<"copied" | "failed" | null>(null);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setOutcome("copied");
    } catch {
      setOutcome("failed");
    }
    setTimeout(() => setOutcome(null), COPIED_FEEDBACK_MS);
  };

  return (
    <button
      className="dt-btn dt-copy"
      data-variant={variant}
      onClick={copy}
      type="button"
    >
      <span aria-hidden={outcome !== null}>{label}</span>
      <span aria-hidden={outcome === null}>
        {outcome === "failed" ? "Copy failed" : "Copied"}
      </span>
    </button>
  );
}
