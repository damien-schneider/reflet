const IPV4_PATTERN = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
const HEXTET_PATTERN = /^[0-9a-f]{1,4}$/;
const BRACKETS_PATTERN = /^\[|\]$/g;
const IPV6_HEXTET_COUNT = 8;
const IPV4_BITS = 32;
const HEXTET_BITS = 16;

const NON_PUBLIC_IPV4_CIDRS: readonly (readonly [string, number])[] = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
];

const parseIpv4 = (address: string): number | null => {
  const match = IPV4_PATTERN.exec(address);
  if (!match) {
    return null;
  }
  const octets = match.slice(1).map(Number);
  if (octets.some((octet) => octet > 255)) {
    return null;
  }
  return octets.reduce((value, octet) => value * 256 + octet, 0);
};

const sharesPrefix = (
  address: number,
  base: number,
  { prefixLength, totalBits }: { prefixLength: number; totalBits: number }
): boolean => {
  const hostSpan = 2 ** (totalBits - prefixLength);
  return Math.floor(address / hostSpan) === Math.floor(base / hostSpan);
};

const isNonPublicIpv4 = (address: number): boolean =>
  NON_PUBLIC_IPV4_CIDRS.some(([base, prefixLength]) =>
    sharesPrefix(address, parseIpv4(base) ?? 0, {
      prefixLength,
      totalBits: IPV4_BITS,
    })
  );

const ipv4AsHextets = (dotted: string): string[] | null => {
  const value = parseIpv4(dotted);
  if (value === null) {
    return null;
  }
  const hextetSpan = 2 ** HEXTET_BITS;
  return [
    Math.floor(value / hextetSpan).toString(16),
    (value % hextetSpan).toString(16),
  ];
};

const splitIpv6Group = (group: string): string[] | null => {
  if (group === "") {
    return [];
  }
  const parts = group.split(":");
  const last = parts.pop() ?? "";
  const embeddedIpv4 = last.includes(".") ? ipv4AsHextets(last) : [last];
  return embeddedIpv4 ? [...parts, ...embeddedIpv4] : null;
};

const expandIpv6 = (address: string): number[] | null => {
  const groups = address.split("::");
  if (groups.length > 2) {
    return null;
  }
  const head = splitIpv6Group(groups[0] ?? "");
  const tail = groups.length === 2 ? splitIpv6Group(groups[1] ?? "") : [];
  if (!(head && tail)) {
    return null;
  }
  const zeroFill = IPV6_HEXTET_COUNT - head.length - tail.length;
  const isCompressed = groups.length === 2;
  if (zeroFill < 0 || (isCompressed ? zeroFill === 0 : zeroFill !== 0)) {
    return null;
  }
  const hextets = [...head, ...new Array<string>(zeroFill).fill("0"), ...tail];
  if (!hextets.every((hextet) => HEXTET_PATTERN.test(hextet))) {
    return null;
  }
  return hextets.map((hextet) => Number.parseInt(hextet, 16));
};

const hasFirstHextetPrefix = (
  firstHextet: number,
  { base, prefixLength }: { base: number; prefixLength: number }
): boolean =>
  sharesPrefix(firstHextet, base, { prefixLength, totalBits: HEXTET_BITS });

const isNonPublicIpv6 = (hextets: number[]): boolean => {
  const [first = 0, second = 0, third = 0] = hextets;
  const high = hextets[6] ?? 0;
  const low = hextets[7] ?? 0;
  const zeroUpTo = (end: number) =>
    hextets.slice(0, end).every((hextet) => hextet === 0);

  const embedsIpv4 =
    zeroUpTo(6) ||
    (zeroUpTo(5) && hextets[5] === 0xff_ff) ||
    (first === 0x64 &&
      second === 0xff_9b &&
      hextets.slice(2, 6).every((hextet) => hextet === 0));
  if (embedsIpv4) {
    const isUnspecifiedOrLoopback = zeroUpTo(7) && low <= 1;
    return (
      isUnspecifiedOrLoopback || isNonPublicIpv4(high * 2 ** HEXTET_BITS + low)
    );
  }
  if (first === 0x20_02) {
    return isNonPublicIpv4(second * 2 ** HEXTET_BITS + third);
  }
  const isLocalNat64 = first === 0x64 && second === 0xff_9b && third === 1;
  const isTeredo = first === 0x20_01 && second === 0;
  const isOrchid = first === 0x20_01 && second >= 0x10 && second <= 0x2f;
  const isDiscardOnly =
    first === 0x01_00 && hextets.slice(1, 4).every((hextet) => hextet === 0);
  return (
    isLocalNat64 ||
    isTeredo ||
    isOrchid ||
    isDiscardOnly ||
    hasFirstHextetPrefix(first, { base: 0xfc_00, prefixLength: 7 }) ||
    hasFirstHextetPrefix(first, { base: 0xfe_80, prefixLength: 10 }) ||
    hasFirstHextetPrefix(first, { base: 0xfe_c0, prefixLength: 10 }) ||
    hasFirstHextetPrefix(first, { base: 0xff_00, prefixLength: 8 }) ||
    (first === 0x20_01 && second === 0x0d_b8)
  );
};

/**
 * True for loopback, private, link-local, CGNAT, multicast, reserved and
 * documentation ranges, including IPv4 embedded in IPv6. Unparseable IPv6 is
 * treated as non-public. Null when the input is not an IP literal.
 */
export const isNonPublicIpAddress = (address: string): boolean | null => {
  const literal = address.replace(BRACKETS_PATTERN, "").toLowerCase();
  const ipv4 = parseIpv4(literal);
  if (ipv4 !== null) {
    return isNonPublicIpv4(ipv4);
  }
  if (!literal.includes(":")) {
    return null;
  }
  const hextets = expandIpv6(literal.split("%")[0] ?? "");
  return hextets ? isNonPublicIpv6(hextets) : true;
};
