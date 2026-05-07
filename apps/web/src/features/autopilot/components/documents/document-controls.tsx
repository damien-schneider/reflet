import { IconPlus, IconSearch } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { H2 } from "@/components/ui/typography";
import {
  AGENT_LABELS,
  DOCUMENT_REVIEW_TYPE_OPTIONS,
} from "@/features/autopilot/lib/document-labels";
import { cn } from "@/lib/utils";
import type { StatusPreset } from "./types";

const DOCUMENT_FILTER_PRESETS: Array<{ label: string; value: StatusPreset }> = [
  { label: "All", value: "all" },
  { label: "Draft", value: "draft" },
  { label: "Review", value: "review" },
  { label: "Published", value: "published" },
];

interface DocumentsHeaderProps {
  onCreate: () => void;
}

interface DocumentFiltersProps {
  filterAgent: string;
  filteredCount: number;
  filterType: string;
  onAgentChange: (agent: string) => void;
  onSearchChange: (query: string) => void;
  onStatusChange: (status: StatusPreset) => void;
  onTypeChange: (type: string) => void;
  searchQuery: string;
  statusPreset: StatusPreset;
}

export function DocumentsHeader({ onCreate }: DocumentsHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <H2 variant="card">Documents</H2>
      <Button onClick={onCreate} size="sm">
        <IconPlus className="mr-1 size-4" />
        New Document
      </Button>
    </div>
  );
}

export function DocumentFilters({
  filterAgent,
  filterType,
  filteredCount,
  onAgentChange,
  onSearchChange,
  onStatusChange,
  onTypeChange,
  searchQuery,
  statusPreset,
}: DocumentFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative max-w-xs flex-1">
        <IconSearch className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-8"
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search documents..."
          value={searchQuery}
        />
      </div>

      <div className="flex overflow-hidden rounded-md border border-border">
        {DOCUMENT_FILTER_PRESETS.map((preset) => (
          <Button
            className={cn(
              "h-8 rounded-none border-0 px-3 text-xs",
              statusPreset === preset.value
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
              preset.value !== "all" && "border-border border-l"
            )}
            key={preset.value}
            onClick={() => onStatusChange(preset.value)}
            size="sm"
            type="button"
            variant="ghost"
          >
            {preset.label}
          </Button>
        ))}
      </div>

      <Select
        onValueChange={(value) => {
          if (value) {
            onTypeChange(value);
          }
        }}
        value={filterType}
      >
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All types</SelectItem>
          {DOCUMENT_REVIEW_TYPE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        onValueChange={(value) => {
          if (value) {
            onAgentChange(value);
          }
        }}
        value={filterAgent}
      >
        <SelectTrigger className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All agents</SelectItem>
          {Object.entries(AGENT_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <span className="ml-auto text-muted-foreground text-sm">
        {filteredCount} document{filteredCount === 1 ? "" : "s"}
      </span>
    </div>
  );
}
