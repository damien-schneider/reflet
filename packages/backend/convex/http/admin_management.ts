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
    method: "GET",
    path: "/api/v1/admin/milestones",
  });

  http.route({
    handler: adminGet(async (ctx, { organizationId }, url) => {
      const id = url.searchParams.get("id");
      return await ctx.runQuery(internal.admin_api.milestones.getMilestone, {
        milestoneId: parseId<"milestones">(id, "id"),
        organizationId,
      });
    }),
    method: "GET",
    path: "/api/v1/admin/milestone",
  });

  http.route({
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
          color: requireStr(body.color, "color"),
          description: str(body.description),
          emoji: str(body.emoji),
          isPublic: bool(body.isPublic),
          name: requireStr(body.name, "name"),
          organizationId,
          targetDate: num(body.targetDate),
          timeHorizon,
        }
      );
    }),
    method: "POST",
    path: "/api/v1/admin/milestone/create",
  });

  http.route({
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
          color: str(body.color),
          description: str(body.description),
          emoji: str(body.emoji),
          isPublic: bool(body.isPublic),
          milestoneId: parseId<"milestones">(
            str(body.milestoneId),
            "milestoneId"
          ),
          name: str(body.name),
          organizationId,
          targetDate: num(body.targetDate),
          timeHorizon,
        }
      );
    }),
    method: "POST",
    path: "/api/v1/admin/milestone/update",
  });

  http.route({
    handler: adminPost(async (ctx, { organizationId }, body) =>
      ctx.runMutation(internal.admin_api.milestones.completeMilestone, {
        milestoneId: parseId<"milestones">(
          str(body.milestoneId),
          "milestoneId"
        ),
        organizationId,
      })
    ),
    method: "POST",
    path: "/api/v1/admin/milestone/complete",
  });

  http.route({
    handler: adminPost(async (ctx, { organizationId }, body) =>
      ctx.runMutation(internal.admin_api.milestones.deleteMilestone, {
        milestoneId: parseId<"milestones">(
          str(body.milestoneId),
          "milestoneId"
        ),
        organizationId,
      })
    ),
    method: "POST",
    path: "/api/v1/admin/milestone/delete",
  });

  http.route({
    handler: adminPost(async (ctx, { organizationId }, body) => {
      const action = requireStr(body.action, "action") as "link" | "unlink";
      return await ctx.runMutation(
        internal.admin_api.milestones.linkMilestoneFeedback,
        {
          action,
          feedbackId: parseId<"feedback">(str(body.feedbackId), "feedbackId"),
          milestoneId: parseId<"milestones">(
            str(body.milestoneId),
            "milestoneId"
          ),
          organizationId,
        }
      );
    }),
    method: "POST",
    path: "/api/v1/admin/milestone/link-feedback",
  });

  // ============================================
  // MEMBERS & INVITATIONS
  // ============================================

  http.route({
    handler: adminGet(async (ctx, { organizationId }) =>
      ctx.runQuery(internal.admin_api.members.listMembers, {
        organizationId,
      })
    ),
    method: "GET",
    path: "/api/v1/admin/members",
  });

  http.route({
    handler: adminGet(async (ctx, { organizationId }) =>
      ctx.runQuery(internal.admin_api.members.listInvitations, {
        organizationId,
      })
    ),
    method: "GET",
    path: "/api/v1/admin/invitations",
  });

  http.route({
    handler: adminPost(async (ctx, { organizationId }, body) => {
      const role = requireStr(body.role, "role") as "admin" | "member";
      return await ctx.runMutation(
        internal.admin_api.members.createInvitation,
        {
          email: requireStr(body.email, "email"),
          organizationId,
          role,
        }
      );
    }),
    method: "POST",
    path: "/api/v1/admin/invitation/create",
  });

  http.route({
    handler: adminPost(async (ctx, { organizationId }, body) =>
      ctx.runMutation(internal.admin_api.members.cancelInvitation, {
        invitationId: parseId<"invitations">(
          str(body.invitationId),
          "invitationId"
        ),
        organizationId,
      })
    ),
    method: "POST",
    path: "/api/v1/admin/invitation/cancel",
  });

  // ============================================
  // ORGANIZATION
  // ============================================

  http.route({
    handler: adminGet(async (ctx, { organizationId }) =>
      ctx.runQuery(internal.admin_api.organization.getOrganization, {
        organizationId,
      })
    ),
    method: "GET",
    path: "/api/v1/admin/organization",
  });

  http.route({
    handler: adminPost(async (ctx, { organizationId }, body) =>
      ctx.runMutation(internal.admin_api.organization.updateOrganization, {
        isPublic: bool(body.isPublic),
        name: str(body.name),
        organizationId,
        primaryColor: str(body.primaryColor),
        supportEnabled: bool(body.supportEnabled),
      })
    ),
    method: "POST",
    path: "/api/v1/admin/organization/update",
  });

  // --- CORS preflight for all admin management routes ---
  for (const path of ADMIN_MANAGEMENT_PATHS) {
    http.route({ handler: corsOptionsHandler(), method: "OPTIONS", path });
  }
}
