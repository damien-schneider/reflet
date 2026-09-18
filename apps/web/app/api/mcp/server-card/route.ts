import { MCP_CARD } from "@/lib/agents/mcp/metadata";

export const dynamic = "force-static";

export function GET() {
  return Response.json(MCP_CARD, {
    headers: { "Access-Control-Allow-Origin": "*" },
  });
}
