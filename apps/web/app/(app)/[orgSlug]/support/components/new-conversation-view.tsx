import { ArrowLeft, PaperPlaneRight } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface NewConversationViewProps {
  hasExistingConversations: boolean;
  isSubmitting: boolean;
  newSubject: string;
  newMessage: string;
  onBack: () => void;
  onSubjectChange: (value: string) => void;
  onMessageChange: (value: string) => void;
  onSubmit: () => void;
}

export function NewConversationView({
  hasExistingConversations,
  isSubmitting,
  newSubject,
  newMessage,
  onBack,
  onSubjectChange,
  onMessageChange,
  onSubmit,
}: NewConversationViewProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>New conversation</CardTitle>
          {hasExistingConversations && (
            <Button onClick={onBack} size="sm" variant="ghost">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          )}
        </div>
        <CardDescription>
          Start a new support conversation. We&apos;ll get back to you as soon
          as possible.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="subject">Subject (optional)</Label>
          <Input
            disabled={isSubmitting}
            id="subject"
            onChange={(e) => onSubjectChange(e.target.value)}
            placeholder="What's this about?"
            value={newSubject}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="message">Message</Label>
          <Textarea
            className="min-h-32"
            disabled={isSubmitting}
            id="message"
            onChange={(e) => onMessageChange(e.target.value)}
            placeholder="Describe your issue or question..."
            value={newMessage}
          />
        </div>
        <Button
          className="w-full"
          disabled={!newMessage.trim() || isSubmitting}
          onClick={onSubmit}
        >
          <PaperPlaneRight className="h-4 w-4" weight="fill" />
          Send message
        </Button>
      </CardContent>
    </Card>
  );
}
