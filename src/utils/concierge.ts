import { TOKEN, REFRESHTOKEN } from "../constant";

export const initSession = async (
  fingerprint: { fingerprint: string } | null
): Promise<any> => {
  // fingerprint is either null or pulled from localStorage
  // if no fingerprint, sync with backend
  if (typeof fingerprint?.fingerprint !== `string`) {
    const response = await fetch("/api/concierge/auth", {
      method: "POST",
      body: JSON.stringify({ fingerprint }),
      headers: {
        "Content-Type": "application/json",
      },
    });
    return await response.json();
  }
  return JSON.stringify(null);
};
