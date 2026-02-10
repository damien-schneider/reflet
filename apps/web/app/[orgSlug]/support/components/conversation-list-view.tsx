import { ChatCircle, PaperPlaneRight } from "@phosphor-icons/react";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ConversationStatusBadge } from "@/features/inbox/components/conversation-status-badge";

interface Conversation {
  _id: Id<"supportConversations">;
  subject?: string | null;
  status: string;
  lastMessageAt: number;
  userUnreadCount: number;
}

interface ConversationListViewProps {
  conversations: Conversation[];
  onSelectConversation: (id: Id<"supportConversations">) => void;
  onNewConversation: () => void;
}

export function ConversationListView({
  conversations,
  onSelectConversation,
  onNewConversation,
}: ConversationListViewProps) {
  const hasConversations = conversations.length > 0;

  return (
    <Card className="flex h-[600px] flex-col">
      <CardHeader className="shrink-0 border-b">
        <div className="flex items-center justify-between">
          <CardTitle>Conversations</CardTitle>
          <Button onClick={onNewConversation} size="sm">
            <PaperPlaneRight className="h-4 w-4" />
            New conversation
          </Button>
        </div>
        <CardDescription>
          {hasConversations
            ? "Select a conversation to continue chatting"
            : "No conversations yet"}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1">
        {hasConversations ? (
          <ScrollArea className="h-full">
            <div className="flex flex-col gap-2">
              {conversations.map((conv) => (
                <button
                  className="flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted"
                  key={conv._id}
                  onClick={() => onSelectConversation(conv._id)}
                  type="button"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                    <ChatCircle className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex flex-1 flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">
                        {conv.subject || "Conversation"}
                      </span>
                      <ConversationStatusBadge status={conv.status} />
                    </div>
                    <span className="text-muted-foreground text-xs">
                      {new Date(conv.lastMessageAt).toLocaleDateString(
                        undefined,
                        {
                          month: "short",
                          day: "numeric",
                        }
                      )}
                    </span>
                  </div>
                  {conv.userUnreadCount > 0 && (
                    <div className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-olive-500 px-1.5 font-medium text-[10px] text-white">
                      {conv.userUnreadCount}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex h-full flex-col items-center justify-center">
            <ChatCircle className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 font-semibold text-lg">No conversations yet</h3>
            <p className="mb-4 text-center text-muted-foreground">
              Start a conversation to get help from our support team.
            </p>
            <Button onClick={onNewConversation}>
              <PaperPlaneRight className="h-4 w-4" />
              Start conversation
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
