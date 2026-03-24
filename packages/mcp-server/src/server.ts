import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RefletAdminClient } from "./client.js";
import { registerCommentTools } from "./tools/comments.js";
import { registerDuplicateTools } from "./tools/duplicates.js";
import { registerFeedbackTools } from "./tools/feedback.js";
import { registerMemberTools } from "./tools/members.js";
import { registerMilestoneTools } from "./tools/milestones.js";
import { registerOrganizationTools } from "./tools/organization.js";
import { registerReleaseTools } from "./tools/releases.js";
import { registerScreenshotTools } from "./tools/screenshots.js";
import { registerStatusTools } from "./tools/statuses.js";
import { registerSurveyTools } from "./tools/surveys.js";
import { registerTagTools } from "./tools/tags.js";

export function createServer(client: RefletAdminClient): McpServer {
  const server = new McpServer({
    name: "reflet",
    version: "0.1.0",
  });

  registerFeedbackTools(server, client);
  registerCommentTools(server, client);
  registerTagTools(server, client);
  registerReleaseTools(server, client);
  registerMilestoneTools(server, client);
  registerStatusTools(server, client);
  registerMemberTools(server, client);
  registerOrganizationTools(server, client);
  registerDuplicateTools(server, client);
  registerScreenshotTools(server, client);
  registerSurveyTools(server, client);

  return server;
}
