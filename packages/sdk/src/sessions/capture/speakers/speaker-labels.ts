export const MAX_SPEAKER_LABELS = 10;

export class SpeakerLabels {
  private handedOut: number;
  private readonly onHandOut: (count: number) => void;

  constructor(options: {
    handedOut: number;
    onHandOut: (count: number) => void;
  }) {
    this.handedOut = options.handedOut;
    this.onHandOut = options.onHandOut;
  }

  handOut(): string | null {
    if (this.handedOut >= MAX_SPEAKER_LABELS) {
      return null;
    }
    this.handedOut += 1;
    this.onHandOut(this.handedOut);
    return `S${this.handedOut}`;
  }
}

export function createSpeakerIdMap(
  labels: SpeakerLabels,
  referenceNames: string[]
): (speakerId: string) => string | null {
  const known = new Map<string, string | null>(
    referenceNames.map((name) => [name, name])
  );
  return (speakerId) => {
    const label = known.get(speakerId);
    if (label !== undefined) {
      return label;
    }
    const handedOut = labels.handOut();
    known.set(speakerId, handedOut);
    return handedOut;
  };
}
