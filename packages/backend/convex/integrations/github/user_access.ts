import type { Infer } from "convex/values";
import { z } from "zod";
import { GITHUB_API_URL } from "./github_constants";
import { fetchAllPages } from "./github_pagination";
import type { accessibleRepository } from "./tableFields";

export type AccessibleRepository = Infer<typeof accessibleRepository>;

export interface VerifiedInstallation {
  accessibleRepositories: AccessibleRepository[];
  accountAvatarUrl: string;
  accountLogin: string;
  accountType: "organization" | "user";
}

const userInstallationsPageSchema = z.object({
  installations: z.array(
    z.object({
      account: z.object({
        avatar_url: z.string(),
        login: z.string(),
        type: z.string(),
      }),
      id: z.number(),
    })
  ),
});

const userInstallationRepositoriesPageSchema = z.object({
  repositories: z.array(z.object({ full_name: z.string(), id: z.number() })),
});

/**
 * Proves with the user's own GitHub token that they can access the
 * installation — installation ids from redirects are spoofable.
 */
export async function verifyInstallationAccess(
  githubUserToken: string,
  installationId: string
): Promise<VerifiedInstallation> {
  const installations = await fetchAllPages(
    `${GITHUB_API_URL}/user/installations?per_page=100`,
    githubUserToken,
    (page) => userInstallationsPageSchema.parse(page).installations
  );
  const installation = installations.find(
    (candidate) => String(candidate.id) === installationId
  );
  if (!installation) {
    throw new Error(
      "Your GitHub account cannot access this GitHub App installation"
    );
  }

  const repositories = await fetchAllPages(
    `${GITHUB_API_URL}/user/installations/${installation.id}/repositories?per_page=100`,
    githubUserToken,
    (page) => userInstallationRepositoriesPageSchema.parse(page).repositories
  );

  return {
    accessibleRepositories: repositories.map((repository) => ({
      fullName: repository.full_name,
      id: String(repository.id),
    })),
    accountAvatarUrl: installation.account.avatar_url,
    accountLogin: installation.account.login,
    accountType:
      installation.account.type === "Organization" ? "organization" : "user",
  };
}

export function isRepositoryAccessible(
  accessibleRepositories: AccessibleRepository[],
  repository: AccessibleRepository
): boolean {
  return accessibleRepositories.some(
    (candidate) =>
      candidate.id === repository.id &&
      candidate.fullName === repository.fullName
  );
}
