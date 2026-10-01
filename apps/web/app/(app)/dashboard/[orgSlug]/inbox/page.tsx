"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@ctrl-ui/react/ui/empty";
import {
  PageActions,
  PageHeader,
  PageTitle,
} from "@ctrl-ui/react/ui/page-layout";
import { Skeleton } from "@ctrl-ui/react/ui/skeleton";
import { ArrowLeft } from "@phosphor-icons/react";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { type ComponentProps, use, useState } from "react";
import { OrgNotFound } from "@/features/dashboard/components/org-not-found";
import {
  AdminConversationView,
  SelectConversationPrompt,
} from "@/features/inbox/components/conversation/admin-conversation-view";
import { InboxListPane } from "@/features/inbox/components/list/inbox-list-pane";
import { PublicPageControl } from "@/features/inbox/components/public-page-control";
import { ShortcutHintBar } from "@/features/inbox/components/shortcut-hint-bar";
import { useInbox } from "@/features/inbox/hooks/use-inbox";
import { acceptsReplies } from "@/features/support/lib/conversation-status";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { cn } from "@/lib/utils";
import {
  type InboxState,
  useInboxActions,
  useSupportToggle,
} from "./use-inbox-actions";

type ConversationViewProps = ComponentProps<typeof AdminConversationView>;

export default function InboxPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);
  const inbox = useInbox(orgSlug);
  const { isAdmin, org } = inbox;

  if (org === undefined || (org !== null && isAdmin === undefined)) {
    return (
      <div className="flex h-full flex-col gap-3 p-4" role="status">
        <span className="sr-only">Loading inbox…</span>
        <Skeleton aria-hidden className="h-8 w-40" />
        <Skeleton aria-hidden className="h-full w-full md:w-80" />
      </div>
    );
  }

  if (org === null) {
    return <OrgNotFound />;
  }

  if (!isAdmin) {
    return (
      <Empty className="min-h-[50vh]">
        <EmptyHeader>
          <EmptyTitle>
            <h1>No access to the inbox</h1>
          </EmptyTitle>
          <EmptyDescription>
            Only admins and owners can open the inbox. Ask an owner to change
            your role.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return <InboxWorkspace inbox={inbox} org={org} />;
}

function InboxWorkspace({
  inbox,
  org,
}: {
  inbox: InboxState;
  org: { _id: Id<"organizations">; slug: string };
}) {
  const [showHints, setShowHints] = useState(true);
  const actions = useInboxActions(inbox);

  useKeyboardShortcuts({
    j: () => actions.moveSelection(1),
    k: () => actions.moveSelection(-1),
    "shift+/": () => setShowHints((prev) => !prev),
  });

  return (
    <div className="flex h-full flex-col">
      <InboxHeader inbox={inbox} org={org} />
      <InboxPanes actions={actions} inbox={inbox} />
      <ShortcutHintBar
        canActOnSelection={
          inbox.selectedConversation
            ? acceptsReplies(inbox.selectedConversation.status)
            : false
        }
        visible={showHints}
      />
    </div>
  );
}

function InboxPanes({
  actions,
  inbox,
}: {
  actions: ReturnType<typeof useInboxActions>;
  inbox: InboxState;
}) {
  const [mobilePane, setMobilePane] = useState<"list" | "conversation">("list");

  return (
    <div className="flex min-h-0 flex-1">
      <div
        className={cn(
          "w-full shrink-0 border-r md:block md:w-80",
          mobilePane === "list" ? "block" : "hidden"
        )}
      >
        <InboxListPane
          list={{
            conversations: inbox.conversations,
            quickActions: actions.quickActions,
            selection: {
              activeId: inbox.selectedId,
              onSelect: (id) => {
                inbox.setSelectedId(id);
                setMobilePane("conversation");
              },
            },
          }}
          search={{ onChange: inbox.setSearchQuery, query: inbox.searchQuery }}
          views={{ current: inbox.view, onChange: inbox.setView }}
        />
      </div>
      <ConversationPane
        controls={{
          actions: actions.selectedConversationActions,
          members: inbox.members,
        }}
        detail={{
          conversation: inbox.selectedConversation,
          hasConversations: (inbox.conversations?.length ?? 0) > 0,
          messages: inbox.messages,
        }}
        mobile={{
          isVisible: mobilePane === "conversation",
          onBack: () => setMobilePane("list"),
        }}
      />
    </div>
  );
}

function InboxHeader({
  inbox,
  org,
}: {
  inbox: InboxState;
  org: { _id: Id<"organizations">; slug: string };
}) {
  const support = useSupportToggle(inbox, org._id);
  const count = inbox.conversations?.length;

  return (
    <>
      <PageHeader className="border-b px-4 py-3">
        <PageTitle>Inbox</PageTitle>
        <PageActions>
          <PublicPageControl
            onToggle={support.toggleSupport}
            publicHref={`/${org.slug}/support`}
            setting={{
              enabled: inbox.supportEnabled ?? false,
              isSaving: support.isSaving,
            }}
          />
        </PageActions>
      </PageHeader>
      <p className="sr-only" role="status">
        {count === undefined
          ? ""
          : `${count} ${count === 1 ? "conversation" : "conversations"}`}
      </p>
    </>
  );
}

function ConversationPane({
  controls,
  detail,
  mobile,
}: {
  controls: ConversationViewProps["controls"];
  detail: {
    conversation: ConversationViewProps["conversation"] | null | undefined;
    hasConversations: boolean;
    messages: ConversationViewProps["messages"];
  };
  mobile: { isVisible: boolean; onBack: () => void };
}) {
  return (
    <div
      className={cn(
        "min-w-0 flex-1 flex-col",
        mobile.isVisible ? "flex" : "hidden md:flex"
      )}
    >
      <div className="border-b p-2 md:hidden">
        <Button onClick={mobile.onBack} size="sm" variant="ghost">
          <ArrowLeft aria-hidden />
          All conversations
        </Button>
      </div>
      {detail.conversation ? (
        <AdminConversationView
          controls={controls}
          conversation={detail.conversation}
          messages={detail.messages}
        />
      ) : (
        detail.hasConversations && <SelectConversationPrompt />
      )}
    </div>
  );
}
