export interface ZipEntry {
  data: Uint8Array<ArrayBuffer>;
  name: string;
}

const LOCAL_HEADER_SIGNATURE = 0x04_03_4b_50;
const CENTRAL_HEADER_SIGNATURE = 0x02_01_4b_50;
const END_SIGNATURE = 0x06_05_4b_50;
const LOCAL_HEADER_SIZE = 30;
const CENTRAL_HEADER_SIZE = 46;
const END_RECORD_SIZE = 22;
const ZIP_VERSION = 20;
const UTF8_NAMES_FLAG = 0x08_00;
const DEFLATE_METHOD = 8;
const GZIP_HEADER_SIZE = 10;
const GZIP_FLAGS_OFFSET = 3;
const GZIP_TRAILER_SIZE = 8;
const DOS_EPOCH_YEAR = 1980;

interface DosStamp {
  date: number;
  time: number;
}

interface EntryRecord {
  checksum: number;
  compressed: Uint8Array<ArrayBuffer>;
  name: Uint8Array<ArrayBuffer>;
  offset: number;
  size: number;
}

function dosStamp(date: Date): DosStamp {
  return {
    date:
      (date.getFullYear() - DOS_EPOCH_YEAR) * 512 +
      (date.getMonth() + 1) * 32 +
      date.getDate(),
    time:
      date.getHours() * 2048 +
      date.getMinutes() * 32 +
      Math.floor(date.getSeconds() / 2),
  };
}

/** gzip wraps raw deflate data and ends with the CRC-32 zip needs, so the browser computes both natively. */
async function deflateEntry(data: Uint8Array<ArrayBuffer>) {
  const stream = new Response(data).body?.pipeThrough(
    new CompressionStream("gzip")
  );
  const gzip = new Uint8Array(await new Response(stream).arrayBuffer());
  if (gzip[GZIP_FLAGS_OFFSET] !== 0) {
    throw new Error("The browser wrote an unexpected gzip header.");
  }
  const trailer = new DataView(gzip.buffer, gzip.length - GZIP_TRAILER_SIZE);
  return {
    checksum: trailer.getUint32(0, true),
    compressed: gzip.slice(GZIP_HEADER_SIZE, gzip.length - GZIP_TRAILER_SIZE),
  };
}

function writeCommonFields(
  view: DataView,
  start: number,
  options: { record: EntryRecord; stamp: DosStamp }
) {
  const { record, stamp } = options;
  view.setUint16(start, ZIP_VERSION, true);
  view.setUint16(start + 2, UTF8_NAMES_FLAG, true);
  view.setUint16(start + 4, DEFLATE_METHOD, true);
  view.setUint16(start + 6, stamp.time, true);
  view.setUint16(start + 8, stamp.date, true);
  view.setUint32(start + 10, record.checksum, true);
  view.setUint32(start + 14, record.compressed.length, true);
  view.setUint32(start + 18, record.size, true);
  view.setUint16(start + 22, record.name.length, true);
  view.setUint16(start + 24, 0, true);
}

function localHeader(record: EntryRecord, stamp: DosStamp) {
  const bytes = new Uint8Array(LOCAL_HEADER_SIZE + record.name.length);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, LOCAL_HEADER_SIGNATURE, true);
  writeCommonFields(view, 4, { record, stamp });
  bytes.set(record.name, LOCAL_HEADER_SIZE);
  return bytes;
}

function centralHeader(record: EntryRecord, stamp: DosStamp) {
  const bytes = new Uint8Array(CENTRAL_HEADER_SIZE + record.name.length);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, CENTRAL_HEADER_SIGNATURE, true);
  view.setUint16(4, ZIP_VERSION, true);
  writeCommonFields(view, 6, { record, stamp });
  view.setUint32(42, record.offset, true);
  bytes.set(record.name, CENTRAL_HEADER_SIZE);
  return bytes;
}

function endRecord(options: {
  count: number;
  directoryOffset: number;
  directorySize: number;
}) {
  const bytes = new Uint8Array(END_RECORD_SIZE);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, END_SIGNATURE, true);
  view.setUint16(8, options.count, true);
  view.setUint16(10, options.count, true);
  view.setUint32(12, options.directorySize, true);
  view.setUint32(16, options.directoryOffset, true);
  return bytes;
}

export async function createZipArchive(
  entries: ZipEntry[],
  modifiedAt: Date = new Date()
): Promise<Blob> {
  const stamp = dosStamp(modifiedAt);
  const encoder = new TextEncoder();
  const deflated = await Promise.all(
    entries.map(async (entry) => ({
      ...(await deflateEntry(entry.data)),
      name: encoder.encode(entry.name),
      size: entry.data.length,
    }))
  );
  const records: EntryRecord[] = [];
  const parts: Uint8Array<ArrayBuffer>[] = [];
  let offset = 0;
  for (const entry of deflated) {
    const record = { ...entry, offset };
    const header = localHeader(record, stamp);
    parts.push(header, record.compressed);
    records.push(record);
    offset += header.length + record.compressed.length;
  }
  const directory = records.map((record) => centralHeader(record, stamp));
  const directorySize = directory.reduce((size, part) => size + part.length, 0);
  const end = endRecord({
    count: records.length,
    directoryOffset: offset,
    directorySize,
  });
  return new Blob([...parts, ...directory, end], { type: "application/zip" });
}
