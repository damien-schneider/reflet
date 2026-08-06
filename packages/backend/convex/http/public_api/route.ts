import type { z } from "zod";
import { httpAction } from "../../_generated/server";
import { errorResponse } from "../helpers";
import {
  type ApiAuthContext,
  authenticateApiRequest,
  type PublicApiCtx,
} from "./auth";

export interface PublicRouteArgs {
  auth: ApiAuthContext;
  ctx: PublicApiCtx;
  request: Request;
  url: URL;
}

type PublicHandler = (args: PublicRouteArgs) => Promise<Response>;

export function publicApiRoute(
  handler: PublicHandler
): ReturnType<typeof httpAction> {
  return httpAction(async (ctx, request) => {
    try {
      const authResult = await authenticateApiRequest(ctx, request);
      if (!authResult.success) {
        return authResult.response;
      }

      return await handler({
        auth: authResult.auth,
        ctx,
        request,
        url: new URL(request.url),
      });
    } catch (error) {
      return errorResponse(
        error instanceof Error ? error.message : "Internal server error",
        500
      );
    }
  });
}

export async function readJsonBody<TSchema extends z.ZodType>(
  request: Request,
  schema: TSchema
): Promise<
  | { success: true; data: z.infer<TSchema> }
  | { success: false; response: Response }
> {
  try {
    return { data: schema.parse(await request.json()), success: true };
  } catch {
    return {
      response: errorResponse("Invalid JSON body", 400),
      success: false,
    };
  }
}
