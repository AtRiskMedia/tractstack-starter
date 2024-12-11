import type { APIRoute } from "astro";
import { tursoClient } from "../../../utils/db/client";
import { processEventStream } from "../../../utils/visit/processEventStream";
import { ulid } from "ulid";
import type { EventPayload } from "../../../types";

interface SyncVisitPayload {
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

export const POST: APIRoute = async ({ request, params }) => {
  const { operation } = params;

  try {
    const client = await tursoClient.getClient();
    if (!client) {
      return new Response(JSON.stringify({ success: false, error: "No database connection" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    let result;
    switch (operation) {
      case "syncVisit": {
        const payload = (await request.json()) as SyncVisitPayload;

        // Create new fingerprint entry
        const fingerprintId = payload?.fingerprint || ulid();
        if (!payload?.fingerprint)
          await client.execute({
            sql: "INSERT INTO fingerprints (id) VALUES (?)",
            args: [fingerprintId],
          });

        const { rows: corpusRows } = await client.execute({
          sql: `SELECT DISTINCT c.object_id 
          FROM corpus c
          INNER JOIN actions a ON a.object_id = c.id
          WHERE a.fingerprint_id = ?`,
          args: [fingerprintId],
        });

        const knownCorpusIds = corpusRows.map((row) => row.object_id);

        // Handle campaign/referrer data if present
        let campaignId = null;
        if (payload.referrer?.utmCampaign) {
          const { rows: campaignRows } = await client.execute({
            sql: "SELECT id FROM campaigns WHERE name = ?",
            args: [payload.referrer.utmCampaign],
          });

          if (campaignRows.length > 0) {
            campaignId = campaignRows[0].id;
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

        const visitId = payload?.visitId || ulid();
        if (!payload?.visitId)
          await client.execute({
            sql: "INSERT INTO visits (id, fingerprint_id, campaign_id) VALUES (?, ?, ?)",
            args: [visitId, fingerprintId, campaignId],
          });

        result = {
          success: true,
          data: {
            fingerprint: fingerprintId,
            visitId: visitId,
            auth: false,
            knownLead: false,
            knownCorpusIds,
          },
        };
        break;
      }

      case "stream": {
        const payload = await request.json();
        const fingerprintId = payload?.fingerprint;
        const visitId = payload?.visitId;
        if (!fingerprintId || !visitId)
          return new Response(
            JSON.stringify({
              success: false,
              error: "Visit not registered!",
            }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            }
          );
        if (!payload || !payload.events || !Array.isArray(payload.events)) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "Invalid event payload structure",
            }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        const eventPayload: EventPayload = {
          events: payload.events,
          referrer: payload.referrer,
          visit: {
            fingerprint_id: fingerprintId,
            visit_id: visitId,
          },
          contentMap: payload.contentMap,
        };

        await processEventStream(client, eventPayload);
        result = {
          success: true,
          message: "Events processed successfully",
        };
        break;
      }

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(`Error in turso ${operation} route:`, error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "An error occurred",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
