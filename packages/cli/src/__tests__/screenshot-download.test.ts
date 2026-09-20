import { describe, expect, it, vi } from "vitest";
import {
  type BinaryWriter,
  downloadScreenshots,
} from "../commands/screenshot-download";

function screenshot(overrides: Record<string, unknown> = {}) {
  return {
    _id: "shot_1",
    captureSource: "widget",
    createdAt: 0,
    filename: "capture.png",
    mimeType: "image/png",
    size: 3,
    url: "https://storage.example/one",
    ...overrides,
  };
}

function collector() {
  const written = new Map<string, Uint8Array>();
  const writer: BinaryWriter = {
    write: (path, bytes) => {
      written.set(path, bytes);
    },
  };
  return { writer, written };
}

describe("screenshot download", () => {
  it("writes each image under the feedback id", async () => {
    const { writer, written } = collector();
    const client = {
      listScreenshots: vi.fn().mockResolvedValue([screenshot()]),
    };
    const fetchFile = vi
      .fn()
      .mockResolvedValue(new Response(new Uint8Array([1, 2, 3])));

    const report = await downloadScreenshots(client, "fb_1", {
      fetchFile: fetchFile as unknown as typeof fetch,
      writer,
    });

    expect(report.downloaded[0]?.path).toBe(
      ".reflet/screenshots/fb_1/01-capture.png"
    );
    expect(written.get(".reflet/screenshots/fb_1/01-capture.png")).toEqual(
      new Uint8Array([1, 2, 3])
    );
  });

  it("keeps a reported filename from escaping the target directory", async () => {
    const { writer, written } = collector();
    const client = {
      listScreenshots: vi
        .fn()
        .mockResolvedValue([screenshot({ filename: "../../etc/passwd" })]),
    };

    await downloadScreenshots(client, "fb_1", {
      fetchFile: vi
        .fn()
        .mockResolvedValue(new Response(new Uint8Array([1]))) as never,
      out: "out",
      writer,
    });

    expect([...written.keys()]).toEqual(["out/01-passwd"]);
  });

  it("reports screenshots whose file is gone instead of failing", async () => {
    const { writer } = collector();
    const client = {
      listScreenshots: vi
        .fn()
        .mockResolvedValue([screenshot({ _id: "shot_missing", url: null })]),
    };

    const report = await downloadScreenshots(client, "fb_1", {
      fetchFile: vi.fn() as never,
      writer,
    });

    expect(report).toMatchObject({
      downloaded: [],
      unavailable: ["shot_missing"],
    });
  });

  it("fails loudly when storage refuses the download", async () => {
    const { writer } = collector();
    const client = {
      listScreenshots: vi.fn().mockResolvedValue([screenshot()]),
    };

    await expect(
      downloadScreenshots(client, "fb_1", {
        fetchFile: vi
          .fn()
          .mockResolvedValue(new Response("", { status: 403 })) as never,
        writer,
      })
    ).rejects.toThrow("status 403");
  });
});
