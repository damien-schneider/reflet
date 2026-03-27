import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { adminApiTables } from "./admin_api/tableFields";
import { billingTables } from "./billing/tableFields";
import { changelogTables } from "./changelog/tableFields";
import { duplicateTables } from "./duplicates/tableFields";
import { emailTables } from "./email/tableFields";
import { feedbackTables } from "./feedback/tableFields";
import { githubTables } from "./integrations/github/tableFields";
import { intelligenceTables } from "./intelligence/tableFields";
import { notificationTables } from "./notifications/tableFields";
import { organizationTables } from "./organizations/tableFields";
import { statusTables } from "./status/tableFields";
import { supportTables } from "./support/tableFields";
import { surveyTables } from "./surveys/tableFields";
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
  ...duplicateTables,
  ...surveyTables,
  ...intelligenceTables,
  ...statusTables,

  // Standalone tables
  todos: defineTable({
    text: v.string(),
    completed: v.boolean(),
  }),
});
