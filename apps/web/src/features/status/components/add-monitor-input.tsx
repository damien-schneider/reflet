"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import { Input } from "@ctrl-ui/react/ui/input";
import { toast } from "@ctrl-ui/react/ui/toast";
import { Plus } from "@phosphor-icons/react";
import { type FormEvent, useState } from "react";

interface AddMonitorInputProps {
  onAdd: (url: string, name: string) => Promise<void>;
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

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = url.trim();
    if (!trimmed || isSaving) {
      return;
    }

    const fullUrl = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
    setIsSaving(true);
    try {
      await onAdd(fullUrl, extractNameFromUrl(fullUrl));
      setUrl("");
      setIsAdding(false);
    } catch {
      toast.error("Couldn’t add the monitor. Try again.");
    }
    setIsSaving(false);
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
    <form className="flex items-center gap-2" onSubmit={handleSubmit}>
      <Input
        aria-label="URL to monitor"
        autoCapitalize="off"
        autoComplete="off"
        autoFocus
        className="min-w-0 flex-1"
        inputMode="url"
        onBlur={() => {
          if (!url.trim()) {
            setIsAdding(false);
          }
        }}
        onChange={(event) => setUrl(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setUrl("");
            setIsAdding(false);
          }
        }}
        placeholder="https://api.example.com/health"
        spellCheck={false}
        type="text"
        value={url}
      />
      <Button
        disabled={!url.trim() || isSaving}
        tone="primary"
        type="submit"
        variant="solid"
      >
        {isSaving ? "Adding…" : "Add"}
      </Button>
    </form>
  );
}
