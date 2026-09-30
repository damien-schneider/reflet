/// <reference types="vite/client" />

import { describe, expect, test } from "vitest";
import { setupTest } from "../../test.helpers";
import { consumeAuthEmailLimit } from "../email_rate_limit";

const SIGN_IN_ATTEMPTS_PER_WINDOW = 10;
const RESET_REQUESTS_PER_HOUR = 3;

describe("auth email rate limit", () => {
  test("sign-in attempts are limited per normalized email, not globally", async () => {
    const t = setupTest();
    const results = await t.run(async (ctx) => {
      for (let i = 0; i < SIGN_IN_ATTEMPTS_PER_WINDOW; i++) {
        await consumeAuthEmailLimit(ctx, {
          body: { email: "ada@acme.test", password: "x" },
          path: "/sign-in/email",
        });
      }
      const sameEmail = await consumeAuthEmailLimit(ctx, {
        body: { email: " ADA@Acme.test ", password: "x" },
        path: "/sign-in/email",
      });
      const otherEmail = await consumeAuthEmailLimit(ctx, {
        body: { email: "grace@acme.test", password: "x" },
        path: "/sign-in/email",
      });
      return { otherEmail, sameEmail };
    });

    expect(results.sameEmail.ok).toBe(false);
    expect(results.otherEmail.ok).toBe(true);
  });

  test("password reset requests share one bucket across both reset paths", async () => {
    const t = setupTest();
    const results = await t.run(async (ctx) => {
      for (let i = 0; i < RESET_REQUESTS_PER_HOUR; i++) {
        await consumeAuthEmailLimit(ctx, {
          body: { email: "ada@acme.test" },
          path: "/request-password-reset",
        });
      }
      const reset = await consumeAuthEmailLimit(ctx, {
        body: { email: "ada@acme.test" },
        path: "/forget-password",
      });
      const signIn = await consumeAuthEmailLimit(ctx, {
        body: { email: "ada@acme.test", password: "x" },
        path: "/sign-in/email",
      });
      return { reset, signIn };
    });

    expect(results.reset.ok).toBe(false);
    expect(results.signIn.ok).toBe(true);
  });
});
