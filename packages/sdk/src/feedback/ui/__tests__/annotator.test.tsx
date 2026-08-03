import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AnnotationCanvasContext } from "../../core/annotation-renderer";
import type { CapturedImage } from "../../types";
import { DEFAULT_WIDGET_LABELS } from "../../types";
import { Annotator } from "../annotator";

interface FakeContext extends AnnotationCanvasContext {
  calls: string[];
  clearRect: (x: number, y: number, width: number, height: number) => void;
}

let context: FakeContext;
const originalGetContext = HTMLCanvasElement.prototype.getContext;

class FakeImage {
  onload: (() => void) | null = null;
  #src = "";

  get src(): string {
    return this.#src;
  }

  set src(value: string) {
    this.#src = value;
    queueMicrotask(() => this.onload?.());
  }
}

function capture(): CapturedImage {
  return {
    blob: new Blob(["x"], { type: "image/png" }),
    height: 800,
    mimeType: "image/png",
    objectUrl: "blob:capture",
    width: 1280,
  };
}

function mount(overrides: Partial<Parameters<typeof Annotator>[0]> = {}) {
  return render(
    <Annotator
      annotations={[]}
      capture={capture()}
      labels={DEFAULT_WIDGET_LABELS}
      onChange={vi.fn()}
      onDone={vi.fn()}
      {...overrides}
    />
  );
}

async function flushImageLoad(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
  });
}

beforeEach(() => {
  const track =
    (name: string) =>
    (...args: unknown[]) => {
      context.calls.push(`${name}(${args.join(",")})`);
    };

  context = {
    beginPath: track("beginPath"),
    calls: [],
    canvas: { height: 800, width: 1280 },
    clearRect: track("clearRect"),
    closePath: track("closePath"),
    drawImage: track("drawImage"),
    fill: track("fill"),
    fillRect: track("fillRect"),
    fillStyle: "",
    globalAlpha: 1,
    lineCap: "butt",
    lineJoin: "miter",
    lineTo: track("lineTo"),
    lineWidth: 1,
    moveTo: track("moveTo"),
    restore: track("restore"),
    save: track("save"),
    stroke: track("stroke"),
    strokeRect: track("strokeRect"),
    strokeStyle: "",
  };

  Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
    configurable: true,
    value: () => context,
  });
  vi.stubGlobal("Image", FakeImage);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
    configurable: true,
    value: originalGetContext,
  });
});

describe("Annotator", () => {
  it("paints the capture as soon as the image decodes, before any drawing", async () => {
    mount();
    expect(
      context.calls.filter((call) => call.startsWith("drawImage"))
    ).toEqual([]);

    await flushImageLoad();

    expect(
      context.calls.filter((call) => call.startsWith("drawImage")).length
    ).toBeGreaterThan(0);
  });

  it("repaints the capture under every annotation", async () => {
    const { rerender } = mount();
    await flushImageLoad();
    const paintsBefore = context.calls.filter((call) =>
      call.startsWith("drawImage")
    ).length;

    rerender(
      <Annotator
        annotations={[
          {
            color: "#ef4444",
            end: { x: 200, y: 150 },
            id: "a1",
            start: { x: 20, y: 30 },
            tool: "rectangle",
          },
        ]}
        capture={capture()}
        labels={DEFAULT_WIDGET_LABELS}
        onChange={vi.fn()}
        onDone={vi.fn()}
      />
    );

    expect(
      context.calls.filter((call) => call.startsWith("drawImage")).length
    ).toBeGreaterThan(paintsBefore);
  });
});
