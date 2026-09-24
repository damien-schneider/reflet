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

  const outcomeLabel = outcome === "copied" ? "Copied" : "Copy failed";
  return (
    <button
      className="dt-btn"
      data-variant={variant}
      onClick={copy}
      type="button"
    >
      {outcome ? outcomeLabel : label}
    </button>
  );
}
