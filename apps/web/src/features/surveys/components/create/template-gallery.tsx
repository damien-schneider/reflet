"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardLink,
  CardTitle,
} from "@ctrl-ui/react/ui/card";
import { Text } from "@ctrl-ui/react/ui/typography";
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
        <StartCard
          description="An empty flow you build step by step."
          icon={<FilePlus aria-hidden className="text-muted-foreground" />}
          onClick={onStartFromScratch}
          title="Start from scratch"
        />
        <StartCard
          description="Say what you want to learn. AI drafts the questions and branches."
          icon={<Sparkle aria-hidden className="text-primary" />}
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
  onClick: () => void;
  title: string;
}

function StartCard({
  description,
  icon,
  onClick,
  title,
}: Omit<GalleryCardProps, "footer">) {
  return (
    <Button
      className="w-full items-start justify-start whitespace-normal text-left [--cui-button-foreground:var(--foreground)] [--cui-button-icon:calc(var(--spacing)*5)] [--cui-button-padding-block:calc(var(--spacing)*4)] [--cui-button-padding-inline:calc(var(--spacing)*4)]"
      layout="tile"
      onClick={onClick}
      variant="dashed"
    >
      {icon}
      <span>{title}</span>
      <Text size="label" tone="muted" weight="normal">
        {description}
      </Text>
    </Button>
  );
}

function GalleryCard({
  description,
  footer,
  icon,
  onClick,
  title,
}: GalleryCardProps) {
  return (
    <Card className="w-full" size="sm">
      <CardHeader>
        <span className="flex h-10 items-center">{icon}</span>
        <CardTitle>
          <CardLink onClick={onClick}>{title}</CardLink>
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      {footer ? (
        <CardFooter className="mt-auto">
          <Text as="span" numeric size="caption" tone="muted">
            {footer}
          </Text>
        </CardFooter>
      ) : null}
    </Card>
  );
}
