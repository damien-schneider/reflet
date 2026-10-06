import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { type FunctionReference, getFunctionName } from "convex/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const VERSION_PLACEHOLDER_REGEX = /v1\.0\.0/i;
const PUBLISH_BUTTON_REGEX = /publish/i;
const DONE_BUTTON_REGEX = /^done$/i;

const {
  mockPush,
  mockToast,
  mockApplyDraft,
  mockCreateRelease,
  mockUpdateRelease,
  mockPublishRelease,
  mockUnpublishRelease,
  mockOtherMutation,
  queryResults,
} = vi.hoisted(() => ({
  mockApplyDraft: vi.fn(),
  mockCreateRelease: vi.fn(),
  mockOtherMutation: vi.fn(),
  mockPublishRelease: vi.fn(),
  mockPush: vi.fn(),
  mockToast: { error: vi.fn(), success: vi.fn() },
  mockUnpublishRelease: vi.fn(),
  mockUpdateRelease: vi.fn(),
  queryResults: new Map<string, unknown>(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

vi.mock("@ctrl-ui/react/ui/toast", () => ({
  toast: mockToast,
}));

vi.mock("@tiptap/react", () => ({
  EditorContent: ({ editor }: { editor: unknown }) => (
    <div data-testid="editor-content">{editor ? "Editor" : "No editor"}</div>
  ),
  useEditor: vi.fn(() => ({
    chain: vi.fn(() => ({ focus: vi.fn(() => ({ run: vi.fn() })) })),
    commands: { focus: vi.fn(), setContent: vi.fn() },
    getText: () => "",
    isActive: vi.fn(() => false),
    off: vi.fn(),
    on: vi.fn(),
    setEditable: vi.fn(),
    storage: { markdown: { getMarkdown: () => "" } },
    view: { state: { selection: { from: 0, to: 0 } } },
  })),
}));

vi.mock("@tiptap/starter-kit", () => ({
  default: { configure: () => ({}) },
}));

vi.mock("@tiptap/extension-placeholder", () => ({
  default: { configure: () => ({}) },
}));

vi.mock("@tiptap/extension-link", () => ({
  default: { configure: () => ({}) },
}));

vi.mock("@tiptap/extension-image", () => ({
  default: {
    configure: () => ({}),
    extend: () => ({ configure: () => ({}) }),
  },
}));

vi.mock("@tiptap/extension-character-count", () => ({
  default: { configure: () => ({}) },
}));

vi.mock("@tiptap/extension-typography", () => ({
  default: {},
}));

vi.mock("tiptap-markdown", () => ({
  Markdown: { configure: () => ({}) },
}));

vi.mock("@/components/ui/tiptap/command-suggestion", () => ({
  createSlashCommandExtension: () => ({}),
}));

vi.mock("@/components/ui/tiptap/image-extension", () => ({
  ImageExtension: {
    configure: () => ({
      extend: () => ({}),
    }),
  },
}));

vi.mock("@/components/ui/tiptap/use-media-upload", () => ({
  useMediaUpload: () => ({
    isUploading: false,
    uploadMedia: vi.fn(),
    uploadProgress: null,
  }),
}));

const mutationMocks: Record<string, typeof mockCreateRelease> = {
  "changelog/actions:publish": mockPublishRelease,
  "changelog/actions:unpublish": mockUnpublishRelease,
  "changelog/mutations:create": mockCreateRelease,
  "changelog/mutations:update": mockUpdateRelease,
  "changelog/release_drafts:applyDraft": mockApplyDraft,
};

vi.mock("convex/react", () => ({
  useAction: () => vi.fn(),
  useMutation: (reference: FunctionReference<"mutation">) => {
    const mock = mutationMocks[getFunctionName(reference)] ?? mockOtherMutation;
    return Object.assign((...args: unknown[]) => mock(...args), {
      withOptimisticUpdate: () => mock,
    });
  },
  useQuery: (reference: FunctionReference<"query">) =>
    queryResults.get(getFunctionName(reference)) ?? null,
}));

vi.mock("@/components/ui/tiptap/title-editor", () => ({
  TiptapTitleEditor: (props: {
    onChange: (v: string) => void;
    value: string;
    placeholder?: string;
    disabled?: boolean;
    autoFocus?: boolean;
  }) => (
    <input
      data-slot="tiptap-title-editor"
      data-testid="title-editor"
      disabled={props.disabled}
      onChange={(e) => props.onChange(e.target.value)}
      placeholder={props.placeholder}
      value={props.value}
    />
  ),
}));

vi.mock("@/components/ui/tiptap/markdown-editor", () => ({
  TiptapMarkdownEditor: (props: {
    onChange: (v: string) => void;
    value: string;
    placeholder?: string;
    disabled?: boolean;
    minimal?: boolean;
  }) => (
    <textarea
      data-slot="tiptap-markdown-editor"
      data-testid="description-editor"
      disabled={props.disabled}
      onChange={(e) => props.onChange(e.target.value)}
      placeholder={props.placeholder}
      value={props.value}
    />
  ),
}));

vi.mock("./publish-confirm-dialog", () => ({
  PublishConfirmDialog: (props: {
    open: boolean;
    onConfirm: () => void;
    onOpenChange: (open: boolean) => void;
    isSubmitting: boolean;
  }) =>
    props.open ? (
      <div data-testid="publish-dialog">
        <button
          data-testid="confirm-publish"
          disabled={props.isSubmitting}
          onClick={props.onConfirm}
          type="button"
        >
          Confirm Publish
        </button>
        <button
          data-testid="cancel-dialog"
          onClick={() => props.onOpenChange(false)}
          type="button"
        >
          Cancel Dialog
        </button>
      </div>
    ) : null,
}));

vi.mock("./generate-from-commits", () => ({
  GenerateFromCommits: (props: {
    disabled: boolean;
    onPreviewChange: (preview: string | null) => void;
  }) => (
    <div data-testid="generate-from-commits">
      <button
        data-testid="start-stream"
        disabled={props.disabled}
        onClick={() => props.onPreviewChange("")}
        type="button"
      >
        Generate
      </button>
      <button
        data-testid="send-chunk"
        onClick={() => props.onPreviewChange("stream chunk")}
        type="button"
      >
        Chunk
      </button>
      <button
        data-testid="finish-stream"
        onClick={() => props.onPreviewChange(null)}
        type="button"
      >
        Finish
      </button>
    </div>
  ),
}));

vi.mock("streamdown", () => ({
  Streamdown: (props: { children: unknown }) => (
    <div data-testid="streamdown">{String(props.children)}</div>
  ),
}));

import { ReleaseEditor } from "./release-editor";

describe("ReleaseEditor", () => {
  const defaultProps = {
    organizationId: "org123" as never,
    orgSlug: "test-org",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    queryResults.clear();
    mockApplyDraft.mockResolvedValue(null);
    mockCreateRelease.mockResolvedValue("new-release-id");
    mockUpdateRelease.mockResolvedValue(undefined);
    mockPublishRelease.mockResolvedValue(undefined);
    mockUnpublishRelease.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders with Notion-like title editor", () => {
    render(<ReleaseEditor {...defaultProps} />);

    const titleEditor = document.querySelector(
      '[data-slot="tiptap-title-editor"]'
    );
    expect(titleEditor).toBeInTheDocument();
  });

  it("renders with rich text description editor", () => {
    render(<ReleaseEditor {...defaultProps} />);

    const descriptionEditor = document.querySelector(
      '[data-slot="tiptap-markdown-editor"]'
    );
    expect(descriptionEditor).toBeInTheDocument();
  });

  it("renders version input field", () => {
    render(<ReleaseEditor {...defaultProps} />);

    const versionInput = screen.getByPlaceholderText(VERSION_PLACEHOLDER_REGEX);
    expect(versionInput).toBeInTheDocument();
  });

  it("shows publish button for new release", () => {
    render(<ReleaseEditor {...defaultProps} />);

    const publishButton = screen.getByRole("button", {
      name: PUBLISH_BUTTON_REGEX,
    });
    expect(publishButton).toBeInTheDocument();
  });

  it("shows publish button when editing existing release", () => {
    render(
      <ReleaseEditor
        {...defaultProps}
        release={
          {
            _id: "release123",
            description: "Test description",
            title: "Test Release",
            version: "v1.0.0",
          } as never
        }
      />
    );

    const publishButton = screen.getByRole("button", {
      name: PUBLISH_BUTTON_REGEX,
    });
    expect(publishButton).toBeInTheDocument();
  });

  it("renders Draft status for existing unpublished release", () => {
    render(
      <ReleaseEditor
        {...defaultProps}
        release={
          {
            _id: "release123",
            description: "Test description",
            title: "Unpublished Release",
            version: "v1.0.0",
          } as never
        }
      />
    );
    expect(screen.getByText("Draft")).toBeInTheDocument();
  });

  it("renders Published badge for published release", () => {
    render(
      <ReleaseEditor
        {...defaultProps}
        release={
          {
            _id: "release123",
            description: "Test description",
            publishedAt: Date.now(),
            title: "Test Release",
            version: "v1.0.0",
          } as never
        }
      />
    );
    expect(screen.getByText("Published")).toBeInTheDocument();
  });

  it("renders Unpublish button for published release", () => {
    render(
      <ReleaseEditor
        {...defaultProps}
        release={
          {
            _id: "release123",
            description: "Published desc",
            publishedAt: Date.now(),
            title: "Published Release",
            version: "v2.0.0",
          } as never
        }
      />
    );
    const unpublishButton = screen.queryByRole("button", {
      name: /unpublish/i,
    });
    expect(unpublishButton).toBeInTheDocument();
  });

  it("renders version input with existing release value", () => {
    render(
      <ReleaseEditor
        {...defaultProps}
        release={
          {
            _id: "release123",
            description: "desc",
            title: "Test",
            version: "2.5.0",
          } as never
        }
      />
    );
    const versionInput = screen.getByDisplayValue("2.5.0");
    expect(versionInput).toBeInTheDocument();
  });

  describe("Done navigation", () => {
    it("navigates to changelog on done click", () => {
      render(<ReleaseEditor {...defaultProps} />);
      fireEvent.click(screen.getByRole("button", { name: DONE_BUTTON_REGEX }));
      expect(mockPush).toHaveBeenCalledWith("/dashboard/test-org/changelog");
    });
  });

  describe("Auto-save", () => {
    it("creates new draft after debounce on first edit", async () => {
      vi.useFakeTimers();
      render(<ReleaseEditor {...defaultProps} />);
      fireEvent.change(screen.getByTestId("title-editor"), {
        target: { value: "New Title" },
      });

      expect(mockCreateRelease).not.toHaveBeenCalled();

      await act(async () => {
        vi.advanceTimersByTime(600);
      });

      expect(mockCreateRelease).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: "org123",
          title: "New Title",
        })
      );
    });

    it("updates existing release on auto-save", async () => {
      vi.useFakeTimers();
      render(
        <ReleaseEditor
          {...defaultProps}
          release={
            {
              _id: "release123",
              description: "desc",
              title: "Old Title",
              version: "1.0.0",
            } as never
          }
        />
      );
      fireEvent.change(screen.getByTestId("title-editor"), {
        target: { value: "Updated Title" },
      });

      await act(async () => {
        vi.advanceTimersByTime(600);
      });

      expect(mockUpdateRelease).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "release123",
          title: "Updated Title",
        })
      );
    });

    it("shows error toast on auto-save failure", async () => {
      vi.useFakeTimers();
      mockCreateRelease.mockRejectedValueOnce(new Error("Save failed"));
      render(<ReleaseEditor {...defaultProps} />);
      fireEvent.change(screen.getByTestId("title-editor"), {
        target: { value: "Title" },
      });

      await act(async () => {
        vi.advanceTimersByTime(600);
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      expect(mockToast.error).toHaveBeenCalledWith("Save failed");
    });

    it("skips auto-save when content is empty", async () => {
      vi.useFakeTimers();
      render(<ReleaseEditor {...defaultProps} />);
      fireEvent.change(screen.getByTestId("title-editor"), {
        target: { value: "" },
      });

      await act(async () => {
        vi.advanceTimersByTime(600);
      });

      expect(mockCreateRelease).not.toHaveBeenCalled();
    });
  });

  describe("Publish flow", () => {
    it("opens publish confirm dialog on publish click", () => {
      render(<ReleaseEditor {...defaultProps} />);
      fireEvent.change(screen.getByTestId("title-editor"), {
        target: { value: "Title" },
      });
      fireEvent.click(
        screen.getByRole("button", { name: PUBLISH_BUTTON_REGEX })
      );
      expect(screen.getByTestId("publish-dialog")).toBeInTheDocument();
    });

    it("shows error when publishing without title", async () => {
      render(<ReleaseEditor {...defaultProps} />);
      fireEvent.change(screen.getByTestId("title-editor"), {
        target: { value: "temp" },
      });
      fireEvent.click(
        screen.getByRole("button", { name: PUBLISH_BUTTON_REGEX })
      );
      fireEvent.change(screen.getByTestId("title-editor"), {
        target: { value: "" },
      });
      fireEvent.click(screen.getByTestId("confirm-publish"));

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith(
          "Add a title before publishing"
        );
      });
    });

    it("creates and publishes new release", async () => {
      render(<ReleaseEditor {...defaultProps} />);
      fireEvent.change(screen.getByTestId("title-editor"), {
        target: { value: "Release Title" },
      });
      fireEvent.click(
        screen.getByRole("button", { name: PUBLISH_BUTTON_REGEX })
      );
      fireEvent.click(screen.getByTestId("confirm-publish"));

      await waitFor(() => {
        expect(mockCreateRelease).toHaveBeenCalled();
        expect(mockPublishRelease).toHaveBeenCalledWith({
          feedbackStatus: "completed",
          id: "new-release-id",
        });
      });
      expect(mockToast.success).toHaveBeenCalledWith("Release published");
      expect(mockPush).toHaveBeenCalledWith("/dashboard/test-org/changelog");
    });

    it("updates and publishes existing release", async () => {
      render(
        <ReleaseEditor
          {...defaultProps}
          release={
            {
              _id: "release123",
              description: "desc",
              title: "Existing",
              version: "1.0.0",
            } as never
          }
        />
      );
      fireEvent.click(
        screen.getByRole("button", { name: PUBLISH_BUTTON_REGEX })
      );
      fireEvent.click(screen.getByTestId("confirm-publish"));

      await waitFor(() => {
        expect(mockPublishRelease).toHaveBeenCalledWith({
          feedbackStatus: "completed",
          id: "release123",
        });
      });
      expect(mockUpdateRelease).not.toHaveBeenCalled();
      expect(mockToast.success).toHaveBeenCalledWith("Release published");
    });

    it("shows error toast on publish failure", async () => {
      mockPublishRelease.mockRejectedValueOnce(new Error("Publish failed"));
      render(<ReleaseEditor {...defaultProps} />);
      fireEvent.change(screen.getByTestId("title-editor"), {
        target: { value: "Title" },
      });
      fireEvent.click(
        screen.getByRole("button", { name: PUBLISH_BUTTON_REGEX })
      );
      fireEvent.click(screen.getByTestId("confirm-publish"));

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith("Publish failed");
      });
    });

    it("closes dialog via cancel", () => {
      render(<ReleaseEditor {...defaultProps} />);
      fireEvent.change(screen.getByTestId("title-editor"), {
        target: { value: "Title" },
      });
      fireEvent.click(
        screen.getByRole("button", { name: PUBLISH_BUTTON_REGEX })
      );
      expect(screen.getByTestId("publish-dialog")).toBeInTheDocument();
      fireEvent.click(screen.getByTestId("cancel-dialog"));
      expect(screen.queryByTestId("publish-dialog")).not.toBeInTheDocument();
    });
  });

  describe("Unpublish flow", () => {
    it("calls unpublish mutation on click", async () => {
      render(
        <ReleaseEditor
          {...defaultProps}
          release={
            {
              _id: "release123",
              description: "desc",
              publishedAt: Date.now(),
              title: "Published",
              version: "1.0.0",
            } as never
          }
        />
      );
      fireEvent.click(screen.getByRole("button", { name: /unpublish/i }));

      await waitFor(() => {
        expect(mockUnpublishRelease).toHaveBeenCalledWith({
          id: "release123",
        });
      });
    });

    it("shows error toast on unpublish failure", async () => {
      mockUnpublishRelease.mockRejectedValueOnce(new Error("Unpublish failed"));
      render(
        <ReleaseEditor
          {...defaultProps}
          release={
            {
              _id: "release123",
              description: "desc",
              publishedAt: Date.now(),
              title: "Published",
              version: "1.0.0",
            } as never
          }
        />
      );
      fireEvent.click(screen.getByRole("button", { name: /unpublish/i }));

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith("Unpublish failed");
      });
    });
  });

  describe("Streaming", () => {
    it("shows Streamdown when streaming", () => {
      render(<ReleaseEditor {...defaultProps} />);
      fireEvent.click(screen.getByTestId("start-stream"));
      expect(screen.getByTestId("streamdown")).toBeInTheDocument();
      expect(
        screen.queryByTestId("description-editor")
      ).not.toBeInTheDocument();
    });

    it("returns to the editor when the preview ends", () => {
      render(<ReleaseEditor {...defaultProps} />);
      fireEvent.click(screen.getByTestId("start-stream"));
      fireEvent.click(screen.getByTestId("finish-stream"));
      expect(screen.getByTestId("description-editor")).toBeInTheDocument();
    });

    it("shows streamed content in Streamdown", () => {
      render(<ReleaseEditor {...defaultProps} />);
      fireEvent.click(screen.getByTestId("start-stream"));
      fireEvent.click(screen.getByTestId("send-chunk"));
      expect(screen.getByTestId("streamdown")).toHaveTextContent(
        "stream chunk"
      );
    });

    it("disables publish button while streaming", () => {
      render(<ReleaseEditor {...defaultProps} />);
      fireEvent.change(screen.getByTestId("title-editor"), {
        target: { value: "Title" },
      });
      fireEvent.click(screen.getByTestId("start-stream"));
      expect(
        screen.getByRole("button", { name: PUBLISH_BUTTON_REGEX })
      ).toBeDisabled();
    });
  });

  describe("Disabled states", () => {
    it("disables publish button without title", () => {
      render(<ReleaseEditor {...defaultProps} />);
      expect(
        screen.getByRole("button", { name: PUBLISH_BUTTON_REGEX })
      ).toBeDisabled();
    });

    it("enables publish button with title", () => {
      render(<ReleaseEditor {...defaultProps} />);
      fireEvent.change(screen.getByTestId("title-editor"), {
        target: { value: "Title" },
      });
      expect(
        screen.getByRole("button", { name: PUBLISH_BUTTON_REGEX })
      ).not.toBeDisabled();
    });
  });

  describe("Save status display", () => {
    it("shows saving indicator during auto-save", async () => {
      vi.useFakeTimers();
      mockCreateRelease.mockImplementation(
        () =>
          new Promise((resolve) => setTimeout(() => resolve("new-id"), 5000))
      );
      render(<ReleaseEditor {...defaultProps} />);
      fireEvent.change(screen.getByTestId("title-editor"), {
        target: { value: "Test" },
      });

      await act(async () => {
        vi.advanceTimersByTime(600);
      });

      expect(screen.getByText("Saving…")).toBeInTheDocument();
    });

    it("shows saved indicator after auto-save completes", async () => {
      vi.useFakeTimers();
      render(<ReleaseEditor {...defaultProps} />);
      fireEvent.change(screen.getByTestId("title-editor"), {
        target: { value: "Test" },
      });

      await act(async () => {
        vi.advanceTimersByTime(600);
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      expect(screen.getByText("Saved")).toBeInTheDocument();
    });
  });

  describe("Draft review", () => {
    const editedRelease = {
      _id: "release123",
      description: "My edited text",
      title: "Search",
      version: "v1.4.0",
    };

    it("keeps edited text under a pending draft and replaces it only on Apply", async () => {
      queryResults.set("changelog/release_drafts:getPendingDraft", {
        _id: "draft1",
        description: "AI text",
        origin: "ai",
      });
      const { rerender } = render(
        <ReleaseEditor {...defaultProps} release={editedRelease as never} />
      );

      expect(screen.getByTestId("description-editor")).toHaveValue(
        "My edited text"
      );
      expect(screen.getByText("New AI draft ready")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Apply" }));
      await waitFor(() => {
        expect(mockApplyDraft).toHaveBeenCalledWith({ draftId: "draft1" });
      });

      queryResults.delete("changelog/release_drafts:getPendingDraft");
      queryResults.set("changelog/queries:get", {
        ...editedRelease,
        description: "AI text",
        feedbackItems: [],
      });
      rerender(
        <ReleaseEditor {...defaultProps} release={editedRelease as never} />
      );

      expect(screen.getByTestId("description-editor")).toHaveValue("AI text");
      expect(screen.queryByText("New AI draft ready")).not.toBeInTheDocument();
    });
  });
});
