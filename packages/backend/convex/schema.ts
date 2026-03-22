import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { adminApiTables } from "./admin_api/tableFields";
import { billingTables } from "./billing/tableFields";
import { changelogTables } from "./changelog/tableFields";
import { emailTables } from "./email/tableFields";
import { feedbackTables } from "./feedback/tableFields";
import { githubTables } from "./integrations/github/tableFields";
import { notificationTables } from "./notifications/tableFields";
import { organizationTables } from "./organizations/tableFields";
import { supportTables } from "./support/tableFields";
import { widgetTables } from "./widget/tableFields";

export default defineSchema({
  ...organizationTables,
  ...feedbackTables,
  ...changelogTables,
  ...notificationTables,
  ...supportTables,
  ...widgetTables,
  ...githubTables,
  ...billingTables,
  ...emailTables,
  ...adminApiTables,

  // Standalone tables
  todos: defineTable({
    text: v.string(),
    completed: v.boolean(),
  }),
});
