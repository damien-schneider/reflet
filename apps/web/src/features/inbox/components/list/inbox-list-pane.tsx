"use client";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@ctrl-ui/react/ui/empty";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@ctrl-ui/react/ui/input-group";
import { Skeleton } from "@ctrl-ui/react/ui/skeleton";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@ctrl-ui/react/ui/tabs";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { type ComponentProps, useRef } from "react";
import { InboxConversationList } from "@/features/inbox/components/list/inbox-conversation-list";
import type { InboxConversation } from "@/features/inbox/hooks/use-inbox";
import { INBOX_VIEWS, type InboxView } from "@/features/inbox/lib/inbox-views";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";

type ListProps = ComponentProps<typeof InboxConversationList>;

interface InboxListPaneProps {
  list: Omit<ListProps, "conversations"> & {
    conversations: InboxConversation[] | undefined;
  };
  search: { onChange: (query: string) => void; query: string };
  views: { current: InboxView; onChange: (view: InboxView) => void };
}

export function InboxListPane({ list, search, views }: InboxListPaneProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);
  useKeyboardShortcuts({ "/": () => searchInputRef.current?.focus() });

  return (
    <Tabs<InboxView>
      className="flex h-full min-h-0 flex-col"
      onValueChange={views.onChange}
      value={views.current}
    >
      <div className="flex flex-col gap-2 border-b p-3">
        <TabsList aria-label="Conversation views" size="sm">
          {INBOX_VIEWS.map((view) => (
            <TabsTab key={view.id} value={view.id}>
              {view.label}
            </TabsTab>
          ))}
        </TabsList>
        <InputGroup size="sm">
          <InputGroupAddon>
            <MagnifyingGlass
              aria-hidden
              className="size-4 text-muted-foreground"
            />
          </InputGroupAddon>
          <InputGroupInput
            aria-keyshortcuts="/"
            aria-label="Search conversations"
            autoComplete="off"
            onChange={(event) => search.onChange(event.target.value)}
            placeholder="Search name, email, subject…"
            ref={searchInputRef}
            spellCheck={false}
            type="search"
            value={search.query}
          />
        </InputGroup>
      </div>
      <TabsPanel
        className="min-h-0 flex-1 overflow-y-auto"
        value={views.current}
      >
        <ListBody list={list} search={search} views={views} />
      </TabsPanel>
    </Tabs>
  );
}

function ListBody({ list, search, views }: InboxListPaneProps) {
  const { conversations, ...listProps } = list;

  if (conversations === undefined) {
    return (
      <div className="flex flex-col gap-2 p-3" role="status">
        <span className="sr-only">Loading conversations…</span>
        <Skeleton aria-hidden className="h-16 w-full" />
        <Skeleton aria-hidden className="h-16 w-full" />
        <Skeleton aria-hidden className="h-16 w-full" />
      </div>
    );
  }

  if (conversations.length === 0) {
    const trimmedQuery = search.query.trim();
    const view = INBOX_VIEWS.find((entry) => entry.id === views.current);
    return (
      <Empty className="m-3 py-10">
        <EmptyHeader>
          <EmptyTitle>
            {trimmedQuery ? "No matches" : view?.empty.title}
          </EmptyTitle>
          <EmptyDescription>
            {trimmedQuery
              ? `Nothing in ${view?.label ?? "this view"} matches “${trimmedQuery}”.`
              : view?.empty.description}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return <InboxConversationList conversations={conversations} {...listProps} />;
}
