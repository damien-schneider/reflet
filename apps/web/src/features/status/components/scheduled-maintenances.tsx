"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import { toast } from "@ctrl-ui/react/ui/toast";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { MaintenanceList } from "./maintenance-list";

export function ScheduledMaintenances({
  organizationId,
}: {
  organizationId: Id<"organizations">;
}) {
  const maintenances = useQuery(api.status.maintenances.listMaintenances, {
    organizationId,
  });
  const cancelMaintenance = useMutation(
    api.status.maintenances.cancelMaintenance
  );

  const handleCancel = async (maintenanceId: Id<"statusMaintenances">) => {
    try {
      await cancelMaintenance({ maintenanceId });
    } catch {
      toast.error("Couldn’t update the maintenance. Try again.");
    }
  };

  return (
    <MaintenanceList
      maintenances={maintenances ?? []}
      renderAction={(maintenance) => (
        <Button
          onClick={() => handleCancel(maintenance._id)}
          size="sm"
          variant="surface"
        >
          {maintenance.isActive ? "End now" : "Cancel"}
        </Button>
      )}
    />
  );
}
