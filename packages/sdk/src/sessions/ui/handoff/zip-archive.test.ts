import { expect, it } from "vitest";
import { createZipArchive } from "./zip-archive";

const encoder = new TextEncoder();
const LOCAL_HEADER_SIGNATURE = 0x04_03_4b_50;
const CENTRAL_HEADER_SIGNATURE = 0x02_01_4b_50;
const END_SIGNATURE = 0x06_05_4b_50;
const LOCAL_HEADER_SIZE = 30;
const CENTRAL_HEADER_SIZE = 46;
const END_RECORD_SIZE = 22;
const DEFLATE_METHOD = 8;
const CRC32_CHECK_VALUE = 0xcb_f4_39_26;

async function archiveView(
  entries: { data: Uint8Array<ArrayBuffer>; name: string }[]
) {
  const blob = await createZipArchive(entries);
  return new DataView(await blob.arrayBuffer());
}

function readText(view: DataView, offset: number, length: number): string {
  return new TextDecoder().decode(
    new Uint8Array(view.buffer, view.byteOffset + offset, length)
  );
}

async function inflate(bytes: Uint8Array<ArrayBuffer>): Promise<string> {
  const stream = new Response(bytes).body?.pipeThrough(
    new DecompressionStream("deflate-raw")
  );
  return await new Response(stream).text();
}

it("deflates each file and records its size and standard CRC-32", async () => {
  const view = await archiveView([
    { data: encoder.encode("123456789"), name: "brief.md" },
  ]);

  expect(view.getUint32(0, true)).toBe(LOCAL_HEADER_SIGNATURE);
  expect(view.getUint16(8, true)).toBe(DEFLATE_METHOD);
  expect(view.getUint32(14, true)).toBe(CRC32_CHECK_VALUE);
  expect(view.getUint32(22, true)).toBe(9);
  expect(readText(view, LOCAL_HEADER_SIZE, 8)).toBe("brief.md");
  const compressedSize = view.getUint32(18, true);
  const dataStart = LOCAL_HEADER_SIZE + "brief.md".length;
  const compressed = new Uint8Array(
    view.buffer.slice(dataStart, dataStart + compressedSize)
  );
  expect(await inflate(compressed)).toBe("123456789");
});

it("indexes every file in a central directory the end record points to", async () => {
  const view = await archiveView([
    { data: encoder.encode("brief"), name: "brief.md" },
    { data: new Uint8Array([1, 2, 3]), name: "evidence/E1-0214.png" },
  ]);
  const end = view.byteLength - END_RECORD_SIZE;

  expect(view.getUint32(end, true)).toBe(END_SIGNATURE);
  expect(view.getUint16(end + 10, true)).toBe(2);
  const directoryOffset = view.getUint32(end + 16, true);
  expect(view.getUint32(directoryOffset, true)).toBe(CENTRAL_HEADER_SIGNATURE);
  expect(readText(view, directoryOffset + CENTRAL_HEADER_SIZE, 8)).toBe(
    "brief.md"
  );

  const secondEntry = directoryOffset + CENTRAL_HEADER_SIZE + "brief.md".length;
  expect(view.getUint32(secondEntry, true)).toBe(CENTRAL_HEADER_SIGNATURE);
  const secondLocalOffset = view.getUint32(secondEntry + 42, true);
  expect(view.getUint32(secondLocalOffset, true)).toBe(LOCAL_HEADER_SIGNATURE);
  expect(readText(view, secondLocalOffset + LOCAL_HEADER_SIZE, 20)).toBe(
    "evidence/E1-0214.png"
  );
});
