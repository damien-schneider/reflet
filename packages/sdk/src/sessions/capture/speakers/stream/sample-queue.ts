export class SampleQueue {
  private readonly maxSamples: number;
  private parts: Float32Array[] = [];
  private queuedSamples = 0;

  constructor(maxSamples: number) {
    this.maxSamples = maxSamples;
  }

  get size(): number {
    return this.queuedSamples;
  }

  clear(): void {
    this.parts = [];
    this.queuedSamples = 0;
  }

  push(samples: Float32Array): boolean {
    if (this.queuedSamples + samples.length > this.maxSamples) {
      return false;
    }
    this.parts.push(samples);
    this.queuedSamples += samples.length;
    return true;
  }

  take(maxSamples: number): Float32Array {
    const taken = new Float32Array(Math.min(maxSamples, this.queuedSamples));
    let filled = 0;
    while (filled < taken.length) {
      const part = this.parts[0];
      if (!part) {
        break;
      }
      const used = Math.min(part.length, taken.length - filled);
      taken.set(part.subarray(0, used), filled);
      filled += used;
      if (used === part.length) {
        this.parts.shift();
      } else {
        this.parts[0] = part.subarray(used);
      }
    }
    this.queuedSamples -= taken.length;
    return taken;
  }
}
