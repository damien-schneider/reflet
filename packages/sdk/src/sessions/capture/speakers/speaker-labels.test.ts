import { describe, expect, it } from "vitest";
import { createSpeakerIdMap, SpeakerLabels } from "./speaker-labels";

function labelsFrom(handedOut: number) {
  const savedCounts: number[] = [];
  const labels = new SpeakerLabels({
    handedOut,
    onHandOut: (count) => savedCounts.push(count),
  });
  return { labels, savedCounts };
}

describe("createSpeakerIdMap", () => {
  it("leaves an eleventh voice unlabelled", () => {
    const { labels, savedCounts } = labelsFrom(9);
    const labelOf = createSpeakerIdMap(labels, []);
    expect(labelOf("speaker_1")).toBe("S10");
    expect(labelOf("speaker_2")).toBeNull();
    expect(labelOf("speaker_2")).toBeNull();
    expect(savedCounts).toEqual([10]);
  });
});
