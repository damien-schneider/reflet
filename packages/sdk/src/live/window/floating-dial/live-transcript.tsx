import { cn } from "@ctrl-ui/react/lib/cn";
import { Button } from "@ctrl-ui/react/ui/button";
import { ScrollArea } from "@ctrl-ui/react/ui/scroll-area";
import { Spinner } from "@ctrl-ui/react/ui/spinner";
import { Text } from "@ctrl-ui/react/ui/typography";
import { type UIEvent, useLayoutEffect, useRef, useState } from "react";
import { ChevronDownIcon } from "../../../feedback/ui/icons";
import { describePlace, type LiveHubEntry } from "../../protocol";
import { RevealedWords } from "./revealed-words";

const STUCK_WITHIN_PX = 4;
const COMPACT_HEIGHT = "4lh";

function useStuckToBottom() {
  const viewportRef = useRef<HTMLDivElement>(null);
  const isStuck = useRef(true);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (viewport && isStuck.current) {
      viewport.scrollTop = viewport.scrollHeight;
    }
  });

  const onScroll = ({ currentTarget }: UIEvent<HTMLDivElement>) => {
    const { clientHeight, scrollHeight, scrollTop } = currentTarget;
    isStuck.current =
      scrollHeight - scrollTop - clientHeight <= STUCK_WITHIN_PX;
  };

  return { onScroll, viewportRef };
}

function detailText(line: string): string {
  const detail = line.trim();
  return detail.startsWith("- ") ? detail.slice(2) : detail;
}

function Passage({
  entry,
  isExpanded,
  isNew,
  opensPlace,
}: {
  entry: LiveHubEntry;
  isExpanded: boolean;
  isNew: boolean;
  opensPlace: boolean;
}) {
  const [said = "", ...details] = entry.lines;
  const place = describePlace(entry.place);
  return (
    <li className="flex flex-col gap-0.5">
      {isExpanded && opensPlace && (
        <Text
          className="truncate"
          size="caption"
          title={place}
          tone="muted"
          weight="medium"
        >
          {place}
        </Text>
      )}
      <Text size="caption">
        <RevealedWords isNew={isNew} text={said} />
      </Text>
      {isExpanded && details.length > 0 && (
        <ul className="flex flex-col gap-0.5 border-border border-s ps-2">
          {details.map((line) => (
            <Text
              as="li"
              className="line-clamp-2"
              key={line}
              size="caption"
              title={detailText(line)}
              tone="muted"
            >
              {detailText(line)}
            </Text>
          ))}
        </ul>
      )}
    </li>
  );
}

function opensPlaceAt(entries: LiveHubEntry[], index: number): boolean {
  const previous = index > 0 ? entries[index - 1] : undefined;
  return (
    !previous ||
    describePlace(previous.place) !== describePlace(entries[index].place)
  );
}

export function TranscriptToggle({
  isExpanded,
  onToggle,
}: {
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <Button
      aria-expanded={isExpanded}
      aria-label="Full transcript"
      className="-my-1 shrink-0"
      iconOnly
      onClick={onToggle}
      size="xs"
      variant="ghost"
    >
      <span
        className={cn(
          "flex transition-[rotate] duration-200 ease-(--ease-emphasized)",
          !isExpanded && "rotate-180"
        )}
      >
        <ChevronDownIcon />
      </span>
    </Button>
  );
}

export function LiveTranscript({
  entries,
  isExpanded,
  isTranscribing,
  onExpand,
}: {
  entries: LiveHubEntry[];
  isExpanded: boolean;
  isTranscribing: boolean;
  onExpand: () => void;
}) {
  const [settledIds] = useState(() => new Set(entries.map(({ id }) => id)));
  const { onScroll, viewportRef } = useStuckToBottom();
  if (entries.length === 0) {
    return null;
  }
  return (
    <ScrollArea
      aria-label="Transcript"
      className={cn(
        "min-h-0 w-full text-start text-caption",
        isExpanded && "flex-1"
      )}
      maxHeight={isExpanded ? undefined : COMPACT_HEIGHT}
      viewportProps={{ onClick: isExpanded ? undefined : onExpand, onScroll }}
      viewportRef={viewportRef}
    >
      <ol className="flex flex-col gap-1.5">
        {entries.map((entry, index) => (
          <Passage
            entry={entry}
            isExpanded={isExpanded}
            isNew={!settledIds.has(entry.id)}
            key={entry.id}
            opensPlace={opensPlaceAt(entries, index)}
          />
        ))}
      </ol>
      {isTranscribing && <Spinner label="Transcribing" size="xs" />}
    </ScrollArea>
  );
}
