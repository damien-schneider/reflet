/// <reference types="vite/client" />

import { describe, expect, test } from "vitest";
import { api, internal } from "../../../_generated/api";
import type { Doc, Id } from "../../../_generated/dataModel";
import {
  createAutopilotConfig,
  createMemberSession,
  createOrg,
  createTestContext,
  type TestContext,
} from "../test-fixtures.helpers";

async function createLocalOrg(t: TestContext, name: string) {
  return await t.run((ctx) =>
    ctx.db.insert("organizations", {
      name,
      slug: `${name.toLowerCase().replaceAll(" ", "-")}-${crypto.randomUUID()}`,
      isPublic: false,
      subscriptionTier: "pro",
      subscriptionStatus: "active",
      createdAt: Date.now(),
    })
  );
}

async function createFreeOrg() {
  const t = createTestContext();
  const organizationId = await t.run((ctx) =>
    ctx.db.insert("organizations", {
      name: "Autopilot Access Control Org",
      slug: `autopilot-access-control-${Date.now()}`,
      isPublic: false,
      subscriptionTier: "free",
      subscriptionStatus: "none",
      createdAt: Date.now(),
    })
  );
  return { organizationId, t };
}

async function createProductDefinition(
  t: TestContext,
  organizationId: Id<"organizations">
) {
  return await t.run(async (ctx) => {
    const now = Date.now();
    const docId = await ctx.db.insert("autopilotKnowledgeDocs", {
      organizationId,
      docType: "product_definition",
      ownerAgent: "pm",
      title: "Product Definition",
      contentFull: "Existing product definition",
      contentSummary: "Existing product definition",
      version: 1,
      userEdited: true,
      userEditedAt: now,
      userEditProtectedUntil: now + 24 * 60 * 60 * 1000,
      stalenessAlertDays: 30,
      lastUpdatedAt: now,
      createdAt: now,
    });
    await ctx.db.insert("autopilotKnowledgeDocVersions", {
      docId,
      version: 1,
      content: "Existing product definition",
      editedBy: "user",
      createdAt: now,
    });
    return docId;
  });
}

async function createFeedback(
  t: TestContext,
  options: { organizationId: Awaited<ReturnType<typeof createLocalOrg>> }
) {
  const now = Date.now();
  return await t.run((ctx) =>
    ctx.db.insert("feedback", {
      organizationId: options.organizationId,
      title: "Cross-org feedback",
      description: "This feedback belongs to one organization only.",
      status: "open",
      voteCount: 0,
      commentCount: 0,
      isApproved: true,
      isPinned: false,
      createdAt: now,
      updatedAt: now,
    })
  );
}

async function createTask(
  t: TestContext,
  options: {
    assignedAgent?: "cto" | "dev" | "growth" | "pm" | "sales" | "support";
    needsReview?: boolean;
    organizationId: Awaited<ReturnType<typeof createLocalOrg>>;
    reviewType?: Doc<"autopilotWorkItems">["reviewType"];
    status?: Doc<"autopilotWorkItems">["status"];
  }
) {
  const now = Date.now();
  return await t.run((ctx) =>
    ctx.db.insert("autopilotWorkItems", {
      organizationId: options.organizationId,
      type: "task",
      title: "Cross-org work",
      description: "This task belongs to one organization only.",
      status: options.status ?? "backlog",
      priority: "medium",
      assignedAgent: options.assignedAgent,
      needsReview: options.needsReview ?? false,
      reviewType: options.reviewType,
      createdAt: now,
      updatedAt: now,
    })
  );
}

async function createDocument(
  t: TestContext,
  options: {
    needsReview?: boolean;
    organizationId: Awaited<ReturnType<typeof createLocalOrg>>;
    status?: Doc<"autopilotDocuments">["status"];
  }
) {
  const now = Date.now();
  return await t.run((ctx) =>
    ctx.db.insert("autopilotDocuments", {
      organizationId: options.organizationId,
      type: "note",
      title: "Review document",
      content: "Document content",
      tags: [],
      sourceAgent: "growth",
      status: options.status ?? "pending_review",
      needsReview: options.needsReview ?? true,
      createdAt: now,
      updatedAt: now,
    })
  );
}

async function createReport(
  t: TestContext,
  options: {
    organizationId: Awaited<ReturnType<typeof createLocalOrg>>;
  }
) {
  const now = Date.now();
  return await t.run((ctx) =>
    ctx.db.insert("autopilotReports", {
      organizationId: options.organizationId,
      reportType: "daily",
      title: "Pending CEO Report",
      executiveSummary: "Needs review.",
      healthScore: 82,
      sections: [],
      recommendations: [],
      sourceAgent: "ceo",
      tags: [],
      needsReview: true,
      archived: false,
      createdAt: now,
      updatedAt: now,
    })
  );
}

async function createGithubConnection(
  t: TestContext,
  options: { organizationId: Awaited<ReturnType<typeof createLocalOrg>> }
) {
  const now = Date.now();
  return await t.run((ctx) =>
    ctx.db.insert("githubConnections", {
      organizationId: options.organizationId,
      installationId: `installation-${crypto.randomUUID()}`,
      accountType: "organization",
      accountLogin: "reflet",
      status: "connected",
      repositoryId: "repo-123",
      repositoryFullName: "reflet/reflet",
      repositoryDefaultBranch: "main",
      createdAt: now,
      updatedAt: now,
    })
  );
}

async function createCompletedRepoAnalysis(
  t: TestContext,
  options: {
    githubConnectionId: Id<"githubConnections">;
    organizationId: Awaited<ReturnType<typeof createLocalOrg>>;
  }
) {
  const now = Date.now();
  return await t.run((ctx) =>
    ctx.db.insert("repoAnalysis", {
      organizationId: options.organizationId,
      githubConnectionId: options.githubConnectionId,
      status: "completed",
      summary: "A production feedback workspace.",
      productAnalysis:
        "Reflet helps product teams collect, prioritize, and ship customer feedback.",
      createdAt: now,
      updatedAt: now,
      completedAt: now,
    })
  );
}

async function createLead(
  t: TestContext,
  options: { organizationId: Awaited<ReturnType<typeof createLocalOrg>> }
) {
  const now = Date.now();
  return await t.run((ctx) =>
    ctx.db.insert("autopilotLeads", {
      organizationId: options.organizationId,
      name: "Cross Org Lead",
      email: "lead@example.com",
      source: "manual",
      status: "discovered",
      outreachCount: 0,
      createdAt: now,
      updatedAt: now,
    })
  );
}

describe("autopilot production access control", () => {
  test("self-healing still cleans up stale work after subscription access is lost", async () => {
    const { organizationId, t } = await createFreeOrg();
    await createAutopilotConfig(t, organizationId, { enabled: true });
    const staleAt = Date.now() - 3 * 60 * 60 * 1000;
    const taskId = await t.run((ctx) =>
      ctx.db.insert("autopilotWorkItems", {
        organizationId,
        type: "task",
        title: "Downgraded stale task",
        description: "Cleanup must still run after billing access is lost.",
        status: "in_progress",
        priority: "medium",
        assignedAgent: "dev",
        needsReview: false,
        createdAt: staleAt,
        updatedAt: staleAt,
      })
    );

    await t.action(internal.autopilot.self_heal.runSelfHealing, {});

    const task = await t.run((ctx) => ctx.db.get(taskId));
    expect(task?.status).toBe("cancelled");
  });

  test("non-Pro organizations cannot pass internal Autopilot gates", async () => {
    const { organizationId, t } = await createFreeOrg();
    await createAutopilotConfig(t, organizationId, {
      enabled: true,
      growthEnabled: true,
    });

    const gate = await t.query(internal.autopilot.gate.checkGate, {
      organizationId,
      agent: "growth",
      action: "publish_content",
    });
    const isActive = await t.query(internal.autopilot.gate.isAgentActive, {
      organizationId,
      agent: "growth",
    });

    expect(gate).toEqual({ proceed: false, reason: "plan_limit" });
    expect(isActive).toBe(false);
  });

  test("non-Pro organizations cannot mutate existing Autopilot settings", async () => {
    const { organizationId, t } = await createFreeOrg();
    const configId = await createAutopilotConfig(t, organizationId, {
      enabled: true,
    });
    const authed = await createMemberSession(t, organizationId);

    await expect(
      authed.mutation(api.autopilot.mutations.config.updateConfig, {
        configId,
        maxTasksPerDay: 25,
      })
    ).rejects.toThrow("Autopilot requires a Pro subscription.");
    await expect(
      authed.mutation(api.autopilot.mutations.config.upsertCredentials, {
        organizationId,
        adapter: "codex",
        credentials: "token",
      })
    ).rejects.toThrow("Autopilot requires a Pro subscription.");
    await expect(
      authed.mutation(api.autopilot.mutations.config.raiseBudgetCap, {
        organizationId,
        newCapUsd: 100,
      })
    ).rejects.toThrow("Autopilot requires a Pro subscription.");

    const rows = await t.run(async (ctx) => ({
      config: await ctx.db.get(configId),
      credentials: await ctx.db.query("autopilotAdapterCredentials").collect(),
    }));
    expect(rows.config?.maxTasksPerDay).toBe(10);
    expect(rows.credentials).toHaveLength(0);
  });

  test("non-Pro organizations cannot use CEO chat write paths", async () => {
    const { organizationId, t } = await createFreeOrg();
    await createAutopilotConfig(t, organizationId, {
      ceoChatThreadId: "owned-thread",
    });
    const authed = await createMemberSession(t, organizationId);

    await expect(
      authed.mutation(api.autopilot.ceo_chat.getOrCreateThread, {
        organizationId,
      })
    ).rejects.toThrow("Autopilot requires a Pro subscription.");
    await expect(
      authed.mutation(api.autopilot.ceo_chat.sendMessage, {
        organizationId,
        threadId: "owned-thread",
        prompt: "Summarize Autopilot state.",
      })
    ).rejects.toThrow("Autopilot requires a Pro subscription.");

    const response = await t.action(
      internal.autopilot.ceo_chat.generateCEOResponseAsync,
      {
        organizationId,
        threadId: "owned-thread",
        promptMessageId: "prompt-message",
      }
    );
    expect(response).toBeNull();
  });

  test("non-Pro organizations cannot manually trigger sales discovery", async () => {
    const { organizationId, t } = await createFreeOrg();
    const authed = await createMemberSession(t, organizationId);

    await expect(
      authed.mutation(api.autopilot.sales_mutations.triggerLeadDiscovery, {
        organizationId,
      })
    ).rejects.toThrow("Autopilot requires a Pro subscription.");

    const activity = await t.run((ctx) =>
      ctx.db.query("autopilotActivityLog").collect()
    );
    expect(
      activity.some((entry) => entry.action === "manual_lead_discovery")
    ).toBe(false);
  });

  test("non-Pro organizations cannot regenerate product definition", async () => {
    const { organizationId, t } = await createFreeOrg();
    const docId = await createProductDefinition(t, organizationId);
    const authed = await createMemberSession(t, organizationId);

    await expect(
      authed.action(
        api.autopilot.mutations.knowledge.regenerateProductDefinition,
        { organizationId }
      )
    ).rejects.toThrow("Autopilot requires a Pro subscription.");

    const rows = await t.run(async (ctx) => ({
      doc: await ctx.db.get(docId),
      versions: await ctx.db
        .query("autopilotKnowledgeDocVersions")
        .withIndex("by_doc", (q) => q.eq("docId", docId))
        .collect(),
    }));
    expect(rows.doc?.contentFull).toBe("Existing product definition");
    expect(rows.versions).toHaveLength(1);
  });

  test("non-Pro organizations cannot delete product definition before regeneration", async () => {
    const { organizationId, t } = await createFreeOrg();
    const docId = await createProductDefinition(t, organizationId);
    const authed = await createMemberSession(t, organizationId);

    await expect(
      authed.mutation(
        api.autopilot.mutations.knowledge.deleteProductDefinitionAndRegenerate,
        { organizationId }
      )
    ).rejects.toThrow("Autopilot requires a Pro subscription.");

    const rows = await t.run(async (ctx) => ({
      doc: await ctx.db.get(docId),
      versions: await ctx.db
        .query("autopilotKnowledgeDocVersions")
        .withIndex("by_doc", (q) => q.eq("docId", docId))
        .collect(),
    }));
    expect(rows.doc?.contentFull).toBe("Existing product definition");
    expect(rows.versions).toHaveLength(1);
  });

  test("non-Pro organizations cannot mutate product definition manually", async () => {
    const { organizationId, t } = await createFreeOrg();
    const docId = await createProductDefinition(t, organizationId);
    const authed = await createMemberSession(t, organizationId);

    await expect(
      authed.mutation(
        api.autopilot.mutations.knowledge.upsertProductDefinition,
        {
          organizationId,
          content: "New product definition",
        }
      )
    ).rejects.toThrow("Autopilot requires a Pro subscription.");
    await expect(
      authed.mutation(api.autopilot.mutations.knowledge.updateKnowledgeDoc, {
        docId,
        contentFull: "Overwritten product definition",
        contentSummary: "Overwritten product definition",
      })
    ).rejects.toThrow("Autopilot requires a Pro subscription.");

    const rows = await t.run(async (ctx) => ({
      doc: await ctx.db.get(docId),
      versions: await ctx.db
        .query("autopilotKnowledgeDocVersions")
        .withIndex("by_doc", (q) => q.eq("docId", docId))
        .collect(),
    }));
    expect(rows.doc?.contentFull).toBe("Existing product definition");
    expect(rows.versions).toHaveLength(1);
  });

  test("non-Pro organizations cannot create Autopilot tasks from feedback", async () => {
    const { organizationId, t } = await createFreeOrg();
    const feedbackId = await createFeedback(t, { organizationId });
    const authed = await createMemberSession(t, organizationId);

    await expect(
      authed.mutation(
        api.autopilot.mutations.feedback_links.createTaskFromFeedback,
        {
          organizationId,
          feedbackId,
          priority: "medium",
        }
      )
    ).rejects.toThrow("Autopilot requires a Pro subscription.");

    const rows = await t.run(async (ctx) => ({
      activity: await ctx.db.query("autopilotActivityLog").collect(),
      links: await ctx.db.query("feedbackTaskLinks").collect(),
      tasks: await ctx.db.query("autopilotWorkItems").collect(),
    }));
    expect(rows.tasks).toHaveLength(0);
    expect(rows.links).toHaveLength(0);
    expect(rows.activity).toHaveLength(0);
  });

  test("non-Pro organizations cannot mutate feedback task links", async () => {
    const { organizationId, t } = await createFreeOrg();
    const feedbackId = await createFeedback(t, { organizationId });
    const taskId = await createTask(t, { organizationId });
    const authed = await createMemberSession(t, organizationId);

    await expect(
      authed.mutation(
        api.autopilot.mutations.feedback_links.linkFeedbackToTask,
        {
          organizationId,
          feedbackId,
          workItemId: taskId,
        }
      )
    ).rejects.toThrow("Autopilot requires a Pro subscription.");

    const seededLinkId = await t.run((ctx) =>
      ctx.db.insert("feedbackTaskLinks", {
        organizationId,
        feedbackId,
        workItemId: taskId,
        createdAt: Date.now(),
        createdBy: "test",
      })
    );
    await expect(
      authed.mutation(
        api.autopilot.mutations.feedback_links.unlinkFeedbackFromTask,
        {
          feedbackId,
          workItemId: taskId,
        }
      )
    ).rejects.toThrow("Autopilot requires a Pro subscription.");

    const rows = await t.run(async (ctx) => ({
      link: await ctx.db.get(seededLinkId),
      links: await ctx.db.query("feedbackTaskLinks").collect(),
    }));
    expect(rows.link).not.toBeNull();
    expect(rows.links).toHaveLength(1);
  });

  test("non-Pro organizations cannot approve or reject inbox work", async () => {
    const { organizationId, t } = await createFreeOrg();
    const workItemId = await createTask(t, {
      organizationId,
      needsReview: true,
      reviewType: "pr_review",
      status: "in_review",
    });
    const authed = await createMemberSession(t, organizationId);

    await expect(
      authed.mutation(api.autopilot.mutations.inbox.approveWorkItem, {
        workItemId,
      })
    ).rejects.toThrow("Autopilot requires a Pro subscription.");
    await expect(
      authed.mutation(api.autopilot.mutations.inbox.rejectWorkItem, {
        workItemId,
      })
    ).rejects.toThrow("Autopilot requires a Pro subscription.");

    const rows = await t.run(async (ctx) => ({
      activity: await ctx.db.query("autopilotActivityLog").collect(),
      item: await ctx.db.get(workItemId),
    }));
    expect(rows.item?.needsReview).toBe(true);
    expect(rows.item?.reviewType).toBe("pr_review");
    expect(rows.item?.reviewedAt).toBeUndefined();
    expect(rows.item?.status).toBe("in_review");
    expect(rows.activity).toHaveLength(0);
  });

  test("non-Pro organizations cannot approve or reject inbox documents", async () => {
    const { organizationId, t } = await createFreeOrg();
    const documentId = await createDocument(t, {
      organizationId,
      needsReview: true,
      status: "pending_review",
    });
    const authed = await createMemberSession(t, organizationId);

    await expect(
      authed.mutation(api.autopilot.mutations.inbox.approveDocument, {
        documentId,
      })
    ).rejects.toThrow("Autopilot requires a Pro subscription.");
    await expect(
      authed.mutation(api.autopilot.mutations.inbox.rejectDocument, {
        documentId,
      })
    ).rejects.toThrow("Autopilot requires a Pro subscription.");

    const rows = await t.run(async (ctx) => ({
      activity: await ctx.db.query("autopilotActivityLog").collect(),
      doc: await ctx.db.get(documentId),
    }));
    expect(rows.doc?.needsReview).toBe(true);
    expect(rows.doc?.reviewedAt).toBeUndefined();
    expect(rows.doc?.status).toBe("pending_review");
    expect(rows.activity).toHaveLength(0);
  });

  test("non-Pro organizations cannot acknowledge or archive reports", async () => {
    const { organizationId, t } = await createFreeOrg();
    const reportId = await createReport(t, { organizationId });
    const authed = await createMemberSession(t, organizationId);

    await expect(
      authed.mutation(api.autopilot.mutations.reports.acknowledgeReport, {
        reportId,
      })
    ).rejects.toThrow("Autopilot requires a Pro subscription.");
    await expect(
      authed.mutation(api.autopilot.mutations.reports.archiveReport, {
        reportId,
      })
    ).rejects.toThrow("Autopilot requires a Pro subscription.");

    const report = await t.run((ctx) => ctx.db.get(reportId));
    expect(report?.acknowledgedAt).toBeUndefined();
    expect(report?.archived).toBe(false);
    expect(report?.needsReview).toBe(true);
    expect(report?.reviewedAt).toBeUndefined();
  });

  test("non-Pro internal product definition generation does not write knowledge docs", async () => {
    const { organizationId, t } = await createFreeOrg();
    const githubConnectionId = await createGithubConnection(t, {
      organizationId,
    });
    await createCompletedRepoAnalysis(t, {
      githubConnectionId,
      organizationId,
    });

    await t.action(internal.autopilot.company_brief.generateCompanyBrief, {
      organizationId,
    });

    const rows = await t.run(async (ctx) => ({
      activity: await ctx.db.query("autopilotActivityLog").collect(),
      docs: await ctx.db.query("autopilotKnowledgeDocs").collect(),
    }));
    expect(rows.docs).toHaveLength(0);
    expect(rows.activity.map((entry) => entry.message)).toContain(
      "Autopilot requires a Pro subscription."
    );
  });

  test("non-Pro internal product definition pipeline does not enqueue repo analysis", async () => {
    const { organizationId, t } = await createFreeOrg();
    await createGithubConnection(t, { organizationId });

    await t.action(
      internal.autopilot.company_brief.triggerProductDefinitionPipeline,
      { organizationId }
    );

    const rows = await t.run(async (ctx) => ({
      activity: await ctx.db.query("autopilotActivityLog").collect(),
      analyses: await ctx.db.query("repoAnalysis").collect(),
    }));
    expect(rows.analyses).toHaveLength(0);
    expect(rows.activity.map((entry) => entry.message)).toContain(
      "Autopilot requires a Pro subscription."
    );
  });

  test("feedback links cannot connect records from different organizations", async () => {
    const t = createTestContext();
    const organizationId = await createOrg(t);
    const foreignOrganizationId = await createOrg(t);
    const feedbackId = await createFeedback(t, { organizationId });
    const foreignTaskId = await createTask(t, {
      organizationId: foreignOrganizationId,
    });
    const authed = await createMemberSession(t, organizationId);

    await expect(
      authed.mutation(
        api.autopilot.mutations.feedback_links.linkFeedbackToTask,
        {
          organizationId,
          feedbackId,
          workItemId: foreignTaskId,
        }
      )
    ).rejects.toThrow("Task does not belong to this organization");

    const links = await t.run((ctx) =>
      ctx.db.query("feedbackTaskLinks").collect()
    );
    expect(links).toHaveLength(0);
  });

  test("manual work items cannot attach to a parent from another organization", async () => {
    const t = createTestContext();
    const organizationId = await createOrg(t);
    const foreignOrganizationId = await createOrg(t);
    const foreignParentId = await createTask(t, {
      organizationId: foreignOrganizationId,
    });
    const authed = await createMemberSession(t, organizationId);

    await expect(
      authed.mutation(api.autopilot.mutations.work.createWorkItem, {
        organizationId,
        type: "task",
        title: "Cross-org child",
        description: "This child must not attach to a foreign parent.",
        priority: "medium",
        parentId: foreignParentId,
      })
    ).rejects.toThrow("Task does not belong to this organization");

    const workItems = await t.run((ctx) =>
      ctx.db
        .query("autopilotWorkItems")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", organizationId)
        )
        .collect()
    );
    expect(workItems).toHaveLength(0);
  });

  test("feedback link queries do not return corrupted cross-org records", async () => {
    const t = createTestContext();
    const organizationId = await createLocalOrg(t, "Query Owner Org");
    const foreignOrganizationId = await createLocalOrg(t, "Query Foreign Org");
    const feedbackId = await createFeedback(t, { organizationId });
    const foreignFeedbackId = await createFeedback(t, {
      organizationId: foreignOrganizationId,
    });
    const taskId = await createTask(t, { organizationId });
    const foreignTaskId = await createTask(t, {
      organizationId: foreignOrganizationId,
    });
    await t.run(async (ctx) => {
      const now = Date.now();
      await ctx.db.insert("feedbackTaskLinks", {
        organizationId,
        feedbackId,
        workItemId: foreignTaskId,
        createdAt: now,
        createdBy: "test",
      });
      await ctx.db.insert("feedbackTaskLinks", {
        organizationId,
        feedbackId: foreignFeedbackId,
        workItemId: taskId,
        createdAt: now,
        createdBy: "test",
      });
    });
    const authed = await createMemberSession(t, organizationId);

    const tasks = await authed.query(
      api.autopilot.queries.feedback_links.getTasksForFeedback,
      { feedbackId }
    );
    const feedback = await authed.query(
      api.autopilot.queries.feedback_links.getFeedbackForTask,
      { workItemId: taskId }
    );

    expect(tasks).toEqual([]);
    expect(feedback).toEqual([]);
  });

  test("outreach documents cannot target leads from another organization", async () => {
    const t = createTestContext();
    const organizationId = await createOrg(t);
    const foreignOrganizationId = await createOrg(t);
    const foreignLeadId = await createLead(t, {
      organizationId: foreignOrganizationId,
    });
    const authed = await createMemberSession(t, organizationId);

    await expect(
      authed.mutation(api.autopilot.mutations.documents.createDocument, {
        organizationId,
        type: "email",
        title: "Outreach",
        content: "Hello",
        linkedLeadId: foreignLeadId,
      })
    ).rejects.toThrow("Lead does not belong to this organization");
  });

  test("approved outreach ignores corrupted cross-org lead links", async () => {
    const t = createTestContext();
    const organizationId = await createLocalOrg(t, "Approved Owner Org");
    const foreignOrganizationId = await createLocalOrg(
      t,
      "Approved Foreign Org"
    );
    const foreignLeadId = await createLead(t, {
      organizationId: foreignOrganizationId,
    });
    const documentId = await t.run((ctx) =>
      ctx.db.insert("autopilotDocuments", {
        organizationId,
        type: "email",
        title: "Approved outreach",
        content: "Hello",
        tags: [],
        status: "published",
        needsReview: false,
        linkedLeadId: foreignLeadId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    );

    const approved = await t.query(
      internal.autopilot.integrations.email.getApprovedOutreach,
      { organizationId }
    );
    await t.mutation(internal.autopilot.integrations.email.markLeadContacted, {
      leadId: foreignLeadId,
      documentId,
    });
    const rows = await t.run(async (ctx) => ({
      document: await ctx.db.get(documentId),
      lead: await ctx.db.get(foreignLeadId),
    }));

    expect(approved).toEqual([]);
    expect(rows.document?.publishedAt).toBeUndefined();
    expect(rows.lead?.lastContactedAt).toBeUndefined();
    expect(rows.lead?.outreachCount).toBe(0);
  });

  test("task cap diagnostics use the same enabled-agent rules as the gate", async () => {
    const t = createTestContext();
    const organizationId = await createLocalOrg(t, "Cap Diagnostics Org");
    await createAutopilotConfig(t, organizationId, { enabled: true });
    await createTask(t, { organizationId, assignedAgent: "growth" });
    await t.run(async (ctx) => {
      const task = await ctx.db
        .query("autopilotWorkItems")
        .withIndex("by_org_agent", (q) =>
          q.eq("organizationId", organizationId).eq("assignedAgent", "growth")
        )
        .first();
      if (task) {
        await ctx.db.patch(task._id, { status: "todo" });
      }
    });

    const usage = await t.query(
      internal.autopilot.config_task_caps.getTaskCapUsage,
      { organizationId }
    );
    const orphaned = await t.query(
      internal.autopilot.config_task_caps.getOrphanedTasks,
      { organizationId }
    );

    expect(usage.agentUsage.map(({ agent }) => agent)).toEqual(["pm", "cto"]);
    expect(orphaned).toHaveLength(1);
    expect(orphaned[0]?.assignedAgent).toBe("growth");
  });
});
