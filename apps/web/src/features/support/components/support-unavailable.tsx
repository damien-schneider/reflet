import { ButtonLink } from "@ctrl-ui/react/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@ctrl-ui/react/ui/empty";
import { PageBody, PageLayout } from "@ctrl-ui/react/ui/page-layout";
import { ChatCircle } from "@phosphor-icons/react";

interface SupportNoticeProps {
  action?: { href: string; label: string };
  description: string;
  title: string;
}

function SupportNotice({ action, description, title }: SupportNoticeProps) {
  return (
    <PageLayout scroll="page" width="prose">
      <PageBody>
        <Empty>
          <EmptyHeader>
            <EmptyMedia>
              <ChatCircle aria-hidden />
            </EmptyMedia>
            <EmptyTitle>
              <h1>{title}</h1>
            </EmptyTitle>
            <EmptyDescription>{description}</EmptyDescription>
          </EmptyHeader>
          {action && (
            <EmptyContent>
              <ButtonLink href={action.href} variant="surface">
                {action.label}
              </ButtonLink>
            </EmptyContent>
          )}
        </Empty>
      </PageBody>
    </PageLayout>
  );
}

export function SupportUnavailable({ backHref }: { backHref: string }) {
  return (
    <SupportNotice
      action={{ href: backHref, label: "Back to the board" }}
      description="This organization hasn’t turned on support messaging."
      title="Support unavailable"
    />
  );
}
