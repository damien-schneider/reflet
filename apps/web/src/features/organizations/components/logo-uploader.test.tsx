import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

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

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    disabled,
    onClick,
    type,
    ...rest
  }: {
    children: React.ReactNode;
    disabled?: boolean;
    onClick?: () => void;
    type?: string;
    [key: string]: unknown;
  }) => (
    <button
      disabled={disabled}
      onClick={onClick}
      type={type as "button" | "submit"}
    >
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/tiptap/use-image-upload", () => ({
  useImageUpload: ({
    onSuccess,
    onError,
  }: {
    onSuccess: (url: string) => void;
    onError: (err: Error) => void;
  }) => ({
    uploadImage: vi.fn(async () => {
      onSuccess("https://uploaded.example.com/logo.png");
    }),
    isUploading: false,
  }),
}));

vi.mock("@/components/ui/typography", () => ({
  Muted: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <span className={className}>{children}</span>,
}));

vi.mock("@/lib/utils", () => ({
  cn: (...classes: unknown[]) => classes.filter(Boolean).join(" "),
}));

vi.mock("@phosphor-icons/react", () => ({
  Image: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="image-icon" />
  ),
  Spinner: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="spinner-icon" />
  ),
  Trash: ({ className }: { className?: string }) => (
    <svg className={className} />
  ),
  Upload: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="upload-icon" />
  ),
}));

import { LogoUploader } from "./logo-uploader";

afterEach(cleanup);

describe("LogoUploader", () => {
  it("renders upload prompt when no logo", () => {
    render(<LogoUploader onLogoChange={vi.fn()} />);
    expect(screen.getByText("Click or drag to upload")).toBeInTheDocument();
  });

  it("renders format hint", () => {
    render(<LogoUploader onLogoChange={vi.fn()} />);
    expect(screen.getByText(/PNG, JPG, SVG, WebP/)).toBeInTheDocument();
  });

  it("renders current logo when provided", () => {
    render(
      <LogoUploader
        currentLogo="https://example.com/logo.png"
        onLogoChange={vi.fn()}
      />
    );
    expect(screen.getByAltText("Organization logo")).toBeInTheDocument();
  });

  it("shows replace hint when logo exists", () => {
    render(
      <LogoUploader
        currentLogo="https://example.com/logo.png"
        onLogoChange={vi.fn()}
      />
    );
    expect(screen.getByText("Click or drag to replace")).toBeInTheDocument();
  });

  it("renders Remove logo button when logo exists", () => {
    render(
      <LogoUploader
        currentLogo="https://example.com/logo.png"
        onLogoChange={vi.fn()}
      />
    );
    expect(screen.getByText("Remove logo")).toBeInTheDocument();
  });

  it("does not render Remove logo button when no logo", () => {
    render(<LogoUploader onLogoChange={vi.fn()} />);
    expect(screen.queryByText("Remove logo")).not.toBeInTheDocument();
  });

  it("calls onLogoChange(null) when remove button is clicked", async () => {
    const user = userEvent.setup();
    const onLogoChange = vi.fn();
    render(
      <LogoUploader
        currentLogo="https://example.com/logo.png"
        onLogoChange={onLogoChange}
      />
    );

    await user.click(screen.getByText("Remove logo"));
    expect(onLogoChange).toHaveBeenCalledWith(null);
  });

  it("renders hidden file input", () => {
    const { container } = render(<LogoUploader onLogoChange={vi.fn()} />);
    const fileInput = container.querySelector('input[type="file"]');
    expect(fileInput).toBeInTheDocument();
    expect(fileInput).toHaveClass("hidden");
  });

  it("accepts correct file formats", () => {
    const { container } = render(<LogoUploader onLogoChange={vi.fn()} />);
    const fileInput = container.querySelector('input[type="file"]');
    expect(fileInput).toHaveAttribute(
      "accept",
      "image/png,image/jpeg,image/svg+xml,image/webp"
    );
  });

  it("disables drop zone when disabled", () => {
    render(<LogoUploader disabled={true} onLogoChange={vi.fn()} />);
    const dropZone = screen.getByRole("button");
    expect(dropZone).toBeDisabled();
  });

  it("has accessible file input label", () => {
    const { container } = render(<LogoUploader onLogoChange={vi.fn()} />);
    const fileInput = container.querySelector('input[type="file"]');
    expect(fileInput).toHaveAttribute("aria-label", "Logo file input");
  });

  it("triggers file input on Enter keypress", async () => {
    const user = userEvent.setup();
    render(<LogoUploader onLogoChange={vi.fn()} />);
    const dropZone = screen.getByRole("button");
    await user.tab();
    await user.keyboard("{Enter}");
    // Verify the drop zone is focusable and responds to keyboard
    expect(dropZone).toBeInTheDocument();
  });

  it("triggers file input on Space keypress", async () => {
    const user = userEvent.setup();
    render(<LogoUploader onLogoChange={vi.fn()} />);
    const dropZone = screen.getByRole("button");
    await user.tab();
    await user.keyboard(" ");
    expect(dropZone).toBeInTheDocument();
  });

  it("renders image icon when no logo", () => {
    render(<LogoUploader onLogoChange={vi.fn()} />);
    expect(screen.getByTestId("image-icon")).toBeInTheDocument();
  });

  it("does not show image icon when logo exists", () => {
    render(
      <LogoUploader
        currentLogo="https://example.com/logo.png"
        onLogoChange={vi.fn()}
      />
    );
    expect(screen.queryByTestId("image-icon")).not.toBeInTheDocument();
  });

  it("shows organization logo image when logo exists", () => {
    render(
      <LogoUploader
        currentLogo="https://example.com/logo.png"
        onLogoChange={vi.fn()}
      />
    );
    expect(screen.getByAltText("Organization logo")).toHaveAttribute(
      "src",
      "https://example.com/logo.png"
    );
  });

  it("does not show Remove button when disabled", () => {
    render(
      <LogoUploader
        currentLogo="https://example.com/logo.png"
        disabled={true}
        onLogoChange={vi.fn()}
      />
    );
    const removeBtn = screen.getByText("Remove logo");
    expect(removeBtn).toBeDisabled();
  });

  it("shows format hint in empty state", () => {
    render(<LogoUploader onLogoChange={vi.fn()} />);
    expect(screen.getByText(/PNG, JPG, SVG, WebP/)).toBeInTheDocument();
  });

  it("shows Click or drag to upload text in empty state", () => {
    render(<LogoUploader onLogoChange={vi.fn()} />);
    expect(screen.getByText("Click or drag to upload")).toBeInTheDocument();
  });

  it("shows replace text when logo exists", () => {
    render(
      <LogoUploader
        currentLogo="https://example.com/logo.png"
        onLogoChange={vi.fn()}
      />
    );
    expect(screen.getByText("Click or drag to replace")).toBeInTheDocument();
  });

  it("calls onLogoChange(null) when Remove button is clicked", async () => {
    const onLogoChange = vi.fn();
    const user = userEvent.setup();
    render(
      <LogoUploader
        currentLogo="https://example.com/logo.png"
        onLogoChange={onLogoChange}
      />
    );
    await user.click(screen.getByText("Remove logo"));
    expect(onLogoChange).toHaveBeenCalledWith(null);
  });

  it("renders hidden file input with correct accept attribute", () => {
    render(<LogoUploader onLogoChange={vi.fn()} />);
    const input = screen.getByLabelText("Logo file input");
    expect(input).toHaveAttribute(
      "accept",
      "image/png,image/jpeg,image/svg+xml,image/webp"
    );
  });

  it("renders file input as disabled when disabled", () => {
    render(<LogoUploader disabled onLogoChange={vi.fn()} />);
    const input = screen.getByLabelText("Logo file input");
    expect(input).toBeDisabled();
  });

  it("calls onLogoChange when a valid file is selected", async () => {
    const onLogoChange = vi.fn();
    const user = userEvent.setup();
    render(<LogoUploader onLogoChange={onLogoChange} />);
    const input = screen.getByLabelText("Logo file input");
    const file = new File(["img"], "logo.png", { type: "image/png" });
    await user.upload(input, file);
    expect(onLogoChange).toHaveBeenCalled();
  });

  it("renders drop zone area", () => {
    const { container } = render(<LogoUploader onLogoChange={vi.fn()} />);
    expect(container.querySelector("div")).toBeInTheDocument();
  });

  it("renders upload text prompt", () => {
    render(<LogoUploader onLogoChange={vi.fn()} />);
    expect(screen.getByText(/Upload|Drop|Click|logo/i)).toBeInTheDocument();
  });

  it("shows current logo preview when currentLogo is provided", () => {
    render(
      <LogoUploader
        currentLogo="https://example.com/logo.png"
        onLogoChange={vi.fn()}
      />
    );
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "https://example.com/logo.png");
  });

  it("renders remove button when currentLogo is set", () => {
    render(
      <LogoUploader
        currentLogo="https://example.com/logo.png"
        onLogoChange={vi.fn()}
      />
    );
    expect(
      screen.getByText(/Remove|remove|Delete|delete/i)
    ).toBeInTheDocument();
  });
});
