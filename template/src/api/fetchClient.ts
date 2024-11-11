import { auth, profile, sync, locked } from "../store/auth";
import type { Referrer, IAuthStoreLoginResponse } from "../types";

const BASE_URL = `/api/concierge`;

let accessToken: string | null = null;

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const fullUrl = new URL(BASE_URL + url, window.location.origin);
  try {
    const response = await fetch(fullUrl.toString(), {
      ...options,
      headers,
      credentials: "include",
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired, try to refresh
        const refreshResponse = await fetch(`${BASE_URL}/auth/refreshToken`, {
          method: "POST",
          credentials: "include",
        });

        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          accessToken = refreshData.jwt;
          headers.set("Authorization", `Bearer ${accessToken}`);
          return fetchWithAuth(url, { ...options, headers });
        } else {
          logout();
          throw new Error("Authentication failed. Please log in again.");
        }
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const res = await response.json();
    if (res.newAccessToken) {
      accessToken = res.newAccessToken;
    }
    return res;
  } catch (error) {
    console.error("Fetch error:", error);
    throw error;
  }
}

export async function getTokens({
  fingerprint,
  codeword,
  email,
  encryptedCode,
  encryptedEmail,
  referrer,
}: {
  fingerprint?: string;
  codeword?: string;
  email?: string;
  encryptedCode?: string;
  encryptedEmail?: string;
  referrer: Referrer;
}) {
  try {
    const response = await fetchWithAuth("/auth/sync", {
      method: "POST",
      body: JSON.stringify({
        fingerprint,
        codeword,
        email,
        encryptedCode,
        encryptedEmail,
        referrer,
      }),
    });
    setRefreshedTokens(response);
    return response;
  } catch (error) {
    console.error("Authentication error:", error);
    return {
      error: error instanceof Error ? error.message : String(error),
      jwt: null,
    };
  }
}

function setRefreshedTokens(response: IAuthStoreLoginResponse) {
  if (response.jwt) {
    accessToken = response.jwt;
  }
  if (response.fingerprint) {
    auth.setKey("key", response.fingerprint);
  }
  if (response.firstname) {
    profile.set({
      ...profile.get(),
      firstname: response.firstname,
    });
  }
  if (response?.knownLead) {
    auth.setKey(`consent`, `1`);
  }
  if (response?.auth) {
    auth.setKey(`hasProfile`, `1`);
  } else {
    auth.setKey(`hasProfile`, undefined);
    auth.setKey("unlockedProfile", undefined);
  }
  auth.setKey("active", Date.now().toString());
  if (response.encryptedEmail) {
    auth.setKey("encryptedEmail", response.encryptedEmail);
  }
  if (response.encryptedCode) {
    auth.setKey("encryptedCode", response.encryptedCode);
  }
  if (response.beliefs) {
    auth.setKey("beliefs", JSON.stringify(response.beliefs));
  }
  auth.setKey("neo4jEnabled", response.neo4jEnabled ? "1" : "0");
}

function logout() {
  sync.set(false);
  locked.set(false);
  accessToken = null;
  document.cookie = "refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
}

export { fetchWithAuth };
