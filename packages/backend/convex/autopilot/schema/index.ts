import { agentsTables } from "./agents.tables";
import { commsTables } from "./comms.tables";
import { configTables } from "./config.tables";
import { dataTables } from "./data.tables";
import { knowledgeTables } from "./knowledge.tables";
import { notesTables } from "./notes.tables";
import { recordsTables } from "./records.tables";
import { tasksTables } from "./tasks.tables";

export const autopilotTables = {
  ...configTables,
  ...tasksTables,
  ...knowledgeTables,
  ...recordsTables,
  ...notesTables,
  ...agentsTables,
  ...commsTables,
  ...dataTables,
};
