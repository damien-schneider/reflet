"use node";

import { Octokit } from "octokit";
import { internal } from "../../_generated/api";
import type { ActionCtx } from "../../_generated/server";

export interface CodebaseRuntime {
  ctx: ActionCtx;
  installationId: string;
  octokit: Octokit;
  organizationId: string;
  repoFullName: string;
}

const tokenCache = new Map<string, { token: string; expiresAt: number }>();

const SAFETY_WINDOW_MS = 60_000;

async function fetchInstallationToken(
  ctx: ActionCtx,
  installationId: string
): Promise<{ token: string; expiresAtMs: number }> {
  const result = await ctx.runAction(
    internal.integrations.github.node_actions.getInstallationTokenInternal,
    { installationId }
  );
  return {
    token: result.token,
    expiresAtMs: new Date(result.expiresAt).getTime(),
  };
}

export async function getInstallationToken(
  ctx: ActionCtx,
  installationId: string
): Promise<string> {
  const cached = tokenCache.get(installationId);
  if (cached && cached.expiresAt > Date.now() + SAFETY_WINDOW_MS) {
    return cached.token;
  }

  const { token, expiresAtMs } = await fetchInstallationToken(
    ctx,
    installationId
  );
  tokenCache.set(installationId, { token, expiresAt: expiresAtMs });
  return token;
}

export async function getInstallationOctokit(
  ctx: ActionCtx,
  installationId: string
): Promise<Octokit> {
  const token = await getInstallationToken(ctx, installationId);
  return new Octokit({ auth: token });
}
