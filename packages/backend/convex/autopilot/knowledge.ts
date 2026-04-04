import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";
import { knowledgeDocType, knowledgeEditedBy } from "./schema/validators";

const MAX_VERSIONS_PER_DOC = 10;
const USER_EDIT_PROTECTION_MS = 72 * 60 * 60 * 1000;

export const createKnowledgeDoc = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    docType: knowledgeDocType,
    ownerAgent: v.string(),
    title: v.string(),
    contentFull: v.string(),
    contentSummary: v.string(),
    stalenessAlertDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const existing = await ctx.db
      .query("autopilotKnowledgeDocs")
      .withIndex("by_org_docType", (q) =>
        q.eq("organizationId", args.organizationId).eq("docType", args.docType)
      )
      .unique();

    if (existing) {
      return existing._id;
    }

    const docId = await ctx.db.insert("autopilotKnowledgeDocs", {
      organizationId: args.organizationId,
      docType: args.docType,
      ownerAgent: args.ownerAgent,
      title: args.title,
      contentFull: args.contentFull,
      contentSummary: args.contentSummary,
      version: 1,
      userEdited: false,
      stalenessAlertDays: args.stalenessAlertDays ?? 30,
      lastUpdatedAt: now,
      createdAt: now,
    });

    await ctx.db.insert("autopilotKnowledgeDocVersions", {
      docId,
      version: 1,
      content: args.contentFull,
      editedBy: "agent",
      editingAgent: args.ownerAgent,
      createdAt: now,
    });

    return docId;
  },
});

export const updateKnowledgeDoc = internalMutation({
  args: {
    docId: v.id("autopilotKnowledgeDocs"),
    contentFull: v.string(),
    contentSummary: v.string(),
    editedBy: knowledgeEditedBy,
    editingAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const doc = await ctx.db.get(args.docId);

    if (!doc) {
      throw new Error("Knowledge doc not found");
    }

    if (
      args.editedBy === "agent" &&
      doc.userEditProtectedUntil &&
      doc.userEditProtectedUntil > now
    ) {
      return null;
    }

    const newVersion = doc.version + 1;

    await ctx.db.patch(args.docId, {
      contentFull: args.contentFull,
      contentSummary: args.contentSummary,
      version: newVersion,
      userEdited: args.editedBy === "user",
      userEditedAt: args.editedBy === "user" ? now : doc.userEditedAt,
      userEditProtectedUntil:
        args.editedBy === "user"
          ? now + USER_EDIT_PROTECTION_MS
          : doc.userEditProtectedUntil,
      lastUpdatedAt: now,
    });

    await ctx.db.insert("autopilotKnowledgeDocVersions", {
      docId: args.docId,
      version: newVersion,
      content: args.contentFull,
      editedBy: args.editedBy,
      editingAgent: args.editingAgent,
      createdAt: now,
    });

    const versions = await ctx.db
      .query("autopilotKnowledgeDocVersions")
      .withIndex("by_doc", (q) => q.eq("docId", args.docId))
      .collect();

    if (versions.length > MAX_VERSIONS_PER_DOC) {
      const toDelete = versions
        .sort((a, b) => a.version - b.version)
        .slice(0, versions.length - MAX_VERSIONS_PER_DOC);

      for (const version of toDelete) {
        await ctx.db.delete(version._id);
      }
    }

    return args.docId;
  },
});

export const getKnowledgeDoc = internalQuery({
  args: { docId: v.id("autopilotKnowledgeDocs") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.docId);
  },
});

export const getKnowledgeDocsByOrg = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    summaryOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const docs = await ctx.db
      .query("autopilotKnowledgeDocs")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    if (args.summaryOnly) {
      return docs.map((doc) => ({
        _id: doc._id,
        docType: doc.docType,
        title: doc.title,
        contentSummary: doc.contentSummary,
        version: doc.version,
        userEdited: doc.userEdited,
        lastUpdatedAt: doc.lastUpdatedAt,
      }));
    }

    return docs;
  },
});

export const getKnowledgeDocByType = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    docType: knowledgeDocType,
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("autopilotKnowledgeDocs")
      .withIndex("by_org_docType", (q) =>
        q.eq("organizationId", args.organizationId).eq("docType", args.docType)
      )
      .unique();
  },
});

export const checkStaleness = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const now = Date.now();
    const docs = await ctx.db
      .query("autopilotKnowledgeDocs")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    return docs.filter(
      (doc) => doc.lastUpdatedAt + doc.stalenessAlertDays * MS_PER_DAY < now
    );
  },
});

export const markUserEdited = internalMutation({
  args: { docId: v.id("autopilotKnowledgeDocs") },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.docId, {
      userEdited: true,
      userEditedAt: now,
      userEditProtectedUntil: now + USER_EDIT_PROTECTION_MS,
      lastUpdatedAt: now,
    });
  },
});
