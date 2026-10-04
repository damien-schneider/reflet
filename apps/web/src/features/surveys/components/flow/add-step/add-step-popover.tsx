"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@ctrl-ui/react/ui/popover";
import { type ReactElement, type ReactNode, useState } from "react";
import { AddStepPicker } from "@/features/surveys/components/flow/add-step/add-step-picker";
import { useSelectFlowStep } from "@/features/surveys/components/flow/flow-context";
import type { InsertAnchor } from "@/features/surveys/components/flow/use-flow-actions";

interface AddStepPopoverProps {
  anchor: InsertAnchor;
  children: ReactNode;
  trigger: ReactElement;
}

export function AddStepPopover({
  anchor,
  children,
  trigger,
}: AddStepPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectStep = useSelectFlowStep();

  return (
    <Popover onOpenChange={setIsOpen} open={isOpen}>
      <PopoverTrigger render={trigger}>{children}</PopoverTrigger>
      <PopoverContent
        className="w-auto rounded-3xl p-4"
        padding="none"
        sideOffset={10}
      >
        <AddStepPicker
          anchor={anchor}
          onInserted={(questionId) => {
            setIsOpen(false);
            selectStep({ kind: "question", questionId }, { reveal: true });
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
