"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@ctrl-ui/react/ui/dialog";
import { ShareNetwork } from "@phosphor-icons/react";
import type { FlowSurvey } from "@/features/surveys/components/flow/flow-model";
import { SharePanel } from "@/features/surveys/components/settings/share-panel";

export function ShareDialog({ survey }: { survey: FlowSurvey }) {
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="surface" />}>
        <ShareNetwork aria-hidden />
        Share
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Share survey</DialogTitle>
          <DialogDescription>
            Send a link or show it inside your app.
          </DialogDescription>
        </DialogHeader>
        <SharePanel survey={survey} />
      </DialogContent>
    </Dialog>
  );
}
