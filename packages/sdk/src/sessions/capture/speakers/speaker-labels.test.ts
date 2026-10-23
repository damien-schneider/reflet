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
  it("keeps one label per voice and saves each new label as it is handed out", () => {
    const { labels, savedCounts } = labelsFrom(0);
    const labelOf = createSpeakerIdMap(labels, []);
    expect(
      ["speaker_1", "speaker_2", "speaker_1"].map((id) => labelOf(id))
    ).toEqual(["S1", "S2", "S1"]);
    expect(savedCounts).toEqual([1, 2]);
  });

  it("recognises referenced voices by name and gives a new voice the next free label", () => {
    const { labels } = labelsFrom(2);
    const labelOf = createSpeakerIdMap(labels, ["S1", "S2"]);
    expect(["S2", "speaker_3", "S1"].map((id) => labelOf(id))).toEqual([
      "S2",
      "S3",
      "S1",
    ]);
  });

  it("never reuses a label handed out before a reload", () => {
    const { labels } = labelsFrom(3);
    expect(createSpeakerIdMap(labels, [])("speaker_1")).toBe("S4");
  });

  it("leaves an eleventh voice unlabelled", () => {
    const { labels, savedCounts } = labelsFrom(9);
    const labelOf = createSpeakerIdMap(labels, []);
    expect(labelOf("speaker_1")).toBe("S10");
    expect(labelOf("speaker_2")).toBeNull();
    expect(labelOf("speaker_2")).toBeNull();
    expect(savedCounts).toEqual([10]);
  });
});
