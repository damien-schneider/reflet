"use client";

import { Check, GithubLogo, Spinner, Warning, X } from "@phosphor-icons/react";
import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Muted, Text } from "@/components/ui/typography";

interface GitHubConnectionCardProps {
  accountAvatarUrl?: string;
  accountLogin?: string;
  connectHref?: string;
  isAdmin: boolean;
  isConnected: boolean;
  isDisconnecting: boolean;
  isOwnerLeft?: boolean;
  onConnectClick?: () => void;
  onDisconnect: () => void;
}

export function GitHubConnectionSection({
  isConnected,
  isOwnerLeft,
  accountLogin,
  accountAvatarUrl,
  connectHref,
  isAdmin,
  isDisconnecting,
  onConnectClick,
  onDisconnect,
}: GitHubConnectionCardProps) {
  if (isOwnerLeft) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Warning className="h-5 w-5 text-amber-500" />
          <Text className="font-medium">GitHub connection lost</Text>
          <Badge variant="outline">Disconnected</Badge>
        </div>
        <Muted>
          The team member who linked this repository is no longer part of the
          organization. An admin with GitHub connected can re-link it.
        </Muted>
        {isAdmin && connectHref ? (
          <Button onClick={onConnectClick} render={<Link href={connectHref} />}>
            <GithubLogo className="mr-2 h-4 w-4" />
            Re-link GitHub
          </Button>
        ) : null}
      </div>
    );
  }

  if (isConnected) {
    return (
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {accountAvatarUrl ? (
            <Image
              alt={accountLogin || "GitHub"}
              className="rounded-full"
              height={32}
              src={accountAvatarUrl}
              width={32}
            />
          ) : null}
          <Text className="font-medium">{accountLogin}</Text>
          <Badge variant="secondary">
            <Check className="mr-1 h-3 w-3" />
            Connected
          </Badge>
        </div>
        {isAdmin ? (
          <Button
            disabled={isDisconnecting}
            onClick={onDisconnect}
            size="sm"
            variant="ghost"
          >
            {isDisconnecting ? (
              <Spinner className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <X className="mr-2 h-4 w-4" />
            )}
            Disconnect
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div>
      {isAdmin && connectHref ? (
        <Button onClick={onConnectClick} render={<Link href={connectHref} />}>
          <GithubLogo className="mr-2 h-4 w-4" />
          Connect GitHub
        </Button>
      ) : null}
      {isAdmin ? null : <Muted>Contact an admin to connect GitHub.</Muted>}
    </div>
  );
}
