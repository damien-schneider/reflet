import { vi } from "vitest";
import { z } from "zod";

const sentMessageSchema = z.looseObject({ type: z.string() });
type SentMessage = z.infer<typeof sentMessageSchema>;

const appendSchema = z.object({
  audio: z.string(),
  type: z.literal("input_audio.append"),
});

export class FakeWebSocket extends EventTarget {
  isClosed = false;
  readonly protocols: string[];
  readonly sent: SentMessage[] = [];
  readonly url: string;

  constructor(url: string, protocols: string[]) {
    super();
    this.url = url;
    this.protocols = protocols;
  }

  accept(): void {
    this.receive({ type: "session.created" });
    this.receive({ type: "session.updated" });
  }

  appendedSamples(): Int16Array[] {
    return this.sent
      .filter((message) => message.type === "input_audio.append")
      .map((message) => {
        const binary = atob(appendSchema.parse(message).audio);
        const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
        return new Int16Array(bytes.buffer);
      });
  }

  close(): void {
    this.isClosed = true;
  }

  drop(code = 1006): void {
    this.isClosed = true;
    this.dispatchEvent(new CloseEvent("close", { code }));
  }

  failWithoutClosing(): void {
    this.dispatchEvent(new Event("error"));
  }

  receive(message: object): void {
    this.dispatchEvent(
      new MessageEvent("message", { data: JSON.stringify(message) })
    );
  }

  send(data: string): void {
    this.sent.push(sentMessageSchema.parse(JSON.parse(data)));
  }

  sentOfType(type: string): SentMessage[] {
    return this.sent.filter((message) => message.type === type);
  }
}

export function installFakeWebSocket(): FakeWebSocket[] {
  const opened: FakeWebSocket[] = [];
  vi.stubGlobal(
    "WebSocket",
    class extends FakeWebSocket {
      constructor(url: string, protocols: string[]) {
        super(url, protocols);
        opened.push(this);
      }
    }
  );
  return opened;
}
