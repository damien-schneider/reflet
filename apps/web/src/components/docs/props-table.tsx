import { ReferenceTable } from "./reference-table";

interface PropDefinition {
  default?: string;
  description: string;
  name: string;
  required?: boolean;
  type: string;
}

interface PropsTableProps {
  props: readonly PropDefinition[];
}

const NAME = { kind: "name", label: "Prop" } as const;
const TYPE = { kind: "code", label: "Type" } as const;
const DEFAULT = { kind: "code", label: "Default" } as const;
const DESCRIPTION = { kind: "text", label: "Description" } as const;

function PropName({ prop }: { prop: PropDefinition }) {
  return (
    <span className="flex flex-col gap-0.5">
      <code>{prop.name}</code>
      {prop.required && (
        <span className="font-sans text-caption text-muted-foreground">
          Required
        </span>
      )}
    </span>
  );
}

function toPropRow(prop: PropDefinition, showDefaults: boolean) {
  const name = <PropName prop={prop} />;
  const fallback = (
    <>
      <span aria-hidden>—</span>
      <span className="sr-only">None</span>
    </>
  );
  const hasDefault = prop.default !== undefined && prop.default !== "—";
  const defaultCell = hasDefault ? prop.default : fallback;
  return {
    cells: showDefaults
      ? [name, prop.type, defaultCell, prop.description]
      : [name, prop.type, prop.description],
    key: prop.name,
  };
}

function PropsTable({ props }: PropsTableProps) {
  const showDefaults = props.some((prop) => prop.default !== undefined);
  const columns = showDefaults
    ? [NAME, TYPE, DEFAULT, DESCRIPTION]
    : [NAME, TYPE, DESCRIPTION];

  return (
    <ReferenceTable
      columns={columns}
      rows={props.map((prop) => toPropRow(prop, showDefaults))}
    />
  );
}

export type { PropDefinition };
export { PropsTable };
