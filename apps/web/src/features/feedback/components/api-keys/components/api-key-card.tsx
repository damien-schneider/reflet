"use client";

import { Copy, Eye, EyeSlash, Plus, Trash } from "@phosphor-icons/react";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface ApiKey {
  apiKeyId: Id<"organizationApiKeys">;
  name: string;
  publicKey: string;
  isActive: boolean;
  createdAt: number;
  lastUsedAt?: number;
  allowedDomains?: string[];
}

interface ApiKeyCardProps {
  apiKey: ApiKey;
  showSecretKey: boolean;
  setShowSecretKey: (value: boolean) => void;
  onToggleActive: (
    apiKeyId: Id<"organizationApiKeys">,
    isActive: boolean
  ) => void;
  onDelete: (apiKeyId: Id<"organizationApiKeys">) => void;
  onRegenerate: (apiKeyId: Id<"organizationApiKeys">) => void;
  onAddDomain: (
    apiKeyId: Id<"organizationApiKeys">,
    currentDomains: string[]
  ) => void;
  onRemoveDomain: (
    apiKeyId: Id<"organizationApiKeys">,
    currentDomains: string[],
    domain: string
  ) => void;
  domainInput: string;
  setDomainInput: (value: string) => void;
  onCopyToClipboard: (text: string, label: string) => void;
}

export function ApiKeyCard({
  apiKey,
  showSecretKey,
  setShowSecretKey,
  onToggleActive,
  onDelete,
  onRegenerate,
  onAddDomain,
  onRemoveDomain,
  domainInput,
  setDomainInput,
  onCopyToClipboard,
}: ApiKeyCardProps) {
  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium">{apiKey.name}</h4>
          <p className="text-muted-foreground text-sm">
            Created {new Date(apiKey.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={apiKey.isActive ? "default" : "secondary"}>
            {apiKey.isActive ? "Active" : "Inactive"}
          </Badge>
          <Switch
            checked={apiKey.isActive}
            onCheckedChange={(checked) =>
              onToggleActive(apiKey.apiKeyId, checked)
            }
          />
          <Button
            onClick={() => onDelete(apiKey.apiKeyId)}
            size="icon"
            variant="ghost"
          >
            <Trash className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Public Key</Label>
        <div className="flex items-center gap-2">
          <Input className="font-mono" readOnly value={apiKey.publicKey} />
          <Button
            onClick={() => onCopyToClipboard(apiKey.publicKey, "Public key")}
            size="icon"
            variant="outline"
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Secret Key</Label>
        <div className="flex items-center gap-2">
          <Input
            className="font-mono"
            readOnly
            type={showSecretKey ? "text" : "password"}
            value="fb_sec_••••••••••••••••••••••••"
          />
          <Button
            onClick={() => setShowSecretKey(!showSecretKey)}
            size="icon"
            title={showSecretKey ? "Hide" : "Show"}
            variant="outline"
          >
            {showSecretKey ? (
              <EyeSlash className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>
          <Button
            onClick={() => onRegenerate(apiKey.apiKeyId)}
            size="sm"
            variant="outline"
          >
            Regenerate
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Allowed Domains (Optional)</Label>
        <p className="text-muted-foreground text-sm">
          Restrict API access to specific domains. Leave empty to allow all
          domains.
        </p>
        <div className="flex flex-wrap gap-2">
          {apiKey.allowedDomains?.map((domain: string) => (
            <Badge
              className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
              key={domain}
              onClick={() =>
                onRemoveDomain(
                  apiKey.apiKeyId,
                  apiKey.allowedDomains ?? [],
                  domain
                )
              }
              variant="secondary"
            >
              {domain} &times;
            </Badge>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Input
            onChange={(e) => setDomainInput(e.target.value)}
            onKeyDown={(e) =>
              e.key === "Enter" &&
              onAddDomain(apiKey.apiKeyId, apiKey.allowedDomains ?? [])
            }
            placeholder="example.com"
            value={domainInput}
          />
          <Button
            onClick={() =>
              onAddDomain(apiKey.apiKeyId, apiKey.allowedDomains ?? [])
            }
            size="icon"
            variant="outline"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {apiKey.lastUsedAt && (
        <div className="text-muted-foreground text-sm">
          Last used: {new Date(apiKey.lastUsedAt).toLocaleDateString()}
        </div>
      )}
    </div>
  );
}
