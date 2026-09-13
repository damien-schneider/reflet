import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runAdmin } from "../commands/admin";

let fetchSpy: ReturnType<typeof vi.fn>;
let stdout: string;

function lastRequest(): { body: unknown; method: string; url: string } {
  const [url, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
  return {
    body: options.body ? JSON.parse(String(options.body)) : undefined,
    method: options.method ?? "GET",
    url,
  };
}

beforeEach(() => {
  stdout = "";
  fetchSpy = vi.fn(async () => Response.json({ success: true }));
  vi.stubGlobal("fetch", fetchSpy);
  vi.stubEnv("REFLET_API_KEY", "fb_sec_test");
  vi.stubEnv("REFLET_API_URL", "https://test.convex.site");
  vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
    stdout += String(chunk);
    return true;
  });
  vi.spyOn(process.stderr, "write").mockImplementation(() => true);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("runAdmin", () => {
  it("maps positionals and flags onto the client method", async () => {
    const code = await runAdmin([
      "feedback",
      "tags",
      "fb1",
      "--add",
      "a,b",
      "--remove",
      "c",
    ]);

    expect(code).toBe(0);
    expect(lastRequest()).toEqual({
      body: { addTagIds: ["a", "b"], feedbackId: "fb1", removeTagIds: ["c"] },
      method: "POST",
      url: "https://test.convex.site/api/v1/admin/feedback/update-tags",
    });
  });

  it("tells a status enum from an organization status id", async () => {
    await runAdmin(["feedback", "status", "fb1", "completed"]);
    expect(lastRequest().body).toEqual({
      feedbackId: "fb1",
      status: "completed",
    });

    fetchSpy.mockClear();
    await runAdmin(["feedback", "status", "fb1", "k57abc"]);
    expect(lastRequest().body).toEqual({
      feedbackId: "fb1",
      statusId: "k57abc",
    });
  });

  it("defaults --as to user@host for claim-next", async () => {
    await runAdmin(["feedback", "claim-next", "--statuses", "open,planned"]);

    const { body, url } = lastRequest();
    expect(url).toContain("/api/v1/admin/feedback/claim-next");
    expect(body).toMatchObject({ statuses: ["open", "planned"] });
    expect((body as { claimedBy: string }).claimedBy).toMatch(/.+@.+/);
  });

  it("prints JSON when piped", async () => {
    fetchSpy.mockResolvedValueOnce(Response.json([{ id: "t1", name: "Bug" }]));

    await runAdmin(["tag", "list"]);

    expect(JSON.parse(stdout)).toEqual([{ id: "t1", name: "Bug" }]);
  });

  it("rejects a missing positional before calling the API", async () => {
    await expect(runAdmin(["feedback", "get"])).rejects.toThrow(
      "Missing <feedbackId>"
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects an unknown flag", async () => {
    await expect(runAdmin(["tag", "list", "--title", "x"])).rejects.toThrow(
      /Unknown option/
    );
  });

  it("lists actions for a bare resource", async () => {
    const code = await runAdmin(["release"]);

    expect(code).toBe(1);
    expect(stdout).toContain("reflet release publish <releaseId>");
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
