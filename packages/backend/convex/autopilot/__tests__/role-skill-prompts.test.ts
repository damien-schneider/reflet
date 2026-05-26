/// <reference types="vite/client" />

import { describe, expect, test } from "vitest";
import {
  CEO_SYSTEM_PROMPT,
  CTO_SYSTEM_PROMPT,
  GROWTH_SYSTEM_PROMPT,
  PM_SYSTEM_PROMPT,
  SALES_SYSTEM_PROMPT,
  SUPPORT_SYSTEM_PROMPT,
} from "../role_skills/prompts";

const ROLE_SKILL_PROMPTS = [
  CEO_SYSTEM_PROMPT,
  CTO_SYSTEM_PROMPT,
  GROWTH_SYSTEM_PROMPT,
  PM_SYSTEM_PROMPT,
  SALES_SYSTEM_PROMPT,
  SUPPORT_SYSTEM_PROMPT,
];

describe("role skill prompts", () => {
  test("describe one chain runtime with role skills, not multiple AI employees", () => {
    for (const prompt of ROLE_SKILL_PROMPTS) {
      expect(prompt).toContain("role skill");
      expect(prompt).not.toMatch(/\bAI agents?\b/i);
      expect(prompt).not.toMatch(/\bteam \(the agents\)/i);
      expect(prompt).not.toMatch(/\bcross-agent\b/i);
    }
  });
});
