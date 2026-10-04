"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import { Input } from "@ctrl-ui/react/ui/input";
import { toast } from "@ctrl-ui/react/ui/toast";
import { ListChecks, Plus } from "@phosphor-icons/react";
import { type FocusEvent, type FormEvent, useState } from "react";
import {
  EMPTY_RESPONSE_CHECKS_DRAFT,
  type ResponseChecks,
  ResponseChecksFields,
  responseChecksFromDraft,
} from "./response-checks";

export interface NewMonitor extends ResponseChecks {
  name: string;
  url: string;
}

interface AddMonitorInputProps {
  onAdd: (monitor: NewMonitor) => Promise<void>;
}

const extractNameFromUrl = (url: string): string => {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace("www.", "");
    const pathParts = parsed.pathname.split("/").filter(Boolean);
    if (pathParts.length > 0) {
      return `${host}/${pathParts[0]}`;
    }
    return host;
  } catch {
    return url;
  }
};

export function AddMonitorInput({ onAdd }: AddMonitorInputProps) {
  const [url, setUrl] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showsChecks, setShowsChecks] = useState(false);
  const [checksDraft, setChecksDraft] = useState(EMPTY_RESPONSE_CHECKS_DRAFT);

  const closeForm = () => {
    setUrl("");
    setChecksDraft(EMPTY_RESPONSE_CHECKS_DRAFT);
    setShowsChecks(false);
    setIsAdding(false);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = url.trim();
    if (!trimmed || isSaving) {
      return;
    }

    const fullUrl = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
    setIsSaving(true);
    try {
      await onAdd({
        ...responseChecksFromDraft(checksDraft),
        name: extractNameFromUrl(fullUrl),
        url: fullUrl,
      });
      closeForm();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Couldn’t add the monitor. Try again."
      );
    }
    setIsSaving(false);
  };

  const handleUrlBlur = (event: FocusEvent<HTMLInputElement>) => {
    const focusLeftForm = !event.currentTarget.form?.contains(
      event.relatedTarget
    );
    if (focusLeftForm && !url.trim() && !showsChecks) {
      closeForm();
    }
  };

  if (!isAdding) {
    return (
      <Button
        className="w-full justify-start"
        onClick={() => setIsAdding(true)}
        variant="surface"
      >
        <Plus />
        Add monitor
      </Button>
    );
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="flex items-center gap-2">
        <Input
          aria-label="URL to monitor"
          autoCapitalize="off"
          autoComplete="off"
          autoFocus
          className="min-w-0 flex-1"
          inputMode="url"
          onBlur={handleUrlBlur}
          onChange={(event) => setUrl(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              closeForm();
            }
          }}
          placeholder="https://api.example.com/health"
          spellCheck={false}
          type="text"
          value={url}
        />
        <Button
          aria-expanded={showsChecks}
          aria-label="Response checks"
          iconOnly
          onClick={() => setShowsChecks(!showsChecks)}
          type="button"
          variant="ghost"
        >
          <ListChecks />
        </Button>
        <Button
          disabled={!url.trim() || isSaving}
          tone="primary"
          type="submit"
          variant="solid"
        >
          {isSaving ? "Adding…" : "Add"}
        </Button>
      </div>
      {showsChecks && (
        <ResponseChecksFields
          draft={checksDraft}
          onDraftChange={setChecksDraft}
        />
      )}
    </form>
  );
}
