"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { WizardConfig } from "../release-setup-wizard";

interface AutomationStepProps {
  config: WizardConfig;
  onChange: (partial: Partial<WizardConfig>) => void;
}

export function AutomationStep({ config, onChange }: AutomationStepProps) {
  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        Configure automation for your release workflow:
      </p>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
          <div>
            <Label className="text-sm" htmlFor="auto-sync">
              Auto-sync from GitHub
            </Label>
            <p className="text-muted-foreground text-xs">
              Automatically import new GitHub releases into Reflet
            </p>
          </div>
          <Switch
            checked={config.autoSyncReleases}
            id="auto-sync"
            onCheckedChange={(checked) =>
              onChange({ autoSyncReleases: checked })
            }
          />
        </div>

        <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
          <div>
            <Label className="text-sm" htmlFor="push-to-github">
              Push to GitHub on publish
            </Label>
            <p className="text-muted-foreground text-xs">
              Create/update a GitHub Release when publishing in Reflet
            </p>
          </div>
          <Switch
            checked={config.pushToGithubOnPublish}
            id="push-to-github"
            onCheckedChange={(checked) =>
              onChange({ pushToGithubOnPublish: checked })
            }
          />
        </div>

        <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
          <div>
            <Label className="text-sm" htmlFor="auto-publish">
              Auto-publish imported releases
            </Label>
            <p className="text-muted-foreground text-xs">
              Immediately publish releases imported from GitHub. When off, they
              arrive as drafts for review.
            </p>
          </div>
          <Switch
            checked={config.autoPublishImported}
            id="auto-publish"
            onCheckedChange={(checked) =>
              onChange({ autoPublishImported: checked })
            }
          />
        </div>
      </div>
    </div>
  );
}
