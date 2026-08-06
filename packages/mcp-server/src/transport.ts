const DEFAULT_BASE_URL = "https://harmless-clam-802.convex.site";

export interface ClientConfig {
  readonly baseUrl?: string;
  readonly secretKey: string;
}

export class RefletTransport {
  protected readonly secretKey: string;
  protected readonly baseUrl: string;

  constructor(config: ClientConfig) {
    this.secretKey = config.secretKey;
    this.baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
  }

  protected async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.secretKey}`,
      "Content-Type": "application/json",
    };

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        body: body ? JSON.stringify(body) : undefined,
        headers,
        method,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to connect";
      throw new Error(`Network error: ${message}`);
    }

    const text = await response.text();

    if (!text) {
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
      return {} as T;
    }

    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`Invalid JSON response (status ${response.status})`);
    }

    if (!response.ok) {
      const errorMessage =
        typeof data === "object" &&
        data !== null &&
        "error" in data &&
        typeof (data as Record<string, unknown>).error === "string"
          ? (data as { error: string }).error
          : `Request failed with status ${response.status}`;
      throw new Error(errorMessage);
    }

    return data as T;
  }

  // ============================================
  // Query param helpers
  // ============================================

  protected buildQuery(
    params: Record<string, string | number | boolean | undefined>
  ): string {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        searchParams.set(key, String(value));
      }
    }
    const query = searchParams.toString();
    return query ? `?${query}` : "";
  }
}
