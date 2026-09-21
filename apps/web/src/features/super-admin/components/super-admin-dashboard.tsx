"use client";

import {
  PageBody,
  PageHeader,
  PageLayout,
  PageTitle,
} from "@ctrl-ui/react/ui/page-layout";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@ctrl-ui/react/ui/tabs";
import { SuperAdminFeedback } from "./super-admin-feedback";
import { SuperAdminOrganizations } from "./super-admin-organizations";
import { SuperAdminOverview } from "./super-admin-overview";
import { SuperAdminUsers } from "./super-admin-users";

export function SuperAdminDashboard() {
  return (
    <PageLayout scroll="page" width="wide">
      <PageHeader>
        <PageTitle>Super Admin</PageTitle>
      </PageHeader>
      <PageBody contentClassName="space-y-6">
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTab value="overview">Overview</TabsTab>
            <TabsTab value="users">Users</TabsTab>
            <TabsTab value="organizations">Organizations</TabsTab>
            <TabsTab value="feedback">Feedback</TabsTab>
          </TabsList>

          <TabsPanel value="overview">
            <SuperAdminOverview />
          </TabsPanel>

          <TabsPanel value="users">
            <SuperAdminUsers />
          </TabsPanel>

          <TabsPanel value="organizations">
            <SuperAdminOrganizations />
          </TabsPanel>

          <TabsPanel value="feedback">
            <SuperAdminFeedback />
          </TabsPanel>
        </Tabs>
      </PageBody>
    </PageLayout>
  );
}
