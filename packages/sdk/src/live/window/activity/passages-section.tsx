import { Spinner } from "@ctrl-ui/react/ui/spinner";
import { Heading, Text } from "@ctrl-ui/react/ui/typography";
import { describePlace } from "../../protocol";
import type { HubActivity } from "../hub-link/use-hub-stream";

function transcribingLabel(count: number): string {
  return count === 1
    ? "Transcribing a passage…"
    : `Transcribing ${count} passages…`;
}

export function PassagesSection({ activity }: { activity: HubActivity }) {
  const { entries, transcribing } = activity;
  if (entries.length === 0 && transcribing === 0) {
    return null;
  }
  return (
    <section aria-labelledby="live-passages" className="flex flex-col gap-3">
      <Heading id="live-passages" level={2} size="heading-4">
        Last passages
      </Heading>
      <ol className="flex flex-col gap-3">
        {entries.map((entry) => (
          <li className="flex flex-col gap-0.5" key={entry.id}>
            <Text size="caption" tone="muted">
              {describePlace(entry.place)}
            </Text>
            <Text className="wrap-anywhere whitespace-pre-line">
              {entry.lines.join("\n")}
            </Text>
          </li>
        ))}
      </ol>
      {transcribing > 0 && (
        <span className="flex items-center gap-2">
          <Spinner aria-hidden="true" size="xs" />
          <Text size="caption" tone="muted">
            {transcribingLabel(transcribing)}
          </Text>
        </span>
      )}
    </section>
  );
}
