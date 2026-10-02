import { describe, expect, it } from "vitest";
import { api } from "../../_generated/api";
import { setupTest } from "../../test.helpers";

describe("Opening a newly created organization", () => {
  it.each(["Acme Labs", "Test"])(
    "returns the saved ID and URL for %s",
    async (name) => {
      const user = { _id: "creator", email: "creator@example.com" };
      const test = setupTest({ authUsers: [user] });
      const creator = test.withIdentity({
        sessionId: user._id,
        subject: user._id,
      });
      const result = await creator.mutation(
        api.organizations.mutations.create,
        { name }
      );
      const organizations = await creator.query(api.organizations.queries.list);
      const organization = organizations[0];

      expect(organization?.role).toBe("owner");
      expect(result).toEqual({
        id: organization?._id,
        slug: organization?.slug,
      });
    }
  );
});
