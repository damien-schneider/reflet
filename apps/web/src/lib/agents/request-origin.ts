import {
  hostHeaderValidationResponse,
  originValidationResponse,
} from "@modelcontextprotocol/server";
import { BASE_URL } from "@/lib/seo-config";

const allowedHosts = [new URL(BASE_URL).hostname, "localhost", "127.0.0.1"];

export function rejectUntrustedAgentRequest(request: Request) {
  return (
    hostHeaderValidationResponse(request, allowedHosts) ??
    originValidationResponse(request, allowedHosts)
  );
}
