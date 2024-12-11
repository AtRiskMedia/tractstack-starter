import type { APIRoute } from "astro";
import { tursoClient } from "../../../utils/db/client";
import { ulid } from "ulid";
import { processEventStream } from "../../../utils/visit/processEventStream";
import { xorEncrypt } from "../../../utils/common/xor";
import type { EventPayload, SyncOptions } from "../../../types";

const PUBLIC_CONCIERGE_AUTH_SECRET = import.meta.env.PUBLIC_CONCIERGE_AUTH_SECRET;

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
        const payload = (await request.json()) as SyncOptions;

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

      case "unlock": {
        const body = await request.json();
        const { email, codeword, fingerprint, encryptedEmail, encryptedCode } = body;

        let queryArgs = [];
        let queryWhere = "";

        // Handle two cases - direct unlock vs restore
        if (encryptedEmail && encryptedCode) {
          queryWhere = "encrypted_email = ? AND encrypted_code = ?";
          queryArgs = [encryptedEmail, encryptedCode];
        } else if (email) {
          queryWhere = "email = ?";
          queryArgs = [email];
        } else {
          return new Response(
            JSON.stringify({ success: false, error: "Invalid request parameters" }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        // Look up lead
        const { rows } = await client.execute({
          sql: `SELECT 
            id, 
            first_name, 
            email, 
            password_hash,
            encrypted_code,
            contact_persona,
            short_bio 
          FROM leads 
          WHERE ${queryWhere}
          LIMIT 1`,
          args: queryArgs,
        });

        if (rows.length === 0) {
          return new Response(JSON.stringify({ success: false, error: "Profile not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }

        // For direct unlock, verify password
        if (codeword) {
          const encrypted = xorEncrypt(codeword, PUBLIC_CONCIERGE_AUTH_SECRET);
          if (encrypted !== rows[0].password_hash) {
            return new Response(JSON.stringify({ success: false, error: "Invalid credentials" }), {
              status: 401,
              headers: { "Content-Type": "application/json" },
            });
          }
        }

        // Link fingerprint if provided
        if (fingerprint) {
          await client.execute({
            sql: "UPDATE fingerprints SET lead_id = ? WHERE id = ? AND lead_id IS NULL",
            args: [rows[0].id, fingerprint],
          });
        }

        result = {
          success: true,
          data: {
            firstname: rows[0].first_name,
            contactPersona: rows[0].contact_persona,
            email: rows[0].email,
            shortBio: rows[0].short_bio,
            encryptedEmail: rows[0].encrypted_email,
            encryptedCode: rows[0].encrypted_code,
          },
        };
        break;
      }

      case "create": {
        const body = await request.json();
        const { firstname, email, codeword, persona, bio, fingerprint } = body;

        // Check if email already exists
        const { rows: existing } = await client.execute({
          sql: "SELECT id FROM leads WHERE email = ?",
          args: [email],
        });

        if (existing.length > 0) {
          return new Response(
            JSON.stringify({ success: false, error: "Email already registered" }),
            {
              status: 409,
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        const leadId = ulid();
        const encrypted = xorEncrypt(codeword, PUBLIC_CONCIERGE_AUTH_SECRET);

        await client.execute({
          sql: `INSERT INTO leads (id, first_name, email, password_hash, contact_persona, short_bio, 
          encrypted_email, encrypted_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            leadId,
            firstname,
            email,
            encrypted,
            persona,
            bio,
            xorEncrypt(email, PUBLIC_CONCIERGE_AUTH_SECRET),
            encrypted,
          ],
        });

        await client.execute({
          sql: "UPDATE fingerprints SET lead_id = ? WHERE id = ?",
          args: [leadId, fingerprint],
        });

        result = {
          success: true,
          data: {
            encryptedEmail: xorEncrypt(email, PUBLIC_CONCIERGE_AUTH_SECRET),
            encryptedCode: encrypted,
          },
        };
        break;
      }

      case "update": {
        const body = await request.json();
        const { firstname, email, codeword, persona, bio, fingerprint } = body;

        // Verify codeword matches before allowing update
        const { rows } = await client.execute({
          sql: `SELECT l.id, l.password_hash 
          FROM leads l 
          JOIN fingerprints f ON l.id = f.lead_id 
          WHERE f.id = ?`,
          args: [fingerprint],
        });

        if (rows.length === 0) {
          return new Response(JSON.stringify({ success: false, error: "Profile not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }

        const encrypted = xorEncrypt(codeword, PUBLIC_CONCIERGE_AUTH_SECRET);
        if (encrypted !== rows[0].password_hash) {
          return new Response(JSON.stringify({ success: false, error: "Invalid credentials" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        await client.execute({
          sql: `UPDATE leads 
          SET first_name = ?, email = ?, contact_persona = ?, short_bio = ?, changed = CURRENT_TIMESTAMP
          WHERE id = ?`,
          args: [firstname, email, persona, bio, rows[0].id],
        });

        result = {
          success: true,
          data: {
            encryptedEmail: xorEncrypt(email, PUBLIC_CONCIERGE_AUTH_SECRET),
            encryptedCode: encrypted,
          },
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
