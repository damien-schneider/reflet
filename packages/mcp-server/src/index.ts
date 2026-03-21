import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { RefletAdminClient } from "./client.js";
import { createServer } from "./server.js";

const secretKey = process.env.REFLET_SECRET_KEY;
if (!secretKey) {
  process.stderr.write(
    "Error: REFLET_SECRET_KEY environment variable is required.\n"
  );
  process.exit(1);
}

const baseUrl = process.env.REFLET_BASE_URL;

const client = new RefletAdminClient({ secretKey, baseUrl });
const server = createServer(client);
const transport = new StdioServerTransport();

await server.connect(transport);
