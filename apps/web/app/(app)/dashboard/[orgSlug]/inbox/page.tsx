"use client";

import { ArrowLeft, EyeSlash } from "@phosphor-icons/react";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { use, useRef, useState } from "react";
import { Alert, AlertAction, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { H2, Muted } from "@/components/ui/typography";
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
import type { ConversationStatus } from "@/features/support/lib/conversation-status";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { cn } from "@/lib/utils";

function CenteredNotice({ body, title }: { body: string; title: string }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="text-center">
        <H2 variant="card">{title}</H2>
        <Muted className="mt-2">{body}</Muted>
      </div>
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

  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [showHints, setShowHints] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [mobilePane, setMobilePane] = useState<"list" | "conversation">("list");

  const searchInputRef = useRef<HTMLInputElement>(null);
  const replyRef = useRef<HTMLTextAreaElement>(null);

  const {
    conversations,
    isAdmin,
    members,
    messages,
    org,
    searchQuery,
    selectedConversation,
    selectedId,
    supportEnabled,
    viewerId,
    write,
  } = inbox;

  const changeStatus = async (status: ConversationStatus) => {
    if (selectedId) {
      await write.updateStatus({ id: selectedId, status });
    }
  };

  const toggleSupport = async (enabled: boolean) => {
    if (!org?._id) {
      return;
    }
    setIsSavingSettings(true);
    try {
      await write.updateSupportSettings({
        organizationId: org._id,
        supportEnabled: enabled,
      });
    } finally {
      setIsSavingSettings(false);
    }
  };

  const moveSelection = (offset: number) => {
    if (!conversations || conversations.length === 0) {
      return;
    }
    const current = conversations.findIndex((c) => c._id === selectedId);
    const next = Math.max(
      0,
      Math.min(current + offset, conversations.length - 1)
    );
    inbox.setSelectedId(conversations[next]._id);
  };

  useKeyboardShortcuts(
    {
      "/": () => searchInputRef.current?.focus(),
      c: () => changeStatus("closed"),
      e: () => changeStatus("resolved"),
      j: () => moveSelection(1),
      k: () => moveSelection(-1),
      "meta+k": () => setCommandPaletteOpen(true),
      r: () => replyRef.current?.focus(),
      "shift+/": () => setShowHints((prev) => !prev),
    },
    { enabled: isAdmin === true }
  );

  if (org === undefined || isAdmin === undefined) {
    return <CenteredNotice body="Loading your inbox…" title="Inbox" />;
  }

  if (org === null) {
    return (
      <CenteredNotice
        body="The organization you're looking for doesn't exist."
        title="Organization not found"
      />
    );
  }

  if (!isAdmin) {
    return (
      <CenteredNotice
        body="You don't have permission to access the inbox."
        title="Access denied"
      />
    );
  }

  const quickStatusChange = (
    id: Id<"supportConversations">,
    status: ConversationStatus
  ) => write.updateStatus({ id, status });
  const hasConversations = (conversations?.length ?? 0) > 0;

  return (
    <div className="flex h-full flex-col">
      <InboxFilterBar
        onSearchChange={inbox.setSearchQuery}
        onToggleStatusFilter={inbox.toggleStatusFilter}
        searchInputRef={searchInputRef}
        searchQuery={searchQuery}
        statusFilter={inbox.statusFilter}
      >
        <SettingsPopover
          isSaving={isSavingSettings}
          onToggle={toggleSupport}
          supportEnabled={supportEnabled ?? false}
        />
      </InboxFilterBar>

      {supportEnabled === false && (
        <Alert className="mx-4 mt-3 w-auto">
          <EyeSlash className="h-4 w-4" />
          <AlertTitle>Inbox is private</AlertTitle>
          <AlertAction>
            <Button
              onClick={() => toggleSupport(true)}
              size="sm"
              variant="outline"
            >
              Make public
            </Button>
          </AlertAction>
        </Alert>
      )}

      <div className="flex flex-1 overflow-hidden">
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
            isAdmin
            onSelect={(conversation) => {
              inbox.setSelectedId(conversation._id);
              setMobilePane("conversation");
            }}
            quickActions={{
              onAssign: (id) =>
                viewerId
                  ? write.assignConversation({ assignedTo: viewerId, id })
                  : undefined,
              onClose: (id) => quickStatusChange(id, "closed"),
              onResolve: (id) => quickStatusChange(id, "resolved"),
            }}
            selectedId={selectedId ?? undefined}
          />
        </div>

        {hasConversations && (
          <div
            className={cn(
              "flex-1 flex-col",
              mobilePane === "conversation" ? "flex" : "hidden md:flex"
            )}
          >
            <div className="border-b p-2 md:hidden">
              <Button onClick={() => setMobilePane("list")} variant="ghost">
                <ArrowLeft className="size-4" />
                Conversations
              </Button>
            </div>
            {selectedConversation ? (
              <AdminConversationView
                actions={{
                  onAssign: async (memberId) => {
                    await write.assignConversation({
                      assignedTo: memberId,
                      id: selectedConversation._id,
                    });
                  },
                  onSendMessage: async (body) => {
                    await write.sendMessage({
                      body,
                      conversationId: selectedConversation._id,
                    });
                  },
                  onStatusChange: changeStatus,
                }}
                conversation={selectedConversation}
                messages={messages}
                replyRef={replyRef}
                teamMembers={members}
              />
            ) : (
              <EmptyConversationState hasConversations />
            )}
          </div>
        )}
      </div>

      <ShortcutHintBar
        hasSelectedConversation={selectedId !== null}
        visible={showHints}
      />

      <InboxCommandPalette
        hasSelectedConversation={selectedId !== null}
        onClose={() => changeStatus("closed")}
        onOpenChange={setCommandPaletteOpen}
        onResolve={() => changeStatus("resolved")}
        onToggleSupport={() => toggleSupport(!supportEnabled)}
        open={commandPaletteOpen}
        supportEnabled={supportEnabled ?? false}
      />
    </div>
  );
}
