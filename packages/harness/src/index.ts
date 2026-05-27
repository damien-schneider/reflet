import {
  HARNESS_ARTIFACT_KINDS as harnessArtifactKinds,
  HARNESS_SUBAGENTS as harnessSubagents,
  HARNESS_VALIDATIONS as harnessValidations,
  PRODUCTMAP_LIFECYCLES as productMapLifecycles,
  PRODUCTMAP_TOPICS as productMapTopics,
  REFLET_KNOWLEDGE_PATHS as refletKnowledgePaths,
} from "./constants";
import type {
  HarnessGuardInput as HarnessGuardInputType,
  HarnessGuardReason as HarnessGuardReasonType,
  HarnessGuardResult as HarnessGuardResultType,
  RecipeRunDecisionInput as RecipeRunDecisionInputType,
  RecipeRunDecision as RecipeRunDecisionType,
} from "./policy";
import {
  evaluateHarnessGuards as evaluateHarnessGuardsImpl,
  resolveRecipeRunDecision as resolveRecipeRunDecisionImpl,
} from "./policy";
import { DEFAULT_HARNESS_RECIPES as defaultHarnessRecipes } from "./recipes";
import type {
  ArtifactMetadata as ArtifactMetadataType,
  HarnessArtifactKind as HarnessArtifactKindType,
  HarnessRecipe as HarnessRecipeType,
  HarnessSubagent as HarnessSubagentType,
  ProductMapLifecycle as ProductMapLifecycleType,
  ProductMapTopic as ProductMapTopicType,
} from "./schemas";
import {
  artifactMetadataSchema as artifactMetadataSchemaImpl,
  harnessRecipeSchema as harnessRecipeSchemaImpl,
  parseArtifactMetadata as parseArtifactMetadataImpl,
  parseHarnessRecipe as parseHarnessRecipeImpl,
} from "./schemas";

export const HARNESS_ARTIFACT_KINDS = harnessArtifactKinds;
export const HARNESS_SUBAGENTS = harnessSubagents;
export const HARNESS_VALIDATIONS = harnessValidations;
export const PRODUCTMAP_LIFECYCLES = productMapLifecycles;
export const PRODUCTMAP_TOPICS = productMapTopics;
export const REFLET_KNOWLEDGE_PATHS = refletKnowledgePaths;
export const DEFAULT_HARNESS_RECIPES = defaultHarnessRecipes;
export const artifactMetadataSchema = artifactMetadataSchemaImpl;
export const harnessRecipeSchema = harnessRecipeSchemaImpl;
export const parseArtifactMetadata = parseArtifactMetadataImpl;
export const parseHarnessRecipe = parseHarnessRecipeImpl;
export const evaluateHarnessGuards = evaluateHarnessGuardsImpl;
export const resolveRecipeRunDecision = resolveRecipeRunDecisionImpl;

export type ArtifactMetadata = ArtifactMetadataType;
export type HarnessArtifactKind = HarnessArtifactKindType;
export type HarnessGuardInput = HarnessGuardInputType;
export type HarnessGuardReason = HarnessGuardReasonType;
export type HarnessGuardResult = HarnessGuardResultType;
export type HarnessRecipe = HarnessRecipeType;
export type HarnessSubagent = HarnessSubagentType;
export type ProductMapLifecycle = ProductMapLifecycleType;
export type ProductMapTopic = ProductMapTopicType;
export type RecipeRunDecision = RecipeRunDecisionType;
export type RecipeRunDecisionInput = RecipeRunDecisionInputType;
