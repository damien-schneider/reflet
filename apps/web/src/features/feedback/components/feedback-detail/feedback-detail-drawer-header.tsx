"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import { Kbd, KbdGroup } from "@ctrl-ui/react/ui/kbd";
import {
  SheetClose,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@ctrl-ui/react/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ctrl-ui/react/ui/tooltip";
import { CaretLeft, CaretRight, X } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { CommentAvatar, CommentTimestamp } from "./comment-meta";

interface DrawerAuthor {
  image?: string | null;
  name?: string | null;
}

interface DrawerNavigationProps {
  currentIndex: number;
  hasNext: boolean;
  hasPrevious: boolean;
  onNext?: () => void;
  onPrevious?: () => void;
  total: number;
}

interface FeedbackDetailDrawerHeaderProps extends DrawerNavigationProps {
  author?: DrawerAuthor | null;
  createdAt?: number;
  showNavigation: boolean;
  title?: string;
}

interface DrawerNavigationButtonProps {
  ariaLabel: string;
  disabled: boolean;
  icon: ReactNode;
  keys: [string, string];
  label: string;
  onClick?: () => void;
}

function DrawerNavigationButton({
  ariaLabel,
  disabled,
  icon,
  keys,
  label,
  onClick,
}: DrawerNavigationButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        aria-label={ariaLabel}
        render={
          <Button
            disabled={disabled}
            iconOnly
            onClick={onClick}
            size="xs"
            variant="ghost"
          />
        }
      >
        {icon}
      </TooltipTrigger>
      <TooltipContent>
        {label}{" "}
        <KbdGroup>
          <Kbd>{keys[0]}</Kbd>
          <Kbd>{keys[1]}</Kbd>
        </KbdGroup>
      </TooltipContent>
    </Tooltip>
  );
}

function DrawerNavigation({
  currentIndex,
  hasNext,
  hasPrevious,
  onNext,
  onPrevious,
  total,
}: DrawerNavigationProps) {
  return (
    <>
      <DrawerNavigationButton
        ariaLabel="Previous feedback"
        disabled={!hasPrevious}
        icon={<CaretLeft className="h-4 w-4" />}
        keys={["K", "↑"]}
        label="Previous"
        onClick={onPrevious}
      />
      <span className="min-w-12 text-center text-muted-foreground text-xs tabular-nums">
        {currentIndex >= 0 ? currentIndex + 1 : "–"} / {total}
      </span>
      <DrawerNavigationButton
        ariaLabel="Next feedback"
        disabled={!hasNext}
        icon={<CaretRight className="h-4 w-4" />}
        keys={["J", "↓"]}
        label="Next"
        onClick={onNext}
      />
    </>
  );
}

function DrawerAuthorInfo({
  author,
  createdAt,
}: {
  author?: DrawerAuthor | null;
  createdAt?: number;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      {author && (
        <div className="flex min-w-0 items-center gap-1.5">
          <CommentAvatar
            image={author.image ?? undefined}
            isReply
            name={author.name ?? "?"}
          />
          <span className="truncate text-muted-foreground text-xs">
            <span className="sr-only">Posted by </span>
            {author.name ?? "Anonymous"}
          </span>
        </div>
      )}

      {createdAt && <CommentTimestamp createdAt={createdAt} />}
    </div>
  );
}

export function FeedbackDetailDrawerHeader({
  author,
  createdAt,
  showNavigation,
  title,
  ...navigation
}: FeedbackDetailDrawerHeaderProps) {
  return (
    <SheetHeader className="flex shrink-0 flex-row items-center justify-between gap-2 border-b px-4 py-3">
      <SheetTitle className="sr-only">{title ?? "Feedback"}</SheetTitle>
      <SheetDescription className="sr-only">
        View and manage feedback details
      </SheetDescription>

      <DrawerAuthorInfo author={author} createdAt={createdAt} />

      <div className="ml-auto flex items-center gap-1">
        {showNavigation && <DrawerNavigation {...navigation} />}
      </div>

      <SheetClose
        aria-label="Close"
        render={<Button iconOnly size="xs" variant="ghost" />}
      >
        <X className="h-4 w-4" />
      </SheetClose>
    </SheetHeader>
  );
}
