"use client";

import { Input } from "@ctrl-ui/react/ui/input";
import { Textarea } from "@ctrl-ui/react/ui/textarea";
import { useEffect, useId, useRef, useState } from "react";
import { Label } from "@/components/ui/label";

const SAVE_DELAY_MS = 600;

interface PendingSave {
  text: string;
  timer: ReturnType<typeof setTimeout>;
}

/**
 * Text that saves itself shortly after typing stops, on blur, and when the
 * field unmounts mid-edit. Shows the saved value whenever it isn't being edited.
 */
export function useAutosavedText(saved: string, save: (text: string) => void) {
  const [draft, setDraft] = useState<string | null>(null);
  const pending = useRef<PendingSave | null>(null);
  const saveRef = useRef(save);

  useEffect(() => {
    saveRef.current = save;
  });

  useEffect(
    () => () => {
      if (pending.current) {
        clearTimeout(pending.current.timer);
        saveRef.current(pending.current.text);
      }
    },
    []
  );

  const flush = () => {
    if (!pending.current) {
      return;
    }
    clearTimeout(pending.current.timer);
    const { text } = pending.current;
    pending.current = null;
    saveRef.current(text);
  };

  const onChange = (text: string) => {
    setDraft(text);
    if (pending.current) {
      clearTimeout(pending.current.timer);
    }
    pending.current =
      text === saved ? null : { text, timer: setTimeout(flush, SAVE_DELAY_MS) };
  };

  const onBlur = () => {
    flush();
    setDraft(null);
  };

  return { onBlur, onChange, value: draft ?? saved };
}

interface AutosavedFieldProps {
  label: string;
  multiline?: boolean;
  onSave: (text: string) => void;
  optional?: boolean;
  placeholder?: string;
  saved: string;
}

export function AutosavedField({
  label,
  multiline = false,
  onSave,
  optional = false,
  placeholder,
  saved,
}: AutosavedFieldProps) {
  const id = useId();
  const text = useAutosavedText(saved, onSave);
  const fieldProps = {
    id,
    onBlur: text.onBlur,
    placeholder,
    value: text.value,
  };
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>
        {label}
        {optional ? (
          <span className="font-normal text-muted-foreground"> (optional)</span>
        ) : null}
      </Label>
      {multiline ? (
        <Textarea
          {...fieldProps}
          onChange={(event) => text.onChange(event.target.value)}
          rows={2}
        />
      ) : (
        <Input
          {...fieldProps}
          onChange={(event) => text.onChange(event.target.value)}
        />
      )}
    </div>
  );
}
