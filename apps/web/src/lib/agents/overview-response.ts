import { type NextRequest, NextResponse } from "next/server";
import { DISCOVERY_LINKS } from "./discovery-headers";
import { prefersMarkdown } from "./negotiation";

export function agentOverviewResponse(
  request: NextRequest
): NextResponse | null {
  const isReadRequest = request.method === "GET" || request.method === "HEAD";
  if (request.nextUrl.pathname !== "/" || !isReadRequest) {
    return null;
  }
  const wantsMarkdown = prefersMarkdown(request.headers.get("accept"));
  const response = wantsMarkdown
    ? NextResponse.rewrite(new URL("/llms.txt", request.url))
    : NextResponse.next();
  response.headers.set("Vary", "Accept");
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Link", DISCOVERY_LINKS);
  if (wantsMarkdown) {
    response.headers.set("Content-Type", "text/markdown; charset=utf-8");
    response.headers.set("Content-Location", "/llms.txt");
  }
  return response;
}
