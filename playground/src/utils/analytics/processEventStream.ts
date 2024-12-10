/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Client } from "@libsql/client";
import { ulid } from "ulid";
import type { EventPayload } from "../../types";

export async function processEventStream(client: Client, payload: EventPayload) {
  const { events, referrer, visit } = payload;
  const { fingerprint_id, visit_id } = visit;

  // Handle campaign tracking
  //const campaign_id: string | null = referrer?.utmCampaign
  //  ?
  if (referrer?.utmCampaign)
    await processCampaign(client, {
      name: referrer.utmCampaign,
      source: referrer.utmSource,
      medium: referrer.utmMedium,
      term: referrer.utmTerm,
      content: referrer.utmContent,
      http_referrer: referrer.httpReferrer,
    });
  //: null;

  // Process each event
  for (const event of events) {
    try {
      switch (event.type) {
        case "StoryFragment":
        case "Pane":
        case "Context": {
          // Ensure object exists in corpus
          const eventId = ulid();
          const objectCorpusId = await ensureCorpusEntry(client, event.id, event.type);

          // If there's a parent, ensure it exists in corpus too
          let parentCorpusId = null;
          if (event.parentId) {
            parentCorpusId = await ensureCorpusEntry(
              client,
              event.parentId,
              event.type === "Pane" ? "StoryFragment" : "TractStack"
            );
          }

          await client.execute({
            sql: `INSERT INTO actions 
                  (id, object_id, visit_id, fingerprint_id, verb, parent_id)
                  VALUES (?, ?, ?, ?, ?, ?)`,
            args: [eventId, objectCorpusId, visit_id, fingerprint_id, event.verb, parentCorpusId],
          });
          break;
        }

        case "Belief": {
          const newEventId = ulid();
          const beliefCorpusId = await ensureCorpusEntry(client, event.id, "Belief");
          // Convert any object value to string or null
          const objectStr = event.object !== undefined ? String(event.object) : null;

          if (event.verb === "UNSET") {
            await client.execute({
              sql: `DELETE FROM heldbeliefs 
                    WHERE belief_id = ? AND fingerprint_id = ?`,
              args: [beliefCorpusId, fingerprint_id],
            });
          } else {
            const { rows } = await client.execute({
              sql: `SELECT 1 FROM heldbeliefs 
                    WHERE belief_id = ? AND fingerprint_id = ?`,
              args: [beliefCorpusId, fingerprint_id],
            });

            if (rows.length > 0) {
              await client.execute({
                sql: `UPDATE heldbeliefs 
                      SET verb = ?, object = ?, updated_at = CURRENT_TIMESTAMP 
                      WHERE belief_id = ? AND fingerprint_id = ?`,
                args: [event.verb, objectStr, beliefCorpusId, fingerprint_id],
              });
            } else {
              await client.execute({
                sql: `INSERT INTO heldbeliefs 
                      (id, belief_id, fingerprint_id, verb, object)
                      VALUES (?, ?, ?, ?, ?)`,
                args: [newEventId, beliefCorpusId, fingerprint_id, event.verb, objectStr],
              });
            }
          }
          break;
        }
      }
    } catch (error) {
      console.error(`Error processing event:`, event, error);
      throw error;
    }
  }
}

async function processCampaign(client: Client, campaign: any) {
  // Check if campaign exists
  const { rows } = await client.execute({
    sql: "SELECT id FROM campaigns WHERE name = ?",
    args: [campaign.name],
  });

  if (rows.length > 0) {
    return rows[0].id;
  }

  // Create new campaign
  const campaignId = ulid();
  await client.execute({
    sql: `INSERT INTO campaigns 
          (id, name, source, medium, term, content, http_referrer) 
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      campaignId,
      campaign.name,
      campaign.source,
      campaign.medium,
      campaign.term,
      campaign.content,
      campaign.http_referrer,
    ],
  });

  return campaignId;
}

async function ensureCorpusEntry(
  client: Client,
  objectId: string,
  objectType: string,
  objectName: string = ""
): Promise<string> {
  // Check if corpus entry exists
  const { rows } = await client.execute({
    sql: "SELECT id FROM corpus WHERE object_id = ? AND object_type = ?",
    args: [objectId, objectType],
  });

  if (rows.length > 0) {
    return rows[0].id as string;
  }

  // Create new corpus entry
  const corpusId = ulid();
  await client.execute({
    sql: `INSERT INTO corpus (id, object_id, object_type, object_name)
          VALUES (?, ?, ?, ?)`,
    args: [corpusId, objectId, objectType, objectName],
  });

  return corpusId;
}
