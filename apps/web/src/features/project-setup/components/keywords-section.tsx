import { Badge } from "@ctrl-ui/react/ui/badge";
import { Button } from "@ctrl-ui/react/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@ctrl-ui/react/ui/card";
import { Checkbox } from "@ctrl-ui/react/ui/checkbox";
import { Binoculars } from "@phosphor-icons/react";
import { useId } from "react";
import type { SuggestedKeyword } from "./setup-types";

interface KeywordsSectionProps {
  keywords: SuggestedKeyword[];
  onToggle: (index: number) => void;
  onToggleAll: (accepted: boolean) => void;
}

export function KeywordsSection({
  keywords,
  onToggle,
  onToggleAll,
}: KeywordsSectionProps) {
  const idPrefix = useId();

  if (keywords.length === 0) {
    return null;
  }

  const acceptedCount = keywords.filter((k) => k.accepted).length;
  const allAccepted = acceptedCount === keywords.length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Binoculars aria-hidden className="size-4" />
              Intelligence keywords
            </CardTitle>
            <CardDescription className="tabular-nums">
              {acceptedCount} of {keywords.length} selected
            </CardDescription>
          </div>
          <Button
            onClick={() => onToggleAll(!allAccepted)}
            size="xs"
            variant="ghost"
          >
            {allAccepted ? "Deselect all" : "Select all"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-1">
          {keywords.map((keyword, index) => (
            <li key={keyword.keyword}>
              <label
                className="flex cursor-pointer items-center gap-3 rounded-md p-2 hover:bg-muted/50"
                htmlFor={`${idPrefix}-${index}`}
              >
                <Checkbox
                  checked={keyword.accepted}
                  id={`${idPrefix}-${index}`}
                  onCheckedChange={() => onToggle(index)}
                />
                <span className="min-w-0 flex-1 truncate font-medium text-sm">
                  “{keyword.keyword}”
                </span>
                <Badge size="sm">{keyword.category}</Badge>
              </label>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
