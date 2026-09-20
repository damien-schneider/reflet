import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@ctrl-ui/react/ui/table";

interface PropDefinition {
  default?: string;
  description: string;
  name: string;
  required?: boolean;
  type: string;
}

interface PropsTableProps {
  props: PropDefinition[];
}

function PropsTable({ props }: PropsTableProps) {
  const showDefaults = props.some((prop) => prop.default !== undefined);

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table className="w-full text-sm">
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="text-foreground">Prop</TableHead>
            <TableHead className="text-foreground">Type</TableHead>
            {showDefaults && (
              <TableHead className="text-foreground">Default</TableHead>
            )}
            <TableHead className="text-foreground">Description</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {props.map((prop) => (
            <TableRow key={prop.name}>
              <TableCell className="align-top">
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-foreground text-sm">
                  {prop.name}
                </code>
                {prop.required && (
                  <span className="ml-1 text-destructive-text">
                    <span aria-hidden="true">*</span>
                    <span className="sr-only">required</span>
                  </span>
                )}
              </TableCell>
              <TableCell className="align-top">
                <code className="font-mono text-muted-foreground text-sm">
                  {prop.type}
                </code>
              </TableCell>
              {showDefaults && (
                <TableCell className="align-top text-muted-foreground">
                  {prop.default ? (
                    <code className="font-mono text-sm">{prop.default}</code>
                  ) : (
                    <span className="text-muted-foreground/60">-</span>
                  )}
                </TableCell>
              )}
              <TableCell className="align-top text-muted-foreground">
                {prop.description}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export type { PropDefinition };
export { PropsTable };
