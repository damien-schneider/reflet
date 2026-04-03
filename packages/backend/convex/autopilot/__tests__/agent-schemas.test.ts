/**
 * Agent schema tests — Azure OpenAI compatibility.
 *
 * Azure requires ALL properties in a JSON Schema object to appear
 * in the `required` array. Zod's `.optional()` excludes properties
 * from `required`, causing runtime failures. Use `.default()` instead.
 *
 * These tests prevent regressions by verifying every agent schema's
 * JSON Schema representation has all properties required.
 */

import { describe, expect, test } from "vitest";
import { z } from "zod";

// Analytics agent schemas
import {
  analyticsBriefSchema,
  anomalyDetectionSchema,
} from "../agents/analytics";

// Architect agent schemas
import {
  architectFindingSchema,
  architectReviewSchema,
} from "../agents/architect";

// CTO agent schema
import { technicalSpecSchema } from "../agents/cto";

// Docs agent schema
import { docsCheckSchema } from "../agents/docs";

// Growth agent schemas
import { growthContentSchema, threadDiscoverySchema } from "../agents/growth";

// Ops agent schemas
import {
  deploymentAnalysisSchema,
  reliabilityReportSchema,
} from "../agents/ops";

// PM agent schema
import { pmAnalysisSchema } from "../agents/pm";

// QA agent schemas
import { regressionCheckSchema, testGenerationSchema } from "../agents/qa";

// Security agent schemas
import { securityFindingSchema, securityScanSchema } from "../agents/security";

// Support agent schemas
import {
  shippedNotificationSchema,
  triageResultSchema,
} from "../agents/support";

/**
 * Recursively verify that every object in a JSON Schema has all
 * properties listed in its `required` array.
 *
 * Azure OpenAI rejects schemas where any property is missing from `required`.
 */
const assertAllPropertiesRequired = (
  jsonSchema: Record<string, unknown>,
  path = "root"
): void => {
  const properties = jsonSchema.properties as
    | Record<string, Record<string, unknown>>
    | undefined;
  const required = jsonSchema.required as string[] | undefined;

  if (!properties) {
    return;
  }

  const propKeys = Object.keys(properties);
  const missingRequired = propKeys.filter((key) => !required?.includes(key));

  if (missingRequired.length > 0) {
    throw new Error(
      `${path}: properties ${missingRequired.map((k) => `'${k}'`).join(", ")} ` +
        "missing from 'required'. Use .default() instead of .optional() for Azure compatibility."
    );
  }

  for (const [key, prop] of Object.entries(properties)) {
    const nestedPath = `${path}.${key}`;

    if (prop.type === "object") {
      assertAllPropertiesRequired(prop, nestedPath);
    }

    if (prop.type === "array" && prop.items) {
      const items = prop.items as Record<string, unknown>;
      if (items.type === "object") {
        assertAllPropertiesRequired(items, `${nestedPath}[]`);
      }
    }
  }
};

const checkSchema = (schema: z.ZodType, name: string): void => {
  const jsonSchema = z.toJSONSchema(schema);
  assertAllPropertiesRequired(jsonSchema as Record<string, unknown>, name);
};

describe("agent schemas — Azure compatibility", () => {
  test("security schemas have all properties required", () => {
    checkSchema(securityFindingSchema, "securityFindingSchema");
    checkSchema(securityScanSchema, "securityScanSchema");
  });

  test("cto schema has all properties required", () => {
    checkSchema(technicalSpecSchema, "technicalSpecSchema");
  });

  test("docs schema has all properties required", () => {
    checkSchema(docsCheckSchema, "docsCheckSchema");
  });

  test("ops schemas have all properties required", () => {
    checkSchema(deploymentAnalysisSchema, "deploymentAnalysisSchema");
    checkSchema(reliabilityReportSchema, "reliabilityReportSchema");
  });

  test("qa schemas have all properties required", () => {
    checkSchema(testGenerationSchema, "testGenerationSchema");
    checkSchema(regressionCheckSchema, "regressionCheckSchema");
  });

  test("support schemas have all properties required", () => {
    checkSchema(triageResultSchema, "triageResultSchema");
    checkSchema(shippedNotificationSchema, "shippedNotificationSchema");
  });

  test("growth schemas have all properties required", () => {
    checkSchema(threadDiscoverySchema, "threadDiscoverySchema");
    checkSchema(growthContentSchema, "growthContentSchema");
  });

  test("analytics schemas have all properties required", () => {
    checkSchema(anomalyDetectionSchema, "anomalyDetectionSchema");
    checkSchema(analyticsBriefSchema, "analyticsBriefSchema");
  });

  test("architect schemas have all properties required", () => {
    checkSchema(architectFindingSchema, "architectFindingSchema");
    checkSchema(architectReviewSchema, "architectReviewSchema");
  });

  test("pm schema has all properties required", () => {
    checkSchema(pmAnalysisSchema, "pmAnalysisSchema");
  });
});

describe("agent schemas — defaults work", () => {
  test("security finding defaults filePath to empty string", () => {
    const result = securityFindingSchema.parse({
      severity: "low",
      category: "other",
      title: "test",
      description: "test",
      recommendation: "test",
      autoFixable: false,
    });
    expect(result.filePath).toBe("");
  });

  test("cto spec defaults architectureNotes to empty string", () => {
    const result = technicalSpecSchema.parse({
      filesToModify: [],
      dependencies: { add: [], remove: [] },
      riskLevel: "low",
      estimatedComplexity: "trivial",
      implementationPrompt: "test",
      testRequirements: [],
      acceptanceCriteria: [],
    });
    expect(result.architectureNotes).toBe("");
  });

  test("docs check defaults suggestedContent and lastRelevantChange", () => {
    const result = docsCheckSchema.parse({
      updates: [{ section: "a", reason: "b", priority: "low" }],
      stalePages: [{ page: "a", reason: "b" }],
      faqEntries: [],
      summary: "test",
    });
    expect(result.updates[0].suggestedContent).toBe("");
    expect(result.stalePages[0].lastRelevantChange).toBe("");
  });

  test("regression check defaults reproductionSteps to empty array", () => {
    const result = regressionCheckSchema.parse({
      hasRegression: false,
      findings: [
        {
          type: "error_spike",
          severity: "low",
          description: "test",
          affectedArea: "test",
        },
      ],
      summary: "test",
    });
    expect(result.findings[0].reproductionSteps).toEqual([]);
  });

  test("triage result defaults escalationReason and relatedFeature", () => {
    const result = triageResultSchema.parse({
      conversations: [
        {
          conversationId: "1",
          intent: "question",
          severity: "low",
          suggestedReply: "test",
          shouldEscalate: false,
        },
      ],
      summary: "test",
    });
    expect(result.conversations[0].escalationReason).toBe("");
    expect(result.conversations[0].relatedFeature).toBe("");
  });

  test("reliability report defaults incident duration", () => {
    const result = reliabilityReportSchema.parse({
      summary: "test",
      uptimePercent: 99,
      highlights: [],
      incidents: [{ date: "2026-01-01", description: "test", resolved: true }],
      recommendations: [],
    });
    expect(result.incidents[0].duration).toBe("");
  });

  test("growth content defaults targetUrl", () => {
    const result = growthContentSchema.parse({
      items: [
        {
          type: "blog_post",
          title: "test",
          content: "test",
          reasoning: "test",
        },
      ],
      summary: "test",
    });
    expect(result.items[0].targetUrl).toBe("");
  });
});
