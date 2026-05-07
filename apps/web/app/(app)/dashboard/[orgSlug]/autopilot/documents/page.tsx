"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useReducer } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { H2 } from "@/components/ui/typography";
import { useAutopilotContext } from "@/features/autopilot/components/autopilot-context";
import { DocumentSheet } from "@/features/autopilot/components/document-sheet";
import {
  DocumentFilters,
  DocumentsHeader,
} from "@/features/autopilot/components/documents/document-controls";
import { DocumentList } from "@/features/autopilot/components/documents/document-list";
import type { StatusPreset } from "@/features/autopilot/components/documents/types";
import { CONTENT_TYPES } from "@/features/autopilot/lib/document-labels";

type SheetMode = "view" | "create";

interface DocumentsPageState {
  filterAgent: string;
  filterType: string;
  searchQuery: string;
  selectedDocId: Id<"autopilotDocuments"> | null;
  sheetMode: SheetMode;
  statusPreset: StatusPreset;
}

const initialDocumentsPageState: DocumentsPageState = {
  filterAgent: "all",
  filterType: "all",
  searchQuery: "",
  selectedDocId: null,
  sheetMode: "view",
  statusPreset: "all",
};

interface DocumentsPageAction {
  kind: "patch";
  state: Partial<DocumentsPageState>;
}

function reduceDocumentsPageState(
  state: DocumentsPageState,
  action: DocumentsPageAction
): DocumentsPageState {
  return { ...state, ...action.state };
}

export default function DocumentsPage() {
  const { organizationId } = useAutopilotContext();

  const documents = useQuery(api.autopilot.queries.documents.listDocuments, {
    organizationId,
    limit: 100,
  });

  const [pageState, dispatchPageState] = useReducer(
    reduceDocumentsPageState,
    initialDocumentsPageState
  );
  const {
    filterAgent,
    filterType,
    searchQuery,
    selectedDocId,
    sheetMode,
    statusPreset,
  } = pageState;
  const updatePageState = (state: Partial<DocumentsPageState>) => {
    dispatchPageState({ kind: "patch", state });
  };
  const hasActiveFilters =
    searchQuery !== "" ||
    statusPreset !== "all" ||
    filterType !== "all" ||
    filterAgent !== "all";

  if (documents === undefined) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <H2 variant="card">Documents</H2>
          <Skeleton className="h-9 w-36" />
        </div>
        <Skeleton className="h-10 w-full rounded-md" />
        <div className="overflow-hidden rounded-xl border border-border">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton
              className="h-10 w-full border-border border-b last:border-b-0"
              key={`skel-${String(i)}`}
            />
          ))}
        </div>
      </div>
    );
  }

  const filteredDocs = documents.filter((doc) => {
    if (CONTENT_TYPES.has(doc.type)) {
      return false;
    }
    if (
      searchQuery &&
      !doc.title.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    if (filterType !== "all" && doc.type !== filterType) {
      return false;
    }
    if (filterAgent !== "all" && doc.sourceAgent !== filterAgent) {
      return false;
    }
    if (statusPreset === "draft" && doc.status !== "draft") {
      return false;
    }
    if (statusPreset === "review" && !doc.needsReview) {
      return false;
    }
    if (statusPreset === "published" && doc.status !== "published") {
      return false;
    }
    return true;
  });

  const sheetOpen = selectedDocId !== null || sheetMode === "create";
  const selectedDoc = documents.find((d) => d._id === selectedDocId) ?? null;

  const handleSheetOpenChange = (open: boolean) => {
    if (!open) {
      updatePageState({ selectedDocId: null, sheetMode: "view" });
    }
  };

  const handleCreateDocument = () => {
    updatePageState({ selectedDocId: null, sheetMode: "create" });
  };

  const handleClearFilters = () => {
    updatePageState({
      filterAgent: "all",
      filterType: "all",
      searchQuery: "",
      statusPreset: "all",
    });
  };

  const handleSelectDocument = (documentId: Id<"autopilotDocuments">) => {
    updatePageState({ selectedDocId: documentId, sheetMode: "view" });
  };

  return (
    <div className="space-y-4">
      <DocumentsHeader onCreate={handleCreateDocument} />

      <DocumentFilters
        filterAgent={filterAgent}
        filteredCount={filteredDocs.length}
        filterType={filterType}
        onAgentChange={(value) => updatePageState({ filterAgent: value })}
        onSearchChange={(value) => updatePageState({ searchQuery: value })}
        onStatusChange={(value) => updatePageState({ statusPreset: value })}
        onTypeChange={(value) => updatePageState({ filterType: value })}
        searchQuery={searchQuery}
        statusPreset={statusPreset}
      />

      <DocumentList
        documents={filteredDocs}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={handleClearFilters}
        onCreate={handleCreateDocument}
        onSelect={handleSelectDocument}
        selectedDocId={selectedDocId}
      />

      <DocumentSheet
        document={selectedDoc}
        mode={sheetMode}
        onOpenChange={handleSheetOpenChange}
        open={sheetOpen}
        organizationId={organizationId}
      />
    </div>
  );
}
