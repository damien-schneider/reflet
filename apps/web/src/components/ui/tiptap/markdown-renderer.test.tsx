import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MarkdownRenderer } from "./markdown-renderer";

describe("MarkdownRenderer", () => {
  it("renders empty state when content is empty", () => {
    render(<MarkdownRenderer content="" />);
    expect(screen.getByText("No description provided.")).toBeInTheDocument();
  });

  it("renders markdown as formatted, read-only content", async () => {
    render(<MarkdownRenderer content={"# Release notes\n\n- Faster search"} />);
    expect(
      await screen.findByRole("heading", { level: 1, name: "Release notes" })
    ).toBeInTheDocument();
    expect(screen.getByRole("listitem")).toHaveTextContent("Faster search");
    expect(
      screen.getByRole("heading", { level: 1 }).closest("[contenteditable]")
    ).toHaveAttribute("contenteditable", "false");
  });

  it("opens links in a new tab without leaking the opener", async () => {
    render(<MarkdownRenderer content="[Docs](https://docs.example.com)" />);
    const link = await screen.findByRole("link", { name: "Docs" });
    expect(link).toHaveAttribute("href", "https://docs.example.com");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("shows raw HTML as text instead of rendering it", async () => {
    const { container } = render(
      <MarkdownRenderer content={'Hello <img src="x" onerror="alert(1)">'} />
    );
    expect(await screen.findByText(/<img src="x"/)).toBeInTheDocument();
    expect(container.querySelector('img[src="x"]')).toBeNull();
  });

  it("shows new content when the content prop changes", async () => {
    const { rerender } = render(<MarkdownRenderer content="First draft" />);
    expect(await screen.findByText("First draft")).toBeInTheDocument();
    rerender(<MarkdownRenderer content="Final notes" />);
    expect(await screen.findByText("Final notes")).toBeInTheDocument();
    expect(screen.queryByText("First draft")).not.toBeInTheDocument();
  });

  it("replaces an image that fails to load with a placeholder", async () => {
    render(
      <MarkdownRenderer content="![Screenshot](https://cdn.example.com/broken.png)" />
    );
    const image = await screen.findByRole("img", { name: "Screenshot" });
    fireEvent.error(image);
    expect(image).not.toBeVisible();
    expect(screen.getByText("Image unavailable")).toBeVisible();
  });
});
