import { env } from "@reflet/env/web";
import { MCP_ENDPOINT } from "@/lib/agents/mcp/metadata";
import { BASE_URL } from "@/lib/seo-config";

export const dynamic = "force-static";

export function GET() {
  return Response.json(
    {
      linkset: [
        {
          anchor: MCP_ENDPOINT,
          "service-desc": [
            {
              href: `${BASE_URL}/api/mcp/server-card`,
              type: "application/mcp-server-card+json",
            },
          ],
          "service-doc": [
            { href: `${BASE_URL}/auth.md`, type: "text/markdown" },
          ],
        },
        {
          anchor: `${env.NEXT_PUBLIC_CONVEX_SITE_URL}/api/v1`,
          "service-doc": [
            { href: `${BASE_URL}/docs/api`, type: "text/html" },
            { href: `${BASE_URL}/docs/cli`, type: "text/html" },
          ],
        },
      ],
    },
    { headers: { "Content-Type": "application/linkset+json" } }
  );
}
