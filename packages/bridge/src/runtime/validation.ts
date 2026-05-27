import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { ArtifactMetadata, HarnessRecipe } from "@reflet/harness";
import { hasRefletDiff, hasRefletLocalChanges } from "./worktree";

const EVIDENCE_HEADING_PATTERN = /^#{1,3}\s*evidence\b/im;
const SECRET_PATTERN = /fb_sec_[A-Za-z0-9_-]+|REFLET_SECRET_KEY\s*=/;
const URL_PATTERN = /https?:\/\//i;
const URL_GLOBAL_PATTERN = /https?:\/\/[^\s)]+/g;

export type ValidationFailureReason =
  | "missing_required_artifact"
  | "missing_evidence"
  | "private_user_folder"
  | "local_state_tracked"
  | "secret_detected"
  | "noop_output";

export type HarnessValidationResult =
  | {
      artifacts: Array<{
        artifactKind: HarnessRecipe["outputs"][number]["artifactKind"];
        metadata: ArtifactMetadata;
        outputHash: string;
        path: string;
        recipeId: string;
        recipeVersion: number;
        title: string;
        validationScore: number;
        validationStatus: "passed" | "warning" | "failed";
      }>;
      kind: "passed";
    }
  | { kind: "failed"; reason: ValidationFailureReason };

export interface ValidateHarnessArtifactsInput {
  baseSha: string;
  jobId: string;
  promptHash: string;
  recipe: HarnessRecipe;
  repoRoot: string;
}

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function readIfExists(path: string): string | null {
  return existsSync(path) ? readFileSync(path, "utf8") : null;
}

function contentHasEvidence(content: string): boolean {
  return EVIDENCE_HEADING_PATTERN.test(content) || URL_PATTERN.test(content);
}

function contentHasSecret(content: string): boolean {
  return SECRET_PATTERN.test(content);
}

function collectFiles(root: string): string[] {
  if (!existsSync(root)) {
    return [];
  }
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name);
    return entry.isDirectory() ? collectFiles(path) : [path];
  });
}

function refletTreeHasSecret(repoRoot: string): boolean {
  return collectFiles(join(repoRoot, ".reflet")).some((path) =>
    contentHasSecret(readFileSync(path, "utf8"))
  );
}

function collectInputHashes(recipe: HarnessRecipe, repoRoot: string) {
  const entries = recipe.inputs.flatMap((input) => {
    const content = readIfExists(join(repoRoot, input));
    return content === null ? [] : [[input, hash(content)]];
  });
  return Object.fromEntries(entries);
}

function collectEvidenceHashes(content: string) {
  const urls = content.match(URL_GLOBAL_PATTERN) ?? [];
  return Object.fromEntries(urls.map((url) => [url, hash(url)]));
}

function buildMetadata(input: {
  content: string;
  jobId: string;
  outputHash: string;
  path: string;
  promptHash: string;
  recipe: HarnessRecipe;
  repoRoot: string;
}): ArtifactMetadata {
  return {
    artifactId: `${input.jobId}:${input.path}`,
    downstreamInvalidations: [],
    evidenceHashes: collectEvidenceHashes(input.content),
    generatedAt: Date.now(),
    inputArtifactHashes: collectInputHashes(input.recipe, input.repoRoot),
    outputHash: input.outputHash,
    promptHash: input.promptHash,
    recipeId: input.recipe.id,
    recipeVersion: input.recipe.version,
    validatorResult: {
      messages: ["Validated by Reflet Bridge"],
      score: 100,
      status: "passed",
    },
  };
}

export function validateHarnessArtifacts({
  baseSha,
  jobId,
  promptHash,
  recipe,
  repoRoot,
}: ValidateHarnessArtifactsInput): HarnessValidationResult {
  if (existsSync(join(repoRoot, ".reflet", "users"))) {
    return { kind: "failed", reason: "private_user_folder" };
  }
  if (refletTreeHasSecret(repoRoot)) {
    return { kind: "failed", reason: "secret_detected" };
  }
  if (hasRefletLocalChanges(repoRoot, baseSha)) {
    return { kind: "failed", reason: "local_state_tracked" };
  }
  if (!hasRefletDiff(repoRoot, baseSha)) {
    return { kind: "failed", reason: "noop_output" };
  }

  const artifacts: Extract<
    HarnessValidationResult,
    { kind: "passed" }
  >["artifacts"] = [];
  for (const output of recipe.outputs) {
    const path = join(repoRoot, output.path);
    const content = readIfExists(path);
    if (content === null) {
      if (output.required) {
        return { kind: "failed", reason: "missing_required_artifact" };
      }
      continue;
    }
    if (
      recipe.validations.includes("evidence_required") &&
      !contentHasEvidence(content)
    ) {
      return { kind: "failed", reason: "missing_evidence" };
    }
    const outputHash = hash(content);
    artifacts.push({
      artifactKind: output.artifactKind,
      metadata: buildMetadata({
        content,
        jobId,
        outputHash,
        path: output.path,
        promptHash,
        recipe,
        repoRoot,
      }),
      outputHash,
      path: output.path,
      recipeId: recipe.id,
      recipeVersion: recipe.version,
      title: dirname(output.path).replace(".reflet/", "") || recipe.title,
      validationScore: 100,
      validationStatus: "passed" as const,
    });
  }
  return { artifacts, kind: "passed" };
}
