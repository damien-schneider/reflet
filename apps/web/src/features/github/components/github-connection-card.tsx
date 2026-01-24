"use client";

import { Check, GithubLogo, Spinner, X } from "@phosphor-icons/react";
import Image from "next/image";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Text } from "@/components/ui/typography";

interface GitHubConnectionCardProps {
  isConnected: boolean;
  accountLogin?: string;
  accountAvatarUrl?: string;
  isAdmin: boolean;
  isDisconnecting: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}

export function GitHubConnectionCard({
  isConnected,
  accountLogin,
  accountAvatarUrl,
  isAdmin,
  isDisconnecting,
  onConnect,
  onDisconnect,
}: GitHubConnectionCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GithubLogo className="h-5 w-5" />
          GitHub Connection
        </CardTitle>
        <CardDescription>
          {isConnected
            ? `Connected as ${accountLogin}`
            : "Connect your GitHub account to sync releases"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isConnected ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              {accountAvatarUrl ? (
                <Image
                  alt={accountLogin || "GitHub"}
                  className="rounded-full"
                  height={40}
                  src={accountAvatarUrl}
                  width={40}
                />
              ) : null}
              <div>
                <Text className="font-medium">{accountLogin}</Text>
                <Badge variant="secondary">
                  <Check className="mr-1 h-3 w-3" />
                  Connected
                </Badge>
              </div>
            </div>
            {isAdmin ? (
              <Button
                disabled={isDisconnecting}
                onClick={onDisconnect}
                size="sm"
                variant="outline"
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
        ) : (
          <div>
            {isAdmin ? (
              <Button onClick={onConnect}>
                <GithubLogo className="mr-2 h-4 w-4" />
                Connect GitHub
              </Button>
            ) : (
              <Text variant="bodySmall">
                Contact an admin to connect GitHub.
              </Text>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
