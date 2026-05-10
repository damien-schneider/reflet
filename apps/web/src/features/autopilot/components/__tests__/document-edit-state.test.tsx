import type { Doc } from "@reflet/backend/convex/_generated/dataModel";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ContentSheet } from "@/features/autopilot/components/content-sheet";
import { ViewMode } from "@/features/autopilot/components/document-view-mode";
import { toId, toOrgId } from "@/lib/convex-helpers";

const { mockUpdateDocument } = vi.hoisted(() => ({
  mockUpdateDocument: vi.fn(() => Promise.resolve(null)),
}));

vi.mock("convex/react", () => ({
  useMutation: () => mockUpdateDocument,
}));

vi.mock("@reflet/backend/convex/_generated/api", () => ({
  api: {
    autopilot: {
      mutations: {
        documents: {
          archiveDocument: "autopilot.documents.archiveDocument",
          updateDocument: "autopilot.documents.updateDocument",
        },
      },
    },
  },
}));

vi.mock("@/features/autopilot/components/autopilot-context", () => ({
  useAutopilotContext: () => ({
    isAdmin: true,
    organizationId: toOrgId("org_123"),
    orgSlug: "acme",
  }),
}));

vi.mock("@/features/autopilot/components/document-content", () => ({
  DocumentContent: ({
    document,
    editedContent,
    isEditable,
    onContentChange,
  }: {
    document: Doc<"autopilotDocuments">;
    editedContent: string | null;
    isEditable: boolean;
    onContentChange?: (value: string) => void;
  }) => (
    <textarea
      aria-label="Document content"
      disabled={!isEditable}
      onChange={(event) => onContentChange?.(event.target.value)}
      value={editedContent ?? document.content}
    />
  ),
  RESEARCH_TYPES: new Set<string>(),
  SOCIAL_TYPES: new Set<string>(),
  SourceLink: ({ url }: { url: string }) => <a href={url}>{url}</a>,
}));

vi.mock("@/features/autopilot/components/content-sheet-conversation", () => ({
  ConversationContent: ({
    content,
    isEditable,
    onContentChange,
  }: {
    content: string;
    isEditable: boolean;
    onContentChange?: (value: string) => void;
  }) => (
    <textarea
      aria-label="Sheet content"
      disabled={!isEditable}
      onChange={(event) => onContentChange?.(event.target.value)}
      value={content}
    />
  ),
}));

vi.mock("@/features/autopilot/components/content-sheet-property-grid", () => ({
  ContentPropertyGrid: () => null,
}));

vi.mock("@/components/ui/tiptap/markdown-editor", () => ({
  TiptapMarkdownEditor: ({
    editable,
    onChange,
    value,
  }: {
    editable: boolean;
    onChange?: (value: string) => void;
    value: string;
  }) => (
    <textarea
      aria-label="Sheet content"
      disabled={!editable}
      onChange={(event) => onChange?.(event.target.value)}
      value={value}
    />
  ),
}));

vi.mock("@/components/ui/sheet", () => ({
  SheetDescription: ({ children }: { children: React.ReactNode }) => (
    <p>{children}</p>
  ),
  Sheet: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div>{children}</div> : null,
  SheetContent: ({ children }: { children: React.ReactNode }) => (
    <section>{children}</section>
  ),
  SheetFooter: ({ children }: { children: React.ReactNode }) => (
    <footer>{children}</footer>
  ),
  SheetHeader: ({ children }: { children: React.ReactNode }) => (
    <header>{children}</header>
  ),
  SheetTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
}));

vi.mock("date-fns", () => ({
  formatDistanceToNow: () => "just now",
}));

function createDocument(
  id: string,
  content: string
): Doc<"autopilotDocuments"> {
  const now = Date.now();
  return {
    _creationTime: now,
    _id: toId("autopilotDocuments", id),
    organizationId: toOrgId("org_123"),
    type: "note",
    title: `Doc ${id}`,
    content,
    tags: [],
    status: "pending_review",
    needsReview: true,
    createdAt: now,
    updatedAt: now,
  };
}

function renderView(document: Doc<"autopilotDocuments">) {
  return render(
    <ViewMode
      document={document}
      onArchive={vi.fn()}
      onStatusTransition={vi.fn()}
    />
  );
}

beforeEach(() => {
  mockUpdateDocument.mockClear();
});

afterEach(() => {
  cleanup();
});

describe("ViewMode edit state", () => {
  it("does not carry unsaved edits into the next selected document", () => {
    const firstDocument = createDocument("doc_one", "First content");
    const secondDocument = createDocument("doc_two", "Second content");
    const view = renderView(firstDocument);

    fireEvent.change(screen.getByLabelText("Document content"), {
      target: { value: "Unsaved edit" },
    });

    view.rerender(
      <ViewMode
        document={secondDocument}
        onArchive={vi.fn()}
        onStatusTransition={vi.fn()}
      />
    );

    expect(screen.getByLabelText("Document content")).toHaveValue(
      "Second content"
    );
    expect(screen.queryByRole("button", { name: "Save Edits" })).toBeNull();

    view.rerender(
      <ViewMode
        document={firstDocument}
        onArchive={vi.fn()}
        onStatusTransition={vi.fn()}
      />
    );

    expect(screen.getByLabelText("Document content")).toHaveValue(
      "First content"
    );
    expect(screen.queryByRole("button", { name: "Save Edits" })).toBeNull();
  });
});

describe("ContentSheet edit state", () => {
  it("does not carry unsaved edits into the next selected document", () => {
    const firstDocument = createDocument("doc_one", "First sheet content");
    const secondDocument = createDocument("doc_two", "Second sheet content");
    const view = render(
      <ContentSheet
        document={firstDocument}
        onOpenChange={vi.fn()}
        open={true}
      />
    );

    fireEvent.change(screen.getByLabelText("Sheet content"), {
      target: { value: "Unsaved sheet edit" },
    });

    view.rerender(
      <ContentSheet
        document={secondDocument}
        onOpenChange={vi.fn()}
        open={true}
      />
    );

    expect(screen.getByLabelText("Sheet content")).toHaveValue(
      "Second sheet content"
    );
    expect(screen.queryByRole("button", { name: "Save Edits" })).toBeNull();

    view.rerender(
      <ContentSheet
        document={firstDocument}
        onOpenChange={vi.fn()}
        open={true}
      />
    );

    expect(screen.getByLabelText("Sheet content")).toHaveValue(
      "First sheet content"
    );
    expect(screen.queryByRole("button", { name: "Save Edits" })).toBeNull();
  });
});
