import { Badge } from "@ctrl-ui/react/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@ctrl-ui/react/ui/table";
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
            <TableRow
              className="relative cursor-pointer hover:bg-accent/50"
              key={response._id}
            >
              <TableCell className="max-w-56">
                <button
                  className="block max-w-full truncate text-left font-medium after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:rounded-sm focus-visible:after:outline-2 focus-visible:after:outline-ring"
                  onClick={() => onOpenResponse(response)}
                  title={respondentDisplayName(response.respondent)}
                  type="button"
                >
                  {respondentDisplayName(response.respondent)}
                </button>
                {response.respondent.name && response.respondent.email ? (
                  <span className="block truncate text-muted-foreground text-xs">
                    {response.respondent.email}
                  </span>
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
              <TableCell className="whitespace-nowrap text-muted-foreground">
                {RESPONSE_CHANNEL_LABELS[response.channel]}
              </TableCell>
              <TableCell className="max-w-40 truncate text-muted-foreground">
                {response.endingId === undefined
                  ? "—"
                  : (endingTitles.get(response.endingId) ?? response.endingId)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {response.answers.length}
              </TableCell>
              <TableCell
                className="max-w-48 truncate text-muted-foreground"
                title={response.pageUrl}
              >
                {response.pageUrl ?? "—"}
              </TableCell>
              <TableCell className="whitespace-nowrap text-muted-foreground">
                <time
                  dateTime={new Date(response.startedAt).toISOString()}
                  title={format(response.startedAt, "PPPp")}
                >
                  {formatDistanceToNow(response.startedAt, { addSuffix: true })}
                </time>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
