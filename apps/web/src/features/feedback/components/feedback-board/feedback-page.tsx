import {
  PageActions,
  PageBody,
  PageHeader,
  PageLayout,
  PageTitle,
} from "@ctrl-ui/react/ui/page-layout";
import type { ReactNode } from "react";
import type { BoardView } from "@/features/feedback/components/board-view-toggle";

export function FeedbackPage({
  actions,
  children,
  view = "feed",
}: {
  actions?: ReactNode;
  children: ReactNode;
  view?: BoardView;
}) {
  return (
    <PageLayout scroll="page" width={view === "feed" ? "content" : "wide"}>
      <PageHeader>
        <PageTitle>Feedback</PageTitle>
        <PageActions>{actions}</PageActions>
      </PageHeader>
      <PageBody>{children}</PageBody>
    </PageLayout>
  );
}
