const BYTES_PER_CONVERSION = 0x80_00;

export function bytesToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += BYTES_PER_CONVERSION) {
    binary += String.fromCharCode(
      ...bytes.subarray(offset, offset + BYTES_PER_CONVERSION)
    );
  }
  return btoa(binary);
}
