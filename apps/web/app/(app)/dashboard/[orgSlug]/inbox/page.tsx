"use client";

import { cn } from "@ctrl-ui/react/lib/cn";
import { Button } from "@ctrl-ui/react/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@ctrl-ui/react/ui/empty";
import { PageLayout } from "@ctrl-ui/react/ui/page-layout";
import { SidebarFooter } from "@ctrl-ui/react/ui/sidebar";
import { ArrowLeft } from "@phosphor-icons/react";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { type ComponentProps, use, useState } from "react";
import { OrgNotFound } from "@/features/dashboard/components/org-not-found";
import { SectionPanel } from "@/features/dashboard/components/section-panel";
import {
  AdminConversationView,
  SelectConversationPrompt,
} from "@/features/inbox/components/conversation/admin-conversation-view";
import { InboxListPane } from "@/features/inbox/components/list/inbox-list-pane";
import { InboxPanelSkeleton } from "@/features/inbox/components/list/inbox-panel-skeleton";
import { NewEmailDialog } from "@/features/inbox/components/list/new-email-dialog";
import { PublicPageControl } from "@/features/inbox/components/public-page-control";
import { ShortcutHintBar } from "@/features/inbox/components/shortcut-hint-bar";
import { useInbox } from "@/features/inbox/hooks/use-inbox";
import { acceptsReplies } from "@/features/support/lib/conversation-status";
import { SendingPausedAlert } from "@/features/support-email/components/sending-paused-alert";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
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
      <>
        <InboxPanelSkeleton />
        <p className="sr-only" role="status">
          Loading inbox…
        </p>
      </>
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
    <PageLayout width="full">
      <h1 className="sr-only">Inbox</h1>
      {inbox.outboundStatus?.composeBlocker === "paused" && (
        <div className="p-3">
          <SendingPausedAlert reason={inbox.outboundStatus.pauseReason} />
        </div>
      )}
      <InboxPanes actions={actions} inbox={inbox} org={org} />
      <ShortcutHintBar
        canActOnSelection={
          inbox.selectedConversation
            ? acceptsReplies(inbox.selectedConversation.status)
            : false
        }
        visible={showHints}
      />
    </PageLayout>
  );
}

function InboxPanes({
  actions,
  inbox,
  org,
}: {
  actions: ReturnType<typeof useInboxActions>;
  inbox: InboxState;
  org: { _id: Id<"organizations">; slug: string };
}) {
  const [mobilePane, setMobilePane] = useState<"list" | "conversation">("list");

  return (
    <div className="flex min-h-0 flex-1">
      <SectionPanel
        className={cn(mobilePane === "list" && "max-lg:flex max-lg:w-full")}
        title="Inbox"
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
          newEmail={
            <NewEmailDialog
              composeBlocker={inbox.outboundStatus?.composeBlocker}
              onStart={(draft) =>
                actions.startEmailConversation(org._id, draft)
              }
              orgSlug={org.slug}
            />
          }
          search={{ onChange: inbox.setSearchQuery, query: inbox.searchQuery }}
          views={{ current: inbox.view, onChange: inbox.setView }}
        />
        <SidebarFooter className="p-3">
          <InboxCount inbox={inbox} />
          <SupportPageToggle inbox={inbox} org={org} />
        </SidebarFooter>
      </SectionPanel>
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

function SupportPageToggle({
  inbox,
  org,
}: {
  inbox: InboxState;
  org: { _id: Id<"organizations">; slug: string };
}) {
  const support = useSupportToggle(inbox, org._id);
  return (
    <PublicPageControl
      onToggle={support.toggleSupport}
      publicHref={`/${org.slug}/support`}
      setting={{
        enabled: inbox.supportEnabled ?? false,
        isSaving: support.isSaving,
      }}
    />
  );
}

function InboxCount({ inbox }: { inbox: InboxState }) {
  const count = inbox.conversations?.length;
  return (
    <p className="sr-only" role="status">
      {count === undefined
        ? ""
        : `${count} ${count === 1 ? "conversation" : "conversations"}`}
    </p>
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
        mobile.isVisible ? "flex" : "hidden lg:flex"
      )}
    >
      <div className="p-2 lg:hidden">
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
