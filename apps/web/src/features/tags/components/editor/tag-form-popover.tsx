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

import type { EditableTag } from "@/features/tags/components/editor/form-state";
import { TagForm } from "@/features/tags/components/editor/tag-form";

interface TagFormPopoverProps {
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
    <PopoverContent
      align="start"
      className="max-h-(--available-height) w-72 overflow-y-auto p-3"
    >
      <TagForm
        actions={{ onCancel: () => onOpenChange(false), onSuccess }}
        key={editingTag?._id ?? "new"}
        layout="popover"
        target={{ editingTag, organizationId }}
      />
    </PopoverContent>
  );

  return (
    <Popover onOpenChange={onOpenChange} open={open}>
      {disableTriggerClick && trigger ? (
        <TagEditPopoverAnchor>{trigger}</TagEditPopoverAnchor>
      ) : (
        <PopoverTrigger
          render={
            <Button
              aria-label="Create tag"
              iconOnly
              size="xs"
              variant="ghost"
            />
          }
        >
          <Plus aria-hidden />
        </PopoverTrigger>
      )}
      {content}
    </Popover>
  );
}

function TagEditPopoverAnchor({ children }: { children: ReactNode }) {
  return (
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
        return <span {...rest}>{children}</span>;
      }}
    />
  );
}
