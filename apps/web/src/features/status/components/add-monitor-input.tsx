"use client";

import { Plus } from "@phosphor-icons/react";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useState } from "react";
import { Input } from "@/components/ui/input";

interface AddMonitorInputProps {
  onAdd: (url: string, name: string) => void;
  organizationId: Id<"organizations">;
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

  const handleSubmit = () => {
    const trimmed = url.trim();
    if (!trimmed) {
      return;
    }

    // Auto-prepend https:// if missing
    const fullUrl = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
    const name = extractNameFromUrl(fullUrl);

    onAdd(fullUrl, name);
    setUrl("");
    setIsAdding(false);
  };

  if (!isAdding) {
    return (
      <button
        className="flex w-full items-center gap-2 rounded-lg border border-dashed p-4 text-muted-foreground text-sm transition-colors hover:border-primary hover:text-foreground"
        onClick={() => setIsAdding(true)}
        type="button"
      >
        <Plus className="h-4 w-4" />
        Add a monitor
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-primary p-2">
      <Input
        autoFocus
        className="border-0 shadow-none focus-visible:ring-0"
        onBlur={() => {
          if (!url.trim()) {
            setIsAdding(false);
          }
        }}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            handleSubmit();
          }
          if (e.key === "Escape") {
            setUrl("");
            setIsAdding(false);
          }
        }}
        placeholder="https://api.example.com/health"
        value={url}
      />
      <span className="shrink-0 text-muted-foreground text-xs">
        Press Enter to add
      </span>
    </div>
  );
}
