import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AttachmentUpload } from "../attachment-upload";

interface UploadOptions {
  onError?: (error: Error) => void;
  onSuccess?: (url: string) => void;
}

const uploadImageMock = vi.fn(
  async (file: File, options: UploadOptions): Promise<string> => {
    const url = `https://cdn.example.com/${file.name}`;
    options.onSuccess?.(url);
    return url;
  }
);

vi.mock("@/components/ui/tiptap/use-image-upload", () => ({
  useImageUpload: (options: UploadOptions = {}) => ({
    isUploading: false,
    uploadImage: (file: File) => uploadImageMock(file, options),
  }),
}));

vi.mock("next/image", () => ({
  default: ({ alt, src }: { alt: string; src: string }) => (
    <img alt={alt} src={src} />
  ),
}));

vi.mock("@phosphor-icons/react", () => ({
  Image: () => <span data-testid="image-icon" />,
  Paperclip: () => <span data-testid="paperclip-icon" />,
  Spinner: () => <span data-testid="spinner-icon" />,
  X: () => <span data-testid="x-icon" />,
}));

describe("AttachmentUpload", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("keeps existing attachments when multiple files finish uploading", async () => {
    const user = userEvent.setup();
    const onAttachmentsChange = vi.fn();
    render(
      <AttachmentUpload
        attachments={["https://cdn.example.com/existing.png"]}
        onAttachmentsChange={onAttachmentsChange}
      />
    );

    await user.upload(screen.getByLabelText("Attach images"), [
      new File(["one"], "one.png", { type: "image/png" }),
      new File(["two"], "two.png", { type: "image/png" }),
    ]);

    await waitFor(() => {
      expect(onAttachmentsChange).toHaveBeenLastCalledWith([
        "https://cdn.example.com/existing.png",
        "https://cdn.example.com/one.png",
        "https://cdn.example.com/two.png",
      ]);
    });
  });

  it("uploads only the remaining attachment slots", async () => {
    const user = userEvent.setup();
    const onAttachmentsChange = vi.fn();
    render(
      <AttachmentUpload
        attachments={["https://cdn.example.com/existing.png"]}
        maxAttachments={2}
        onAttachmentsChange={onAttachmentsChange}
      />
    );

    await user.upload(screen.getByLabelText("Attach images"), [
      new File(["one"], "one.png", { type: "image/png" }),
      new File(["two"], "two.png", { type: "image/png" }),
    ]);

    await waitFor(() => {
      expect(uploadImageMock).toHaveBeenCalledOnce();
      expect(onAttachmentsChange).toHaveBeenLastCalledWith([
        "https://cdn.example.com/existing.png",
        "https://cdn.example.com/one.png",
      ]);
    });
    expect(
      screen.getByText("Maximum 2 attachments allowed")
    ).toBeInTheDocument();
  });
});
