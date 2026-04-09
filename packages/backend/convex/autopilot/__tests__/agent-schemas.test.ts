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

// CTO agent schema
import { technicalSpecSchema } from "../agents/cto";

// Growth agent schemas
import {
  enrichedThreadSchema,
  growthContentSchema,
} from "../agents/growth/discovery";

// PM agent schema
import { pmAnalysisSchema } from "../agents/pm/analysis";

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
  test("cto schema has all properties required", () => {
    checkSchema(technicalSpecSchema, "technicalSpecSchema");
  });

  test("support schemas have all properties required", () => {
    checkSchema(triageResultSchema, "triageResultSchema");
    checkSchema(shippedNotificationSchema, "shippedNotificationSchema");
  });

  test("growth schemas have all properties required", () => {
    checkSchema(enrichedThreadSchema, "enrichedThreadSchema");
    checkSchema(growthContentSchema, "growthContentSchema");
  });

  test("pm schema has all properties required", () => {
    checkSchema(pmAnalysisSchema, "pmAnalysisSchema");
  });
});

describe("agent schemas — required fields are validated", () => {
  test("cto spec requires architectureNotes", () => {
    const result = technicalSpecSchema.parse({
      filesToModify: [],
      dependencies: { add: [], remove: [] },
      riskLevel: "low",
      estimatedComplexity: "trivial",
      implementationPrompt: "test",
      testRequirements: [],
      acceptanceCriteria: [],
      architectureNotes: "",
    });
    expect(result.architectureNotes).toBe("");
  });

  test("triage result requires escalationReason and relatedFeature", () => {
    const result = triageResultSchema.parse({
      conversations: [
        {
          conversationId: "1",
          intent: "question",
          severity: "low",
          suggestedReply: "test",
          shouldEscalate: false,
          escalationReason: "",
          relatedFeature: "",
        },
      ],
      summary: "test",
    });
    expect(result.conversations[0].escalationReason).toBe("");
    expect(result.conversations[0].relatedFeature).toBe("");
  });

  test("growth content requires targetUrl", () => {
    const result = growthContentSchema.parse({
      items: [
        {
          type: "blog_post",
          title: "test",
          content: "test",
          reasoning: "test",
          targetUrl: "",
        },
      ],
      summary: "test",
    });
    expect(result.items[0].targetUrl).toBe("");
  });
});
