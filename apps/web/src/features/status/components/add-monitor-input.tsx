"use client";

import { Plus } from "@phosphor-icons/react";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useState } from "react";
import { Button } from "@/components/ui/button";
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

    const fullUrl = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
    const name = extractNameFromUrl(fullUrl);

    onAdd(fullUrl, name);
    setUrl("");
    setIsAdding(false);
  };

  if (!isAdding) {
    return (
      <Button
        className="w-full justify-start"
        onClick={() => setIsAdding(true)}
        type="button"
        variant="outline"
      >
        <Plus className="h-4 w-4" />
        Add monitor
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        autoFocus
        onBlur={() => {
          if (!url.trim()) {
            setIsAdding(false);
          }
        }}
        onChange={(event) => setUrl(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            handleSubmit();
          }
          if (event.key === "Escape") {
            setUrl("");
            setIsAdding(false);
          }
        }}
        placeholder="https://api.example.com/health"
        value={url}
      />
      <Button disabled={!url.trim()} onClick={handleSubmit}>
        Add
      </Button>
    </div>
  );
}
