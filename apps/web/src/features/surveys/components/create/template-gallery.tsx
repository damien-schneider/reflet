"use client";

import { cn } from "@ctrl-ui/react/lib/cn";
import { FilePlus, Sparkle } from "@phosphor-icons/react";
import { type ReactNode, useId } from "react";
import { FlowGlyph } from "@/features/surveys/components/create/flow-glyph";
import { SURVEY_TEMPLATES } from "@/features/surveys/lib/templates/survey-templates";
import type { SurveyTemplate } from "@/features/surveys/lib/templates/template-draft";

interface TemplateGalleryProps {
  onDescribe: () => void;
  onPickTemplate: (template: SurveyTemplate) => void;
  onStartFromScratch: () => void;
}

export function TemplateGallery({
  onDescribe,
  onPickTemplate,
  onStartFromScratch,
}: TemplateGalleryProps) {
  const headingId = useId();
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <GalleryCard
          description="An empty flow you build step by step."
          icon={
            <FilePlus aria-hidden className="size-5 text-muted-foreground" />
          }
          isDashed
          onClick={onStartFromScratch}
          title="Start from scratch"
        />
        <GalleryCard
          description="Say what you want to learn. AI drafts the questions and branches."
          icon={<Sparkle aria-hidden className="size-5 text-primary" />}
          isDashed
          onClick={onDescribe}
          title="Describe it"
        />
      </div>
      <section aria-labelledby={headingId} className="flex flex-col gap-2">
        <h3
          className="font-medium text-muted-foreground text-xs"
          id={headingId}
        >
          Templates
        </h3>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {SURVEY_TEMPLATES.map((template) => {
            const count = template.questions.length;
            const branchCount = template.questions.reduce(
              (total, question) => total + (question.logic?.length ?? 0),
              0
            );
            return (
              <li className="flex" key={template.id}>
                <GalleryCard
                  description={template.description}
                  footer={`${count} questions · ${branchCount === 1 ? "1 branch" : `${branchCount} branches`}`}
                  icon={
                    <FlowGlyph
                      endings={template.endings}
                      questions={template.questions}
                    />
                  }
                  onClick={() => onPickTemplate(template)}
                  title={template.name}
                />
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

interface GalleryCardProps {
  description: string;
  footer?: string;
  icon: ReactNode;
  isDashed?: boolean;
  onClick: () => void;
  title: string;
}

function GalleryCard({
  description,
  footer,
  icon,
  isDashed = false,
  onClick,
  title,
}: GalleryCardProps) {
  return (
    <button
      className={cn(
        "flex w-full flex-col items-start gap-1.5 rounded-xl border p-4 text-left",
        "transition-colors duration-150 hover:border-foreground/25 hover:bg-muted/40 motion-reduce:transition-none",
        "focus-visible:outline-2 focus-visible:outline-ring",
        isDashed && "border-dashed"
      )}
      onClick={onClick}
      type="button"
    >
      <span className="flex h-10 items-center">{icon}</span>
      <span className="font-medium text-sm">{title}</span>
      <span className="text-pretty text-muted-foreground text-xs">
        {description}
      </span>
      {footer ? (
        <span className="mt-auto pt-1 text-muted-foreground text-xs tabular-nums">
          {footer}
        </span>
      ) : null}
    </button>
  );
}
