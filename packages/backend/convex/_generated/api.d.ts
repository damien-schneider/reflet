/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin_api___tests___test_helpers from "../admin_api/__tests__/test_helpers.js";
import type * as admin_api_duplicates from "../admin_api/duplicates.js";
import type * as admin_api_feedback from "../admin_api/feedback.js";
import type * as admin_api_members from "../admin_api/members.js";
import type * as admin_api_milestones from "../admin_api/milestones.js";
import type * as admin_api_organization from "../admin_api/organization.js";
import type * as admin_api_releases from "../admin_api/releases.js";
import type * as admin_api_screenshots from "../admin_api/screenshots.js";
import type * as admin_api_statuses from "../admin_api/statuses.js";
import type * as admin_api_survey from "../admin_api/survey.js";
import type * as admin_api_tableFields from "../admin_api/tableFields.js";
import type * as admin_api_tags from "../admin_api/tags.js";
import type * as ai_agent from "../ai/agent.js";
import type * as ai_chat from "../ai/chat.js";
import type * as ai_context from "../ai/context.js";
import type * as auth_auth from "../auth/auth.js";
import type * as auth_helpers from "../auth/helpers.js";
import type * as auth_queries from "../auth/queries.js";
import type * as billing_actions from "../billing/actions.js";
import type * as billing_internal from "../billing/internal.js";
import type * as billing_queries from "../billing/queries.js";
import type * as billing_stripe from "../billing/stripe.js";
import type * as billing_tableFields from "../billing/tableFields.js";
import type * as billing_utils from "../billing/utils.js";
import type * as changelog_actions from "../changelog/actions.js";
import type * as changelog_ai_actions from "../changelog/ai_actions.js";
import type * as changelog_ai_matching from "../changelog/ai_matching.js";
import type * as changelog_ai_matching_helpers from "../changelog/ai_matching_helpers.js";
import type * as changelog_mutations from "../changelog/mutations.js";
import type * as changelog_notifications from "../changelog/notifications.js";
import type * as changelog_notifications_helpers from "../changelog/notifications_helpers.js";
import type * as changelog_queries from "../changelog/queries.js";
import type * as changelog_release_notes_ai from "../changelog/release_notes_ai.js";
import type * as changelog_releases from "../changelog/releases.js";
import type * as changelog_releases_internal from "../changelog/releases_internal.js";
import type * as changelog_retroactive from "../changelog/retroactive.js";
import type * as changelog_retroactive_actions from "../changelog/retroactive_actions.js";
import type * as changelog_retroactive_mutations from "../changelog/retroactive_mutations.js";
import type * as changelog_rss from "../changelog/rss.js";
import type * as changelog_scheduling from "../changelog/scheduling.js";
import type * as changelog_subscriptions from "../changelog/subscriptions.js";
import type * as changelog_tableFields from "../changelog/tableFields.js";
import type * as crons from "../crons.js";
import type * as domains_actions from "../domains/actions.js";
import type * as domains_crons from "../domains/crons.js";
import type * as domains_internal from "../domains/internal.js";
import type * as domains_publicMutations from "../domains/publicMutations.js";
import type * as domains_queries from "../domains/queries.js";
import type * as domains_vercel from "../domains/vercel.js";
import type * as duplicates_detection from "../duplicates/detection.js";
import type * as duplicates_merge from "../duplicates/merge.js";
import type * as duplicates_queries from "../duplicates/queries.js";
import type * as duplicates_tableFields from "../duplicates/tableFields.js";
import type * as email_analytics from "../email/analytics.js";
import type * as email_health from "../email/health.js";
import type * as email_renderer from "../email/renderer.js";
import type * as email_send from "../email/send.js";
import type * as email_suppression from "../email/suppression.js";
import type * as email_tableFields from "../email/tableFields.js";
import type * as feedback_actions from "../feedback/actions.js";
import type * as feedback_api_admin from "../feedback/api_admin.js";
import type * as feedback_api_auth from "../feedback/api_auth.js";
import type * as feedback_api_public from "../feedback/api_public.js";
import type * as feedback_auto_tagging from "../feedback/auto_tagging.js";
import type * as feedback_clarification from "../feedback/clarification.js";
import type * as feedback_cleanup from "../feedback/cleanup.js";
import type * as feedback_comments from "../feedback/comments.js";
import type * as feedback_feature_check from "../feedback/feature_check.js";
import type * as feedback_importance from "../feedback/importance.js";
import type * as feedback_list from "../feedback/list.js";
import type * as feedback_mutations from "../feedback/mutations.js";
import type * as feedback_queries from "../feedback/queries.js";
import type * as feedback_roadmap from "../feedback/roadmap.js";
import type * as feedback_screenshots from "../feedback/screenshots.js";
import type * as feedback_stale from "../feedback/stale.js";
import type * as feedback_status_utils from "../feedback/status_utils.js";
import type * as feedback_subscriptions from "../feedback/subscriptions.js";
import type * as feedback_tableFields from "../feedback/tableFields.js";
import type * as feedback_tags from "../feedback/tags.js";
import type * as feedback_trash from "../feedback/trash.js";
import type * as feedback_votes from "../feedback/votes.js";
import type * as healthCheck from "../healthCheck.js";
import type * as http from "../http.js";
import type * as http_admin_content from "../http/admin_content.js";
import type * as http_admin_feedback from "../http/admin_feedback.js";
import type * as http_admin_management from "../http/admin_management.js";
import type * as http_ai_api from "../http/ai_api.js";
import type * as http_github_api from "../http/github_api.js";
import type * as http_github_webhook from "../http/github_webhook.js";
import type * as http_helpers from "../http/helpers.js";
import type * as http_public_api from "../http/public_api.js";
import type * as integrations_github_actions from "../integrations/github/actions.js";
import type * as integrations_github_actions_node from "../integrations/github/actions_node.js";
import type * as integrations_github_client_actions from "../integrations/github/client_actions.js";
import type * as integrations_github_code_search from "../integrations/github/code_search.js";
import type * as integrations_github_github_helpers from "../integrations/github/github_helpers.js";
import type * as integrations_github_issues from "../integrations/github/issues.js";
import type * as integrations_github_mutations from "../integrations/github/mutations.js";
import type * as integrations_github_node_actions from "../integrations/github/node_actions.js";
import type * as integrations_github_project_setup from "../integrations/github/project_setup.js";
import type * as integrations_github_queries from "../integrations/github/queries.js";
import type * as integrations_github_release_actions from "../integrations/github/release_actions.js";
import type * as integrations_github_repo_analysis from "../integrations/github/repo_analysis.js";
import type * as integrations_github_sync from "../integrations/github/sync.js";
import type * as integrations_github_tableFields from "../integrations/github/tableFields.js";
import type * as integrations_website_references from "../integrations/website_references.js";
import type * as intelligence_community from "../intelligence/community.js";
import type * as intelligence_competitor_monitor from "../intelligence/competitor_monitor.js";
import type * as intelligence_competitors from "../intelligence/competitors.js";
import type * as intelligence_config from "../intelligence/config.js";
import type * as intelligence_crons from "../intelligence/crons.js";
import type * as intelligence_feedback_integration from "../intelligence/feedback_integration.js";
import type * as intelligence_insights from "../intelligence/insights.js";
import type * as intelligence_intelligence_agent from "../intelligence/intelligence_agent.js";
import type * as intelligence_keywords from "../intelligence/keywords.js";
import type * as intelligence_llm_visibility from "../intelligence/llm_visibility.js";
import type * as intelligence_notifications from "../intelligence/notifications.js";
import type * as intelligence_reports from "../intelligence/reports.js";
import type * as intelligence_structured_output from "../intelligence/structured_output.js";
import type * as intelligence_synthesis from "../intelligence/synthesis.js";
import type * as intelligence_tableFields from "../intelligence/tableFields.js";
import type * as mcp_handler from "../mcp/handler.js";
import type * as mcp_protocol from "../mcp/protocol.js";
import type * as mcp_tools from "../mcp/tools.js";
import type * as migrations_cleanup_board_fields from "../migrations/cleanup_board_fields.js";
import type * as notifications_preferences from "../notifications/preferences.js";
import type * as notifications_push from "../notifications/push.js";
import type * as notifications_push_queries from "../notifications/push_queries.js";
import type * as notifications_queries from "../notifications/queries.js";
import type * as notifications_shipped from "../notifications/shipped.js";
import type * as notifications_shipped_helpers from "../notifications/shipped_helpers.js";
import type * as notifications_tableFields from "../notifications/tableFields.js";
import type * as notifications_weekly_digest from "../notifications/weekly_digest.js";
import type * as notifications_weekly_digest_helpers from "../notifications/weekly_digest_helpers.js";
import type * as organizations_actions from "../organizations/actions.js";
import type * as organizations_invitations from "../organizations/invitations.js";
import type * as organizations_members from "../organizations/members.js";
import type * as organizations_milestones from "../organizations/milestones.js";
import type * as organizations_mutations from "../organizations/mutations.js";
import type * as organizations_onboarding from "../organizations/onboarding.js";
import type * as organizations_queries from "../organizations/queries.js";
import type * as organizations_statuses from "../organizations/statuses.js";
import type * as organizations_super_admin from "../organizations/super_admin.js";
import type * as organizations_tableFields from "../organizations/tableFields.js";
import type * as organizations_tag_manager from "../organizations/tag_manager.js";
import type * as organizations_tag_manager_actions from "../organizations/tag_manager_actions.js";
import type * as privateData from "../privateData.js";
import type * as shared_constants from "../shared/constants.js";
import type * as shared_text_formatters from "../shared/text_formatters.js";
import type * as shared_utils from "../shared/utils.js";
import type * as shared_validators from "../shared/validators.js";
import type * as sitemap_public from "../sitemap_public.js";
import type * as status_healthCheck from "../status/healthCheck.js";
import type * as status_incidents from "../status/incidents.js";
import type * as status_monitors from "../status/monitors.js";
import type * as status_publicQueries from "../status/publicQueries.js";
import type * as status_subscriptions from "../status/subscriptions.js";
import type * as status_tableFields from "../status/tableFields.js";
import type * as storage from "../storage.js";
import type * as support_conversations from "../support/conversations.js";
import type * as support_messages from "../support/messages.js";
import type * as support_tableFields from "../support/tableFields.js";
import type * as surveys_mutations from "../surveys/mutations.js";
import type * as surveys_tableFields from "../surveys/tableFields.js";
import type * as todos from "../todos.js";
import type * as widget_admin from "../widget/admin.js";
import type * as widget_public from "../widget/public.js";
import type * as widget_tableFields from "../widget/tableFields.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "admin_api/__tests__/test_helpers": typeof admin_api___tests___test_helpers;
  "admin_api/duplicates": typeof admin_api_duplicates;
  "admin_api/feedback": typeof admin_api_feedback;
  "admin_api/members": typeof admin_api_members;
  "admin_api/milestones": typeof admin_api_milestones;
  "admin_api/organization": typeof admin_api_organization;
  "admin_api/releases": typeof admin_api_releases;
  "admin_api/screenshots": typeof admin_api_screenshots;
  "admin_api/statuses": typeof admin_api_statuses;
  "admin_api/survey": typeof admin_api_survey;
  "admin_api/tableFields": typeof admin_api_tableFields;
  "admin_api/tags": typeof admin_api_tags;
  "ai/agent": typeof ai_agent;
  "ai/chat": typeof ai_chat;
  "ai/context": typeof ai_context;
  "auth/auth": typeof auth_auth;
  "auth/helpers": typeof auth_helpers;
  "auth/queries": typeof auth_queries;
  "billing/actions": typeof billing_actions;
  "billing/internal": typeof billing_internal;
  "billing/queries": typeof billing_queries;
  "billing/stripe": typeof billing_stripe;
  "billing/tableFields": typeof billing_tableFields;
  "billing/utils": typeof billing_utils;
  "changelog/actions": typeof changelog_actions;
  "changelog/ai_actions": typeof changelog_ai_actions;
  "changelog/ai_matching": typeof changelog_ai_matching;
  "changelog/ai_matching_helpers": typeof changelog_ai_matching_helpers;
  "changelog/mutations": typeof changelog_mutations;
  "changelog/notifications": typeof changelog_notifications;
  "changelog/notifications_helpers": typeof changelog_notifications_helpers;
  "changelog/queries": typeof changelog_queries;
  "changelog/release_notes_ai": typeof changelog_release_notes_ai;
  "changelog/releases": typeof changelog_releases;
  "changelog/releases_internal": typeof changelog_releases_internal;
  "changelog/retroactive": typeof changelog_retroactive;
  "changelog/retroactive_actions": typeof changelog_retroactive_actions;
  "changelog/retroactive_mutations": typeof changelog_retroactive_mutations;
  "changelog/rss": typeof changelog_rss;
  "changelog/scheduling": typeof changelog_scheduling;
  "changelog/subscriptions": typeof changelog_subscriptions;
  "changelog/tableFields": typeof changelog_tableFields;
  crons: typeof crons;
  "domains/actions": typeof domains_actions;
  "domains/crons": typeof domains_crons;
  "domains/internal": typeof domains_internal;
  "domains/publicMutations": typeof domains_publicMutations;
  "domains/queries": typeof domains_queries;
  "domains/vercel": typeof domains_vercel;
  "duplicates/detection": typeof duplicates_detection;
  "duplicates/merge": typeof duplicates_merge;
  "duplicates/queries": typeof duplicates_queries;
  "duplicates/tableFields": typeof duplicates_tableFields;
  "email/analytics": typeof email_analytics;
  "email/health": typeof email_health;
  "email/renderer": typeof email_renderer;
  "email/send": typeof email_send;
  "email/suppression": typeof email_suppression;
  "email/tableFields": typeof email_tableFields;
  "feedback/actions": typeof feedback_actions;
  "feedback/api_admin": typeof feedback_api_admin;
  "feedback/api_auth": typeof feedback_api_auth;
  "feedback/api_public": typeof feedback_api_public;
  "feedback/auto_tagging": typeof feedback_auto_tagging;
  "feedback/clarification": typeof feedback_clarification;
  "feedback/cleanup": typeof feedback_cleanup;
  "feedback/comments": typeof feedback_comments;
  "feedback/feature_check": typeof feedback_feature_check;
  "feedback/importance": typeof feedback_importance;
  "feedback/list": typeof feedback_list;
  "feedback/mutations": typeof feedback_mutations;
  "feedback/queries": typeof feedback_queries;
  "feedback/roadmap": typeof feedback_roadmap;
  "feedback/screenshots": typeof feedback_screenshots;
  "feedback/stale": typeof feedback_stale;
  "feedback/status_utils": typeof feedback_status_utils;
  "feedback/subscriptions": typeof feedback_subscriptions;
  "feedback/tableFields": typeof feedback_tableFields;
  "feedback/tags": typeof feedback_tags;
  "feedback/trash": typeof feedback_trash;
  "feedback/votes": typeof feedback_votes;
  healthCheck: typeof healthCheck;
  http: typeof http;
  "http/admin_content": typeof http_admin_content;
  "http/admin_feedback": typeof http_admin_feedback;
  "http/admin_management": typeof http_admin_management;
  "http/ai_api": typeof http_ai_api;
  "http/github_api": typeof http_github_api;
  "http/github_webhook": typeof http_github_webhook;
  "http/helpers": typeof http_helpers;
  "http/public_api": typeof http_public_api;
  "integrations/github/actions": typeof integrations_github_actions;
  "integrations/github/actions_node": typeof integrations_github_actions_node;
  "integrations/github/client_actions": typeof integrations_github_client_actions;
  "integrations/github/code_search": typeof integrations_github_code_search;
  "integrations/github/github_helpers": typeof integrations_github_github_helpers;
  "integrations/github/issues": typeof integrations_github_issues;
  "integrations/github/mutations": typeof integrations_github_mutations;
  "integrations/github/node_actions": typeof integrations_github_node_actions;
  "integrations/github/project_setup": typeof integrations_github_project_setup;
  "integrations/github/queries": typeof integrations_github_queries;
  "integrations/github/release_actions": typeof integrations_github_release_actions;
  "integrations/github/repo_analysis": typeof integrations_github_repo_analysis;
  "integrations/github/sync": typeof integrations_github_sync;
  "integrations/github/tableFields": typeof integrations_github_tableFields;
  "integrations/website_references": typeof integrations_website_references;
  "intelligence/community": typeof intelligence_community;
  "intelligence/competitor_monitor": typeof intelligence_competitor_monitor;
  "intelligence/competitors": typeof intelligence_competitors;
  "intelligence/config": typeof intelligence_config;
  "intelligence/crons": typeof intelligence_crons;
  "intelligence/feedback_integration": typeof intelligence_feedback_integration;
  "intelligence/insights": typeof intelligence_insights;
  "intelligence/intelligence_agent": typeof intelligence_intelligence_agent;
  "intelligence/keywords": typeof intelligence_keywords;
  "intelligence/llm_visibility": typeof intelligence_llm_visibility;
  "intelligence/notifications": typeof intelligence_notifications;
  "intelligence/reports": typeof intelligence_reports;
  "intelligence/structured_output": typeof intelligence_structured_output;
  "intelligence/synthesis": typeof intelligence_synthesis;
  "intelligence/tableFields": typeof intelligence_tableFields;
  "mcp/handler": typeof mcp_handler;
  "mcp/protocol": typeof mcp_protocol;
  "mcp/tools": typeof mcp_tools;
  "migrations/cleanup_board_fields": typeof migrations_cleanup_board_fields;
  "notifications/preferences": typeof notifications_preferences;
  "notifications/push": typeof notifications_push;
  "notifications/push_queries": typeof notifications_push_queries;
  "notifications/queries": typeof notifications_queries;
  "notifications/shipped": typeof notifications_shipped;
  "notifications/shipped_helpers": typeof notifications_shipped_helpers;
  "notifications/tableFields": typeof notifications_tableFields;
  "notifications/weekly_digest": typeof notifications_weekly_digest;
  "notifications/weekly_digest_helpers": typeof notifications_weekly_digest_helpers;
  "organizations/actions": typeof organizations_actions;
  "organizations/invitations": typeof organizations_invitations;
  "organizations/members": typeof organizations_members;
  "organizations/milestones": typeof organizations_milestones;
  "organizations/mutations": typeof organizations_mutations;
  "organizations/onboarding": typeof organizations_onboarding;
  "organizations/queries": typeof organizations_queries;
  "organizations/statuses": typeof organizations_statuses;
  "organizations/super_admin": typeof organizations_super_admin;
  "organizations/tableFields": typeof organizations_tableFields;
  "organizations/tag_manager": typeof organizations_tag_manager;
  "organizations/tag_manager_actions": typeof organizations_tag_manager_actions;
  privateData: typeof privateData;
  "shared/constants": typeof shared_constants;
  "shared/text_formatters": typeof shared_text_formatters;
  "shared/utils": typeof shared_utils;
  "shared/validators": typeof shared_validators;
  sitemap_public: typeof sitemap_public;
  "status/healthCheck": typeof status_healthCheck;
  "status/incidents": typeof status_incidents;
  "status/monitors": typeof status_monitors;
  "status/publicQueries": typeof status_publicQueries;
  "status/subscriptions": typeof status_subscriptions;
  "status/tableFields": typeof status_tableFields;
  storage: typeof storage;
  "support/conversations": typeof support_conversations;
  "support/messages": typeof support_messages;
  "support/tableFields": typeof support_tableFields;
  "surveys/mutations": typeof surveys_mutations;
  "surveys/tableFields": typeof surveys_tableFields;
  todos: typeof todos;
  "widget/admin": typeof widget_admin;
  "widget/public": typeof widget_public;
  "widget/tableFields": typeof widget_tableFields;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  betterAuth: import("@convex-dev/better-auth/_generated/component.js").ComponentApi<"betterAuth">;
  agent: import("@convex-dev/agent/_generated/component.js").ComponentApi<"agent">;
  stripe: import("@convex-dev/stripe/_generated/component.js").ComponentApi<"stripe">;
  rateLimiter: import("@convex-dev/rate-limiter/_generated/component.js").ComponentApi<"rateLimiter">;
  resend: import("@convex-dev/resend/_generated/component.js").ComponentApi<"resend">;
  shardedCounter: import("@convex-dev/sharded-counter/_generated/component.js").ComponentApi<"shardedCounter">;
};
