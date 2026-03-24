"use client";

import { ClipboardText, Plus, Trash } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { H1, Muted, Text } from "@/components/ui/typography";

const STATUS_COLORS = {
  draft: "gray",
  active: "green",
  paused: "yellow",
  closed: "red",
} as const;

const TRIGGER_LABELS = {
  manual: "Manual",
  page_visit: "Page Visit",
  time_delay: "Time Delay",
  exit_intent: "Exit Intent",
  feedback_submitted: "After Feedback",
} as const;

type TriggerType =
  | "manual"
  | "page_visit"
  | "time_delay"
  | "exit_intent"
  | "feedback_submitted";

export default function SurveysPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);
  const org = useQuery(api.organizations.queries.getBySlug, { slug: orgSlug });
  const surveys = useQuery(
    api.surveys.mutations.list,
    org?._id ? { organizationId: org._id } : "skip"
  );
  const createSurvey = useMutation(api.surveys.mutations.create);
  const updateStatus = useMutation(api.surveys.mutations.updateStatus);
  const deleteSurveyMutation = useMutation(api.surveys.mutations.deleteSurvey);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [triggerType, setTriggerType] = useState<TriggerType>("manual");
  const [statusFilter, setStatusFilter] = useState("all");

  const handleCreate = async () => {
    if (!(org?._id && title.trim())) {
      return;
    }

    try {
      await createSurvey({
        organizationId: org._id,
        title: title.trim(),
        description: description.trim() || undefined,
        triggerType,
        questions: [],
      });
      toast.success("Survey created");
      setIsCreateOpen(false);
      setTitle("");
      setDescription("");
      setTriggerType("manual");
    } catch {
      toast.error("Failed to create survey");
    }
  };

  const handleStatusChange = async (
    surveyId: Id<"surveys">,
    status: "draft" | "active" | "paused" | "closed"
  ) => {
    try {
      await updateStatus({ surveyId, status });
      toast.success(`Survey ${status}`);
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async (surveyId: Id<"surveys">) => {
    try {
      await deleteSurveyMutation({ surveyId });
      toast.success("Survey deleted");
    } catch {
      toast.error("Failed to delete survey");
    }
  };

  const filteredSurveys =
    statusFilter === "all"
      ? surveys
      : surveys?.filter((s) => s.status === statusFilter);

  if (!org) {
    return (
      <div className="admin-container">
        <Skeleton className="h-8 w-48" />
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <H1>Surveys</H1>
          <Text variant="bodySmall">
            Create and manage surveys to collect structured feedback
          </Text>
        </div>
        <Dialog onOpenChange={setIsCreateOpen} open={isCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1.5 size-4" />
              New Survey
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Survey</DialogTitle>
              <DialogDescription>
                Create a new survey to collect structured feedback from your
                users.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="survey-title">Title</Label>
                <Input
                  id="survey-title"
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Product Satisfaction"
                  value={title}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="survey-desc">Description (optional)</Label>
                <Input
                  id="survey-desc"
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of this survey"
                  value={description}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="survey-trigger">Trigger</Label>
                <Select
                  onValueChange={(val) => setTriggerType(val as TriggerType)}
                  value={triggerType}
                >
                  <SelectTrigger id="survey-trigger">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="page_visit">Page Visit</SelectItem>
                    <SelectItem value="time_delay">Time Delay</SelectItem>
                    <SelectItem value="exit_intent">Exit Intent</SelectItem>
                    <SelectItem value="feedback_submitted">
                      After Feedback
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button disabled={!title.trim()} onClick={handleCreate}>
                Create Survey
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs onValueChange={setStatusFilter} value={statusFilter}>
        <TabsList variant="line">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="draft">Draft</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="paused">Paused</TabsTrigger>
          <TabsTrigger value="closed">Closed</TabsTrigger>
        </TabsList>

        <TabsContent className="mt-4" value={statusFilter}>
          <SurveyListContent
            filteredSurveys={filteredSurveys}
            onDelete={handleDelete}
            onStatusChange={handleStatusChange}
            orgSlug={orgSlug}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface SurveyItem {
  _id: Id<"surveys">;
  completionRate: number;
  createdAt: number;
  description?: string;
  questionCount: number;
  responseCount: number;
  status: "draft" | "active" | "paused" | "closed";
  title: string;
  triggerType: TriggerType;
}

function SurveyListContent({
  filteredSurveys,
  orgSlug,
  onStatusChange,
  onDelete,
}: {
  filteredSurveys: SurveyItem[] | undefined;
  orgSlug: string;
  onStatusChange: (
    surveyId: Id<"surveys">,
    status: "draft" | "active" | "paused" | "closed"
  ) => void;
  onDelete: (surveyId: Id<"surveys">) => void;
}) {
  if (!filteredSurveys) {
    return (
      <div className="flex flex-col gap-3">
        {["sk-1", "sk-2", "sk-3"].map((id) => (
          <Skeleton className="h-24 w-full" key={id} />
        ))}
      </div>
    );
  }

  if (filteredSurveys.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <ClipboardText className="mb-4 size-12 text-muted-foreground" />
        <Muted>No surveys found</Muted>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {filteredSurveys.map((survey) => (
        <SurveyCard
          key={survey._id}
          onDelete={onDelete}
          onStatusChange={onStatusChange}
          orgSlug={orgSlug}
          survey={survey}
        />
      ))}
    </div>
  );
}

interface SurveyCardProps {
  onDelete: (surveyId: Id<"surveys">) => void;
  onStatusChange: (
    surveyId: Id<"surveys">,
    status: "draft" | "active" | "paused" | "closed"
  ) => void;
  orgSlug: string;
  survey: SurveyItem;
}

function SurveyCard({
  survey,
  orgSlug,
  onStatusChange,
  onDelete,
}: SurveyCardProps) {
  return (
    <div className="group relative rounded-lg border bg-card p-4 transition-colors hover:bg-accent/50">
      <div className="flex items-start justify-between">
        <a
          className="flex-1"
          href={`/dashboard/${orgSlug}/surveys/${survey._id}`}
        >
          <div className="flex items-center gap-2">
            <span className="font-medium">{survey.title}</span>
            <Badge variant={STATUS_COLORS[survey.status]}>
              {survey.status}
            </Badge>
          </div>
          {survey.description ? (
            <p className="mt-1 text-muted-foreground text-sm">
              {survey.description}
            </p>
          ) : null}
          <div className="mt-2 flex items-center gap-4 text-muted-foreground text-xs">
            <span>{survey.questionCount} questions</span>
            <span>{survey.responseCount} responses</span>
            <span>{survey.completionRate}% completion</span>
            <span>{TRIGGER_LABELS[survey.triggerType]}</span>
            <span>
              {formatDistanceToNow(survey.createdAt, { addSuffix: true })}
            </span>
          </div>
        </a>
        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          {survey.status === "draft" ? (
            <Button
              onClick={() => onStatusChange(survey._id, "active")}
              size="sm"
              variant="outline"
            >
              Activate
            </Button>
          ) : null}
          {survey.status === "active" ? (
            <Button
              onClick={() => onStatusChange(survey._id, "paused")}
              size="sm"
              variant="outline"
            >
              Pause
            </Button>
          ) : null}
          {survey.status === "paused" ? (
            <Button
              onClick={() => onStatusChange(survey._id, "active")}
              size="sm"
              variant="outline"
            >
              Resume
            </Button>
          ) : null}
          <Button
            onClick={() => onDelete(survey._id)}
            size="sm"
            variant="ghost"
          >
            <Trash className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
