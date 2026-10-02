import {
  AppShell,
  AppShellContent,
  AppShellHeader,
} from "@ctrl-ui/react/ui/app-shell";
import { Button } from "@ctrl-ui/react/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@ctrl-ui/react/ui/sidebar";
import { Chat } from "@phosphor-icons/react";
import { useState } from "react";
import { createRoot } from "react-dom/client";
import {
  type BoardView,
  BoardViewToggle,
} from "@/features/feedback/components/board-view-toggle";
import {
  LoadingState,
  PrivateOrgMessage,
} from "@/features/feedback/components/feedback-board/board-states";
import { FeedbackPage } from "@/features/feedback/components/feedback-board/feedback-page";

const parameters = new URLSearchParams(location.search);

function FeedbackStates() {
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<BoardView>("feed");
  return (
    <>
      <div className="fixed right-4 bottom-4 z-50">
        <Button onClick={() => setLoading(!loading)}>Toggle loading</Button>
      </div>
      {loading ? (
        <LoadingState view={view} />
      ) : (
        <FeedbackPage
          actions={
            <BoardViewToggle
              className="hidden md:flex"
              onChange={setView}
              size="sm"
              view={view}
            />
          }
          view={view}
        >
          <article className="rounded-xl border bg-card p-4">
            Loaded feedback
          </article>
        </FeedbackPage>
      )}
    </>
  );
}

function Fixture() {
  const content = parameters.has("private") ? (
    <PrivateOrgMessage />
  ) : (
    <FeedbackStates />
  );
  if (parameters.has("public")) {
    return <main>{content}</main>;
  }
  return (
    <AppShell
      defaultOpen={parameters.get("collapsed") !== "true"}
      persistOpen={false}
      scroll="page"
    >
      <Sidebar collapsible="icon">
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton>
                <Chat />
                <span>Feedback</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
      <AppShellContent>
        <AppShellHeader>
          <SidebarTrigger />
        </AppShellHeader>
        {content}
      </AppShellContent>
    </AppShell>
  );
}

const root = document.getElementById("root");
if (!root) {
  throw new Error("Missing fixture root");
}
createRoot(root).render(<Fixture />);
