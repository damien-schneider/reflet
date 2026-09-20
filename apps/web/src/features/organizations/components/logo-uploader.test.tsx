import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const uploadImage = vi.fn();

vi.mock("next/image", () => ({
  default: ({
    alt,
    src,
    className,
  }: {
    alt: string;
    src: string;
    className?: string;
    fill?: boolean;
  }) => <img alt={alt} className={className} src={src} />,
}));

vi.mock("@/components/ui/tiptap/use-image-upload", () => ({
  useImageUpload: ({ onSuccess }: { onSuccess: (url: string) => void }) => ({
    isUploading: false,
    uploadImage: uploadImage.mockImplementation(() => {
      onSuccess("https://uploaded.example.com/logo.png");
    }),
  }),
}));

import { LogoUploader } from "./logo-uploader";

const pngFile = () => new File(["img"], "logo.png", { type: "image/png" });

describe("LogoUploader", () => {
  it("prompts for a logo when none is set", () => {
    render(<LogoUploader onLogoChange={vi.fn()} />);
    expect(screen.getByText("Click or drag to upload")).toBeInTheDocument();
    expect(screen.getByText(/PNG, JPG, SVG, WebP/)).toBeInTheDocument();
    expect(screen.queryByText("Remove logo")).not.toBeInTheDocument();
  });

  it("previews the current logo and offers removal", async () => {
    const user = userEvent.setup();
    const onLogoChange = vi.fn();
    render(
      <LogoUploader
        currentLogo="https://example.com/logo.png"
        onLogoChange={onLogoChange}
      />
    );

    expect(screen.getByAltText("Organization logo")).toHaveAttribute(
      "src",
      "https://example.com/logo.png"
    );
    expect(screen.getByText("Click or drag to replace")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Remove logo/ }));
    expect(onLogoChange).toHaveBeenCalledWith(null);
  });

  it("exposes a keyboard-reachable trigger separate from the file input", () => {
    render(<LogoUploader onLogoChange={vi.fn()} />);
    const input = screen.getByLabelText("Logo file input");
    const trigger = screen.getByRole("button");

    expect(input).toHaveAttribute("type", "file");
    expect(input.tagName).toBe("INPUT");
    expect(trigger.tagName).toBe("BUTTON");
    expect(trigger.contains(input)).toBe(false);
    expect(input).toHaveAttribute("tabindex", "-1");
  });

  it("restricts selection to the supported image formats", () => {
    render(<LogoUploader onLogoChange={vi.fn()} />);
    expect(screen.getByLabelText("Logo file input")).toHaveAttribute(
      "accept",
      "image/jpeg,image/png,image/svg+xml,image/webp"
    );
  });

  it("uploads an accepted file and reports the resulting url", async () => {
    const user = userEvent.setup();
    const onLogoChange = vi.fn();
    render(<LogoUploader onLogoChange={onLogoChange} />);

    await user.upload(screen.getByLabelText("Logo file input"), pngFile());

    expect(uploadImage).toHaveBeenCalled();
    expect(onLogoChange).toHaveBeenCalledWith(
      "https://uploaded.example.com/logo.png"
    );
  });

  it("rejects an unsupported file type with guidance", async () => {
    render(<LogoUploader onLogoChange={vi.fn()} />);
    const input = screen.getByLabelText("Logo file input");

    fireEvent.change(input, {
      target: {
        files: [new File(["nope"], "notes.txt", { type: "text/plain" })],
      },
    });

    expect(
      await screen.findByText("Please upload a PNG, JPG, SVG, or WebP image")
    ).toBeInTheDocument();
  });

  it("rejects a file over the size limit", async () => {
    const user = userEvent.setup();
    render(<LogoUploader onLogoChange={vi.fn()} />);
    const tooBig = new File(["x"], "huge.png", { type: "image/png" });
    Object.defineProperty(tooBig, "size", { value: 3 * 1024 * 1024 });

    await user.upload(screen.getByLabelText("Logo file input"), tooBig);

    expect(
      await screen.findByText("Image must be smaller than 2MB")
    ).toBeInTheDocument();
  });

  it("disables both the trigger and the file input when disabled", () => {
    render(<LogoUploader disabled onLogoChange={vi.fn()} />);
    expect(screen.getByRole("button")).toBeDisabled();
    expect(screen.getByLabelText("Logo file input")).toBeDisabled();
  });
});
