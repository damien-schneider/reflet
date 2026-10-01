"use client";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@ctrl-ui/react/ui/alert-dialog";
import { Badge } from "@ctrl-ui/react/ui/badge";
import { Button, ButtonLink } from "@ctrl-ui/react/ui/button";
import { Spinner } from "@ctrl-ui/react/ui/spinner";
import { Check, GithubLogo, Warning } from "@phosphor-icons/react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Muted, Text } from "@/components/ui/typography";

const ADMIN_ONLY_COPY =
  "Only admins can connect GitHub. Ask an admin in your organization to connect it.";

interface GitHubConnectionCardProps {
  accountAvatarUrl?: string;
  accountLogin?: string;
  anotherAccountHref?: string;
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
  anotherAccountHref,
  connectHref,
  isAdmin,
  isDisconnecting,
  onConnectClick,
  onDisconnect,
}: GitHubConnectionCardProps) {
  if (isOwnerLeft) {
    return (
      <div className="flex flex-col items-start gap-3">
        <div className="flex items-center gap-2">
          <Warning aria-hidden="true" className="size-5 text-warning-text" />
          <Text className="font-medium">GitHub connection lost</Text>
          <Badge size="sm" variant="outline">
            Disconnected
          </Badge>
        </div>
        <Muted className="text-pretty">
          The teammate who connected GitHub left this organization, so syncing
          has stopped.{" "}
          {isAdmin
            ? "Reconnect GitHub with your account to resume."
            : "Ask an admin to reconnect GitHub."}
        </Muted>
        {isAdmin ? (
          <ConnectGitHubActions
            anotherAccountHref={anotherAccountHref}
            connectHref={connectHref}
            label="Reconnect GitHub"
            onConnectClick={onConnectClick}
          />
        ) : null}
      </div>
    );
  }

  if (isConnected) {
    return (
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          {accountAvatarUrl ? (
            <Image
              alt=""
              className="size-8 shrink-0 rounded-full outline outline-1 outline-black/10 -outline-offset-1 dark:outline-white/10"
              height={32}
              src={accountAvatarUrl}
              width={32}
            />
          ) : (
            <GithubLogo
              aria-hidden="true"
              className="size-8 shrink-0 text-muted-foreground"
            />
          )}
          <Text className="truncate font-medium" title={accountLogin}>
            {accountLogin ?? "GitHub account"}
          </Text>
          <Badge color="green" size="sm">
            <Check aria-hidden="true" />
            Connected
          </Badge>
        </div>
        {isAdmin ? (
          <DisconnectGitHubButton
            isDisconnecting={isDisconnecting}
            onDisconnect={onDisconnect}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-3">
      <Muted className="text-pretty">
        GitHub isn’t connected yet.{" "}
        {isAdmin
          ? "Connect it to sync releases and issues with a repository."
          : ADMIN_ONLY_COPY}
      </Muted>
      {isAdmin ? (
        <ConnectGitHubActions
          anotherAccountHref={anotherAccountHref}
          connectHref={connectHref}
          label="Connect GitHub"
          onConnectClick={onConnectClick}
        />
      ) : null}
    </div>
  );
}

function ConnectGitHubActions({
  anotherAccountHref,
  connectHref,
  label,
  onConnectClick,
}: {
  anotherAccountHref?: string;
  connectHref?: string;
  label: string;
  onConnectClick?: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <ConnectGitHubButton
        connectHref={connectHref}
        label={label}
        onConnectClick={onConnectClick}
      />
      {anotherAccountHref ? (
        <ButtonLink
          onClick={onConnectClick}
          render={<Link href={anotherAccountHref} />}
          variant="ghost"
        >
          Use another GitHub account
        </ButtonLink>
      ) : null}
    </div>
  );
}

function ConnectGitHubButton({
  connectHref,
  label,
  onConnectClick,
}: {
  connectHref?: string;
  label: string;
  onConnectClick?: () => void;
}) {
  if (!connectHref) {
    return (
      <Button disabled tone="primary" variant="solid">
        <GithubLogo
          aria-hidden="true"
          className="size-4"
          data-icon="inline-start"
        />
        {label}
      </Button>
    );
  }

  return (
    <ButtonLink
      onClick={onConnectClick}
      render={<Link href={connectHref} />}
      tone="primary"
      variant="solid"
    >
      <GithubLogo
        aria-hidden="true"
        className="size-4"
        data-icon="inline-start"
      />
      {label}
    </ButtonLink>
  );
}

function DisconnectGitHubButton({
  isDisconnecting,
  onDisconnect,
}: {
  isDisconnecting: boolean;
  onDisconnect: () => void;
}) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  return (
    <>
      <Button
        disabled={isDisconnecting}
        onClick={() => setIsConfirmOpen(true)}
        size="xs"
        variant="ghost"
      >
        Disconnect
      </Button>
      <AlertDialog
        onOpenChange={(nextOpen) => {
          if (!isDisconnecting) {
            setIsConfirmOpen(nextOpen);
          }
        }}
        open={isConfirmOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-balance">
              Disconnect GitHub?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-pretty">
              Releases and issues stop syncing, and Reflet forgets the releases
              it synced from GitHub. Releases already in your changelog stay.
              You can reconnect anytime.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              disabled={isDisconnecting}
              onClick={() => setIsConfirmOpen(false)}
              variant="surface"
            >
              Cancel
            </Button>
            <Button
              disabled={isDisconnecting}
              onClick={onDisconnect}
              tone="danger"
              variant="surface"
            >
              {isDisconnecting ? (
                <Spinner data-icon="inline-start" size="xs" />
              ) : null}
              Disconnect GitHub
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
