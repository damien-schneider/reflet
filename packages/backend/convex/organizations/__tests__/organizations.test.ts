/// <reference types="vite/client" />
import { describe, expect, test } from "vitest";
import { api } from "../../_generated/api";
import { setupTest } from "../../test.helpers";

const OWNER = { _id: "user_123", email: "owner@example.com" };

const setup = () => {
  const t = setupTest({ authUsers: [OWNER] });
  const owner = t.withIdentity({ sessionId: OWNER._id, subject: OWNER._id });
  return { owner, t };
};

const seedOrganization = (t: ReturnType<typeof setup>["t"], slug: string) =>
  t.run((ctx) =>
    ctx.db.insert("organizations", {
      createdAt: Date.now(),
      isPublic: false,
      name: "Existing Org",
      slug,
      subscriptionStatus: "none",
      subscriptionTier: "free",
    })
  );

describe("Organization slug uniqueness", () => {
  test("should reject creating an organization with a duplicate slug", async () => {
    const { owner, t } = setup();
    await seedOrganization(t, "my-unique-slug");

    await expect(
      owner.mutation(api.organizations.mutations.create, {
        name: "Second Org",
        slug: "my-unique-slug",
      })
    ).rejects.toThrow("This slug is already taken");
  });

  test("should reject creating an organization with a duplicate generated slug", async () => {
    const { owner, t } = setup();
    await seedOrganization(t, "my-org");

    await expect(
      owner.mutation(api.organizations.mutations.create, { name: "My Org" })
    ).rejects.toThrow("This slug is already taken");
  });

  test("should allow creating organizations with different slugs", async () => {
    const { owner } = setup();

    const first = await owner.mutation(api.organizations.mutations.create, {
      name: "First Org",
      slug: "first-org",
    });
    const second = await owner.mutation(api.organizations.mutations.create, {
      name: "Second Org",
      slug: "second-org",
    });

    expect(first.id).not.toBe(second.id);
  });
});

describe("Organization slug derived from name", () => {
  const VALID_SLUG = /^[a-z0-9](?:[a-z0-9-]{0,46}[a-z0-9])$/;

  test.each([
    ["Test", /^test-[a-z0-9]{6}$/],
    ["X", /^x-[a-z0-9]{6}$/],
    ["!!!", /^org-[a-z0-9]{6}$/],
    ["Acme Labs", /^acme-labs$/],
  ])("creates %s with a usable slug", async (name, expected) => {
    const { owner } = setup();
    const { slug } = await owner.mutation(api.organizations.mutations.create, {
      name,
    });
    expect(slug).toMatch(expected);
  });

  test("truncates long names to a valid 48-char slug", async () => {
    const { owner } = setup();
    const name = `${"a".repeat(47)} ${"b".repeat(12)}`;
    const { slug } = await owner.mutation(api.organizations.mutations.create, {
      name,
    });
    expect(slug).toBe("a".repeat(47));
    expect(slug).toMatch(VALID_SLUG);
  });

  test("still rejects an explicitly requested reserved slug", async () => {
    const { owner } = setup();
    await expect(
      owner.mutation(api.organizations.mutations.create, {
        name: "Anything",
        slug: "test",
      })
    ).rejects.toThrow("This slug is reserved");
  });
});

describe("Organization slug update", () => {
  test("should allow changing slug to a unique value", async () => {
    const { owner, t } = setup();
    const { id } = await owner.mutation(api.organizations.mutations.create, {
      name: "My Org",
      slug: "my-org",
    });

    await owner.mutation(api.organizations.mutations.update, {
      id,
      slug: "new-slug",
    });

    expect((await t.run((ctx) => ctx.db.get(id)))?.slug).toBe("new-slug");
  });

  test("should reject changing slug to one that is already taken", async () => {
    const { owner, t } = setup();
    await seedOrganization(t, "taken-slug");
    const { id } = await owner.mutation(api.organizations.mutations.create, {
      name: "Second Org",
      slug: "second-org",
    });

    await expect(
      owner.mutation(api.organizations.mutations.update, {
        id,
        slug: "taken-slug",
      })
    ).rejects.toThrow("This slug is already taken");
  });

  test("should allow keeping the same slug (no-op)", async () => {
    const { owner, t } = setup();
    const { id } = await owner.mutation(api.organizations.mutations.create, {
      name: "My Org",
      slug: "my-org",
    });

    await owner.mutation(api.organizations.mutations.update, {
      id,
      slug: "my-org",
    });

    expect((await t.run((ctx) => ctx.db.get(id)))?.slug).toBe("my-org");
  });
});
