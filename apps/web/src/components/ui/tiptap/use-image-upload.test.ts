import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockGenerateUploadUrl = vi
  .fn()
  .mockResolvedValue("https://upload.example.com");
const mockGetStorageUrl = vi
  .fn()
  .mockResolvedValue("https://storage.example.com/img.png");
const mockQuery = vi.fn();

vi.mock("convex/react", () => ({
  useMutation: vi.fn((apiRef: unknown) => {
    if (String(apiRef).includes("generateUploadUrl")) {
      return mockGenerateUploadUrl;
    }
    return mockGetStorageUrl;
  }),
  useQuery: vi.fn(() => mockQuery()),
}));

vi.mock("@reflet/backend/convex/_generated/api", () => ({
  api: {
    storage: {
      generateUploadUrl: "generateUploadUrl",
      getStorageUrlMutation: "getStorageUrlMutation",
      getStorageUrl: "getStorageUrl",
    },
  },
}));

describe("useImageUpload", () => {
  let useImageUpload: typeof import("./use-image-upload").useImageUpload;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockQuery.mockReturnValue(null);
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ storageId: "storage-id-123" }),
    });
    const mod = await import("./use-image-upload");
    useImageUpload = mod.useImageUpload;
  });

  afterEach(() => {
    cleanup();
  });

  it("returns initial state", () => {
    const { result } = renderHook(() => useImageUpload());
    expect(result.current.isUploading).toBe(false);
    expect(result.current.uploadImage).toBeInstanceOf(Function);
    expect(result.current.handlePaste).toBeInstanceOf(Function);
    expect(result.current.handleDrop).toBeInstanceOf(Function);
    expect(result.current.openFilePicker).toBeInstanceOf(Function);
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
          method: "POST",
          headers: { "Content-Type": "image/png" },
          body: file,
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

  describe("handlePaste", () => {
    it("uploads pasted image", async () => {
      const { result } = renderHook(() => useImageUpload());

      const file = new File(["img"], "pasted.png", { type: "image/png" });
      const mockGetAsFile = vi.fn(() => file);
      const event = {
        clipboardData: {
          items: [{ type: "image/png", getAsFile: mockGetAsFile }],
        },
        preventDefault: vi.fn(),
      } as unknown as ClipboardEvent;

      let url: string | null = null;
      await act(async () => {
        url = await result.current.handlePaste(event);
      });

      expect(url).toBe("https://storage.example.com/img.png");
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it("returns null when no clipboard data", async () => {
      const { result } = renderHook(() => useImageUpload());

      const event = {
        clipboardData: null,
      } as unknown as ClipboardEvent;

      let url: string | null = null;
      await act(async () => {
        url = await result.current.handlePaste(event);
      });

      expect(url).toBeNull();
    });

    it("returns null when no image items in clipboard", async () => {
      const { result } = renderHook(() => useImageUpload());

      const event = {
        clipboardData: {
          items: [{ type: "text/plain", getAsFile: vi.fn(() => null) }],
        },
      } as unknown as ClipboardEvent;

      let url: string | null = null;
      await act(async () => {
        url = await result.current.handlePaste(event);
      });

      expect(url).toBeNull();
    });
  });

  describe("handleDrop", () => {
    it("uploads dropped image", async () => {
      const { result } = renderHook(() => useImageUpload());

      const file = new File(["img"], "dropped.png", { type: "image/png" });
      const event = {
        dataTransfer: { files: [file] },
        preventDefault: vi.fn(),
      } as unknown as DragEvent;

      let url: string | null = null;
      await act(async () => {
        url = await result.current.handleDrop(event);
      });

      expect(url).toBe("https://storage.example.com/img.png");
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it("returns null when no files in drop", async () => {
      const { result } = renderHook(() => useImageUpload());

      const event = {
        dataTransfer: { files: [] },
      } as unknown as DragEvent;

      let url: string | null = null;
      await act(async () => {
        url = await result.current.handleDrop(event);
      });

      expect(url).toBeNull();
    });

    it("returns null when dropped file is not an image", async () => {
      const { result } = renderHook(() => useImageUpload());

      const file = new File(["data"], "doc.pdf", { type: "application/pdf" });
      const event = {
        dataTransfer: { files: [file] },
      } as unknown as DragEvent;

      let url: string | null = null;
      await act(async () => {
        url = await result.current.handleDrop(event);
      });

      expect(url).toBeNull();
    });

    it("returns null when dataTransfer is null", async () => {
      const { result } = renderHook(() => useImageUpload());

      const event = {
        dataTransfer: null,
      } as unknown as DragEvent;

      let url: string | null = null;
      await act(async () => {
        url = await result.current.handleDrop(event);
      });

      expect(url).toBeNull();
    });
  });

  describe("openFilePicker", () => {
    it("creates file input and triggers click", async () => {
      const { result } = renderHook(() => useImageUpload());

      const mockClick = vi.fn();
      const originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
        const el = originalCreateElement(tag);
        if (tag === "input") {
          Object.defineProperty(el, "click", { value: mockClick });
        }
        return el;
      });

      // Don't await - it waits for user interaction
      result.current.openFilePicker();

      expect(mockClick).toHaveBeenCalled();
      vi.restoreAllMocks();
    });
  });
});
