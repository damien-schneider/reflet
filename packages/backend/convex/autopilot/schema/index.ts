import { activityTables } from "./activity.tables";
import { agentsTables } from "./agents.tables";
import { communityPostsTables } from "./community_posts.tables";
import { competitorsTables } from "./competitors.tables";
import { configTables } from "./config.tables";
import { dataTables } from "./data.tables";
import { documentsTables } from "./documents.tables";
import { knowledgeTables } from "./knowledge.tables";
import { memoryTables } from "./memory.tables";
import { personasTables } from "./personas.tables";
import { reportsTables } from "./reports.tables";
import { useCasesTables } from "./use_cases.tables";
import { workTables } from "./work.tables";

export const autopilotTables = {
  ...configTables,
  ...activityTables,
  ...knowledgeTables,
  ...agentsTables,
  ...dataTables,
  ...documentsTables,
  ...competitorsTables,
  ...workTables,
  ...reportsTables,
  ...memoryTables,
  ...personasTables,
  ...useCasesTables,
  ...communityPostsTables,
};
