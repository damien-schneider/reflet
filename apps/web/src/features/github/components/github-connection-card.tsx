"use client";

import { Check, GithubLogo, Spinner, X } from "@phosphor-icons/react";
import Image from "next/image";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Muted, Text } from "@/components/ui/typography";

interface GitHubConnectionCardProps {
  accountAvatarUrl?: string;
  accountLogin?: string;
  isAdmin: boolean;
  isConnected: boolean;
  isDisconnecting: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}

export function GitHubConnectionSection({
  isConnected,
  accountLogin,
  accountAvatarUrl,
  isAdmin,
  isDisconnecting,
  onConnect,
  onDisconnect,
}: GitHubConnectionCardProps) {
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
      {isAdmin ? (
        <Button onClick={onConnect}>
          <GithubLogo className="mr-2 h-4 w-4" />
          Connect GitHub
        </Button>
      ) : (
        <Muted>Contact an admin to connect GitHub.</Muted>
      )}
    </div>
  );
}
