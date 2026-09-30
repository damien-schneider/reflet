import { Badge } from "@ctrl-ui/react/ui/badge";

import { CodeBlock } from "@/components/docs/code-block";
import { DocsText } from "@/components/docs/docs-page";
import { ReferenceTable } from "@/components/docs/reference-table";
import { type EndpointDefinition, METHOD_COLOR } from "./endpoint-data";

const PARAM_COLUMNS = [
  { kind: "name", label: "Parameter" },
  { kind: "code", label: "Type" },
  { kind: "text", label: "Description" },
] as const;

function Endpoint({ endpoint }: { endpoint: EndpointDefinition }) {
  return (
    <article
      aria-labelledby={`${endpoint.id}-title`}
      className="flex scroll-mt-20 flex-col gap-4"
      id={endpoint.id}
    >
      <h4
        className="flex flex-wrap items-center gap-2 font-mono font-semibold text-body text-foreground"
        id={`${endpoint.id}-title`}
      >
        <Badge color={METHOD_COLOR[endpoint.method]} size="sm">
          {endpoint.method}
        </Badge>
        <a className="break-all hover:underline" href={`#${endpoint.id}`}>
          /api/v1{endpoint.path}
        </a>
      </h4>
      <DocsText>{endpoint.description}</DocsText>
      <DocsText>
        <strong className="font-medium text-foreground">Auth:</strong>{" "}
        {endpoint.access}
      </DocsText>
      {endpoint.params && (
        <ReferenceTable columns={PARAM_COLUMNS} rows={endpoint.params} />
      )}
      {endpoint.body && <CodeBlock code={endpoint.body} title="Request body" />}
      <CodeBlock code={endpoint.request} title="Example request" />
      <CodeBlock code={endpoint.response} title="Example response" />
      {endpoint.note && <DocsText>{endpoint.note}</DocsText>}
    </article>
  );
}

interface EndpointGroupProps {
  endpoints: readonly EndpointDefinition[];
  title: string;
}

function EndpointGroup({ endpoints, title }: EndpointGroupProps) {
  return (
    <div className="flex flex-col gap-8">
      <h3 className="font-semibold text-foreground text-heading-3">{title}</h3>
      {endpoints.map((endpoint) => (
        <Endpoint endpoint={endpoint} key={endpoint.id} />
      ))}
    </div>
  );
}

export { EndpointGroup };
