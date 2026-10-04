import { AppShellHeader } from "@ctrl-ui/react/ui/app-shell";
import { SidebarTrigger } from "@ctrl-ui/react/ui/sidebar";
import { SectionPanelHost } from "@/features/dashboard/components/section-panel";

export function isInboxRoute(pathname: string) {
  return pathname.split("/")[3] === "inbox";
}

export function isSurveyDetailRoute(pathname: string) {
  const [, , , section, surveyId] = pathname.split("/");
  return section === "surveys" && Boolean(surveyId);
}

export function DashboardMobileHeader({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShellHeader className="lg:hidden">
      <SidebarTrigger label="Open navigation" />
      <div className="flex min-w-0 flex-1 items-center">{children}</div>
    </AppShellHeader>
  );
}

export function DashboardWorkspace({
  children,
  panel,
}: {
  children: React.ReactNode;
  panel: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1">
      <SectionPanelHost>
        {panel}
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto bg-background lg:shadow-(--reflet-workspace-shadow)">
          {children}
        </div>
      </SectionPanelHost>
    </div>
  );
}
