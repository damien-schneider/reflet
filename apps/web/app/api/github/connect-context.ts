import { cookies } from "next/headers";
import { z } from "zod";

const CONNECT_CONTEXT_COOKIE = "github_connect_context";
const CONNECT_CONTEXT_COOKIE_PATH = "/api/github";
const CONNECT_CONTEXT_MAX_AGE_SECONDS = 60 * 10;

const connectContextSchema = z.object({
  installationId: z.string().nullable(),
  nonce: z.string(),
  organizationId: z.string().nullable(),
  orgSlug: z.string().nullable(),
  returnTo: z.string().nullable(),
  setupAction: z.string().nullable(),
});

/**
 * Where a GitHub connection started, kept server-side so the OAuth `state`
 * only carries a nonce bound to this browser.
 */
export type GithubConnectContext = z.infer<typeof connectContextSchema>;

export async function readConnectContext(): Promise<GithubConnectContext | null> {
  const encoded = (await cookies()).get(CONNECT_CONTEXT_COOKIE)?.value;
  if (!encoded) {
    return null;
  }
  try {
    const decoded: unknown = JSON.parse(
      Buffer.from(encoded, "base64url").toString()
    );
    return connectContextSchema.parse(decoded);
  } catch {
    return null;
  }
}

export async function writeConnectContext(
  context: GithubConnectContext
): Promise<void> {
  (await cookies()).set(
    CONNECT_CONTEXT_COOKIE,
    Buffer.from(JSON.stringify(context)).toString("base64url"),
    {
      httpOnly: true,
      maxAge: CONNECT_CONTEXT_MAX_AGE_SECONDS,
      path: CONNECT_CONTEXT_COOKIE_PATH,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    }
  );
}

export async function clearConnectContext(): Promise<void> {
  (await cookies()).delete({
    name: CONNECT_CONTEXT_COOKIE,
    path: CONNECT_CONTEXT_COOKIE_PATH,
  });
}
