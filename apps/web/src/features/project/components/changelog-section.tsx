"use client";

import { AutomationSection } from "@app/(app)/dashboard/[orgSlug]/settings/releases/_components/automation-section";
import { CurrentConfigSection } from "@app/(app)/dashboard/[orgSlug]/settings/releases/_components/current-config-section";
import { ManualSyncSection } from "@app/(app)/dashboard/[orgSlug]/settings/releases/_components/manual-sync-section";
import { SyncDirectionSection } from "@app/(app)/dashboard/[orgSlug]/settings/releases/_components/sync-direction-section";
import { VersioningSection } from "@app/(app)/dashboard/[orgSlug]/settings/releases/_components/versioning-section";
import { GithubLogo, MagicWand } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useAction, useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Muted } from "@/components/ui/typography";
import { ReleaseSetupWizard } from "@/features/changelog/components/release-setup-wizard";

interface BranchInfo {
  isProtected: boolean;
  name: string;
}

interface ChangelogSectionProps {
  organizationId: Id<"organizations">;
  orgSlug: string;
}

export function ChangelogSection({
  organizationId,
  orgSlug,
}: ChangelogSectionProps) {
  const org = useQuery(api.organizations.queries.get, { id: organizationId });
  const currentMember = useQuery(api.organizations.members.getCurrentMember, {
    organizationId,
  });
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

  const [showWizard, setShowWizard] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [isLoadingBranches, setIsLoadingBranches] = useState(false);

  const isAdmin =
    currentMember?.role === "admin" || currentMember?.role === "owner";

  const settings = org?.changelogSettings;
  const isGitHubConnected = githubStatus?.isConnected === true;

  useEffect(
    function syncBranches() {
      if (!isGitHubConnected) {
        return;
      }
      const installationId = githubConnection?.installationId;
      const repositoryFullName = githubConnection?.repositoryFullName;
      if (!(installationId && repositoryFullName)) {
        return;
      }
      const run = async () => {
        setIsLoadingBranches(true);
        try {
          const { token } = await getToken({ installationId });
          const result = await fetchBranchesAction({
            installationToken: token,
            repositoryFullName,
          });
          setBranches(result);
        } catch {
          setBranches([]);
        } finally {
          setIsLoadingBranches(false);
        }
      };
      run();
    },
    [
      isGitHubConnected,
      githubConnection?.installationId,
      githubConnection?.repositoryFullName,
      getToken,
      fetchBranchesAction,
    ]
  );

  const handleUpdate = async (updates: Record<string, unknown>) => {
    if (!organizationId) {
      return;
    }
    setIsSaving(true);
    try {
      await updateOrg({
        id: organizationId,
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
  };

  const syncDirection = settings?.syncDirection;
  return (
    <div className="space-y-6">
      <VersioningSection
        autoVersioning={settings?.autoVersioning}
        isAdmin={isAdmin}
        isSaving={isSaving}
        onUpdate={handleUpdate}
        versionIncrement={settings?.versionIncrement}
        versionPrefix={settings?.versionPrefix}
      />

      {isGitHubConnected ? (
        <>
          <div className="rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MagicWand className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium text-sm">GitHub Sync Wizard</p>
                  <Muted className="text-xs">
                    {syncDirection
                      ? "Re-run the guided sync setup"
                      : "Configure GitHub release sync in a few steps"}
                  </Muted>
                </div>
              </div>
              <Button
                disabled={!isAdmin}
                onClick={() => setShowWizard(true)}
                size="sm"
                variant="outline"
              >
                {syncDirection ? "Re-configure" : "Run Setup"}
              </Button>
            </div>
          </div>

          <SyncDirectionSection
            currentDirection={syncDirection}
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

          {syncDirection ? <CurrentConfigSection settings={settings} /> : null}

          <ManualSyncSection
            isAdmin={isAdmin}
            lastSyncAt={githubStatus?.lastSyncAt}
            lastSyncStatus={githubStatus?.lastSyncStatus}
            organizationId={organizationId}
            orgSlug={orgSlug}
          />

          <ReleaseSetupWizard
            onOpenChange={setShowWizard}
            open={showWizard}
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
          </div>
        </div>
      )}
    </div>
  );
}
