"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@ctrl-ui/react/ui/empty";
import { toast } from "@ctrl-ui/react/ui/toast";
import {
  type Announcements,
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
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
import { useState } from "react";
import {
  AddQuestionPanel,
  type NewQuestion,
} from "@/features/surveys/components/add-question-panel";
import { QuestionCard } from "@/features/surveys/components/question-card";
import type { QuestionUpdate } from "@/features/surveys/components/question-edit-fields";
import type { SurveyQuestion } from "@/store/surveys";

interface SortableQuestionProps {
  isActive: boolean;
  onDelete: () => void;
  onMove: (offset: -1 | 1) => void;
  onToggle: () => void;
  onUpdate: (updates: QuestionUpdate) => void;
  position: { index: number; total: number };
  question: SurveyQuestion;
}

function SortableQuestion({ question, ...cardProps }: SortableQuestionProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question._id });

  return (
    <li
      className={isDragging ? "relative z-10 opacity-80" : undefined}
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <QuestionCard
        {...cardProps}
        handleProps={{ ...attributes, ...listeners }}
        question={question}
      />
    </li>
  );
}

function getAnnouncements(questions: SurveyQuestion[]): Announcements {
  const describe = (id: string | number) => {
    const index = questions.findIndex((q) => q._id === id);
    return `question ${index + 1}, “${questions[index]?.title ?? ""}”`;
  };
  const positionOf = (id: string | number) =>
    `position ${questions.findIndex((q) => q._id === id) + 1} of ${questions.length}`;

  return {
    onDragCancel: ({ active }) =>
      `Reordering cancelled. ${describe(active.id)} stayed in place.`,
    onDragEnd: ({ active, over }) =>
      over
        ? `Moved ${describe(active.id)} to ${positionOf(over.id)}.`
        : `${describe(active.id)} was dropped.`,
    onDragOver: ({ active, over }) =>
      over
        ? `${describe(active.id)} is over ${positionOf(over.id)}.`
        : undefined,
    onDragStart: ({ active }) => `Picked up ${describe(active.id)}.`,
  };
}

interface QuestionEditorProps {
  questions: SurveyQuestion[];
  surveyId: Id<"surveys">;
}

export function QuestionEditor({ questions, surveyId }: QuestionEditorProps) {
  const addQuestion = useMutation(api.surveys.mutations.addQuestion);
  const updateQuestion = useMutation(api.surveys.mutations.updateQuestion);
  const deleteQuestion = useMutation(api.surveys.mutations.deleteQuestion);
  const reorderQuestions = useMutation(
    api.surveys.mutations.reorderQuestions
  ).withOptimisticUpdate((store, { questionIds }) => {
    const survey = store.getQuery(api.surveys.queries.get, { surveyId });
    if (!survey) {
      return;
    }
    const byId = new Map(survey.questions.map((q) => [q._id, q]));
    const reordered = questionIds.flatMap((id, order) => {
      const question = byId.get(id);
      return question ? [{ ...question, order }] : [];
    });
    store.setQuery(
      api.surveys.queries.get,
      { surveyId },
      { ...survey, questions: reordered }
    );
  });

  const [activeQuestionId, setActiveQuestionId] =
    useState<Id<"surveyQuestions"> | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const moveQuestion = async (fromIndex: number, toIndex: number) => {
    const isOutOfRange =
      fromIndex < 0 || toIndex < 0 || toIndex >= questions.length;
    if (isOutOfRange || fromIndex === toIndex) {
      return;
    }
    try {
      await reorderQuestions({
        questionIds: arrayMove(questions, fromIndex, toIndex).map((q) => q._id),
        surveyId,
      });
    } catch {
      toast.error("Couldn’t reorder questions. Try again.");
    }
  };

  const handleDragEnd = async ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) {
      return;
    }
    await moveQuestion(
      questions.findIndex((q) => q._id === active.id),
      questions.findIndex((q) => q._id === over.id)
    );
  };

  const handleAddQuestion = async (question: NewQuestion) => {
    try {
      await addQuestion({ ...question, order: questions.length, surveyId });
      setIsAdding(false);
    } catch {
      toast.error("Couldn’t add the question. Try again.");
    }
  };

  const handleUpdateQuestion = async (
    questionId: Id<"surveyQuestions">,
    updates: QuestionUpdate
  ) => {
    try {
      await updateQuestion({ questionId, ...updates });
    } catch {
      toast.error("Couldn’t save the question. Try again.");
    }
  };

  const handleDeleteQuestion = async (questionId: Id<"surveyQuestions">) => {
    try {
      await deleteQuestion({ questionId });
      if (activeQuestionId === questionId) {
        setActiveQuestionId(null);
      }
    } catch {
      toast.error("Couldn’t delete the question. Try again.");
    }
  };

  if (questions.length === 0 && !isAdding) {
    return (
      <Empty className="rounded-lg border border-dashed py-16">
        <EmptyHeader>
          <EmptyTitle>No questions yet</EmptyTitle>
          <EmptyDescription>
            Add a question to start building this survey.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button
            onClick={() => setIsAdding(true)}
            tone="primary"
            variant="solid"
          >
            <Plus aria-hidden className="size-4" />
            Add question
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <DndContext
        accessibility={{
          announcements: getAnnouncements(questions),
          screenReaderInstructions: {
            draggable:
              "To reorder, press space or enter to pick up a question, use the arrow keys to move it, then press space or enter to drop it. Press escape to cancel. You can also use Move up and Move down in the question’s actions menu.",
          },
        }}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        sensors={sensors}
      >
        <SortableContext
          items={questions.map((q) => q._id)}
          strategy={verticalListSortingStrategy}
        >
          <ol aria-label="Questions" className="flex flex-col gap-3">
            {questions.map((question, index) => (
              <SortableQuestion
                isActive={activeQuestionId === question._id}
                key={question._id}
                onDelete={() => handleDeleteQuestion(question._id)}
                onMove={(offset) => moveQuestion(index, index + offset)}
                onToggle={() =>
                  setActiveQuestionId((current) =>
                    current === question._id ? null : question._id
                  )
                }
                onUpdate={(updates) =>
                  handleUpdateQuestion(question._id, updates)
                }
                position={{ index, total: questions.length }}
                question={question}
              />
            ))}
          </ol>
        </SortableContext>
      </DndContext>

      {isAdding ? (
        <AddQuestionPanel
          onAdd={handleAddQuestion}
          onCancel={() => setIsAdding(false)}
        />
      ) : (
        <Button
          className="w-full"
          onClick={() => setIsAdding(true)}
          variant="surface"
        >
          <Plus aria-hidden className="size-4" />
          Add question
        </Button>
      )}
    </div>
  );
}
