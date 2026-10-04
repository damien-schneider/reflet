"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@ctrl-ui/react/ui/empty";
import { Skeleton } from "@ctrl-ui/react/ui/skeleton";
import { Tabs, TabsList, TabsTab } from "@ctrl-ui/react/ui/tabs";
import { Tray } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import {
  type PaginationStatus,
  usePaginatedQuery,
  useQuery,
} from "convex/react";
import { useState } from "react";
import { ExportResponsesButton } from "@/features/surveys/components/responses/export-responses-button";
import { ResponseDetailSheet } from "@/features/surveys/components/responses/response-detail-sheet";
import type { ResponseRow } from "@/features/surveys/components/responses/response-types";
import { ResponsesTable } from "@/features/surveys/components/responses/responses-table";
import {
  RESPONSE_STATUS_LABELS,
  type ResponseStatus,
} from "@/features/surveys/lib/response-labels";

const RESPONSES_PAGE_SIZE = 25;

const STATUS_FILTERS = [
  "all",
  "completed",
  "in_progress",
  "abandoned",
] as const;
type ResponseStatusFilter = (typeof STATUS_FILTERS)[number];

const isStatusFilter = (value: string): value is ResponseStatusFilter =>
  STATUS_FILTERS.some((filter) => filter === value);

interface ResponsesPanelProps {
  surveyId: Id<"surveys">;
}

export function ResponsesPanel({ surveyId }: ResponsesPanelProps) {
  const [statusFilter, setStatusFilter] = useState<ResponseStatusFilter>("all");
  const [openResponseId, setOpenResponseId] =
    useState<Id<"surveyResponses"> | null>(null);
  const survey = useQuery(api.surveys.queries.get, { surveyId });
  const status: ResponseStatus | undefined =
    statusFilter === "all" ? undefined : statusFilter;
  const {
    loadMore,
    results,
    status: paginationStatus,
  } = usePaginatedQuery(
    api.surveys.queries.listResponses,
    { status, surveyId },
    { initialNumItems: RESPONSES_PAGE_SIZE }
  );

  const endingTitles = new Map(
    (survey?.endings ?? []).map((ending) => [ending.id, ending.title])
  );
  const openResponse =
    results.find((response) => response._id === openResponseId) ?? null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          onValueChange={(value) => {
            if (isStatusFilter(value)) {
              setStatusFilter(value);
            }
          }}
          value={statusFilter}
        >
          <TabsList aria-label="Filter responses by status" size="sm">
            {STATUS_FILTERS.map((filter) => (
              <TabsTab key={filter} value={filter}>
                {filter === "all" ? "All" : RESPONSE_STATUS_LABELS[filter]}
              </TabsTab>
            ))}
          </TabsList>
        </Tabs>
        {survey ? (
          <ExportResponsesButton
            endingTitles={endingTitles}
            surveyId={surveyId}
            surveyTitle={survey.title}
          />
        ) : null}
      </div>

      <ResponsesBody
        endingTitles={endingTitles}
        onOpenResponse={(response: ResponseRow) =>
          setOpenResponseId(response._id)
        }
        paginationStatus={paginationStatus}
        results={results}
        statusFilter={statusFilter}
      />

      {paginationStatus === "CanLoadMore" ||
      paginationStatus === "LoadingMore" ? (
        <Button
          className="self-center"
          disabled={paginationStatus === "LoadingMore"}
          onClick={() => loadMore(RESPONSES_PAGE_SIZE)}
          size="sm"
          variant="surface"
        >
          {paginationStatus === "LoadingMore" ? "Loading…" : "Load more"}
        </Button>
      ) : null}

      <ResponseDetailSheet
        endingTitles={endingTitles}
        onOpenChange={(open) => {
          if (!open) {
            setOpenResponseId(null);
          }
        }}
        questions={survey?.questions ?? []}
        response={openResponse}
      />
    </div>
  );
}

function ResponsesBody({
  endingTitles,
  onOpenResponse,
  paginationStatus,
  results,
  statusFilter,
}: {
  endingTitles: ReadonlyMap<string, string>;
  onOpenResponse: (response: ResponseRow) => void;
  paginationStatus: PaginationStatus;
  results: readonly ResponseRow[];
  statusFilter: ResponseStatusFilter;
}) {
  if (paginationStatus === "LoadingFirstPage") {
    return (
      <div
        aria-label="Loading responses"
        className="flex flex-col gap-2"
        role="status"
      >
        {["row-1", "row-2", "row-3", "row-4"].map((id) => (
          <Skeleton className="h-12 w-full rounded-lg" key={id} />
        ))}
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <Empty className="rounded-xl border border-dashed py-16">
        <EmptyHeader>
          <EmptyMedia>
            <Tray aria-hidden className="size-6" />
          </EmptyMedia>
          <EmptyTitle>
            {statusFilter === "all"
              ? "No responses yet"
              : `No ${RESPONSE_STATUS_LABELS[statusFilter].toLowerCase()} responses`}
          </EmptyTitle>
          <EmptyDescription>
            {statusFilter === "all"
              ? "Each person who starts the survey shows up here, even if they don’t finish."
              : "Try another status to see the rest of the responses."}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <ResponsesTable
      endingTitles={endingTitles}
      onOpenResponse={onOpenResponse}
      responses={results}
    />
  );
}
