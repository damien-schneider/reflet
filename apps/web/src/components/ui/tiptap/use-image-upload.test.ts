import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGenerateUploadUrl = vi
  .fn()
  .mockResolvedValue("https://upload.example.com");
const mockGetStorageUrl = vi
  .fn()
  .mockResolvedValue("https://storage.example.com/img.png");
vi.mock("convex/react", () => ({
  useMutation: vi.fn((apiRef: unknown) => {
    if (String(apiRef).includes("generateUploadUrl")) {
      return mockGenerateUploadUrl;
    }
    return mockGetStorageUrl;
  }),
}));

vi.mock("@reflet/backend/convex/_generated/api", () => ({
  api: {
    storage: {
      generateUploadUrl: "generateUploadUrl",
      getStorageUrl: "getStorageUrl",
    },
  },
}));

describe("useImageUpload", () => {
  let useImageUpload: typeof import("./use-image-upload").useImageUpload;

  beforeEach(async () => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ storageId: "storage-id-123" }),
      ok: true,
    });
    const mod = await import("./use-image-upload");
    useImageUpload = mod.useImageUpload;
  });

  describe("uploadImage", () => {
    it("rejects non-image files", async () => {
      const onError = vi.fn();
      const { result } = renderHook(() => useImageUpload({ onError }));

      const file = new File(["data"], "test.txt", { type: "text/plain" });
      let url: string | null = null;
      await act(async () => {
        url = await result.current.uploadImage(file);
      });

      expect(url).toBeNull();
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Please upload an image file" })
      );
    });

    it("rejects files larger than 5MB", async () => {
      const onError = vi.fn();
      const { result } = renderHook(() => useImageUpload({ onError }));

      const largeContent = new ArrayBuffer(6 * 1024 * 1024);
      const file = new File([largeContent], "large.png", { type: "image/png" });
      let url: string | null = null;
      await act(async () => {
        url = await result.current.uploadImage(file);
      });

      expect(url).toBeNull();
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("smaller than 5MB"),
        })
      );
    });

    it("uploads image successfully", async () => {
      const onSuccess = vi.fn();
      const { result } = renderHook(() => useImageUpload({ onSuccess }));

      const file = new File(["image-data"], "pic.png", { type: "image/png" });
      let url: string | null = null;
      await act(async () => {
        url = await result.current.uploadImage(file);
      });

      expect(url).toBe("https://storage.example.com/img.png");
      expect(mockGenerateUploadUrl).toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalledWith(
        "https://upload.example.com",
        expect.objectContaining({
          body: file,
          headers: { "Content-Type": "image/png" },
          method: "POST",
        })
      );
      expect(onSuccess).toHaveBeenCalledWith(
        "https://storage.example.com/img.png"
      );
    });

    it("handles upload failure", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
      });
      const onError = vi.fn();
      const { result } = renderHook(() => useImageUpload({ onError }));

      const file = new File(["data"], "pic.png", { type: "image/png" });
      let url: string | null = null;
      await act(async () => {
        url = await result.current.uploadImage(file);
      });

      expect(url).toBeNull();
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Failed to upload image" })
      );
    });

    it("handles getStorageUrl returning null", async () => {
      mockGetStorageUrl.mockResolvedValueOnce(null);
      const onError = vi.fn();
      const { result } = renderHook(() => useImageUpload({ onError }));

      const file = new File(["data"], "pic.png", { type: "image/png" });
      let url: string | null = null;
      await act(async () => {
        url = await result.current.uploadImage(file);
      });

      expect(url).toBeNull();
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Failed to get storage URL" })
      );
    });

    it("handles non-Error exceptions", async () => {
      mockGenerateUploadUrl.mockRejectedValueOnce("string error");
      const onError = vi.fn();
      const { result } = renderHook(() => useImageUpload({ onError }));

      const file = new File(["data"], "pic.png", { type: "image/png" });
      await act(async () => {
        await result.current.uploadImage(file);
      });

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Failed to upload image" })
      );
    });
  });
});
