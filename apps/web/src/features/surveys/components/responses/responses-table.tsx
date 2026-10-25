import { Badge } from "@ctrl-ui/react/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableRowLink,
} from "@ctrl-ui/react/ui/table";
import { Text } from "@ctrl-ui/react/ui/typography";
import { format, formatDistanceToNow } from "date-fns";
import {
  type ResponseRow,
  respondentDisplayName,
} from "@/features/surveys/components/responses/response-types";
import {
  RESPONSE_CHANNEL_LABELS,
  RESPONSE_STATUS_COLORS,
  RESPONSE_STATUS_LABELS,
} from "@/features/surveys/lib/response-labels";

interface ResponsesTableProps {
  endingTitles: ReadonlyMap<string, string>;
  onOpenResponse: (response: ResponseRow) => void;
  responses: readonly ResponseRow[];
}

export function ResponsesTable({
  endingTitles,
  onOpenResponse,
  responses,
}: ResponsesTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Respondent</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Channel</TableHead>
            <TableHead>Ending</TableHead>
            <TableHead className="text-right">Answers</TableHead>
            <TableHead>Page</TableHead>
            <TableHead>Started</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {responses.map((response) => (
            <TableRow key={response._id}>
              <TableCell className="max-w-56">
                <TableRowLink
                  className="block max-w-full truncate"
                  onClick={() => onOpenResponse(response)}
                  title={respondentDisplayName(response.respondent)}
                >
                  <Text weight="medium">
                    {respondentDisplayName(response.respondent)}
                  </Text>
                </TableRowLink>
                {response.respondent.name && response.respondent.email ? (
                  <Text className="block truncate" size="label" tone="muted">
                    {response.respondent.email}
                  </Text>
                ) : null}
              </TableCell>
              <TableCell>
                <Badge
                  color={RESPONSE_STATUS_COLORS[response.status]}
                  size="sm"
                >
                  {RESPONSE_STATUS_LABELS[response.status]}
                </Badge>
              </TableCell>
              <TableCell className="whitespace-nowrap">
                <Text tone="muted">
                  {RESPONSE_CHANNEL_LABELS[response.channel]}
                </Text>
              </TableCell>
              <TableCell className="max-w-40 truncate">
                <Text tone="muted">
                  {response.endingId === undefined
                    ? "—"
                    : (endingTitles.get(response.endingId) ??
                      response.endingId)}
                </Text>
              </TableCell>
              <TableCell className="text-right">
                {response.answers.length}
              </TableCell>
              <TableCell className="max-w-48 truncate" title={response.pageUrl}>
                <Text tone="muted">{response.pageUrl ?? "—"}</Text>
              </TableCell>
              <TableCell className="whitespace-nowrap">
                <Text tone="muted">
                  <time
                    dateTime={new Date(response.startedAt).toISOString()}
                    title={format(response.startedAt, "PPPp")}
                  >
                    {formatDistanceToNow(response.startedAt, {
                      addSuffix: true,
                    })}
                  </time>
                </Text>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
