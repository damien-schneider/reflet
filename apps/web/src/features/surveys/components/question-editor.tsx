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
import {
  ChartBar,
  CheckSquare,
  Plus,
  RadioButton,
  Star,
  TextAa,
  ToggleLeft,
} from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Muted } from "@/components/ui/typography";
import { QuestionCard } from "@/features/surveys/components/question-card";
import { QuestionInputPreview } from "@/features/surveys/components/question-input-preview";
import {
  getDefaultConfig,
  getDefaultTitle,
  QUESTION_TYPE_DESCRIPTIONS,
  QUESTION_TYPE_LABELS,
} from "@/features/surveys/lib/constants";
import { cn } from "@/lib/utils";
import type {
  QuestionConfig,
  QuestionType,
  SurveyQuestion,
} from "@/store/surveys";

const QUESTION_TYPE_ICON_MAP = {
  rating: Star,
  nps: ChartBar,
  text: TextAa,
  single_choice: RadioButton,
  multiple_choice: CheckSquare,
  boolean: ToggleLeft,
} as const;

const QUESTION_TYPES: QuestionType[] = [
  "rating",
  "nps",
  "text",
  "single_choice",
  "multiple_choice",
  "boolean",
];

// ---------------------------------------------------------------------------
// Add Question Panel — replaces the old generic dialog
// ---------------------------------------------------------------------------

type AddStep = "pick-type" | "configure";

interface AddQuestionPanelProps {
  onAdd: (question: {
    choices?: string[];
    config: Record<string, unknown> | undefined;
    description?: string;
    required: boolean;
    title: string;
    type: QuestionType;
  }) => void;
  onCancel: () => void;
}

function AddQuestionPanel({ onAdd, onCancel }: AddQuestionPanelProps) {
  const [step, setStep] = useState<AddStep>("pick-type");
  const [selectedType, setSelectedType] = useState<QuestionType>("rating");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [required, setRequired] = useState(true);
  const [choices, setChoices] = useState("Option 1\nOption 2\nOption 3");
  const [minLabel, setMinLabel] = useState("");
  const [maxLabel, setMaxLabel] = useState("");

  const handleSelectType = (type: QuestionType) => {
    setSelectedType(type);
    setTitle(getDefaultTitle(type));
    const config = getDefaultConfig(type);
    setMinLabel((config?.minLabel as string) ?? "");
    setMaxLabel((config?.maxLabel as string) ?? "");
    if (type === "single_choice" || type === "multiple_choice") {
      setChoices(
        (config?.choices as string[])?.join("\n") ??
          "Option 1\nOption 2\nOption 3"
      );
    }
    setStep("configure");
  };

  const buildConfig = (): Record<string, unknown> | undefined => {
    const hasChoices =
      selectedType === "single_choice" || selectedType === "multiple_choice";
    const parsedChoices = hasChoices
      ? choices
          .split("\n")
          .map((c) => c.trim())
          .filter(Boolean)
      : undefined;
    const base = getDefaultConfig(selectedType, parsedChoices);
    if (!base) {
      return undefined;
    }

    if (selectedType === "rating" || selectedType === "nps") {
      return {
        ...base,
        minLabel: minLabel || base.minLabel,
        maxLabel: maxLabel || base.maxLabel,
      };
    }
    return base;
  };

  const handleSubmit = () => {
    if (!title.trim()) {
      return;
    }
    onAdd({
      type: selectedType,
      title: title.trim(),
      description: description.trim() || undefined,
      required,
      config: buildConfig(),
    });
  };

  // Preview config for the live preview
  const previewConfig = buildConfig();

  if (step === "pick-type") {
    return (
      <div className="overflow-hidden rounded-xl border border-primary/40 border-dashed bg-card">
        <div className="border-b bg-muted/30 px-5 py-3">
          <div className="flex items-center justify-between">
            <p className="font-medium text-sm">Choose a question type</p>
            <Button onClick={onCancel} size="sm" variant="ghost">
              Cancel
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 p-5">
          {QUESTION_TYPES.map((type) => {
            const Icon = QUESTION_TYPE_ICON_MAP[type];
            return (
              <button
                className="group/type flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-all hover:border-primary/50 hover:bg-primary/5"
                key={type}
                onClick={() => handleSelectType(type)}
                type="button"
              >
                <div className="flex size-9 items-center justify-center rounded-lg bg-muted transition-colors group-hover/type:bg-primary/10">
                  <Icon className="size-5 text-muted-foreground transition-colors group-hover/type:text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">
                    {QUESTION_TYPE_LABELS[type]}
                  </p>
                  <p className="mt-0.5 text-muted-foreground text-xs leading-snug">
                    {QUESTION_TYPE_DESCRIPTIONS[type]}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Step 2: Configure — side-by-side form + live preview
  const hasChoices =
    selectedType === "single_choice" || selectedType === "multiple_choice";
  const hasRange = selectedType === "rating" || selectedType === "nps";

  return (
    <div className="overflow-hidden rounded-xl border border-primary/40 border-dashed bg-card">
      <div className="border-b bg-muted/30 px-5 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              className="text-muted-foreground text-sm hover:text-foreground"
              onClick={() => setStep("pick-type")}
              type="button"
            >
              Change type
            </button>
            <span className="text-muted-foreground/40">|</span>
            <div className="flex items-center gap-1.5">
              {(() => {
                const Icon = QUESTION_TYPE_ICON_MAP[selectedType];
                return <Icon className="size-4 text-primary" />;
              })()}
              <span className="font-medium text-sm">
                {QUESTION_TYPE_LABELS[selectedType]}
              </span>
            </div>
          </div>
          <Button onClick={onCancel} size="sm" variant="ghost">
            Cancel
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 divide-x">
        {/* Left: Configuration form */}
        <div className="flex flex-col gap-4 p-5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-q-title">Question</Label>
            <Input
              autoFocus
              id="new-q-title"
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. How satisfied are you?"
              value={title}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-q-desc">
              Description{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </Label>
            <Input
              id="new-q-desc"
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Additional context for respondents"
              value={description}
            />
          </div>

          {hasChoices ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-q-choices">Choices (one per line)</Label>
              <Textarea
                id="new-q-choices"
                onChange={(e) => setChoices(e.target.value)}
                placeholder={"Option A\nOption B\nOption C"}
                rows={4}
                value={choices}
              />
            </div>
          ) : null}

          {hasRange ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="new-q-min-label">Low label</Label>
                <Input
                  id="new-q-min-label"
                  onChange={(e) => setMinLabel(e.target.value)}
                  placeholder="e.g. Poor"
                  value={minLabel}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="new-q-max-label">High label</Label>
                <Input
                  id="new-q-max-label"
                  onChange={(e) => setMaxLabel(e.target.value)}
                  placeholder="e.g. Excellent"
                  value={maxLabel}
                />
              </div>
            </div>
          ) : null}

          <div className="flex items-center gap-2">
            <Switch
              checked={required}
              id="new-q-required"
              onCheckedChange={setRequired}
            />
            <Label htmlFor="new-q-required">Required</Label>
          </div>

          <div className="mt-2 flex items-center gap-2">
            <Button disabled={!title.trim()} onClick={handleSubmit} size="sm">
              <Plus className="mr-1.5 size-4" />
              Add Question
            </Button>
          </div>
        </div>

        {/* Right: Live preview */}
        <div className="bg-muted/20 p-5">
          <p className="mb-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">
            Preview
          </p>
          <div className="rounded-lg border bg-card p-5 shadow-sm">
            <p className="font-medium">
              {title || "Your question here"}
              {required ? (
                <span className="ml-1 text-destructive">*</span>
              ) : null}
            </p>
            {description ? (
              <p className="mt-1 text-muted-foreground text-sm">
                {description}
              </p>
            ) : null}
            <div className="mt-4">
              <QuestionInputPreview
                config={previewConfig as QuestionConfig | undefined}
                type={selectedType}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sortable wrapper
// ---------------------------------------------------------------------------

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
          surveyId,
          questionIds: reordered.map((q) => q._id),
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
          surveyId,
          type: question.type,
          title: question.title,
          description: question.description,
          required: question.required,
          order: questions.length,
          config: question.config,
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
