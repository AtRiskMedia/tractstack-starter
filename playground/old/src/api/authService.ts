import type { APIContext } from "astro";

const BACKEND_URL = import.meta.env.PRIVATE_CONCIERGE_BASE_URL;
const CONCIERGE_SECRET = import.meta.env.PRIVATE_CONCIERGE_SECRET;

export async function proxyRequestWithRefresh(
  url: string,
  options: RequestInit,
  context: APIContext
) {
  let response = await fetch(url, options);

  if (response.status === 401) {
    const cookies = context.cookies;
    const refreshToken = cookies.get("refreshToken")?.value;

    if (refreshToken) {
      const { newAccessToken, newRefreshToken } = await refreshTokenRequest(refreshToken);

      if (newAccessToken) {
        const newHeaders = new Headers(options.headers);
        newHeaders.set("Authorization", `Bearer ${newAccessToken}`);
        const newOptions: RequestInit = {
          ...options,
          headers: newHeaders,
        };
        response = await fetch(url, newOptions);

        if (newRefreshToken) {
          cookies.set("refreshToken", newRefreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: "strict",
            path: "/",
            maxAge: 60 * 60 * 24 * 30, // 30 days
          });
        }

        if (response.status === 401) {
          // Log this as it's unexpected - refresh token didn't work
          console.error("Authentication failed after token refresh");
        }

        return { response, newAccessToken };
      } else {
        // Log this as the refresh token is invalid or expired
        console.error("Failed to refresh authentication token");
      }
    } else {
      // Log this as there's no refresh token available
      console.error("No refresh token available for authentication");
    }
  }

  if (!response.ok) {
    const errorBody = await response.text();
    if (response.status !== 401) {
      // Only log non-401 errors, as 401s have been handled above
      console.error(`Error response from server:`, errorBody);
    }
    throw new Error(`HTTP error! status: ${response.status}, body: ${errorBody}`);
  }

  return { response };
}

async function refreshTokenRequest(refreshToken: string) {
  try {
    const response = await fetch(`${BACKEND_URL}/auth/refreshToken`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.jwt && data.refreshToken) {
        return { newAccessToken: data.jwt, newRefreshToken: data.refreshToken };
      }
    }
  } catch (error) {
    console.error("Error refreshing token:", error);
  }

  return { newAccessToken: null, newRefreshToken: null };
}

export async function proxyRequestToConcierge(url: string, options: RequestInit) {
  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");
  headers.set("X-Concierge-Secret", CONCIERGE_SECRET);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Error response from server:`, errorBody);
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorBody}`);
    }

    return { response };
  } catch (error) {
    console.error("Fetch error:", error);
    throw error;
  }
}
