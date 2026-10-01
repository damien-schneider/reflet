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
  installationId: string;
}

export interface InstallationChoice {
  previousInstallationId?: string;
  requestedInstallationId?: string;
}

const userInstallationsPageSchema = z.object({
  installations: z.array(
    z.object({
      account: z.object({
        avatar_url: z.string(),
        login: z.string(),
        type: z.string(),
      }),
      created_at: z.string(),
      id: z.number(),
    })
  ),
});

type UserInstallation = z.infer<
  typeof userInstallationsPageSchema
>["installations"][number];

const userInstallationRepositoriesPageSchema = z.object({
  repositories: z.array(z.object({ full_name: z.string(), id: z.number() })),
});

function chooseInstallation(
  installations: UserInstallation[],
  { previousInstallationId, requestedInstallationId }: InstallationChoice
): UserInstallation | null {
  if (requestedInstallationId) {
    const requested = installations.find(
      (candidate) => String(candidate.id) === requestedInstallationId
    );
    if (!requested) {
      throw new Error(
        "Your GitHub account cannot access this GitHub App installation"
      );
    }
    return requested;
  }

  const previous = installations.find(
    (candidate) => String(candidate.id) === previousInstallationId
  );
  return (
    previous ??
    installations.reduce<UserInstallation | null>(
      (newest, candidate) =>
        newest && newest.created_at >= candidate.created_at
          ? newest
          : candidate,
      null
    )
  );
}

/**
 * Picks the installation to connect from the ones the user's own GitHub token
 * can access — installation ids from redirects are spoofable. Returns null
 * when the user has not installed the app on any account yet.
 */
export async function resolveUserInstallation(
  githubUserToken: string,
  choice: InstallationChoice
): Promise<VerifiedInstallation | null> {
  const installations = await fetchAllPages(
    `${GITHUB_API_URL}/user/installations?per_page=100`,
    githubUserToken,
    (page) => userInstallationsPageSchema.parse(page).installations
  );
  const installation = chooseInstallation(installations, choice);
  if (!installation) {
    return null;
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
    installationId: String(installation.id),
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
