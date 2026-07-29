import { z } from "zod";
import {
  HARNESS_ARTIFACT_KINDS,
  HARNESS_SUBAGENTS,
  HARNESS_VALIDATIONS,
  PRODUCTMAP_LIFECYCLES,
  PRODUCTMAP_TOPICS,
} from "./constants";

export const harnessArtifactKindSchema = z.enum(HARNESS_ARTIFACT_KINDS);
export const harnessSubagentSchema = z.enum(HARNESS_SUBAGENTS);
export const harnessValidationSchema = z.enum(HARNESS_VALIDATIONS);
export const productMapTopicSchema = z.enum(PRODUCTMAP_TOPICS);
export const productMapLifecycleSchema = z.enum(PRODUCTMAP_LIFECYCLES);

export const approvalPolicySchema = z.enum([
  "always_required",
  "required_for_external_action",
  "not_required",
]);

export const rerunTriggerSchema = z.enum([
  "input_changed",
  "new_evidence",
  "failed_validation",
  "manual_request",
  "merged_pr",
]);

export const stopConditionSchema = z.enum([
  "approval_cap_reached",
  "pr_cap_reached",
  "noop_loop_detected",
  "validator_loop_detected",
  "bridge_offline",
  "claude_unavailable",
  "dirty_worktree",
]);

export const sinkSchema = z.enum(["pr", "documents", "artifacts"]);

export const harnessOutputSchema = z.object({
  artifactKind: harnessArtifactKindSchema,
  path: z.string().min(1),
  required: z.boolean(),
});

export const harnessRecipeSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  version: z.number().int().positive(),
  productMapTopic: productMapTopicSchema,
  productMapLifecycle: productMapLifecycleSchema,
  objectives: z.array(z.string().min(1)).min(1),
  inputs: z.array(z.string().min(1)),
  dependsOn: z.array(z.string().min(1)),
  subagents: z.array(harnessSubagentSchema).min(1),
  allowedTools: z.array(z.string().min(1)),
  outputs: z.array(harnessOutputSchema).min(1),
  validations: z.array(harnessValidationSchema).min(1),
  stopConditions: z.array(stopConditionSchema).min(1),
  sink: sinkSchema.optional(),
  approvalPolicy: approvalPolicySchema,
  rerunPolicy: z.object({
    triggers: z.array(rerunTriggerSchema).min(1),
    inputHashStrategy: z.literal("artifact_hashes"),
  }),
});

export const validatorResultSchema = z.object({
  status: z.enum(["passed", "warning", "failed"]),
  score: z.number().min(0).max(100),
  messages: z.array(z.string()),
});

export const artifactMetadataSchema = z.object({
  artifactId: z.string().min(1),
  recipeId: z.string().min(1),
  recipeVersion: z.number().int().positive(),
  promptHash: z.string().min(1),
  inputArtifactHashes: z.record(z.string(), z.string()),
  evidenceHashes: z.record(z.string(), z.string()),
  outputHash: z.string().min(1),
  validatorResult: validatorResultSchema,
  downstreamInvalidations: z.array(z.string()),
  generatedAt: z.number(),
});

export type ArtifactMetadata = z.infer<typeof artifactMetadataSchema>;
export type HarnessArtifactKind = z.infer<typeof harnessArtifactKindSchema>;
export type HarnessRecipe = z.infer<typeof harnessRecipeSchema>;
export type HarnessSink = z.infer<typeof sinkSchema>;
export type HarnessSubagent = z.infer<typeof harnessSubagentSchema>;
export type ProductMapLifecycle = z.infer<typeof productMapLifecycleSchema>;
export type ProductMapTopic = z.infer<typeof productMapTopicSchema>;

const DEFAULT_SINK: HarnessSink = "pr";

export function resolveRecipeSink(
  recipe: Pick<HarnessRecipe, "sink">
): HarnessSink {
  return recipe.sink ?? DEFAULT_SINK;
}

export function parseHarnessRecipe(input: unknown): HarnessRecipe {
  return harnessRecipeSchema.parse(input);
}

export function parseArtifactMetadata(input: unknown): ArtifactMetadata {
  return artifactMetadataSchema.parse(input);
}
