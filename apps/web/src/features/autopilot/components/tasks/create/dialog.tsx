"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { IconPlus } from "@tabler/icons-react";
import { useMutation } from "convex/react";
import type { KeyboardEvent } from "react";
import { useEffect, useReducer, useRef } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import {
  ComposerFields,
  CreateDialogFooter,
  CreateDialogHeader,
} from "@/features/autopilot/components/tasks/create/layout";
import { CreateProperties } from "@/features/autopilot/components/tasks/create/property-controls";
import {
  createTaskReducer,
  formatTeamKey,
  INITIAL_CREATE_STATE,
} from "@/features/autopilot/components/tasks/create/state";
import { cn } from "@/lib/utils";

interface CreateTaskDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: Id<"organizations">;
  teamKey?: string;
}

export function CreateTaskDialog({
  isOpen,
  onOpenChange,
  organizationId,
  teamKey,
}: CreateTaskDialogProps) {
  const [state, dispatch] = useReducer(createTaskReducer, INITIAL_CREATE_STATE);
  const titleRef = useRef<HTMLInputElement>(null);
  const createWorkItem = useMutation(
    api.autopilot.mutations.work.createWorkItem
  );

  useEffect(
    function resetWhenClosed() {
      if (!isOpen) {
        dispatch({ kind: "resetAll" });
      }
    },
    [isOpen]
  );

  useEffect(
    function focusTitleWhenOpened() {
      if (!isOpen) {
        return undefined;
      }
      const handle = setTimeout(() => titleRef.current?.focus(), 0);
      return () => clearTimeout(handle);
    },
    [isOpen]
  );

  const trimmedTitle = state.title.trim();
  const trimmedDescription = state.description.trim();
  const canSubmit = trimmedTitle.length > 0 && !state.submitting;

  const handleCreate = async () => {
    if (trimmedTitle.length === 0) {
      toast.error("Issue title is required");
      titleRef.current?.focus();
      return;
    }
    dispatch({ kind: "setSubmitting", value: true });
    try {
      await createWorkItem({
        organizationId,
        type: state.type,
        title: trimmedTitle,
        description: trimmedDescription,
        priority: state.priority,
        status: state.status,
        isPublicRoadmap: state.isPublic || undefined,
      });
      handleCreateSuccess();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create issue";
      toast.error(message);
      dispatch({ kind: "setSubmitting", value: false });
    }
  };

  const handleCreateSuccess = () => {
    toast.success("Issue created");
    if (state.createMore) {
      dispatch({ kind: "resetAfterCreate" });
      titleRef.current?.focus();
      return;
    }
    dispatch({ kind: "resetAll" });
    onOpenChange(false);
  };

  const handleUnexpectedCreateError = (error: unknown) => {
    const message =
      error instanceof Error ? error.message : "Failed to create issue";
    toast.error(message);
  };

  const submitCreate = () => {
    handleCreate().catch(handleUnexpectedCreateError);
  };

  const handleCreateShortcut = (
    event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    if (event.key !== "Enter" || !(event.metaKey || event.ctrlKey)) {
      return;
    }
    event.preventDefault();
    submitCreate();
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={isOpen}>
      <DialogTrigger render={<Button className="gap-2" size="sm" />}>
        <IconPlus className="size-4" />
        New Task
      </DialogTrigger>
      <DialogContent
        className={cn(
          "gap-0 rounded-xl border bg-card/95 p-0 shadow-2xl",
          state.expanded
            ? "h-[calc(100dvh-2rem)] max-w-[calc(100vw-2rem)]"
            : "h-[min(560px,calc(100dvh-2rem))] max-w-[min(980px,calc(100vw-2rem))]"
        )}
        showCloseButton={false}
      >
        <CreateDialogHeader
          expanded={state.expanded}
          onExpandedChange={() => dispatch({ kind: "toggleExpanded" })}
          teamKey={formatTeamKey(teamKey)}
        />
        <div className="flex min-h-0 flex-1 flex-col px-5 pt-6 sm:px-8">
          <ComposerFields
            description={state.description}
            disabled={state.submitting}
            onDescriptionChange={(value) =>
              dispatch({ kind: "setDescription", value })
            }
            onKeyDown={handleCreateShortcut}
            onTitleChange={(value) => dispatch({ kind: "setTitle", value })}
            title={state.title}
            titleRef={titleRef}
          />
          <CreateProperties
            isPublic={state.isPublic}
            onPriorityChange={(value) =>
              dispatch({ kind: "setPriority", value })
            }
            onPublicChange={(value) => dispatch({ kind: "setPublic", value })}
            onStatusChange={(value) => dispatch({ kind: "setStatus", value })}
            onTypeChange={(value) => dispatch({ kind: "setType", value })}
            priority={state.priority}
            status={state.status}
            type={state.type}
          />
        </div>
        <CreateDialogFooter
          canSubmit={canSubmit}
          createMore={state.createMore}
          onCreateMoreChange={(value) =>
            dispatch({ kind: "setCreateMore", value })
          }
          onSubmit={submitCreate}
          submitting={state.submitting}
        />
      </DialogContent>
    </Dialog>
  );
}
