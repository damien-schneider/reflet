"use client";

import { Card } from "@ctrl-ui/react/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@ctrl-ui/react/ui/empty";
import {
  PageBody,
  PageDescription,
  PageHeader,
  PageLayout,
  PageTitle,
} from "@ctrl-ui/react/ui/page-layout";
import { Skeleton } from "@ctrl-ui/react/ui/skeleton";
import { LinkBreak } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { SupportCredential } from "@reflet/backend/convex/support/access";
import { useQuery } from "convex/react";
import { useMemo } from "react";
import { SupportThread } from "@/features/support/components/desk/support-thread";
import { ThreadEmailToggle } from "@/features/support/components/thread-link/thread-email-toggle";

export function ThreadLinkView({ token }: { token: string }) {
  const link = useQuery(api.support.thread_links.resolve, { token });
  const credential = useMemo<SupportCredential>(
    () => ({ kind: "thread", token }),
    [token]
  );

  if (link === undefined) {
    return (
      <PageLayout scroll="page" width="prose">
        <PageBody>
          <div className="flex flex-col gap-4" role="status">
            <span className="sr-only">Loading conversation…</span>
            <Skeleton aria-hidden className="h-8 w-48" />
            <Skeleton aria-hidden className="h-96 w-full" />
          </div>
        </PageBody>
      </PageLayout>
    );
  }

  if (link === null) {
    return (
      <PageLayout scroll="page" width="prose">
        <PageBody>
          <Empty>
            <EmptyHeader>
              <EmptyMedia>
                <LinkBreak aria-hidden />
              </EmptyMedia>
              <EmptyTitle>
                <h1>This link is no longer valid</h1>
              </EmptyTitle>
              <EmptyDescription>
                Open the most recent email about this conversation and use its
                link.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </PageBody>
      </PageLayout>
    );
  }

  return (
    <PageLayout scroll="page" width="prose">
      <PageHeader>
        <PageTitle>Conversation with {link.organization.name}</PageTitle>
        <PageDescription>
          Replies from the team show up here. Anyone with this link can read and
          reply, so don’t share it.
        </PageDescription>
      </PageHeader>
      <PageBody>
        <div className="flex flex-col gap-4">
          <Card className="flex h-[min(75dvh,48rem)] flex-col overflow-hidden p-0">
            <SupportThread
              conversationId={link.conversationId}
              credential={credential}
            />
          </Card>
          <ThreadEmailToggle token={token} />
        </div>
      </PageBody>
    </PageLayout>
  );
}
