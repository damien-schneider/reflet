import type { httpRouter } from "convex/server";
import { internal } from "../_generated/api";
import {
  adminGet,
  adminPost,
  bool,
  corsOptionsHandler,
  num,
  parseId,
  requireStr,
  str,
} from "./helpers";

type Router = ReturnType<typeof httpRouter>;

const ADMIN_MANAGEMENT_PATHS = [
  "/api/v1/admin/milestones",
  "/api/v1/admin/milestone",
  "/api/v1/admin/milestone/create",
  "/api/v1/admin/milestone/update",
  "/api/v1/admin/milestone/complete",
  "/api/v1/admin/milestone/delete",
  "/api/v1/admin/milestone/link-feedback",
  "/api/v1/admin/members",
  "/api/v1/admin/invitations",
  "/api/v1/admin/invitation/create",
  "/api/v1/admin/invitation/cancel",
  "/api/v1/admin/organization",
  "/api/v1/admin/organization/update",
] as const;

export function registerAdminManagementRoutes(http: Router): void {
  // ============================================
  // MILESTONES
  // ============================================

  http.route({
    path: "/api/v1/admin/milestones",
    method: "GET",
    handler: adminGet(async (ctx, { organizationId }, url) => {
      const statusParam = url.searchParams.get("status") as
        | "active"
        | "completed"
        | "archived"
        | "all"
        | null;
      return await ctx.runQuery(internal.admin_api.milestones.listMilestones, {
        organizationId,
        status: statusParam ?? undefined,
      });
    }),
  });

  http.route({
    path: "/api/v1/admin/milestone",
    method: "GET",
    handler: adminGet(async (ctx, { organizationId }, url) => {
      const id = url.searchParams.get("id");
      return await ctx.runQuery(internal.admin_api.milestones.getMilestone, {
        organizationId,
        milestoneId: parseId<"milestones">(id, "id"),
      });
    }),
  });

  http.route({
    path: "/api/v1/admin/milestone/create",
    method: "POST",
    handler: adminPost(async (ctx, { organizationId }, body) => {
      const timeHorizon = requireStr(body.timeHorizon, "timeHorizon") as
        | "now"
        | "next_month"
        | "next_quarter"
        | "half_year"
        | "next_year"
        | "future";
      return await ctx.runMutation(
        internal.admin_api.milestones.createMilestone,
        {
          organizationId,
          name: requireStr(body.name, "name"),
          description: str(body.description),
          emoji: str(body.emoji),
          color: requireStr(body.color, "color"),
          timeHorizon,
          targetDate: num(body.targetDate),
          isPublic: bool(body.isPublic),
        }
      );
    }),
  });

  http.route({
    path: "/api/v1/admin/milestone/update",
    method: "POST",
    handler: adminPost(async (ctx, { organizationId }, body) => {
      const timeHorizon = str(body.timeHorizon) as
        | "now"
        | "next_month"
        | "next_quarter"
        | "half_year"
        | "next_year"
        | "future"
        | undefined;
      return await ctx.runMutation(
        internal.admin_api.milestones.updateMilestone,
        {
          organizationId,
          milestoneId: parseId<"milestones">(
            str(body.milestoneId),
            "milestoneId"
          ),
          name: str(body.name),
          description: str(body.description),
          emoji: str(body.emoji),
          color: str(body.color),
          timeHorizon,
          targetDate: num(body.targetDate),
          isPublic: bool(body.isPublic),
        }
      );
    }),
  });

  http.route({
    path: "/api/v1/admin/milestone/complete",
    method: "POST",
    handler: adminPost(async (ctx, { organizationId }, body) =>
      ctx.runMutation(internal.admin_api.milestones.completeMilestone, {
        organizationId,
        milestoneId: parseId<"milestones">(
          str(body.milestoneId),
          "milestoneId"
        ),
      })
    ),
  });

  http.route({
    path: "/api/v1/admin/milestone/delete",
    method: "POST",
    handler: adminPost(async (ctx, { organizationId }, body) =>
      ctx.runMutation(internal.admin_api.milestones.deleteMilestone, {
        organizationId,
        milestoneId: parseId<"milestones">(
          str(body.milestoneId),
          "milestoneId"
        ),
      })
    ),
  });

  http.route({
    path: "/api/v1/admin/milestone/link-feedback",
    method: "POST",
    handler: adminPost(async (ctx, { organizationId }, body) => {
      const action = requireStr(body.action, "action") as "link" | "unlink";
      return await ctx.runMutation(
        internal.admin_api.milestones.linkMilestoneFeedback,
        {
          organizationId,
          milestoneId: parseId<"milestones">(
            str(body.milestoneId),
            "milestoneId"
          ),
          feedbackId: parseId<"feedback">(str(body.feedbackId), "feedbackId"),
          action,
        }
      );
    }),
  });

  // ============================================
  // MEMBERS & INVITATIONS
  // ============================================

  http.route({
    path: "/api/v1/admin/members",
    method: "GET",
    handler: adminGet(async (ctx, { organizationId }) =>
      ctx.runQuery(internal.admin_api.members.listMembers, {
        organizationId,
      })
    ),
  });

  http.route({
    path: "/api/v1/admin/invitations",
    method: "GET",
    handler: adminGet(async (ctx, { organizationId }) =>
      ctx.runQuery(internal.admin_api.members.listInvitations, {
        organizationId,
      })
    ),
  });

  http.route({
    path: "/api/v1/admin/invitation/create",
    method: "POST",
    handler: adminPost(async (ctx, { organizationId }, body) => {
      const role = requireStr(body.role, "role") as "admin" | "member";
      return await ctx.runMutation(
        internal.admin_api.members.createInvitation,
        {
          organizationId,
          email: requireStr(body.email, "email"),
          role,
        }
      );
    }),
  });

  http.route({
    path: "/api/v1/admin/invitation/cancel",
    method: "POST",
    handler: adminPost(async (ctx, { organizationId }, body) =>
      ctx.runMutation(internal.admin_api.members.cancelInvitation, {
        organizationId,
        invitationId: parseId<"invitations">(
          str(body.invitationId),
          "invitationId"
        ),
      })
    ),
  });

  // ============================================
  // ORGANIZATION
  // ============================================

  http.route({
    path: "/api/v1/admin/organization",
    method: "GET",
    handler: adminGet(async (ctx, { organizationId }) =>
      ctx.runQuery(internal.admin_api.organization.getOrganization, {
        organizationId,
      })
    ),
  });

  http.route({
    path: "/api/v1/admin/organization/update",
    method: "POST",
    handler: adminPost(async (ctx, { organizationId }, body) =>
      ctx.runMutation(internal.admin_api.organization.updateOrganization, {
        organizationId,
        name: str(body.name),
        isPublic: bool(body.isPublic),
        primaryColor: str(body.primaryColor),
        supportEnabled: bool(body.supportEnabled),
      })
    ),
  });

  // --- CORS preflight for all admin management routes ---
  for (const path of ADMIN_MANAGEMENT_PATHS) {
    http.route({ path, method: "OPTIONS", handler: corsOptionsHandler() });
  }
}
