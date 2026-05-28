import type { ArtifactMetadata, HarnessArtifactKind } from "@reflet/harness";

export type BridgeEventLevel =
  | "info"
  | "action"
  | "success"
  | "warning"
  | "error";

export interface BridgeJob {
  id: string;
  recipeId: string;
  recipeVersion: number;
  title: string;
  worktreeBranch: string;
}

export interface BridgeEventInput {
  jobId: string;
  level: BridgeEventLevel;
  message: string;
}

export interface BridgeArtifactInput {
  artifactKind: HarnessArtifactKind;
  metadata: ArtifactMetadata;
  outputHash: string;
  path: string;
  recipeId: string;
  recipeVersion: number;
  title: string;
  validationScore: number;
  validationStatus: "passed" | "warning" | "failed";
}

export interface BridgeCompletionInput {
  artifacts: BridgeArtifactInput[];
  claudeSessionId: string | null;
  commitSha: string;
  jobId: string;
  promptHash: string;
  prUrl: string;
  runtimeMs: number;
}

export interface BridgeFailureInput {
  blockerMessage?: string;
  failureReason: string;
  jobId: string;
  runtimeMs: number;
}

export interface BridgeRegistrationInput {
  bridgeName: string;
  claudeAvailable: boolean;
  doctorChecks: DoctorCheck[];
  repoFullName: string;
}

export interface BridgeRegistrationResult {
  bridgeInstallationId: string;
}

export interface BridgeClaimResult {
  job: BridgeJob | null;
}

export interface BridgeApi {
  appendEvent(input: BridgeEventInput): Promise<void>;
  claimJob(input: {
    bridgeInstallationId: string;
    repoFullName: string;
  }): Promise<BridgeClaimResult>;
  completeJob(input: BridgeCompletionInput): Promise<void>;
  failJob(input: BridgeFailureInput): Promise<void>;
  heartbeat(
    input: BridgeRegistrationInput & { bridgeInstallationId: string }
  ): Promise<void>;
  register(input: BridgeRegistrationInput): Promise<BridgeRegistrationResult>;
}

export interface DoctorCheck {
  label: string;
  message?: string;
  passed: boolean;
}

export interface DoctorReport {
  checks: DoctorCheck[];
  claudeCodeAvailable: boolean;
  ready: boolean;
}
