"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { env } from "@reflet/env/web";
import { useMutation } from "convex/react";
import { CheckCircle2, CircleAlert, Copy, KeyRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { HarnessBridgeView } from "./types";

interface HarnessSetupPanelProps {
  bridge: HarnessBridgeView | null;
  organizationId: Id<"organizations">;
  repoFullName: string | null;
}

const BRIDGE_DOWNLOAD_PATH = "/downloads/reflet-bridge-0.1.0.tgz";
const DEFAULT_SITE_URL = "https://www.reflet.app";
const TRAILING_SLASH_PATTERN = /\/+$/;

function trimTrailingSlash(value: string): string {
  return value.replace(TRAILING_SLASH_PATTERN, "");
}

function buildBridgeCommand({
  repoFullName,
  secretKey,
  siteUrl,
}: {
  repoFullName: string;
  secretKey: string;
  siteUrl: string;
}): string {
  const packageUrl = `${trimTrailingSlash(siteUrl)}${BRIDGE_DOWNLOAD_PATH}`;
  return [
    `REFLET_SECRET_KEY=${secretKey}`,
    `bunx --package ${packageUrl} reflet-bridge start`,
    `--site-url ${env.NEXT_PUBLIC_CONVEX_SITE_URL}`,
    "--repo .",
    `--repo-full-name ${repoFullName}`,
  ].join(" ");
}

function BridgeCheckRow({ label, passed }: { label: string; passed: boolean }) {
  const Icon = passed ? CheckCircle2 : CircleAlert;
  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon
        className={passed ? "size-4 text-primary" : "size-4 text-destructive"}
      />
      <span>{label}</span>
    </div>
  );
}

export function HarnessSetupPanel({
  bridge,
  organizationId,
  repoFullName,
}: HarnessSetupPanelProps) {
  const generateApiKeys = useMutation(api.feedback.api_admin.generateApiKeys);
  const [secretKey, setSecretKey] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const command = buildBridgeCommand({
    repoFullName: repoFullName ?? "owner/repo",
    secretKey: secretKey ?? "fb_sec_your_bridge_key",
    siteUrl: env.NEXT_PUBLIC_SITE_URL ?? DEFAULT_SITE_URL,
  });

  const handleGenerateBridgeKey = () => {
    setIsGenerating(true);
    generateApiKeys({
      organizationId,
      name: "Reflet Bridge",
    })
      .then((result) => {
        setSecretKey(result.secretKey);
        toast.success("Bridge key generated");
      })
      .catch((error: unknown) => {
        toast.error(
          error instanceof Error
            ? error.message
            : "Could not generate Bridge key"
        );
      })
      .finally(() => {
        setIsGenerating(false);
      });
  };

  const handleCopyCommand = () => {
    navigator.clipboard
      .writeText(command)
      .then(() => {
        toast.success("Bridge command copied");
      })
      .catch((error: unknown) => {
        toast.error(
          error instanceof Error ? error.message : "Could not copy command"
        );
      });
  };

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Bridge setup</CardTitle>
        <CardDescription>
          Run this once in the repo. Reflet stores product knowledge in
          `.reflet/` and keeps local secrets in `.reflet.local/`.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Badge variant={repoFullName ? "secondary" : "outline"}>
            GitHub {repoFullName ?? "not connected"}
          </Badge>
          <Badge
            variant={bridge?.status === "online" ? "secondary" : "outline"}
          >
            Bridge {bridge?.status ?? "offline"}
          </Badge>
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          {(bridge?.doctorChecks.length
            ? bridge.doctorChecks
            : [
                { label: "Git CLI", passed: false },
                { label: "Claude Code", passed: false },
                { label: "GitHub auth", passed: false },
                { label: ".reflet.local ignored", passed: false },
              ]
          ).map((check) => (
            <BridgeCheckRow
              key={check.label}
              label={check.label}
              passed={check.passed}
            />
          ))}
        </div>
        <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
          {command}
        </pre>
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={isGenerating}
            onClick={handleGenerateBridgeKey}
            variant="outline"
          >
            <KeyRound className="size-4" />
            Generate Bridge key
          </Button>
          <Button onClick={handleCopyCommand} variant="outline">
            <Copy className="size-4" />
            Copy command
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
