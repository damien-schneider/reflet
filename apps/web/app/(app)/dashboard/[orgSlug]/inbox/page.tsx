"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@ctrl-ui/react/ui/empty";
import { ArrowLeft, Globe } from "@phosphor-icons/react";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import {
  type ComponentProps,
  type RefObject,
  use,
  useRef,
  useState,
} from "react";
import { OrgNotFound } from "@/features/dashboard/components/org-not-found";
import {
  AdminConversationView,
  EmptyConversationState,
} from "@/features/inbox/components/admin-conversation-view";
import { InboxCommandPalette } from "@/features/inbox/components/inbox-command-palette";
import { InboxFilterBar } from "@/features/inbox/components/inbox-filter-bar";
import { SettingsPopover } from "@/features/inbox/components/settings-popover";
import { ShortcutHintBar } from "@/features/inbox/components/shortcut-hint-bar";
import { useInbox } from "@/features/inbox/hooks/use-inbox";
import { ConversationList } from "@/features/support/components/conversation-list";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { cn } from "@/lib/utils";
import {
  type InboxState,
  useInboxActions,
  useSupportToggle,
} from "./use-inbox-actions";

function InboxNotice({ body, title }: { body: string; title: string }) {
  return (
    <Empty className="min-h-[50vh]">
      <EmptyHeader>
        <EmptyTitle>
          <h1>{title}</h1>
        </EmptyTitle>
        <EmptyDescription>{body}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

function InboxLoading() {
  return (
    <div className="flex h-full">
      <ConversationList
        className="w-full border-r md:w-80 md:flex-none"
        conversations={undefined}
        isAdmin
        onSelect={() => undefined}
      />
    </div>
  );
}

function FilteredEmptyState({
  onClearFilters,
  searchQuery,
}: {
  onClearFilters: () => void;
  searchQuery: string;
}) {
  const trimmedQuery = searchQuery.trim();
  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>No matching conversations</EmptyTitle>
        <EmptyDescription>
          {trimmedQuery
            ? `Nothing matches “${trimmedQuery}” with these statuses.`
            : "Nothing has the selected statuses."}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button onClick={onClearFilters} variant="surface">
          Clear filters
        </Button>
      </EmptyContent>
    </Empty>
  );
}

type ConversationViewProps = ComponentProps<typeof AdminConversationView>;

function ConversationCountStatus({ count }: { count: number | undefined }) {
  const noun = count === 1 ? "conversation" : "conversations";
  return (
    <p className="sr-only" role="status">
      {count === undefined ? "" : `${count} ${noun}`}
    </p>
  );
}

function ConversationPane({
  conversation,
  isVisible,
  messages,
  onAssign,
  onBack,
  onSendMessage,
  onStatusChange,
  replyRef,
  teamMembers,
}: {
  conversation: ConversationViewProps["conversation"] | null | undefined;
  isVisible: boolean;
  messages: ConversationViewProps["messages"];
  onAssign: (
    id: Id<"supportConversations">,
    memberId: string | undefined
  ) => Promise<void>;
  onBack: () => void;
  onSendMessage: (
    conversationId: Id<"supportConversations">,
    body: string
  ) => Promise<void>;
  onStatusChange: ConversationViewProps["actions"]["onStatusChange"];
  replyRef: RefObject<HTMLTextAreaElement | null>;
  teamMembers: ConversationViewProps["teamMembers"];
}) {
  return (
    <div
      className={cn(
        "min-w-0 flex-1 flex-col",
        isVisible ? "flex" : "hidden md:flex"
      )}
    >
      <div className="border-b p-2 md:hidden">
        <Button onClick={onBack} variant="ghost">
          <ArrowLeft aria-hidden />
          All conversations
        </Button>
      </div>
      {conversation ? (
        <AdminConversationView
          actions={{
            onAssign: (memberId) => onAssign(conversation._id, memberId),
            onSendMessage: (body) => onSendMessage(conversation._id, body),
            onStatusChange,
          }}
          conversation={conversation}
          messages={messages}
          replyRef={replyRef}
          teamMembers={teamMembers}
        />
      ) : (
        <EmptyConversationState hasConversations />
      )}
    </div>
  );
}

export default function InboxPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);
  const inbox = useInbox(orgSlug);
  const { isAdmin, org } = inbox;

  if (org === undefined || (org !== null && isAdmin === undefined)) {
    return <InboxLoading />;
  }

  if (org === null) {
    return <OrgNotFound />;
  }

  if (!isAdmin) {
    return (
      <InboxNotice
        body="Only admins and owners can open the inbox. Ask an owner to change your role."
        title="No access to the inbox"
      />
    );
  }

  return <InboxWorkspace inbox={inbox} organizationId={org._id} />;
}

function InboxWorkspace({
  inbox,
  organizationId,
}: {
  inbox: InboxState;
  organizationId: Id<"organizations">;
}) {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [showHints, setShowHints] = useState(true);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const replyRef = useRef<HTMLTextAreaElement>(null);
  const actions = useInboxActions(inbox);
  const support = useSupportToggle(inbox, organizationId);
  const { changeStatus } = actions;
  const hasSelectedConversation = inbox.selectedId !== null;
  const supportEnabled = inbox.supportEnabled ?? false;

  useKeyboardShortcuts({
    "/": () => searchInputRef.current?.focus(),
    c: () => changeStatus("closed"),
    e: () => changeStatus("resolved"),
    j: () => actions.moveSelection(1),
    k: () => actions.moveSelection(-1),
    "meta+k": () => setCommandPaletteOpen(true),
    r: () => replyRef.current?.focus(),
    "shift+/": () => setShowHints((prev) => !prev),
  });

  return (
    <div className="flex h-full flex-col">
      <InboxFilterBar
        onSearchChange={inbox.setSearchQuery}
        onToggleStatusFilter={inbox.toggleStatusFilter}
        searchInputRef={searchInputRef}
        searchQuery={inbox.searchQuery}
        statusFilter={inbox.statusFilter}
      >
        {inbox.supportEnabled === false && (
          <MakePublicButton
            isSaving={support.isSaving}
            onClick={() => support.toggleSupport(true)}
          />
        )}
        <SettingsPopover
          isSaving={support.isSaving}
          onToggle={support.toggleSupport}
          supportEnabled={supportEnabled}
        />
      </InboxFilterBar>
      <ConversationCountStatus count={inbox.conversations?.length} />
      <InboxPanes actions={actions} inbox={inbox} replyRef={replyRef} />
      <ShortcutHintBar
        hasSelectedConversation={hasSelectedConversation}
        visible={showHints}
      />
      <InboxCommandPalette
        hasSelectedConversation={hasSelectedConversation}
        onClose={() => changeStatus("closed")}
        onOpenChange={setCommandPaletteOpen}
        onResolve={() => changeStatus("resolved")}
        onToggleSupport={() => support.toggleSupport(!inbox.supportEnabled)}
        open={commandPaletteOpen}
        supportEnabled={supportEnabled}
      />
    </div>
  );
}

function MakePublicButton({
  isSaving,
  onClick,
}: {
  isSaving: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      disabled={isSaving}
      onClick={onClick}
      tone="primary"
      variant="solid"
    >
      <Globe aria-hidden />
      {isSaving ? "Making public…" : "Make inbox public"}
    </Button>
  );
}

function InboxPanes({
  actions,
  inbox,
  replyRef,
}: {
  actions: ReturnType<typeof useInboxActions>;
  inbox: InboxState;
  replyRef: RefObject<HTMLTextAreaElement | null>;
}) {
  const [mobilePane, setMobilePane] = useState<"list" | "conversation">("list");
  const { conversations, searchQuery, selectedId, viewerId } = inbox;
  const hasConversations = (conversations?.length ?? 0) > 0;
  const isFiltering =
    searchQuery.trim() !== "" || inbox.statusFilter.length > 0;

  return (
    <div className="flex min-h-0 flex-1">
      <div
        className={cn(
          "w-full shrink-0 border-r md:block",
          hasConversations ? "md:w-80" : "md:w-full",
          mobilePane === "list" ? "block" : "hidden"
        )}
      >
        <ConversationList
          activeId={selectedId ?? undefined}
          conversations={conversations}
          emptyState={
            isFiltering ? (
              <FilteredEmptyState
                onClearFilters={inbox.clearFilters}
                searchQuery={searchQuery}
              />
            ) : undefined
          }
          isAdmin
          onSelect={(conversation) => {
            inbox.setSelectedId(conversation._id);
            setMobilePane("conversation");
          }}
          quickActions={{
            onAssign: (id) =>
              viewerId ? actions.assign(id, viewerId) : undefined,
            onClose: (id) => actions.updateStatus(id, "closed"),
            onResolve: (id) => actions.updateStatus(id, "resolved"),
          }}
          selectedId={selectedId ?? undefined}
        />
      </div>

      {hasConversations && (
        <ConversationPane
          conversation={inbox.selectedConversation}
          isVisible={mobilePane === "conversation"}
          messages={inbox.messages}
          onAssign={actions.assign}
          onBack={() => setMobilePane("list")}
          onSendMessage={async (conversationId, body) => {
            await inbox.write.sendMessage({ body, conversationId });
          }}
          onStatusChange={actions.changeStatus}
          replyRef={replyRef}
          teamMembers={inbox.members}
        />
      )}
    </div>
  );
}
