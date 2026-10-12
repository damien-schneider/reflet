import type {
  SessionEvent,
  SessionLimitKind,
  SessionLimits,
} from "../../protocol";

export class SessionQuota {
  private eventCount = 0;
  private readonly limits: SessionLimits;
  private segmentCount = 0;
  readonly stopped = new Set<SessionLimitKind>();

  constructor(limits: SessionLimits) {
    this.limits = limits;
  }

  acceptEvents(batch: SessionEvent[]): SessionEvent[] {
    const room = Math.max(0, this.limits.maxEvents - this.eventCount);
    const accepted = batch.slice(0, room);
    this.eventCount += accepted.length;
    return accepted;
  }

  acceptSegment(): boolean {
    if (this.segmentCount >= this.limits.maxSegments) {
      return false;
    }
    this.segmentCount += 1;
    return true;
  }

  eventsFull(): boolean {
    return this.eventCount >= this.limits.maxEvents;
  }

  segmentsFull(): boolean {
    return this.segmentCount >= this.limits.maxSegments;
  }
}
