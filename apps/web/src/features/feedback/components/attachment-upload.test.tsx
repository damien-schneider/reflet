import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/tiptap/use-image-upload", () => ({
  useImageUpload: () => ({
    isUploading: false,
    uploadImage: (file: File) =>
      Promise.resolve(`https://cdn.test/${file.name}`),
  }),
}));

import { AttachmentUpload } from "./attachment-upload";

const image = (name: string) => new File(["x"], name, { type: "image/png" });

describe("AttachmentUpload", () => {
  it("attaches what fits and explains the limit for the rest", async () => {
    const onAttachmentsChange = vi.fn();
    const user = userEvent.setup();
    render(
      <AttachmentUpload
        attachments={[]}
        maxAttachments={1}
        onAttachmentsChange={onAttachmentsChange}
      />
    );

    await user.upload(screen.getByLabelText("Attach images"), [
      image("a.png"),
      image("b.png"),
    ]);

    await waitFor(() =>
      expect(onAttachmentsChange).toHaveBeenCalledWith([
        "https://cdn.test/a.png",
      ])
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "You can attach up to 1 images. Remove one to add another."
    );
  });
});
