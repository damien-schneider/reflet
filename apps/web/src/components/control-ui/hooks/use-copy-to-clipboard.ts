import { useEffect, useRef, useState } from "react";

export type UseCopyToClipboardOptions = {
  text?: string;
  copiedDuration?: number;
  onCopy?: (value: string) => void;
  onCopyError?: (error: unknown) => void;
};

export type UseCopyToClipboardResult = {
  isCopied: boolean;
  copyToClipboard: (value: string) => Promise<boolean>;
  resetCopied: () => void;
};

export type UseCopyToClipboardConfiguredResult = UseCopyToClipboardResult & {
  handleCopy: () => Promise<boolean>;
};

async function copyViaClipboardApi(value: string) {
  if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) return false;

  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

function copyViaSelection(value: string) {
  if (typeof document === "undefined" || typeof document.execCommand !== "function" || !document.body) return false;

  const activeElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const textarea = document.createElement("textarea");

  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.setAttribute("aria-hidden", "true");
  textarea.style.position = "fixed";
  textarea.style.top = "0";
  textarea.style.left = "0";
  textarea.style.width = "1px";
  textarea.style.height = "1px";
  textarea.style.opacity = "0";
  textarea.style.pointerEvents = "none";

  document.body.appendChild(textarea);

  try {
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, value.length);
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    textarea.remove();
    activeElement?.focus({ preventScroll: true });
  }
}

export async function copyTextToClipboard(value: string) {
  if (await copyViaClipboardApi(value)) return true;
  return copyViaSelection(value);
}

export function useCopyToClipboard(options: UseCopyToClipboardOptions & { text: string }): UseCopyToClipboardConfiguredResult;
export function useCopyToClipboard(options?: UseCopyToClipboardOptions): UseCopyToClipboardResult;
export function useCopyToClipboard({ text, copiedDuration = 1200, onCopy, onCopyError }: UseCopyToClipboardOptions = {}) {
  const [isCopied, setIsCopied] = useState(false);
  const resetTimeout = useRef<number | null>(null);

  useEffect(() => {
    const timeoutRef = resetTimeout;

    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  function resetCopied() {
    if (resetTimeout.current) window.clearTimeout(resetTimeout.current);
    resetTimeout.current = null;
    setIsCopied(false);
  }

  async function copyToClipboard(value: string) {
    const copied = await copyTextToClipboard(value);
    if (!copied) {
      const error = new Error("Unable to copy text");
      onCopyError?.(error);
      setIsCopied(false);
      return false;
    }

    try {
      onCopy?.(value);
    } catch (error) {
      onCopyError?.(error);
      setIsCopied(false);
      return false;
    }

    setIsCopied(true);
    if (resetTimeout.current) window.clearTimeout(resetTimeout.current);
    resetTimeout.current = window.setTimeout(() => setIsCopied(false), copiedDuration);
    return true;
  }

  function handleCopy() {
    return text !== undefined ? copyToClipboard(text) : Promise.resolve(false);
  }

  return text === undefined ? { isCopied, copyToClipboard, resetCopied } : { isCopied, copyToClipboard, handleCopy, resetCopied };
}
