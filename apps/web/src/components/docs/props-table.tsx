import { cn } from "@/lib/utils";

interface PropDefinition {
  name: string;
  type: string;
  default?: string;
  description: string;
}

interface PropsTableProps {
  props: PropDefinition[];
}

function PropsTable({ props }: PropsTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-border border-b bg-muted/50">
            <th className="px-4 py-3 text-left font-medium text-foreground">
              Prop
            </th>
            <th className="px-4 py-3 text-left font-medium text-foreground">
              Type
            </th>
            <th className="px-4 py-3 text-left font-medium text-foreground">
              Default
            </th>
            <th className="px-4 py-3 text-left font-medium text-foreground">
              Description
            </th>
          </tr>
        </thead>
        <tbody>
          {props.map((prop) => (
            <tr
              className="border-border border-b last:border-b-0"
              key={prop.name}
            >
              <td className="px-4 py-3 align-top">
                <code
                  className={cn(
                    "rounded bg-muted px-1.5 py-0.5 font-mono text-sm",
                    "text-foreground"
                  )}
                >
                  {prop.name}
                </code>
              </td>
              <td className="px-4 py-3 align-top">
                <code className="font-mono text-muted-foreground text-sm">
                  {prop.type}
                </code>
              </td>
              <td className="px-4 py-3 align-top text-muted-foreground">
                {prop.default ? (
                  <code className="font-mono text-sm">{prop.default}</code>
                ) : (
                  <span className="text-muted-foreground/60">-</span>
                )}
              </td>
              <td className="px-4 py-3 align-top text-muted-foreground">
                {prop.description}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export { PropsTable };
export type { PropDefinition };
