export interface RecipeOutput {
  artifactKind: string;
  path: string;
}

export interface HarnessRecipeView {
  dependsOn: string[];
  id: string;
  outputs: RecipeOutput[];
  productMapLifecycle: string;
  productMapTopic: string;
  subagents: string[];
  title: string;
  validations: string[];
  version: number;
}

export interface BridgeDoctorCheck {
  label: string;
  message?: string;
  passed: boolean;
}

export interface HarnessBridgeView {
  claudeAvailable: boolean;
  doctorChecks: BridgeDoctorCheck[];
  lastHeartbeatAt: number;
  name: string;
  repoFullName: string;
  status: "online" | "offline" | "blocked";
}

export interface HarnessJobView {
  blockerMessage: string | null;
  commitSha: string | null;
  id: string;
  prUrl: string | null;
  recipeId: string;
  runtimeMs: number | null;
  status: "queued" | "running" | "succeeded" | "failed" | "blocked";
  title: string;
  updatedAt: number;
  worktreeBranch: string | null;
}

export interface HarnessArtifactView {
  artifactKind: string;
  evidenceHashes: Record<string, string>;
  id: string;
  inputArtifactHashes: Record<string, string>;
  path: string;
  promptHash: string;
  recipeId: string;
  title: string;
  updatedAt: number;
  validationScore: number;
  validationStatus: "passed" | "warning" | "failed";
  validatorMessages: string[];
}

export interface HarnessEventView {
  createdAt: number;
  id: string;
  level: string;
  message: string;
}

export interface HarnessOverview {
  artifacts: HarnessArtifactView[];
  bridge: HarnessBridgeView | null;
  events: HarnessEventView[];
  jobs: HarnessJobView[];
  recipes: HarnessRecipeView[];
}
