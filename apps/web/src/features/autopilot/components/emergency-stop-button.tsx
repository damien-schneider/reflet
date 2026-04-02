"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import { IconPlayerStop } from "@tabler/icons-react";
import { useMutation } from "convex/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useAutopilotContext } from "./autopilot-context";

export function EmergencyStopButton() {
  const { organizationId } = useAutopilotContext();
  const stop = useMutation(api.autopilot.mutations.emergencyStop);

  const handleStop = async () => {
    try {
      await stop({ organizationId });
      toast.success("Autopilot stopped");
    } catch {
      toast.error("Failed to stop autopilot");
    }
  };

  return (
    <Button
      className="gap-2"
      onClick={handleStop}
      size="sm"
      variant="destructive"
    >
      <IconPlayerStop className="size-4" />
      Stop All
    </Button>
  );
}
