import { tursoClient } from "../client";
import { ulid } from "ulid";
import type { SyncOptions } from "@/types";

interface SyncVisitResponse {
  fingerprint: string;
  visitId: string;
  auth: boolean;
  knownLead: boolean;
}

export async function syncVisit(payload: SyncOptions): Promise<SyncVisitResponse> {
  const client = await tursoClient.getClient();
  if (!client) {
    throw new Error("No database connection");
  }

  // Create new fingerprint entry
  const fingerprintId = payload?.fingerprint || ulid();
  if (!payload?.fingerprint) {
    await client.execute({
      sql: "INSERT INTO fingerprints (id) VALUES (?)",
      args: [fingerprintId],
    });
  }

  // Handle campaign/referrer data if present
  let campaignId = null;
  if (payload.referrer?.utmCampaign) {
    const { rows: campaignRows } = await client.execute({
      sql: "SELECT id FROM campaigns WHERE name = ?",
      args: [payload.referrer.utmCampaign],
    });

    if (campaignRows.length > 0) {
      campaignId = String(campaignRows[0].id);
    } else {
      campaignId = ulid();
      await client.execute({
        sql: `INSERT INTO campaigns (id, name, source, medium, term, content, http_referrer)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [
          campaignId,
          payload.referrer.utmCampaign,
          payload.referrer.utmSource || null,
          payload.referrer.utmMedium || null,
          payload.referrer.utmTerm || null,
          payload.referrer.utmContent || null,
          payload.referrer.httpReferrer || null,
        ],
      });
    }
  }

  // Create new visit entry if needed
  const visitId = payload?.visitId || ulid();
  if (!payload?.visitId) {
    await client.execute({
      sql: "INSERT INTO visits (id, fingerprint_id, campaign_id) VALUES (?, ?, ?)",
      args: [visitId, fingerprintId, campaignId],
    });
  }

  return {
    fingerprint: fingerprintId,
    visitId: visitId,
    auth: false,
    knownLead: false,
  };
}
