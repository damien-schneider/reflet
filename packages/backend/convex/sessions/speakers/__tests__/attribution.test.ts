import { describe, expect, test } from "vitest";
import { type SpeakerTurn, segmentSpeech } from "../attribution";

const TEXT = "Bon, on fait le point. Moi je trouve que c'est long.";
const SECOND_SENTENCE = TEXT.indexOf("Moi");

const voiceSegment = (
  words: { endMs: number; textOffset: number }[] | undefined,
  text = TEXT
) => ({
  endMs: 9000,
  source: "voice" as const,
  startMs: 1000,
  text,
  words,
});

const turn = (
  speaker: string,
  startMs: number,
  endMs: number
): SpeakerTurn => ({ endMs, speaker, startMs });

describe("segmentSpeech", () => {
  test("splits the passage where the speaker changes, the first run starting at the beginning", () => {
    const speech = segmentSpeech(
      voiceSegment([
        { endMs: 1500, textOffset: 5 },
        { endMs: 3000, textOffset: 16 },
        { endMs: 5000, textOffset: SECOND_SENTENCE },
        { endMs: 7000, textOffset: TEXT.indexOf("long") },
      ]),
      [turn("S1", 1200, 3200), turn("S2", 4800, 7200)]
    );

    expect(speech).toEqual([
      { speaker: "S1", text: "Bon, on fait le point." },
      { speaker: "S2", text: "Moi je trouve que c'est long." },
    ]);
  });

  test("gives the words after a turn's last words to the turn that follows, since a turn starts where its first words end", () => {
    const speech = segmentSpeech(
      voiceSegment([
        { endMs: 2000, textOffset: 0 },
        { endMs: 3200, textOffset: 16 },
        { endMs: 3700, textOffset: SECOND_SENTENCE },
      ]),
      [turn("S1", 1000, 3000), turn("S2", 5000, 7000)]
    );

    expect(speech).toEqual([
      { speaker: "S1", text: "Bon, on fait le point." },
      { speaker: "S2", text: "Moi je trouve que c'est long." },
    ]);
  });

  test("keeps a word late after a turn with that turn when the next speaker only starts much later", () => {
    const speech = segmentSpeech(
      voiceSegment([
        { endMs: 2000, textOffset: 0 },
        { endMs: 3600, textOffset: SECOND_SENTENCE },
      ]),
      [turn("S1", 1000, 3000), turn("S2", 6000, 8000)]
    );

    expect(speech).toEqual([{ speaker: "S1", text: TEXT }]);
  });

  test("leaves words more than 1.5 s away from any turn without a speaker", () => {
    const speech = segmentSpeech(
      voiceSegment([
        { endMs: 2000, textOffset: 0 },
        { endMs: 6000, textOffset: SECOND_SENTENCE },
      ]),
      [turn("S1", 1000, 2500)]
    );

    expect(speech).toEqual([
      { speaker: "S1", text: "Bon, on fait le point." },
      { speaker: null, text: "Moi je trouve que c'est long." },
    ]);
  });

  test("keeps a punctuation word with the speaker who said the words before it", () => {
    const text = "Ça marche ? Oui.";
    const speech = segmentSpeech(
      voiceSegment(
        [
          { endMs: 1300, textOffset: 0 },
          { endMs: 1700, textOffset: 3 },
          { endMs: 2900, textOffset: 10 },
          { endMs: 3200, textOffset: 12 },
        ],
        text
      ),
      [turn("S1", 1300, 1700), turn("S2", 3000, 3200)]
    );

    expect(speech).toEqual([
      { speaker: "S1", text: "Ça marche ?" },
      { speaker: "S2", text: "Oui." },
    ]);
  });

  test("gives a corrected passage to the person who talked longest during it", () => {
    const turns = [turn("S1", 0, 2000), turn("S2", 2500, 8000)];

    expect(segmentSpeech(voiceSegment(undefined), turns)).toEqual([
      { speaker: "S2", text: TEXT },
    ]);
    expect(
      segmentSpeech(voiceSegment(undefined), [turn("S1", 9500, 9500)])
    ).toBeNull();
  });

  test("has no speech for typed passages or sessions without speaker turns", () => {
    expect(
      segmentSpeech(
        { ...voiceSegment([{ endMs: 2000, textOffset: 0 }]), source: "typed" },
        [turn("S1", 1000, 3000)]
      )
    ).toBeNull();
    expect(
      segmentSpeech(voiceSegment([{ endMs: 2000, textOffset: 0 }]), [])
    ).toBeNull();
  });
});
