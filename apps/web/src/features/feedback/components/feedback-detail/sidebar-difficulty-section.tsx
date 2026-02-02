"use client";

import { ArrowsClockwise, Gauge, Sparkle } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const DIFFICULTY_CONFIG = {
  trivial: { label: "Trivial", color: "#22c55e", description: "< 1 hour" },
  easy: { label: "Easy", color: "#84cc16", description: "1-4 hours" },
  medium: { label: "Medium", color: "#eab308", description: "1-2 days" },
  hard: { label: "Hard", color: "#f97316", description: "3-5 days" },
  complex: { label: "Complex", color: "#ef4444", description: "1+ weeks" },
} as const;

interface DifficultyEstimate {
  hasAiDifficulty: boolean;
  aiDifficultyScore?: "trivial" | "easy" | "medium" | "hard" | "complex";
  aiDifficultyReasoning?: string;
}

interface SidebarDifficultySectionProps {
  estimate: DifficultyEstimate | undefined;
  isGenerating: boolean;
  onGenerate: () => void;
}

function DifficultyBadge({
  score,
}: {
  score: "trivial" | "easy" | "medium" | "hard" | "complex";
}) {
  const config = DIFFICULTY_CONFIG[score];

  return (
    <div className="flex items-center gap-2">
      <Gauge className="h-4 w-4 text-muted-foreground" />
      <Badge
        className="px-3 py-1"
        style={{
          backgroundColor: `${config.color}20`,
          color: config.color,
          borderColor: config.color,
        }}
        variant="outline"
      >
        {config.label}
      </Badge>
      <span className="text-muted-foreground text-xs">
        {config.description}
      </span>
    </div>
  );
}

export function SidebarDifficultySection({
  estimate,
  isGenerating,
  onGenerate,
}: SidebarDifficultySectionProps) {
  const score = estimate?.aiDifficultyScore;

  if (estimate?.hasAiDifficulty && score) {
    return (
      <div className="space-y-2">
        <DifficultyBadge score={score} />
        {estimate.aiDifficultyReasoning && (
          <p className="text-muted-foreground text-xs">
            {estimate.aiDifficultyReasoning}
          </p>
        )}
        <Button
          className="w-full"
          disabled={isGenerating}
          onClick={onGenerate}
          size="sm"
          variant="ghost"
        >
          {isGenerating ? (
            <>
              <ArrowsClockwise className="mr-2 h-3 w-3 animate-spin" />
              Regenerating...
            </>
          ) : (
            <>
              <ArrowsClockwise className="mr-2 h-3 w-3" />
              Regenerate
            </>
          )}
        </Button>
      </div>
    );
  }

  return (
    <Button
      className="w-full"
      disabled={isGenerating}
      onClick={onGenerate}
      variant="outline"
    >
      {isGenerating ? (
        <>
          <ArrowsClockwise className="mr-2 h-4 w-4 animate-spin" />
          Estimating...
        </>
      ) : (
        <>
          <Sparkle className="mr-2 h-4 w-4" />
          Estimate Difficulty
        </>
      )}
    </Button>
  );
}
