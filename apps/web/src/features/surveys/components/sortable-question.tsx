"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { QuestionCard } from "@/features/surveys/components/question-card";
import type { QuestionConfig, SurveyQuestion } from "@/store/surveys";

export interface SortableQuestionProps {
  activeQuestionId: Id<"surveyQuestions"> | null;
  index: number;
  onActivate: (id: Id<"surveyQuestions">) => void;
  onDelete: (id: Id<"surveyQuestions">) => void;
  onUpdate: (
    id: Id<"surveyQuestions">,
    updates: {
      config?: QuestionConfig;
      description?: string;
      required?: boolean;
      title?: string;
    }
  ) => void;
  question: SurveyQuestion;
}

export function SortableQuestion({
  question,
  index,
  activeQuestionId,
  onActivate,
  onDelete,
  onUpdate,
}: SortableQuestionProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <QuestionCard
        dragHandleProps={listeners}
        index={index}
        isActive={activeQuestionId === question._id}
        onActivate={() => onActivate(question._id)}
        onDelete={onDelete}
        onUpdate={(updates) => onUpdate(question._id, updates)}
        question={question}
      />
    </div>
  );
}
