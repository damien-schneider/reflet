"use client";

import {
  Button,
  type ButtonSize,
  type ButtonVariant,
} from "@ctrl-ui/react/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ctrl-ui/react/ui/tooltip";
import { Check, Copy, WarningCircle } from "@phosphor-icons/react";

import { type CopyState, useCopyFeedback } from "@/hooks/use-copy-feedback";

interface CopyButtonProps {
  /** Action label for the idle state, e.g. "Copy invitation link". */
  label: string;
  size?: ButtonSize;
  value: string;
  variant?: ButtonVariant;
}

const STATUS_TEXT: Record<CopyState, string> = {
  copied: "Copied to clipboard",
  failed: "Couldn’t copy. Select the text and copy it manually.",
  idle: "",
};

function CopyIcon({ state }: { state: CopyState }) {
  if (state === "copied") {
    return <Check aria-hidden className="text-success-text" weight="bold" />;
  }
  if (state === "failed") {
    return <WarningCircle aria-hidden className="text-destructive-text" />;
  }
  return <Copy aria-hidden />;
}

function CopyButton({
  label,
  size = "sm",
  value,
  variant = "ghost",
}: CopyButtonProps) {
  const { copy, state } = useCopyFeedback();
  const actionLabel = state === "idle" ? label : STATUS_TEXT[state];

  const handleCopy = async () => {
    try {
      await copy(value);
    } catch {
      // The hook already switched to the "failed" state, which the icon, label and status announce.
    }
  };

  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              aria-label={actionLabel}
              iconOnly
              onClick={handleCopy}
              size={size}
              type="button"
              variant={variant}
            >
              <CopyIcon state={state} />
            </Button>
          }
        />
        <TooltipContent>{actionLabel}</TooltipContent>
      </Tooltip>
      <span className="sr-only" role="status">
        {STATUS_TEXT[state]}
      </span>
    </>
  );
}

export { CopyButton };
