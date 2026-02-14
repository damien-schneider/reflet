"use client";

import { GithubLogo, MagicWand } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import { useAction, useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { H1, Muted, Text } from "@/components/ui/typography";
import { ReleaseSetupWizard } from "@/features/changelog/components/release-setup-wizard";
import { AutomationSection } from "./_components/automation-section";
import { CurrentConfigSection } from "./_components/current-config-section";
import { ManualSyncSection } from "./_components/manual-sync-section";
import { SyncDirectionSection } from "./_components/sync-direction-section";
import { VersioningSection } from "./_components/versioning-section";

interface BranchInfo {
  name: string;
  isProtected: boolean;
}

export default function ReleaseSettingsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);
  const org = useQuery(api.organizations.getBySlug, { slug: orgSlug });
  const currentMember = useQuery(
    api.members.getCurrentMember,
    org?._id ? { organizationId: org._id } : "skip"
  );
  const githubStatus = useQuery(
    api.github.getConnectionStatus,
    org?._id ? { organizationId: org._id } : "skip"
  );
  const githubConnection = useQuery(
    api.github.getConnection,
    org?._id ? { organizationId: org._id } : "skip"
  );

  const updateOrg = useMutation(api.organizations.update);
  const getToken = useAction(api.github_node_actions.getInstallationToken);
  const fetchBranchesAction = useAction(
    api.github_release_actions.fetchBranches
  );

  const [showWizard, setShowWizard] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [isLoadingBranches, setIsLoadingBranches] = useState(false);

  const isAdmin =
    currentMember?.role === "admin" || currentMember?.role === "owner";

  const settings = org?.changelogSettings;
  const orgId = org?._id;
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
      if (!orgId) {
        return;
      }
      setIsSaving(true);
      try {
        await updateOrg({
          id: orgId,
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
    [orgId, settings, updateOrg]
  );

  if (!(org && orgId)) {
    return null;
  }

  return (
    <div className="space-y-8">
      <div>
        <H1>Release Settings</H1>
        <Text variant="bodySmall">
          Configure how releases and changelogs are managed
        </Text>
      </div>

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
          {/* GitHub Sync Setup Wizard */}
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
                onClick={() => setShowWizard(true)}
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
            organizationId={orgId}
          />

          <ReleaseSetupWizard
            onOpenChange={setShowWizard}
            open={showWizard}
            organizationId={orgId}
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
            <Link
              className={buttonVariants({ variant: "outline", size: "sm" })}
              href={`/dashboard/${orgSlug}/settings/github`}
            >
              <GithubLogo className="mr-1.5 h-4 w-4" />
              Connect GitHub
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
