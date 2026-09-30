"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@ctrl-ui/react/ui/popover";
import { Plus } from "@phosphor-icons/react";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import type { HTMLAttributes, ReactNode, Ref } from "react";

import { type EditableTag, TagForm } from "./tag-form";

interface TagFormPopoverProps {
  /** Controlled externally (e.g. from a context menu): the trigger itself never opens the popover. */
  disableTriggerClick?: boolean;
  editingTag?: EditableTag | null;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  open: boolean;
  organizationId: Id<"organizations">;
  trigger?: ReactNode;
}

export function TagFormPopover({
  organizationId,
  editingTag,
  open,
  onOpenChange,
  onSuccess,
  trigger,
  disableTriggerClick = false,
}: TagFormPopoverProps) {
  const content = (
    <PopoverContent align="start" className="w-72 p-3">
      <TagForm
        editingTag={editingTag}
        key={editingTag?._id ?? "new"}
        layout="popover"
        onCancel={() => onOpenChange(false)}
        onSuccess={onSuccess}
        organizationId={organizationId}
      />
    </PopoverContent>
  );

  if (disableTriggerClick && trigger) {
    return (
      <Popover onOpenChange={onOpenChange} open={open}>
        <PopoverTrigger
          nativeButton={false}
          render={(
            props: HTMLAttributes<HTMLElement> & { ref?: Ref<HTMLElement> }
          ) => {
            const {
              onClick: _click,
              onKeyDown: _keyDown,
              role: _role,
              tabIndex: _tabIndex,
              ...rest
            } = props;
            return <span {...rest}>{trigger}</span>;
          }}
        />
        {content}
      </Popover>
    );
  }

  return (
    <Popover onOpenChange={onOpenChange} open={open}>
      <PopoverTrigger
        render={
          <Button aria-label="Create tag" iconOnly size="xs" variant="ghost" />
        }
      >
        <Plus aria-hidden />
      </PopoverTrigger>
      {content}
    </Popover>
  );
}
