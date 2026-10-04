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
  search,
  view = "feed",
}: {
  actions?: ReactNode;
  children: ReactNode;
  search?: ReactNode;
  view?: BoardView;
}) {
  return (
    <PageLayout
      style={
        search
          ? { "--cui-page-layout-header-gap": "calc(var(--spacing) * 1)" }
          : undefined
      }
      width={view === "feed" ? "content" : "wide"}
    >
      <PageHeader>
        <PageTitle className="sr-only">Feedback</PageTitle>
        {search && <div className="[grid-area:title]">{search}</div>}
        <PageActions>{actions}</PageActions>
      </PageHeader>
      <PageBody>{children}</PageBody>
    </PageLayout>
  );
}
