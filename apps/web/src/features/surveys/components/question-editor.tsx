"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Muted } from "@/components/ui/typography";
import { QuestionCard } from "@/features/surveys/components/question-card";
import { cn } from "@/lib/utils";
import type {
  QuestionConfig,
  QuestionType,
  SurveyQuestion,
} from "@/store/surveys";
import { AddQuestionPanel } from "./add-question-panel";

interface SortableQuestionProps {
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

function SortableQuestion({
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
    opacity: isDragging ? 0.5 : 1,
    transform: CSS.Transform.toString(transform),
    transition,
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

// ---------------------------------------------------------------------------
// Main QuestionEditor
// ---------------------------------------------------------------------------

interface QuestionEditorProps {
  questions: SurveyQuestion[];
  surveyId: Id<"surveys">;
}

export function QuestionEditor({ questions, surveyId }: QuestionEditorProps) {
  const addQuestion = useMutation(api.surveys.mutations.addQuestion);
  const updateQuestion = useMutation(api.surveys.mutations.updateQuestion);
  const deleteQuestion = useMutation(api.surveys.mutations.deleteQuestion);
  const reorderQuestions = useMutation(api.surveys.mutations.reorderQuestions);

  const [activeQuestionId, setActiveQuestionId] =
    useState<Id<"surveyQuestions"> | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) {
        return;
      }

      const oldIndex = questions.findIndex((q) => q._id === active.id);
      const newIndex = questions.findIndex((q) => q._id === over.id);
      if (oldIndex === -1 || newIndex === -1) {
        return;
      }

      const reordered = [...questions];
      const [moved] = reordered.splice(oldIndex, 1);
      reordered.splice(newIndex, 0, moved);

      try {
        await reorderQuestions({
          questionIds: reordered.map((q) => q._id),
          surveyId,
        });
      } catch {
        toast.error("Failed to reorder questions");
      }
    },
    [questions, reorderQuestions, surveyId]
  );

  const handleAddQuestion = useCallback(
    async (question: {
      config: Record<string, unknown> | undefined;
      description?: string;
      required: boolean;
      title: string;
      type: QuestionType;
    }) => {
      try {
        await addQuestion({
          config: question.config,
          description: question.description,
          order: questions.length,
          required: question.required,
          surveyId,
          title: question.title,
          type: question.type,
        });
        toast.success("Question added");
        setIsAdding(false);
      } catch {
        toast.error("Failed to add question");
      }
    },
    [addQuestion, questions.length, surveyId]
  );

  const handleUpdateQuestion = useCallback(
    async (
      questionId: Id<"surveyQuestions">,
      updates: {
        config?: QuestionConfig;
        description?: string;
        required?: boolean;
        title?: string;
      }
    ) => {
      try {
        await updateQuestion({ questionId, ...updates });
      } catch {
        toast.error("Failed to update question");
      }
    },
    [updateQuestion]
  );

  const handleDeleteQuestion = useCallback(
    async (questionId: Id<"surveyQuestions">) => {
      try {
        await deleteQuestion({ questionId });
        toast.success("Question deleted");
        if (activeQuestionId === questionId) {
          setActiveQuestionId(null);
        }
      } catch {
        toast.error("Failed to delete question");
      }
    },
    [activeQuestionId, deleteQuestion]
  );

  const questionIds = questions.map((q) => q._id);

  return (
    <div>
      {questions.length === 0 && !isAdding ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <Muted className="mb-4">
            No questions yet. Add your first question to get started.
          </Muted>
          <Button onClick={() => setIsAdding(true)} size="sm">
            <Plus className="mr-1.5 size-4" />
            Add Question
          </Button>
        </div>
      ) : (
        <>
          <DndContext
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            sensors={sensors}
          >
            <SortableContext
              items={questionIds}
              strategy={verticalListSortingStrategy}
            >
              <div className="flex flex-col gap-3">
                {questions.map((question, index) => (
                  <SortableQuestion
                    activeQuestionId={activeQuestionId}
                    index={index}
                    key={question._id}
                    onActivate={setActiveQuestionId}
                    onDelete={handleDeleteQuestion}
                    onUpdate={handleUpdateQuestion}
                    question={question}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          <div className="mt-4">
            {isAdding ? (
              <AddQuestionPanel
                onAdd={handleAddQuestion}
                onCancel={() => setIsAdding(false)}
              />
            ) : (
              <button
                className={cn(
                  "flex w-full items-center justify-center gap-2 rounded-lg border border-dashed py-4",
                  "text-muted-foreground text-sm transition-colors",
                  "hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                )}
                onClick={() => setIsAdding(true)}
                type="button"
              >
                <Plus className="size-4" />
                Add question
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
