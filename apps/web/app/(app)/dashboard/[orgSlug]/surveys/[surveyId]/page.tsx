"use client";

import { ArrowLeft, Plus, Trash } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { use, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { H1, H3, Muted, Text } from "@/components/ui/typography";

const STATUS_COLORS = {
  draft: "gray",
  active: "green",
  paused: "yellow",
  closed: "red",
} as const;

const QUESTION_TYPE_LABELS = {
  rating: "Rating Scale",
  nps: "NPS (0-10)",
  text: "Free Text",
  single_choice: "Single Choice",
  multiple_choice: "Multiple Choice",
  boolean: "Yes / No",
} as const;

type QuestionType =
  | "rating"
  | "nps"
  | "text"
  | "single_choice"
  | "multiple_choice"
  | "boolean";

function getDefaultConfig(
  type: QuestionType,
  choices?: string[]
): Record<string, unknown> | undefined {
  if (type === "rating") {
    return {
      minValue: 1,
      maxValue: 5,
      minLabel: "Poor",
      maxLabel: "Excellent",
    };
  }
  if (type === "nps") {
    return {
      minValue: 0,
      maxValue: 10,
      minLabel: "Not likely",
      maxLabel: "Very likely",
    };
  }
  if ((type === "single_choice" || type === "multiple_choice") && choices) {
    return { choices };
  }
  if (type === "text") {
    return { placeholder: "Your answer...", maxLength: 1000 };
  }
  return undefined;
}

export default function SurveyDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; surveyId: string }>;
}) {
  const { orgSlug, surveyId } = use(params);
  const survey = useQuery(api.surveys.mutations.get, {
    surveyId: surveyId as Id<"surveys">,
  });
  const updateSurvey = useMutation(api.surveys.mutations.update);
  const updateStatus = useMutation(api.surveys.mutations.updateStatus);
  const addQuestion = useMutation(api.surveys.mutations.addQuestion);
  const updateQuestion = useMutation(api.surveys.mutations.updateQuestion);
  const deleteQuestion = useMutation(api.surveys.mutations.deleteQuestion);
  const analytics = useQuery(api.surveys.mutations.getAnalytics, {
    surveyId: surveyId as Id<"surveys">,
  });

  const [isAddQuestionOpen, setIsAddQuestionOpen] = useState(false);
  const [newQuestionType, setNewQuestionType] =
    useState<QuestionType>("rating");
  const [newQuestionTitle, setNewQuestionTitle] = useState("");
  const [newQuestionDescription, setNewQuestionDescription] = useState("");
  const [newQuestionRequired, setNewQuestionRequired] = useState(true);
  const [newQuestionChoices, setNewQuestionChoices] = useState("");

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState("");

  if (survey === undefined) {
    return (
      <div className="admin-container">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="mt-4 h-64 w-full" />
      </div>
    );
  }

  if (survey === null) {
    return (
      <div className="admin-container">
        <H1>Survey not found</H1>
      </div>
    );
  }

  const handleTitleSave = async () => {
    if (!editTitle.trim()) {
      return;
    }
    try {
      await updateSurvey({
        surveyId: survey._id,
        title: editTitle.trim(),
      });
      setIsEditingTitle(false);
      toast.success("Title updated");
    } catch {
      toast.error("Failed to update title");
    }
  };

  const handleAddQuestion = async () => {
    if (!newQuestionTitle.trim()) {
      return;
    }

    const hasChoices =
      newQuestionType === "single_choice" ||
      newQuestionType === "multiple_choice";
    const choices = hasChoices
      ? newQuestionChoices
          .split("\n")
          .map((c) => c.trim())
          .filter(Boolean)
      : undefined;

    try {
      await addQuestion({
        surveyId: survey._id,
        type: newQuestionType,
        title: newQuestionTitle.trim(),
        description: newQuestionDescription.trim() || undefined,
        required: newQuestionRequired,
        order: survey.questions.length,
        config: getDefaultConfig(
          newQuestionType,
          hasChoices ? choices : undefined
        ),
      });
      toast.success("Question added");
      setIsAddQuestionOpen(false);
      setNewQuestionTitle("");
      setNewQuestionDescription("");
      setNewQuestionType("rating");
      setNewQuestionRequired(true);
      setNewQuestionChoices("");
    } catch {
      toast.error("Failed to add question");
    }
  };

  const handleDeleteQuestion = async (questionId: Id<"surveyQuestions">) => {
    try {
      await deleteQuestion({ questionId });
      toast.success("Question deleted");
    } catch {
      toast.error("Failed to delete question");
    }
  };

  const handleStatusChange = async (
    status: "draft" | "active" | "paused" | "closed"
  ) => {
    try {
      await updateStatus({ surveyId: survey._id, status });
      toast.success(`Survey ${status}`);
    } catch {
      toast.error("Failed to update status");
    }
  };

  return (
    <div className="admin-container">
      <div className="mb-2">
        <a
          className="inline-flex items-center gap-1 text-muted-foreground text-sm hover:text-foreground"
          href={`/dashboard/${orgSlug}/surveys`}
        >
          <ArrowLeft className="size-4" />
          Back to Surveys
        </a>
      </div>

      <div className="mb-8 flex items-start justify-between">
        <div className="flex-1">
          {isEditingTitle ? (
            <div className="flex items-center gap-2">
              <Input
                autoFocus
                className="font-bold text-2xl"
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleTitleSave();
                  }
                  if (e.key === "Escape") {
                    setIsEditingTitle(false);
                  }
                }}
                value={editTitle}
              />
              <Button onClick={handleTitleSave} size="sm">
                Save
              </Button>
              <Button
                onClick={() => setIsEditingTitle(false)}
                size="sm"
                variant="ghost"
              >
                Cancel
              </Button>
            </div>
          ) : (
            <button
              className="flex items-center gap-2"
              onClick={() => {
                setEditTitle(survey.title);
                setIsEditingTitle(true);
              }}
              type="button"
            >
              <H1>{survey.title}</H1>
              <Badge variant={STATUS_COLORS[survey.status]}>
                {survey.status}
              </Badge>
            </button>
          )}
          {survey.description ? (
            <Text className="mt-1" variant="bodySmall">
              {survey.description}
            </Text>
          ) : null}
        </div>

        <StatusActions
          hasQuestions={survey.questions.length > 0}
          onStatusChange={handleStatusChange}
          status={survey.status}
        />
      </div>

      {analytics ? (
        <div className="mb-8 grid grid-cols-4 gap-4">
          <StatCard label="Responses" value={analytics.totalResponses} />
          <StatCard label="Completed" value={analytics.completedResponses} />
          <StatCard
            label="Completion Rate"
            value={`${analytics.completionRate}%`}
          />
          <StatCard label="Questions" value={survey.questions.length} />
        </div>
      ) : null}

      {analytics && analytics.questionStats.length > 0 ? (
        <div className="mb-8">
          <H3 className="mb-4">Response Analytics</H3>
          <div className="flex flex-col gap-4">
            {analytics.questionStats.map((stat) => (
              <div
                className="rounded-lg border bg-card p-4"
                key={stat.questionId}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{stat.title}</span>
                  <span className="text-muted-foreground text-xs">
                    {stat.totalAnswers} answers
                  </span>
                </div>
                {stat.averageValue === undefined ? null : (
                  <p className="mt-1 font-semibold text-lg">
                    Avg: {stat.averageValue}
                  </p>
                )}
                {stat.distribution && stat.distribution.length > 0 ? (
                  <div className="mt-2 flex flex-col gap-1">
                    {stat.distribution.map((d) => {
                      const counts = stat.distribution?.map((x) => x.count) ?? [
                        0,
                      ];
                      const maxCount = Math.max(...counts);
                      const pct =
                        maxCount > 0
                          ? Math.round((d.count / maxCount) * 100)
                          : 0;
                      return (
                        <div
                          className="flex items-center gap-2 text-sm"
                          key={d.label}
                        >
                          <span className="w-20 shrink-0 truncate text-muted-foreground text-xs">
                            {d.label}
                          </span>
                          <div className="relative h-5 flex-1 overflow-hidden rounded bg-muted">
                            <div
                              className="absolute inset-y-0 left-0 rounded bg-primary/20"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="w-8 shrink-0 text-right text-muted-foreground text-xs">
                            {d.count}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mb-4 flex items-center justify-between">
        <H3>Questions</H3>
        <Dialog onOpenChange={setIsAddQuestionOpen} open={isAddQuestionOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="mr-1.5 size-4" />
              Add Question
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Question</DialogTitle>
              <DialogDescription>
                Add a new question to your survey.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="q-type">Question Type</Label>
                <Select
                  onValueChange={(val) =>
                    setNewQuestionType(val as QuestionType)
                  }
                  value={newQuestionType}
                >
                  <SelectTrigger id="q-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(QUESTION_TYPE_LABELS).map(
                      ([val, label]) => (
                        <SelectItem key={val} value={val}>
                          {label}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="q-title">Question</Label>
                <Input
                  id="q-title"
                  onChange={(e) => setNewQuestionTitle(e.target.value)}
                  placeholder="e.g. How satisfied are you?"
                  value={newQuestionTitle}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="q-desc">Description (optional)</Label>
                <Input
                  id="q-desc"
                  onChange={(e) => setNewQuestionDescription(e.target.value)}
                  placeholder="Additional context for the question"
                  value={newQuestionDescription}
                />
              </div>
              {newQuestionType === "single_choice" ||
              newQuestionType === "multiple_choice" ? (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="q-choices">Choices (one per line)</Label>
                  <Textarea
                    id="q-choices"
                    onChange={(e) => setNewQuestionChoices(e.target.value)}
                    placeholder={"Option A\nOption B\nOption C"}
                    rows={4}
                    value={newQuestionChoices}
                  />
                </div>
              ) : null}
              <div className="flex items-center gap-2">
                <Switch
                  checked={newQuestionRequired}
                  id="q-required"
                  onCheckedChange={setNewQuestionRequired}
                />
                <Label htmlFor="q-required">Required</Label>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button
                disabled={!newQuestionTitle.trim()}
                onClick={handleAddQuestion}
              >
                Add Question
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {survey.questions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <Muted>
            No questions yet. Add your first question to get started.
          </Muted>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {survey.questions.map((question, index) => (
            <QuestionCard
              index={index}
              key={question._id}
              onDelete={handleDeleteQuestion}
              onUpdate={async (updates) => {
                try {
                  await updateQuestion({
                    questionId: question._id,
                    ...updates,
                  });
                  toast.success("Question updated");
                } catch {
                  toast.error("Failed to update question");
                }
              }}
              question={question}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StatusActions({
  status,
  hasQuestions,
  onStatusChange,
}: {
  status: "draft" | "active" | "paused" | "closed";
  hasQuestions: boolean;
  onStatusChange: (s: "draft" | "active" | "paused" | "closed") => void;
}) {
  if (status === "draft") {
    return (
      <Button
        disabled={!hasQuestions}
        onClick={() => onStatusChange("active")}
        size="sm"
      >
        Activate
      </Button>
    );
  }
  if (status === "active") {
    return (
      <Button
        onClick={() => onStatusChange("paused")}
        size="sm"
        variant="outline"
      >
        Pause
      </Button>
    );
  }
  if (status === "paused") {
    return (
      <div className="flex items-center gap-2">
        <Button onClick={() => onStatusChange("active")} size="sm">
          Resume
        </Button>
        <Button
          onClick={() => onStatusChange("closed")}
          size="sm"
          variant="outline"
        >
          Close
        </Button>
      </div>
    );
  }
  return (
    <Button onClick={() => onStatusChange("draft")} size="sm" variant="outline">
      Reopen as Draft
    </Button>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-muted-foreground text-sm">{label}</p>
      <p className="font-semibold text-2xl">{value}</p>
    </div>
  );
}

interface QuestionCardProps {
  index: number;
  onDelete: (id: Id<"surveyQuestions">) => void;
  onUpdate: (updates: { title?: string; required?: boolean }) => void;
  question: {
    _id: Id<"surveyQuestions">;
    type: QuestionType;
    title: string;
    description?: string;
    required: boolean;
    order: number;
    config?: {
      minValue?: number;
      maxValue?: number;
      minLabel?: string;
      maxLabel?: string;
      choices?: string[];
      placeholder?: string;
      maxLength?: number;
    };
  };
}

function QuestionCard({
  question,
  index,
  onDelete,
  onUpdate,
}: QuestionCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(question.title);

  return (
    <div className="group rounded-lg border bg-card p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted font-medium text-muted-foreground text-xs">
            {index + 1}
          </span>
          <div className="flex-1">
            {isEditing ? (
              <div className="flex items-center gap-2">
                <Input
                  autoFocus
                  onChange={(e) => setEditTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      onUpdate({ title: editTitle.trim() });
                      setIsEditing(false);
                    }
                    if (e.key === "Escape") {
                      setIsEditing(false);
                      setEditTitle(question.title);
                    }
                  }}
                  value={editTitle}
                />
                <Button
                  onClick={() => {
                    onUpdate({ title: editTitle.trim() });
                    setIsEditing(false);
                  }}
                  size="sm"
                >
                  Save
                </Button>
              </div>
            ) : (
              <button
                className="text-left font-medium"
                onClick={() => setIsEditing(true)}
                type="button"
              >
                {question.title}
              </button>
            )}
            {question.description ? (
              <p className="mt-0.5 text-muted-foreground text-sm">
                {question.description}
              </p>
            ) : null}
            <div className="mt-1 flex items-center gap-2">
              <Badge variant="secondary">
                {QUESTION_TYPE_LABELS[question.type]}
              </Badge>
              {question.required ? (
                <Badge variant="outline">Required</Badge>
              ) : null}
              {question.config?.choices ? (
                <span className="text-muted-foreground text-xs">
                  {question.config.choices.length} choices
                </span>
              ) : null}
              {question.config?.minValue !== undefined &&
              question.config?.maxValue !== undefined ? (
                <span className="text-muted-foreground text-xs">
                  {question.config.minValue}-{question.config.maxValue}
                </span>
              ) : null}
            </div>
          </div>
        </div>
        <Button
          className="opacity-0 transition-opacity group-hover:opacity-100"
          onClick={() => onDelete(question._id)}
          size="sm"
          variant="ghost"
        >
          <Trash className="size-4" />
        </Button>
      </div>
    </div>
  );
}
