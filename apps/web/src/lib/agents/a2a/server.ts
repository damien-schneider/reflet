import { A2A_PROTOCOL_VERSION, Extensions } from "@a2a-js/sdk";
import {
  A2A_ERROR_CODE,
  A2AError,
  JsonRpcRequestMalformedError,
  RequestMalformedError,
} from "@a2a-js/sdk/errors";
import {
  JsonRpcTransportHandler,
  ServerCallContext,
  validateVersion,
} from "@a2a-js/sdk/server";
import { z } from "zod";
import { rejectUntrustedAgentRequest } from "@/lib/agents/request-origin";
import { DOCUMENTATION_AGENT } from "./card";
import { documentationRequestHandler } from "./request-handler";

const rpcEnvelope = z
  .object({
    id: z.union([z.string(), z.number().int(), z.null()]).optional(),
    jsonrpc: z.literal("2.0"),
    method: z.string().min(1),
  })
  .passthrough();

const transport = new JsonRpcTransportHandler(documentationRequestHandler);
const MAX_MESSAGE_CHARS = 65_536;

function rpcResponse(body: unknown, status = 200) {
  return Response.json(body, {
    headers: {
      "A2A-Version": A2A_PROTOCOL_VERSION,
      "Cache-Control": "no-store",
    },
    status,
  });
}

function rpcError(
  error: A2AError,
  status = 200,
  id: string | number | null = null
) {
  return rpcResponse(
    {
      error: JsonRpcTransportHandler.mapToJSONRPCError(error),
      id,
      jsonrpc: "2.0",
    },
    status
  );
}

async function readRpcBody(request: Request) {
  const contentType = request.headers
    .get("content-type")
    ?.split(";")[0]
    ?.trim()
    .toLowerCase();
  if (
    contentType !== "application/json" &&
    contentType !== "application/a2a+json"
  ) {
    return rpcError(
      new RequestMalformedError(
        "Send application/json or application/a2a+json."
      ),
      415
    );
  }
  const body = await request.text();
  if (body.length > MAX_MESSAGE_CHARS) {
    return rpcError(
      new RequestMalformedError(
        `Documentation requests must be at most ${MAX_MESSAGE_CHARS} characters.`
      ),
      413
    );
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return rpcError(
      new JsonRpcRequestMalformedError({
        envelopeCode: A2A_ERROR_CODE.PARSE_ERROR,
        message: "Invalid JSON.",
      })
    );
  }
  const envelope = rpcEnvelope.safeParse(parsed);
  if (!envelope.success) {
    return rpcError(
      new JsonRpcRequestMalformedError({
        envelopeCode: A2A_ERROR_CODE.INVALID_REQUEST,
        message: "Invalid JSON-RPC request.",
      })
    );
  }
  return envelope.data;
}

export async function handleAgentMessage(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return new Response(null, { headers: { Allow: "POST" }, status: 405 });
  }
  const rejected = rejectUntrustedAgentRequest(request);
  if (rejected) {
    return rejected;
  }
  const body = await readRpcBody(request);
  if (body instanceof Response) {
    return body;
  }
  const context = new ServerCallContext({
    requestedExtensions: Extensions.parseServiceParameter(
      request.headers.get("A2A-Extensions") ?? undefined
    ),
    requestedVersion: request.headers.get("A2A-Version") ?? "",
  });
  try {
    validateVersion(context.requestedVersion, DOCUMENTATION_AGENT, "JSONRPC");
    const response = await transport.handle(body, context);
    if (Symbol.asyncIterator in response) {
      throw new Error("Stateless documentation returned an unexpected stream.");
    }
    return rpcResponse(response);
  } catch (error) {
    if (!(error instanceof A2AError)) {
      throw error;
    }
    return rpcError(error, 200, body.id ?? null);
  }
}
