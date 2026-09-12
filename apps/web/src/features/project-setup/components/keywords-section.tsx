import { Badge } from "@ctrl-ui/react/ui/badge";
import { Button } from "@ctrl-ui/react/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@ctrl-ui/react/ui/card";
import { Checkbox } from "@ctrl-ui/react/ui/checkbox";
import { Binoculars } from "@phosphor-icons/react";
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
  if (keywords.length === 0) {
    return null;
  }

  const acceptedCount = keywords.filter((k) => k.accepted).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Binoculars className="size-4" />
            Intelligence Keywords ({keywords.length} found)
          </CardTitle>
          <Button
            onClick={() => onToggleAll(acceptedCount < keywords.length)}
            size="xs"
            variant="ghost"
          >
            {acceptedCount === keywords.length ? "Deselect all" : "Select all"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {keywords.map((keyword, index) => (
            <div
              className="flex items-center gap-3 rounded-md p-2 hover:bg-muted/50"
              key={keyword.keyword}
            >
              <Checkbox
                checked={keyword.accepted}
                onCheckedChange={() => onToggle(index)}
              />
              <span className="flex-1 font-medium text-sm">
                &quot;{keyword.keyword}&quot;
              </span>
              <Badge>{keyword.category}</Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
