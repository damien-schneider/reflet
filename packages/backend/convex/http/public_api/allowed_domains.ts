const WILDCARD_PREFIX = "*.";

function requestHost(request: Request): string | null {
  const origin =
    request.headers.get("Origin") ?? request.headers.get("Referer");
  if (!origin) {
    return null;
  }
  try {
    return new URL(origin).host.toLowerCase();
  } catch {
    return null;
  }
}

function hostMatches(host: string, allowedDomain: string): boolean {
  if (allowedDomain.startsWith(WILDCARD_PREFIX)) {
    const base = allowedDomain.slice(WILDCARD_PREFIX.length);
    return host.endsWith(`.${base}`);
  }
  return host === allowedDomain;
}

export function hostMatchesAllowedDomains(
  host: string,
  allowedDomains: string[]
): boolean {
  return allowedDomains.some((domain) =>
    hostMatches(host, domain.toLowerCase())
  );
}

export function isRequestFromAllowedDomain(
  request: Request,
  allowedDomains: string[] | undefined
): boolean {
  if (!allowedDomains?.length) {
    return true;
  }
  const host = requestHost(request);
  return host !== null && hostMatchesAllowedDomains(host, allowedDomains);
}
