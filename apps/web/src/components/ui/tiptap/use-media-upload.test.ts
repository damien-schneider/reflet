import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockGenerateUploadUrl = vi
  .fn()
  .mockResolvedValue("https://upload.example.com");
const mockGetStorageUrl = vi
  .fn()
  .mockResolvedValue("https://storage.example.com/media.jpg");

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
      getStorageUrlMutation: "getStorageUrlMutation",
    },
  },
}));

describe("useMediaUpload", () => {
  let useMediaUpload: typeof import("./use-media-upload").useMediaUpload;

  beforeEach(async () => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ storageId: "storage-id-456" }),
    });
    const mod = await import("./use-media-upload");
    useMediaUpload = mod.useMediaUpload;
  });

  afterEach(() => {
    cleanup();
  });

  it("returns initial state", () => {
    const { result } = renderHook(() => useMediaUpload());
    expect(result.current.isUploading).toBe(false);
    expect(result.current.uploadProgress).toBeNull();
    expect(result.current.uploadMedia).toBeInstanceOf(Function);
    expect(result.current.openFilePicker).toBeInstanceOf(Function);
  });

  describe("uploadMedia", () => {
    it("uploads image successfully", async () => {
      const onSuccess = vi.fn();
      const { result } = renderHook(() => useMediaUpload({ onSuccess }));

      const file = new File(["data"], "photo.png", { type: "image/png" });
      let uploadResult: unknown = null;
      await act(async () => {
        uploadResult = await result.current.uploadMedia(file);
      });

      expect(uploadResult).toEqual({
        url: "https://storage.example.com/media.jpg",
        type: "image",
      });
      expect(onSuccess).toHaveBeenCalledWith({
        url: "https://storage.example.com/media.jpg",
        type: "image",
      });
    });

    it("uploads video successfully", async () => {
      const onSuccess = vi.fn();
      const { result } = renderHook(() => useMediaUpload({ onSuccess }));

      const file = new File(["data"], "clip.mp4", { type: "video/mp4" });
      let uploadResult: unknown = null;
      await act(async () => {
        uploadResult = await result.current.uploadMedia(file);
      });

      expect(uploadResult).toEqual({
        url: "https://storage.example.com/media.jpg",
        type: "video",
      });
    });

    it("rejects unsupported file types", async () => {
      const onError = vi.fn();
      const { result } = renderHook(() => useMediaUpload({ onError }));

      const file = new File(["data"], "doc.pdf", {
        type: "application/pdf",
      });
      let uploadResult: unknown = null;
      await act(async () => {
        uploadResult = await result.current.uploadMedia(file);
      });

      expect(uploadResult).toBeNull();
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("image (JPEG, PNG, GIF, WebP)"),
        })
      );
    });

    it("rejects oversized images", async () => {
      const onError = vi.fn();
      const { result } = renderHook(() =>
        useMediaUpload({ onError, maxImageSizeMB: 2 })
      );

      const largeContent = new ArrayBuffer(3 * 1024 * 1024);
      const file = new File([largeContent], "big.png", { type: "image/png" });
      let uploadResult: unknown = null;
      await act(async () => {
        uploadResult = await result.current.uploadMedia(file);
      });

      expect(uploadResult).toBeNull();
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("smaller than 2MB"),
        })
      );
    });

    it("rejects oversized videos", async () => {
      const onError = vi.fn();
      const { result } = renderHook(() =>
        useMediaUpload({ onError, maxVideoSizeMB: 10 })
      );

      const largeContent = new ArrayBuffer(11 * 1024 * 1024);
      const file = new File([largeContent], "big.mp4", { type: "video/mp4" });
      let uploadResult: unknown = null;
      await act(async () => {
        uploadResult = await result.current.uploadMedia(file);
      });

      expect(uploadResult).toBeNull();
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("smaller than 10MB"),
        })
      );
    });

    it("handles upload failure (fetch not ok)", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
      });
      const onError = vi.fn();
      const { result } = renderHook(() => useMediaUpload({ onError }));

      const file = new File(["data"], "pic.png", { type: "image/png" });
      let uploadResult: unknown = null;
      await act(async () => {
        uploadResult = await result.current.uploadMedia(file);
      });

      expect(uploadResult).toBeNull();
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Failed to upload image" })
      );
    });

    it("handles getStorageUrl returning null", async () => {
      mockGetStorageUrl.mockResolvedValueOnce(null);
      const onError = vi.fn();
      const { result } = renderHook(() => useMediaUpload({ onError }));

      const file = new File(["data"], "pic.png", { type: "image/png" });
      let uploadResult: unknown = null;
      await act(async () => {
        uploadResult = await result.current.uploadMedia(file);
      });

      expect(uploadResult).toBeNull();
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Failed to get storage URL" })
      );
    });

    it("handles non-Error exceptions", async () => {
      mockGenerateUploadUrl.mockRejectedValueOnce("unexpected");
      const onError = vi.fn();
      const { result } = renderHook(() => useMediaUpload({ onError }));

      const file = new File(["data"], "pic.png", { type: "image/png" });
      await act(async () => {
        await result.current.uploadMedia(file);
      });

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Failed to upload image" })
      );
    });

    it("resets uploading state after completion", async () => {
      const { result } = renderHook(() => useMediaUpload());

      const file = new File(["data"], "pic.png", { type: "image/png" });
      await act(async () => {
        await result.current.uploadMedia(file);
      });

      expect(result.current.isUploading).toBe(false);
      expect(result.current.uploadProgress).toBeNull();
    });

    it("resets uploading state after error", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error("network error")
      );
      const { result } = renderHook(() => useMediaUpload({ onError: vi.fn() }));

      const file = new File(["data"], "pic.png", { type: "image/png" });
      await act(async () => {
        await result.current.uploadMedia(file);
      });

      expect(result.current.isUploading).toBe(false);
      expect(result.current.uploadProgress).toBeNull();
    });
  });

  describe("openFilePicker", () => {
    it("creates file input with image accept type", () => {
      const { result } = renderHook(() => useMediaUpload());

      const mockClick = vi.fn();
      const inputs: HTMLInputElement[] = [];
      const originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
        const el = originalCreateElement(tag);
        if (tag === "input") {
          Object.defineProperty(el, "click", { value: mockClick });
          inputs.push(el as HTMLInputElement);
        }
        return el;
      });

      result.current.openFilePicker("image");
      expect(mockClick).toHaveBeenCalled();
      expect(inputs[0]?.accept).toBe("image/*");
      vi.restoreAllMocks();
    });

    it("creates file input with video accept type", () => {
      const { result } = renderHook(() => useMediaUpload());

      const mockClick = vi.fn();
      const inputs: HTMLInputElement[] = [];
      const originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
        const el = originalCreateElement(tag);
        if (tag === "input") {
          Object.defineProperty(el, "click", { value: mockClick });
          inputs.push(el as HTMLInputElement);
        }
        return el;
      });

      result.current.openFilePicker("video");
      expect(inputs[0]?.accept).toBe("video/*");
      vi.restoreAllMocks();
    });

    it("creates file input with both accept types by default", () => {
      const { result } = renderHook(() => useMediaUpload());

      const mockClick = vi.fn();
      const inputs: HTMLInputElement[] = [];
      const originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
        const el = originalCreateElement(tag);
        if (tag === "input") {
          Object.defineProperty(el, "click", { value: mockClick });
          inputs.push(el as HTMLInputElement);
        }
        return el;
      });

      result.current.openFilePicker();
      expect(inputs[0]?.accept).toBe("image/*,video/*");
      vi.restoreAllMocks();
    });
  });
});
