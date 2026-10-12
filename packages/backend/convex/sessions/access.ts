import { ConvexError, type Infer, v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { SESSION_NOT_FOUND } from "./constants";

export const sessionActorValidator = v.object({
  organizationId: v.id("organizations"),
  userId: v.string(),
});

export type SessionActor = Infer<typeof sessionActorValidator>;

export type SessionAccess = "read" | "write";

type SessionLimitKind =
  | "duration"
  | "segments"
  | "events"
  | "evidence"
  | "bytes";

type SessionChildTable =
  | "sessionEvidence"
  | "sessionHandoffs"
  | "sessionProposals"
  | "sessionSegments";

const NOT_FOUND_STATUS = 404;
const FORBIDDEN_STATUS = 403;
const CONFLICT_STATUS = 409;
const LIMIT_STATUS = 413;
const ONLY_AUTHOR = "Only the author can change this session.";

export function sessionFailure(
  status: number,
  error: string
): ConvexError<{
  error: string;
  status: number;
}> {
  return new ConvexError({ error, status });
}

export const sessionNotFound = () =>
  sessionFailure(NOT_FOUND_STATUS, SESSION_NOT_FOUND);

export const sessionConflict = (error: string) =>
  sessionFailure(CONFLICT_STATUS, error);

export function sessionLimitReached(limit: SessionLimitKind): ConvexError<{
  error: string;
  limit: SessionLimitKind;
  status: number;
}> {
  return new ConvexError({
    error: `This session reached its ${limit} limit.`,
    limit,
    status: LIMIT_STATUS,
  });
}

export function canReadSession(
  session: Doc<"sessions">,
  actor: SessionActor
): boolean {
  return (
    session.organizationId === actor.organizationId &&
    session.deletedAt === undefined &&
    (session.authorId === actor.userId || session.visibility === "team")
  );
}

export async function loadSession(
  ctx: QueryCtx,
  options: { actor: SessionActor; access: SessionAccess; sessionId: string }
): Promise<Doc<"sessions">> {
  const sessionId = ctx.db.normalizeId("sessions", options.sessionId);
  const session = sessionId ? await ctx.db.get(sessionId) : null;
  if (!(session && canReadSession(session, options.actor))) {
    throw sessionNotFound();
  }
  if (options.access === "write" && session.authorId !== options.actor.userId) {
    throw sessionFailure(FORBIDDEN_STATUS, ONLY_AUTHOR);
  }
  return session;
}

export async function loadSessionChild<T extends SessionChildTable>(
  ctx: QueryCtx,
  options: {
    access: SessionAccess;
    actor: SessionActor;
    id: string;
    table: T;
  }
): Promise<{ child: Doc<T>; session: Doc<"sessions"> }> {
  const childId = ctx.db.normalizeId(options.table, options.id);
  const child = childId ? await ctx.db.get(childId) : null;
  if (!child || child.organizationId !== options.actor.organizationId) {
    throw sessionNotFound();
  }
  const session = await loadSession(ctx, {
    access: options.access,
    actor: options.actor,
    sessionId: child.sessionId,
  });
  return { child, session };
}

export async function requireIdsInSession<T extends SessionChildTable>(
  ctx: QueryCtx,
  options: { ids: string[]; sessionId: Id<"sessions">; table: T }
): Promise<Id<T>[]> {
  const resolved: Id<T>[] = [];
  for (const id of new Set(options.ids)) {
    const childId = ctx.db.normalizeId(options.table, id);
    const child = childId ? await ctx.db.get(childId) : null;
    if (!(childId && child && child.sessionId === options.sessionId)) {
      throw sessionNotFound();
    }
    resolved.push(childId);
  }
  return resolved;
}
