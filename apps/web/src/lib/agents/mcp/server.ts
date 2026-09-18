import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import {
  documentationUri,
  documentName,
  readDocumentation,
} from "@/lib/agents/documents";
import { rejectUntrustedAgentRequest } from "@/lib/agents/request-origin";
import { DOCUMENTATION_SERVER } from "./metadata";

function createDocumentationServer() {
  const server = new McpServer(DOCUMENTATION_SERVER);
  for (const document of documentName.options) {
    server.registerResource(
      document,
      documentationUri(document),
      {
        description: `Public Reflet ${document} documentation`,
        mimeType: "text/markdown",
      },
      async () => ({ contents: [await readDocumentation(document)] })
    );
  }
  server.registerTool(
    "read_documentation",
    {
      annotations: {
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
        readOnlyHint: true,
      },
      description:
        "Read official Reflet documentation: product overview, authentication, or integration instructions.",
      inputSchema: z.object({ document: documentName }),
    },
    async ({ document }) => ({
      content: [
        { resource: await readDocumentation(document), type: "resource" },
      ],
    })
  );
  return server;
}

const handler = createMcpHandler(createDocumentationServer, {
  maxSubscriptions: 0,
});
export async function handleDocumentationRequest(
  request: Request
): Promise<Response> {
  const rejected = rejectUntrustedAgentRequest(request);
  if (rejected) {
    return rejected;
  }
  const response = await handler.fetch(request);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
