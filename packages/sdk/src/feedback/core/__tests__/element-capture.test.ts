import { afterEach, describe, expect, it, vi } from "vitest";
import type { ElementSelection } from "../../../types";
import type { CapturedImage } from "../../types";
import { highlightFor } from "../element-capture";

const SCROLLBAR_WIDTH = 16;

afterEach(() => {
  vi.restoreAllMocks();
});

describe("highlightFor", () => {
  it("lands on the element when a classic scrollbar narrows the captured viewport", () => {
    vi.spyOn(window, "innerWidth", "get").mockReturnValue(1440);
    vi.spyOn(document.documentElement, "clientWidth", "get").mockReturnValue(
      1440 - SCROLLBAR_WIDTH
    );
    const capture: CapturedImage = {
      blob: new Blob(),
      height: 1800,
      mimeType: "image/png",
      objectUrl: "blob:capture",
      width: (1440 - SCROLLBAR_WIDTH) * 2,
    };
    const selection: ElementSelection = {
      componentStack: [],
      html: "<button>Save</button>",
      label: 'button "Save"',
      rect: { height: 40, width: 100, x: 1300, y: 200 },
      selector: "button",
    };

    const highlight = highlightFor(selection, capture);

    expect(highlight.start).toEqual({ x: 2600, y: 400 });
    expect(highlight.end).toEqual({ x: 2800, y: 480 });
  });
});
