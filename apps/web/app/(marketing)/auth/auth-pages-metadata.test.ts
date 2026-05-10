import { describe, expect, it } from "vitest";

import { metadata as checkEmailMetadata } from "./check-email/page";
import { metadata as forgotPasswordMetadata } from "./forgot-password/page";
import { metadata as resetPasswordMetadata } from "./reset-password/page";
import { metadata as verifyEmailMetadata } from "./verify-email/page";

const authPages = [
  {
    metadata: checkEmailMetadata,
    path: "/auth/check-email",
    title: "Check Your Email",
  },
  {
    metadata: forgotPasswordMetadata,
    path: "/auth/forgot-password",
    title: "Forgot Password",
  },
  {
    metadata: resetPasswordMetadata,
    path: "/auth/reset-password",
    title: "Reset Password",
  },
  {
    metadata: verifyEmailMetadata,
    path: "/auth/verify-email",
    title: "Verify Email",
  },
] as const;

describe("auth page metadata", () => {
  it("keeps account utility pages out of the search index", () => {
    for (const page of authPages) {
      expect(page.metadata.title).toBe(page.title);
      expect(String(page.metadata.alternates?.canonical)).toContain(page.path);
      expect(page.metadata.robots).toEqual({ index: false, follow: false });
    }
  });
});
