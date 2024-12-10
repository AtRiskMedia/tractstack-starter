/* eslint-disable @typescript-eslint/no-explicit-any */
import { tursoClient } from "../db/client";
import { v4 as uuidv4 } from "uuid";
import { auth } from "../../store/auth";
import type { AuthSettings } from "../../store/auth";
import type { Client } from "@libsql/client";

interface SyncResponse {
  fingerprint: string;
  neo4jEnabled: boolean;
  auth: boolean;
  firstname?: string;
  knownLead: boolean;
  encryptedEmail?: string;
  encryptedCode?: string;
  beliefs?: string;
}

interface SyncOptions {
  fingerprint?: string;
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

export async function syncVisit(options: SyncOptions = {}): Promise<SyncResponse> {
  const client = await tursoClient.getClient();

  // Default response structure
  const response: SyncResponse = {
    fingerprint: "",
    neo4jEnabled: false,
    auth: false,
    knownLead: false,
  };

  try {
    // Generate or validate fingerprint
    let fingerprintId: string;

    if (options.fingerprint) {
      // Check if fingerprint exists
      const { rows } = await client.execute({
        sql: `SELECT id, lead_id FROM fingerprints WHERE fingerprint = ?`,
        args: [options.fingerprint],
      });

      if (rows.length > 0) {
        fingerprintId = rows[0].id as string;
        if (rows[0].lead_id) {
          response.knownLead = true;
        }
      } else {
        fingerprintId = await createFingerprint(client, options.fingerprint);
      }
      response.fingerprint = options.fingerprint;
    } else {
      // Generate new fingerprint
      const newFingerprint = `t8k-${uuidv4()}`;
      fingerprintId = await createFingerprint(client, newFingerprint);
      response.fingerprint = newFingerprint;
    }

    // Handle auth if provided
    if (options.encryptedEmail && options.encryptedCode) {
      const authResult = await validateAuth(client, {
        fingerprintId,
        encryptedEmail: options.encryptedEmail,
        encryptedCode: options.encryptedCode,
      });

      if (authResult) {
        response.auth = true;
        response.firstname = authResult.firstname;
        response.knownLead = true;
      }
    }

    // Create or get active visit
    await getOrCreateVisit(client, {
      fingerprintId,
      referrer: options.referrer,
      userAgent: typeof window !== "undefined" ? window.navigator.userAgent : undefined,
    });

    // Get held beliefs if authenticated
    if (response.auth) {
      const beliefs = await getHeldBeliefs(client, fingerprintId);
      if (beliefs) {
        response.beliefs = JSON.stringify(beliefs);
      }
    }

    // Update auth store with session info
    const authUpdate: Partial<AuthSettings> = {
      key: response.fingerprint,
      neo4jEnabled: response.neo4jEnabled ? "1" : undefined,
      beliefs: response.beliefs,
      encryptedEmail: options.encryptedEmail,
      encryptedCode: options.encryptedCode,
      active: Date.now().toString(),
      hasProfile: response.auth ? "1" : undefined,
    };

    Object.entries(authUpdate).forEach(([key, value]) => {
      auth.setKey(key as keyof AuthSettings, value);
    });

    return response;
  } catch (error) {
    console.error("Error in syncVisit:", error);
    throw error;
  }
}

// Helper functions remain the same but without JWT/refresh token related code
async function createFingerprint(client: Client, fingerprint: string): Promise<string> {
  const { rows } = await client.execute({
    sql: `INSERT INTO fingerprints (id, fingerprint) VALUES (?, ?)`,
    args: [uuidv4(), fingerprint],
  });
  return rows[0].id as string;
}

async function validateAuth(
  client: Client,
  options: {
    fingerprintId: string;
    encryptedEmail: string;
    encryptedCode: string;
  }
): Promise<{ firstname: string } | null> {
  const { rows } = await client.execute({
    sql: `SELECT l.first_name 
          FROM leads l 
          JOIN fingerprints f ON f.lead_id = l.id 
          WHERE f.id = ? AND l.encrypted_email = ? AND l.encrypted_code = ?`,
    args: [options.fingerprintId, options.encryptedEmail, options.encryptedCode],
  });

  return rows.length > 0 ? { firstname: rows[0].first_name as string } : null;
}

async function getOrCreateVisit(
  client: Client,
  options: {
    fingerprintId: string;
    referrer?: any;
    userAgent?: string;
  }
): Promise<string> {
  // Check for active visit in last 24 hours
  const { rows: existingVisits } = await client.execute({
    sql: `SELECT id FROM visits 
          WHERE fingerprint_id = ? 
          AND created_at > datetime('now', '-1 day')`,
    args: [options.fingerprintId],
  });

  if (existingVisits.length > 0) {
    return existingVisits[0].id as string;
  }

  // Create new visit
  const visitId = uuidv4();
  await client.execute({
    sql: `INSERT INTO visits (
            id, fingerprint_id, http_referrer, http_user_agent,
            utm_source, utm_medium, utm_campaign, utm_term, utm_content
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      visitId,
      options.fingerprintId,
      options.referrer?.httpReferrer || null,
      options.userAgent || null,
      options.referrer?.utmSource || null,
      options.referrer?.utmMedium || null,
      options.referrer?.utmCampaign || null,
      options.referrer?.utmTerm || null,
      options.referrer?.utmContent || null,
    ],
  });

  return visitId;
}

async function getHeldBeliefs(client: Client, fingerprintId: string) {
  const { rows } = await client.execute({
    sql: `SELECT c.object_id as id, c.object_name as slug, 
          b.verb, b.object
          FROM heldbeliefs b 
          JOIN corpus c ON b.belief_id = c.id
          WHERE b.fingerprint_id = ?`,
    args: [fingerprintId],
  });

  return rows.length > 0 ? rows : null;
}
