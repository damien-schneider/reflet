import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import type { ArtifactMetadata, HarnessRecipe } from "@reflet/harness";
import { resolveRecipeSink } from "@reflet/harness";
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
  | "noop_output"
  | "invalid_documents_output";

export interface BridgeDocument {
  content: string;
  platform?: string;
  targetUrl?: string;
  title: string;
  type: string;
}

export type HarnessValidationResult =
  | {
      artifacts: Array<{
        artifactKind: HarnessRecipe["outputs"][number]["artifactKind"];
        content: string;
        metadata: ArtifactMetadata;
        outputHash: string;
        path: string;
        recipeId: string;
        recipeVersion: number;
        title: string;
        validationScore: number;
        validationStatus: "passed" | "warning" | "failed";
      }>;
      documents: BridgeDocument[];
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

// Defensive cap so a runaway artifact body cannot bloat a Convex mutation
// payload. Normal harness docs are a few KB; anything past this is truncated
// with a marker so the UI still renders something useful.
const MAX_ARTIFACT_CONTENT_BYTES = 1_000_000;

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function capContent(content: string): string {
  if (Buffer.byteLength(content, "utf8") <= MAX_ARTIFACT_CONTENT_BYTES) {
    return content;
  }
  const truncated = Buffer.from(content, "utf8")
    .subarray(0, MAX_ARTIFACT_CONTENT_BYTES)
    .toString("utf8");
  return `${truncated}\n\n[reflet: content truncated — exceeded ${MAX_ARTIFACT_CONTENT_BYTES} bytes]`;
}

function readIfExists(path: string): string | null {
  // Recipe inputs can reference directories (e.g. ".reflet/codebase"), which
  // now materialize in the worktree once seeding writes files under them.
  // Reading a directory throws EISDIR, so treat non-files as absent.
  if (!(existsSync(path) && statSync(path).isFile())) {
    return null;
  }
  return readFileSync(path, "utf8");
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

function toOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function parseDocument(value: unknown): BridgeDocument | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (typeof record.type !== "string" || record.type.length === 0) {
    return null;
  }
  if (typeof record.title !== "string" || record.title.length === 0) {
    return null;
  }
  if (typeof record.content !== "string" || record.content.length === 0) {
    return null;
  }
  return {
    content: record.content,
    platform: toOptionalString(record.platform),
    targetUrl: toOptionalString(record.targetUrl),
    title: record.title,
    type: record.type,
  };
}

function parseDocumentsOutput(content: string): BridgeDocument[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) {
    return null;
  }
  const raw = (parsed as Record<string, unknown>).documents;
  if (!Array.isArray(raw)) {
    return null;
  }
  const documents: BridgeDocument[] = [];
  for (const entry of raw) {
    const document = parseDocument(entry);
    if (!document) {
      return null;
    }
    documents.push(document);
  }
  return documents;
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

  const sink = resolveRecipeSink(recipe);
  // Documents-sink recipes write drafts straight into Convex, not a git PR, so
  // there is no .reflet diff to assert and evidence lives inside the JSON drafts.
  if (sink === "documents") {
    return validateDocumentsSink({ jobId, promptHash, recipe, repoRoot });
  }

  // Artifacts-sink recipes harvest their .reflet bodies straight into Convex
  // (no git PR), so they are told NOT to commit. There is therefore no commit
  // to diff — the files live only in the working tree.
  if (sink === "artifacts") {
    return harvestRefletOutputs({ jobId, promptHash, recipe, repoRoot });
  }

  if (!hasRefletDiff(repoRoot, baseSha)) {
    return { kind: "failed", reason: "noop_output" };
  }
  return harvestRefletOutputs({ jobId, promptHash, recipe, repoRoot });
}

function harvestRefletOutputs({
  jobId,
  promptHash,
  recipe,
  repoRoot,
}: {
  jobId: string;
  promptHash: string;
  recipe: HarnessRecipe;
  repoRoot: string;
}): HarnessValidationResult {
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
      content: capContent(content),
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
  if (artifacts.length === 0) {
    return { kind: "failed", reason: "noop_output" };
  }
  return { artifacts, documents: [], kind: "passed" };
}

function validateDocumentsSink({
  jobId,
  promptHash,
  recipe,
  repoRoot,
}: {
  jobId: string;
  promptHash: string;
  recipe: HarnessRecipe;
  repoRoot: string;
}): HarnessValidationResult {
  const artifacts: Extract<
    HarnessValidationResult,
    { kind: "passed" }
  >["artifacts"] = [];
  const documents: BridgeDocument[] = [];
  for (const output of recipe.outputs) {
    const content = readIfExists(join(repoRoot, output.path));
    if (content === null) {
      if (output.required) {
        return { kind: "failed", reason: "missing_required_artifact" };
      }
      continue;
    }
    const parsed = parseDocumentsOutput(content);
    if (parsed === null) {
      return { kind: "failed", reason: "invalid_documents_output" };
    }
    documents.push(...parsed);
    const outputHash = hash(content);
    artifacts.push({
      artifactKind: output.artifactKind,
      content: capContent(content),
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
  return { artifacts, documents, kind: "passed" };
}
