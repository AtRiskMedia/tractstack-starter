// versionCache.ts
import { map } from "nanostores";

// 1 hour TTL in milliseconds
const VERSION_CHECK_TTL = 60 * 60 * 1000;

export interface RemoteVersionInfo {
  storykeep: number;
  concierge: number;
  lastChecked: number;
}

// Initialize version store - only store remote information
export const remoteVersionStore = map<RemoteVersionInfo>({
  storykeep: 0,
  concierge: 0,
  lastChecked: 0,
});

// Check if version cache is still valid
export function isRemoteVersionCacheValid(): boolean {
  const { lastChecked } = remoteVersionStore.get();
  return lastChecked > 0 && Date.now() - lastChecked < VERSION_CHECK_TTL;
}

// Fetch remote version information
export async function updateRemoteVersionCache(): Promise<boolean> {
  try {
    // Fetch release version info
    const releaseResponse = await fetch("https://release.freewebpress.org");
    if (!releaseResponse.ok) throw new Error("Failed to fetch release version");
    const releaseData = await releaseResponse.json();

    // Update store with just the remote data
    remoteVersionStore.set({
      storykeep: releaseData.storykeep,
      concierge: releaseData.concierge,
      lastChecked: Date.now(),
    });

    return true;
  } catch (error) {
    console.error("Error updating remote version cache:", error);
    return false;
  }
}

// Get remote version info, updating cache if needed
export async function getRemoteVersionInfo(): Promise<RemoteVersionInfo> {
  if (!isRemoteVersionCacheValid()) {
    await updateRemoteVersionCache();
  }
  return remoteVersionStore.get();
}
