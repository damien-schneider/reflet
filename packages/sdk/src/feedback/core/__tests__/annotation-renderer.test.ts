import { describe, expect, it } from "vitest";
import type { Annotation } from "../../types";
import {
  type AnnotationCanvasContext,
  drawAnnotations,
} from "../annotation-renderer";

interface FakeContext extends AnnotationCanvasContext {
  alphaAtFill: number[];
  calls: string[];
}

function fakeContext(canvas?: HTMLCanvasElement): FakeContext {
  const track =
    (name: string) =>
    (...args: unknown[]) => {
      context.calls.push(`${name}(${args.join(",")})`);
    };

  const context: FakeContext = {
    alphaAtFill: [],
    beginPath: track("beginPath"),
    calls: [],
    canvas: canvas ?? { height: 800, width: 1200 },
    closePath: track("closePath"),
    drawImage: track("drawImage"),
    fill: track("fill"),
    fillRect: (x: number, y: number, width: number, height: number) => {
      context.alphaAtFill.push(context.globalAlpha);
      context.calls.push(`fillRect(${x},${y},${width},${height})`);
    },
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

  return context;
}

function annotation(overrides: Partial<Annotation>): Annotation {
  return {
    color: "#ef4444",
    end: { x: 200, y: 150 },
    id: "a1",
    start: { x: 20, y: 30 },
    tool: "rectangle",
    ...overrides,
  };
}

describe("drawAnnotations", () => {
  it("strokes a rectangle around the drag area", () => {
    const context = fakeContext();

    drawAnnotations(context, [annotation({})]);

    expect(context.calls).toContain("strokeRect(20,30,180,120)");
  });

  it("fills a translucent band for the highlight tool", () => {
    const context = fakeContext();

    drawAnnotations(context, [annotation({ tool: "highlight" })]);

    expect(context.calls).toContain("fillRect(20,30,180,120)");
    expect(context.alphaAtFill[0]).toBeLessThan(1);
  });

  it("draws the shaft and the closed head of an arrow", () => {
    const context = fakeContext();

    drawAnnotations(context, [annotation({ tool: "arrow" })]);

    expect(context.calls).toContain("moveTo(20,30)");
    expect(context.calls).toContain("lineTo(200,150)");
    expect(context.calls.filter((call) => call === "closePath()")).toHaveLength(
      1
    );
    expect(context.calls).toContain("fill()");
  });

  it("traces every point of a pen stroke", () => {
    const context = fakeContext();

    drawAnnotations(context, [
      annotation({
        points: [
          { x: 0, y: 0 },
          { x: 10, y: 20 },
          { x: 40, y: 60 },
        ],
        tool: "pen",
      }),
    ]);

    expect(context.calls).toContain("moveTo(0,0)");
    expect(context.calls).toContain("lineTo(10,20)");
    expect(context.calls).toContain("lineTo(40,60)");
    expect(context.calls).toContain("stroke()");
  });

  it("redacts with an opaque block when pixelation is unavailable", () => {
    const context = fakeContext();

    drawAnnotations(context, [annotation({ tool: "blur" })]);

    expect(context.calls).toContain("fillRect(20,30,180,120)");
    expect(context.alphaAtFill[0]).toBe(1);
    expect(context.calls.some((call) => call.startsWith("drawImage"))).toBe(
      false
    );
  });

  it("still redacts when the source canvas has no 2d context", () => {
    const source = document.createElement("canvas");
    source.width = 1200;
    source.height = 800;
    const context = fakeContext(source);

    drawAnnotations(context, [annotation({ tool: "blur" })]);

    expect(context.calls).toContain("fillRect(20,30,180,120)");
  });

  it("skips degenerate shapes", () => {
    const context = fakeContext();

    drawAnnotations(context, [annotation({ end: { x: 21, y: 31 } })]);

    expect(context.calls).toEqual([]);
  });

  it("scales geometry when the export is larger than the editor", () => {
    const context = fakeContext();

    drawAnnotations(context, [annotation({})], { scale: 2 });

    expect(context.calls).toContain("strokeRect(40,60,360,240)");
  });

  it("restores the context state for every annotation", () => {
    const context = fakeContext();

    drawAnnotations(context, [annotation({}), annotation({ tool: "arrow" })]);

    expect(context.calls.filter((call) => call === "save()")).toHaveLength(2);
    expect(context.calls.filter((call) => call === "restore()")).toHaveLength(
      2
    );
  });
});
