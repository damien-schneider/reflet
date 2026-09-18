import { AgentCard } from "@a2a-js/sdk";
import { DOCUMENTATION_AGENT } from "@/lib/agents/a2a/card";

export const dynamic = "force-static";

export function GET() {
  return Response.json(AgentCard.toJSON(DOCUMENTATION_AGENT), {
    headers: { "Access-Control-Allow-Origin": "*" },
  });
}
