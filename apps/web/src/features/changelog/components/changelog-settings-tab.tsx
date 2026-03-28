"use client";

import { GithubLogo, MagicWand } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useAction, useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Muted } from "@/components/ui/typography";
import { AutomationSection } from "../../../../app/(app)/dashboard/[orgSlug]/settings/releases/_components/automation-section";
import { CurrentConfigSection } from "../../../../app/(app)/dashboard/[orgSlug]/settings/releases/_components/current-config-section";
import { ManualSyncSection } from "../../../../app/(app)/dashboard/[orgSlug]/settings/releases/_components/manual-sync-section";
import { SyncDirectionSection } from "../../../../app/(app)/dashboard/[orgSlug]/settings/releases/_components/sync-direction-section";
import { VersioningSection } from "../../../../app/(app)/dashboard/[orgSlug]/settings/releases/_components/versioning-section";

interface BranchInfo {
  isProtected: boolean;
  name: string;
}

interface ChangelogSettingsTabProps {
  isAdmin: boolean;
  onOpenSetupWizard: () => void;
  organizationId: Id<"organizations">;
  orgSlug: string;
}

export function ChangelogSettingsTab({
  isAdmin,
  onOpenSetupWizard,
  organizationId,
  orgSlug,
}: ChangelogSettingsTabProps) {
  const org = useQuery(api.organizations.queries.getBySlug, { slug: orgSlug });
  const githubStatus = useQuery(
    api.integrations.github.queries.getConnectionStatus,
    { organizationId }
  );
  const githubConnection = useQuery(
    api.integrations.github.queries.getConnection,
    { organizationId }
  );

  const updateOrg = useMutation(api.organizations.mutations.update);
  const getToken = useAction(
    api.integrations.github.node_actions.getInstallationToken
  );
  const fetchBranchesAction = useAction(
    api.integrations.github.release_actions.fetchBranches
  );

  const [isSaving, setIsSaving] = useState(false);
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [isLoadingBranches, setIsLoadingBranches] = useState(false);

  const settings = org?.changelogSettings;
  const isGitHubConnected = githubStatus?.isConnected === true;

  const loadBranches = useCallback(async () => {
    if (
      !(githubConnection?.installationId && githubConnection.repositoryFullName)
    ) {
      return;
    }

    setIsLoadingBranches(true);
    try {
      const { token } = await getToken({
        installationId: githubConnection.installationId,
      });
      const result = await fetchBranchesAction({
        installationToken: token,
        repositoryFullName: githubConnection.repositoryFullName,
      });
      setBranches(result);
    } catch {
      setBranches([]);
    } finally {
      setIsLoadingBranches(false);
    }
  }, [
    githubConnection?.installationId,
    githubConnection?.repositoryFullName,
    getToken,
    fetchBranchesAction,
  ]);

  useEffect(() => {
    if (isGitHubConnected) {
      loadBranches();
    }
  }, [isGitHubConnected, loadBranches]);

  const handleUpdate = useCallback(
    async (updates: Record<string, unknown>) => {
      if (!org?._id) {
        return;
      }
      setIsSaving(true);
      try {
        await updateOrg({
          id: org._id,
          changelogSettings: {
            ...settings,
            ...updates,
          },
        });
        toast.success("Settings saved");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to save");
      } finally {
        setIsSaving(false);
      }
    },
    [org?._id, settings, updateOrg]
  );

  return (
    <div className="space-y-6">
      {/* Versioning — always available */}
      <VersioningSection
        autoVersioning={settings?.autoVersioning}
        isAdmin={isAdmin}
        isSaving={isSaving}
        onUpdate={handleUpdate}
        versionIncrement={settings?.versionIncrement}
        versionPrefix={settings?.versionPrefix}
      />

      {/* GitHub Sync — only when connected */}
      {isGitHubConnected ? (
        <>
          {/* Setup wizard launcher */}
          <div className="rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MagicWand className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium text-sm">GitHub Sync Wizard</p>
                  <Muted className="text-xs">
                    {settings?.syncDirection
                      ? "Re-run the guided sync setup"
                      : "Configure GitHub release sync in a few steps"}
                  </Muted>
                </div>
              </div>
              <Button
                disabled={!isAdmin}
                onClick={onOpenSetupWizard}
                size="sm"
                variant="outline"
              >
                {settings?.syncDirection ? "Re-configure" : "Run Setup"}
              </Button>
            </div>
          </div>

          <SyncDirectionSection
            currentDirection={settings?.syncDirection}
            isAdmin={isAdmin}
            isConnected={isGitHubConnected}
            isSaving={isSaving}
            onUpdate={handleUpdate}
          />

          <AutomationSection
            autoPublishImported={settings?.autoPublishImported}
            branches={branches}
            isAdmin={isAdmin}
            isLoadingBranches={isLoadingBranches}
            isSaving={isSaving}
            onUpdate={handleUpdate}
            pushToGithubOnPublish={settings?.pushToGithubOnPublish}
            targetBranch={settings?.targetBranch}
          />

          {settings?.syncDirection && (
            <CurrentConfigSection settings={settings} />
          )}

          <ManualSyncSection
            isAdmin={isAdmin}
            lastSyncAt={githubStatus?.lastSyncAt}
            lastSyncStatus={githubStatus?.lastSyncStatus}
            organizationId={organizationId}
            orgSlug={orgSlug}
          />
        </>
      ) : (
        <div className="rounded-lg border border-dashed p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <GithubLogo className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-sm">GitHub Sync</p>
                <Muted className="text-xs">
                  Connect a GitHub repository to enable release sync, branch
                  tracking, and AI-powered release notes.
                </Muted>
              </div>
            </div>
            <a
              className={buttonVariants({ variant: "outline", size: "sm" })}
              href={`/api/github/install?organizationId=${organizationId}&orgSlug=${encodeURIComponent(orgSlug)}`}
            >
              <GithubLogo className="mr-1.5 h-4 w-4" />
              Connect GitHub
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
