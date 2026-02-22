import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Top-level regex patterns for performance
const VERSION_PLACEHOLDER_REGEX = /v1\.0\.0/i;
const PUBLISH_BUTTON_REGEX = /publish/i;
const CANCEL_BUTTON_REGEX = /cancel/i;

// Mock next/navigation
const {
  mockPush,
  mockToast,
  mockCreateRelease,
  mockUpdateRelease,
  mockPublishRelease,
  mockUnpublishRelease,
} = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockToast: { success: vi.fn(), error: vi.fn() },
  mockCreateRelease: vi.fn(),
  mockUpdateRelease: vi.fn(),
  mockPublishRelease: vi.fn(),
  mockUnpublishRelease: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock sonner
vi.mock("sonner", () => ({
  toast: mockToast,
}));

// Mock tiptap components
vi.mock("@tiptap/react", () => ({
  useEditor: vi.fn(() => ({
    commands: { setContent: vi.fn(), focus: vi.fn() },
    storage: { markdown: { getMarkdown: () => "" } },
    getText: () => "",
    setEditable: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    isActive: vi.fn(() => false),
    chain: vi.fn(() => ({ focus: vi.fn(() => ({ run: vi.fn() })) })),
    view: { state: { selection: { from: 0, to: 0 } } },
  })),
  EditorContent: ({ editor }: { editor: unknown }) => (
    <div data-testid="editor-content">{editor ? "Editor" : "No editor"}</div>
  ),
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

vi.mock("@/components/ui/tiptap/slash-command", () => ({
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
    uploadMedia: vi.fn(),
    isUploading: false,
    uploadProgress: null,
  }),
}));

let mutationIdx = 0;

vi.mock("convex/react", () => ({
  useMutation: () => {
    const order = [
      mockCreateRelease,
      mockUpdateRelease,
      mockPublishRelease,
      mockUnpublishRelease,
    ];
    const mock = order[mutationIdx % order.length];
    mutationIdx++;
    return mock;
  },
  useQuery: () => null,
  useAction: () => vi.fn(),
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
    onStreamStart: () => void;
    onStreamChunk: (c: string) => void;
    onComplete: (c: string) => void;
    onTitleGenerated: (t: string) => void;
    disabled: boolean;
    isStreaming: boolean;
  }) => (
    <div data-testid="generate-from-commits">
      <button
        data-testid="start-stream"
        disabled={props.disabled || props.isStreaming}
        onClick={props.onStreamStart}
        type="button"
      >
        Generate
      </button>
      <button
        data-testid="complete-stream"
        onClick={() => props.onComplete("Generated description")}
        type="button"
      >
        Complete
      </button>
      <button
        data-testid="generate-title"
        onClick={() => props.onTitleGenerated("AI Title")}
        type="button"
      >
        Gen Title
      </button>
      <button
        data-testid="send-chunk"
        onClick={() => props.onStreamChunk("stream chunk")}
        type="button"
      >
        Chunk
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
    mutationIdx = 0;
    mockCreateRelease.mockResolvedValue("new-release-id");
    mockUpdateRelease.mockResolvedValue(undefined);
    mockPublishRelease.mockResolvedValue(undefined);
    mockUnpublishRelease.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
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
            title: "Test Release",
            version: "v1.0.0",
            description: "Test description",
          } as never
        }
      />
    );

    const publishButton = screen.getByRole("button", {
      name: PUBLISH_BUTTON_REGEX,
    });
    expect(publishButton).toBeInTheDocument();
  });

  it("renders cancel button", () => {
    render(<ReleaseEditor {...defaultProps} />);

    const cancelButton = screen.getByRole("button", {
      name: CANCEL_BUTTON_REGEX,
    });
    expect(cancelButton).toBeInTheDocument();
  });

  it("renders Draft status for existing unpublished release", () => {
    render(
      <ReleaseEditor
        {...defaultProps}
        release={
          {
            _id: "release123",
            title: "Unpublished Release",
            version: "v1.0.0",
            description: "Test description",
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
            title: "Test Release",
            version: "v1.0.0",
            description: "Test description",
            publishedAt: Date.now(),
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
            title: "Published Release",
            version: "v2.0.0",
            description: "Published desc",
            publishedAt: Date.now(),
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
            title: "Test",
            version: "2.5.0",
            description: "desc",
          } as never
        }
      />
    );
    const versionInput = screen.getByDisplayValue("2.5.0");
    expect(versionInput).toBeInTheDocument();
  });

  describe("Cancel navigation", () => {
    it("navigates to changelog on cancel click", () => {
      render(<ReleaseEditor {...defaultProps} />);
      fireEvent.click(
        screen.getByRole("button", { name: CANCEL_BUTTON_REGEX })
      );
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
              title: "Old Title",
              version: "1.0.0",
              description: "desc",
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
          "Title is required to publish"
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
          id: "new-release-id",
        });
      });
      expect(mockToast.success).toHaveBeenCalledWith("Release published!");
      expect(mockPush).toHaveBeenCalledWith("/dashboard/test-org/changelog");
    });

    it("updates and publishes existing release", async () => {
      render(
        <ReleaseEditor
          {...defaultProps}
          release={
            {
              _id: "release123",
              title: "Existing",
              version: "1.0.0",
              description: "desc",
            } as never
          }
        />
      );
      fireEvent.click(
        screen.getByRole("button", { name: PUBLISH_BUTTON_REGEX })
      );
      fireEvent.click(screen.getByTestId("confirm-publish"));

      await waitFor(() => {
        expect(mockUpdateRelease).toHaveBeenCalledWith(
          expect.objectContaining({ id: "release123" })
        );
        expect(mockPublishRelease).toHaveBeenCalledWith({
          id: "release123",
        });
      });
      expect(mockToast.success).toHaveBeenCalledWith("Release published!");
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
              title: "Published",
              version: "1.0.0",
              description: "desc",
              publishedAt: Date.now(),
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
      expect(mockToast.success).toHaveBeenCalledWith("Release unpublished");
    });

    it("shows error toast on unpublish failure", async () => {
      mockUnpublishRelease.mockRejectedValueOnce(new Error("Unpublish failed"));
      render(
        <ReleaseEditor
          {...defaultProps}
          release={
            {
              _id: "release123",
              title: "Published",
              version: "1.0.0",
              description: "desc",
              publishedAt: Date.now(),
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

    it("updates description on stream complete", () => {
      render(<ReleaseEditor {...defaultProps} />);
      fireEvent.click(screen.getByTestId("complete-stream"));
      expect(screen.getByTestId("description-editor")).toHaveValue(
        "Generated description"
      );
    });

    it("updates title on title generated", () => {
      render(<ReleaseEditor {...defaultProps} />);
      fireEvent.click(screen.getByTestId("generate-title"));
      expect(screen.getByTestId("title-editor")).toHaveValue("AI Title");
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

      expect(screen.getByText("Saving...")).toBeInTheDocument();
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
});
