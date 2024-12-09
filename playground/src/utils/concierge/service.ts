export class ConciergeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConciergeError";
  }
}

export async function requestConcierge(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const baseUrl = import.meta.env.PRIVATE_CONCIERGE_BASE_URL;
  const secret = import.meta.env.PRIVATE_CONCIERGE_AUTH_SECRET;

  if (!baseUrl || !secret) {
    throw new ConciergeError("Missing concierge configuration");
  }

  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  headers.set("X-Concierge-Secret", secret);

  try {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Concierge error response:`, errorBody);
      throw new ConciergeError(`HTTP error! status: ${response.status}, body: ${errorBody}`);
    }

    return response;
  } catch (error) {
    if (error instanceof ConciergeError) {
      throw error;
    }
    console.error("Concierge fetch error:", error);
    throw new ConciergeError(error instanceof Error ? error.message : "Unknown error occurred");
  }
}
