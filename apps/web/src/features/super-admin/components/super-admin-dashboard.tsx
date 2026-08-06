"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { H1 } from "@/components/ui/typography";
import { SuperAdminFeedback } from "./super-admin-feedback";
import { SuperAdminOrganizations } from "./super-admin-organizations";
import { SuperAdminOverview } from "./super-admin-overview";
import { SuperAdminUsers } from "./super-admin-users";

export function SuperAdminDashboard() {
  return (
    <div className="space-y-6 p-6">
      <H1 variant="page">Super Admin</H1>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="organizations">Organizations</TabsTrigger>
          <TabsTrigger value="feedback">Feedback</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <SuperAdminOverview />
        </TabsContent>

        <TabsContent value="users">
          <SuperAdminUsers />
        </TabsContent>

        <TabsContent value="organizations">
          <SuperAdminOrganizations />
        </TabsContent>

        <TabsContent value="feedback">
          <SuperAdminFeedback />
        </TabsContent>
      </Tabs>
    </div>
  );
}
