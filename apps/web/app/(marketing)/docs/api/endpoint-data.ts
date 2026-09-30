import type { ReactNode } from "react";
import type { ReferenceRow } from "@/components/docs/reference-table";

const BASE_URL = "https://harmless-clam-802.convex.site/api/v1";

const METHOD_COLOR = { GET: "blue", POST: "green" } as const;

interface EndpointDefinition {
  access: ReactNode;
  body?: string;
  description: ReactNode;
  id: string;
  method: keyof typeof METHOD_COLOR;
  note?: ReactNode;
  params?: readonly ReferenceRow[];
  path: string;
  request: string;
  response: string;
}

function param(
  name: string,
  type: string,
  description: ReactNode
): ReferenceRow {
  return { cells: [name, type, description], key: name };
}

export type { EndpointDefinition };
export { BASE_URL, METHOD_COLOR, param };
