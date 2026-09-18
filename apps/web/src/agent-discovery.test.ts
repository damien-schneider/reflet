import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { proxy } from "../proxy";

describe("agent content negotiation", () => {
  it("serves the public overview when Markdown is preferred", () => {
    const response = proxy(
      new NextRequest("https://www.reflet.app/", {
        headers: { accept: "text/markdown", host: "www.reflet.app" },
      })
    );
    expect(response.headers.get("x-middleware-rewrite")).toBe(
      "https://www.reflet.app/llms.txt"
    );
    expect(response.headers.get("vary")).toContain("Accept");
  });

  it.each([
    "text/html",
    "*/*",
    "text/markdown;q=0",
    "text/markdown;q=0.2, text/html;q=0.9",
    "text/markdown;q=invalid",
  ])("preserves HTML for %s", (accept) => {
    const response = proxy(
      new NextRequest("https://www.reflet.app/", {
        headers: { accept, host: "www.reflet.app" },
      })
    );
    expect(response.headers.get("x-middleware-rewrite")).toBeNull();
  });

  it("does not replace application routes with marketing content", () => {
    const response = proxy(
      new NextRequest("https://www.reflet.app/account", {
        headers: { accept: "text/markdown", host: "www.reflet.app" },
      })
    );
    expect(response.headers.get("x-middleware-rewrite")).toBeNull();
  });
});

describe("agent negotiation boundaries", () => {
  it("keeps signed-in visitors on the dashboard", () => {
    const response = proxy(
      new NextRequest("https://www.reflet.app/", {
        headers: {
          accept: "text/markdown",
          cookie: "better-auth.session_token=test-session",
          host: "www.reflet.app",
        },
      })
    );
    expect(response.headers.get("location")).toBe(
      "https://www.reflet.app/dashboard"
    );
    expect(response.headers.get("x-middleware-rewrite")).toBeNull();
  });
  it("preserves custom domain routing", () => {
    const response = proxy(
      new NextRequest("https://feedback.example/", {
        headers: { accept: "text/markdown", host: "feedback.example" },
      })
    );
    expect(response.headers.get("x-middleware-rewrite")).toBe(
      "https://feedback.example/_custom-domain"
    );
    expect(response.headers.get("content-type")).not.toBe(
      "text/markdown; charset=utf-8"
    );
  });
});
