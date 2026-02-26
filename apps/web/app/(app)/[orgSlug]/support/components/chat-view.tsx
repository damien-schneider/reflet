import { ArrowLeft } from "@phosphor-icons/react";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ConversationStatusBadge } from "@/features/inbox/components/conversation-status-badge";
import { MessageInput } from "@/features/inbox/components/message-input";
import { MessageList } from "@/features/inbox/components/message-list";

interface MessageSender {
  id?: string;
  name?: string;
  email?: string;
  image?: string;
}

interface Message {
  _id: Id<"supportMessages">;
  senderId: string;
  senderType: "user" | "admin";
  body: string;
  isRead: boolean;
  createdAt: number;
  sender?: MessageSender;
  isOwnMessage: boolean;
}

interface ChatViewProps {
  conversation: {
    _id: Id<"supportConversations">;
    subject?: string | null;
    status: string;
  };
  isLoadingMessages: boolean;
  messages: Message[];
  onBack: () => void;
  onNewConversation: () => void;
  onSendMessage: (body: string) => void;
}

export function ChatView({
  conversation,
  isLoadingMessages,
  messages,
  onBack,
  onNewConversation,
  onSendMessage,
}: ChatViewProps) {
  const isDisabled =
    conversation.status === "closed" || conversation.status === "resolved";

  return (
    <Card className="flex h-[600px] flex-col overflow-hidden">
      <CardHeader className="shrink-0 border-b">
        <div className="flex items-center gap-2">
          <Button onClick={onBack} size="icon" variant="ghost">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <CardTitle>
              {conversation.subject ?? "Support Conversation"}
            </CardTitle>
            <CardDescription>Conversation with support team</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <ConversationStatusBadge status={conversation.status} />
            <Button onClick={onNewConversation} size="sm" variant="outline">
              New
            </Button>
          </div>
        </div>
      </CardHeader>
      <div className="flex min-h-0 flex-1 flex-col">
        <MessageList isLoading={isLoadingMessages} messages={messages} />
        <MessageInput
          disabled={isDisabled}
          onSend={onSendMessage}
          placeholder="Type your message..."
        />
      </div>
    </Card>
  );
}
