import { A2A_PROTOCOL_VERSION, type AgentCard } from "@a2a-js/sdk";
import { documentName } from "@/lib/agents/documents";
import { BASE_URL, SITE_NAME } from "@/lib/seo-config";
export const A2A_ENDPOINT = new URL("/api/a2a", BASE_URL).href;
export const DOCUMENTATION_AGENT = {
  capabilities: {
    extendedAgentCard: false,
    extensions: [],
    pushNotifications: false,
    streaming: false,
  },
  defaultInputModes: ["text/plain"],
  defaultOutputModes: ["text/markdown"],
  description:
    "Stateless public documentation lookup. Send exactly overview, authentication, or integration as a text message. Returns official Markdown. No account data or actions.",
  documentationUrl: new URL("/auth.md", BASE_URL).href,
  name: `${SITE_NAME} documentation`,
  provider: { organization: SITE_NAME, url: BASE_URL },
  securityRequirements: [],
  securitySchemes: {},
  signatures: [],
  skills: documentName.options.map((document) => ({
    description: `Return the published ${document} document. Send the single word ${document}.`,
    examples: [document],
    id: document,
    inputModes: [],
    name: `${SITE_NAME} ${document}`,
    outputModes: [],
    securityRequirements: [],
    tags: ["documentation", document],
  })),
  supportedInterfaces: [
    {
      protocolBinding: "JSONRPC",
      protocolVersion: A2A_PROTOCOL_VERSION,
      tenant: "",
      url: A2A_ENDPOINT,
    },
  ],
  version: "1.0.0",
} satisfies AgentCard;
