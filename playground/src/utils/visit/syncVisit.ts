import { auth } from "../../store/auth";
import type { AuthSettings } from "../../store/auth";

interface SyncOptions {
  fingerprint?: string;
  visitId?: string;
  encryptedCode?: string;
  encryptedEmail?: string;
  referrer?: {
    httpReferrer?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    utmTerm?: string;
    utmContent?: string;
  };
}

interface SyncResponse {
  fingerprint: string;
  visitId?: string;
  auth: boolean;
  firstname?: string;
  knownLead: boolean;
  encryptedEmail?: string;
  encryptedCode?: string;
  beliefs?: string;
  knownCorpusIds?: string[];
}

export async function syncVisit(options: SyncOptions = {}): Promise<SyncResponse> {
  try {
    const response = await fetch("/api/turso/syncVisit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(options),
    });

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error);
    }

    // Update auth store
    const authUpdate: Partial<AuthSettings> = {
      key: result.data.fingerprint,
      visitId: result.data.visitId,
      beliefs: result.data.beliefs,
      encryptedEmail: options.encryptedEmail,
      encryptedCode: options.encryptedCode,
      active: Date.now().toString(),
      hasProfile: result.data.auth ? "1" : undefined,
      knownCorpusIds: result.data.knownCorpusIds
        ? JSON.stringify(result.data.knownCorpusIds)
        : undefined,
    };

    Object.entries(authUpdate).forEach(([key, value]) => {
      auth.setKey(key as keyof AuthSettings, value);
    });

    return result.data;
  } catch (error) {
    console.error("Error in syncVisit:", error);
    throw error;
  }
}
