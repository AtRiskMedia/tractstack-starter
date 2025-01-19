import type { Client } from "@libsql/client";
import { ulid } from "ulid";
import type { EventPayload, EventStream } from "../../types";

const DEBUG = false;

async function processBeliefEvent(
  client: Client,
  event: EventStream,
  visit_id: string,
  fingerprint_id: string
): Promise<void> {
  // Get belief ID from slug
  const checkBeliefQuery = {
    sql: "SELECT id FROM beliefs WHERE slug = ?",
    args: [event.id],
  };
  if (DEBUG) console.log(checkBeliefQuery);
  const { rows: beliefRows } = await client.execute(checkBeliefQuery);

  if (!beliefRows.length) {
    console.error(`Missing belief for event:`, event);
    return;
  }

  const beliefId = beliefRows[0].id;
  if (!beliefId) {
    console.error(`Invalid belief ID for event:`, event);
    return;
  }

  try {
    // Handle UNSET by deleting existing belief
    if (event.verb === "UNSET") {
      const deleteQuery = {
        sql: "DELETE FROM heldbeliefs WHERE belief_id = ? AND fingerprint_id = ?",
        args: [beliefId, fingerprint_id],
      };
      if (DEBUG) console.log(deleteQuery);
      await client.execute(deleteQuery);
      return;
    }

    // Record action for non-UNSET verbs
    const actionQuery = {
      sql: `INSERT INTO actions 
        (id, object_id, object_type, visit_id, fingerprint_id, verb, created_at) 
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      args: [ulid(), beliefId, event.type, visit_id, fingerprint_id, event.verb],
    };
    if (DEBUG) console.log(actionQuery);
    await client.execute(actionQuery);

    // Check for existing belief state
    const checkHeldBeliefQuery = {
      sql: "SELECT verb FROM heldbeliefs WHERE belief_id = ? AND fingerprint_id = ?",
      args: [beliefId, fingerprint_id],
    };
    if (DEBUG) console.log(checkHeldBeliefQuery);
    const { rows: existingBelief } = await client.execute(checkHeldBeliefQuery);

    // Update or insert belief state using belief ID
    if (existingBelief.length > 0) {
      const updateQuery = {
        sql: `UPDATE heldbeliefs 
              SET verb = ?, object = ?, updated_at = CURRENT_TIMESTAMP 
              WHERE belief_id = ? AND fingerprint_id = ?`,
        args: [event.verb, event.object || null, beliefId, fingerprint_id],
      };
      if (DEBUG) console.log(updateQuery);
      await client.execute(updateQuery);
    } else {
      const insertQuery = {
        sql: `INSERT INTO heldbeliefs (id, belief_id, fingerprint_id, verb, object)
              VALUES (?, ?, ?, ?, ?)`,
        args: [ulid(), beliefId, fingerprint_id, event.verb, event.object || null],
      };
      if (DEBUG) console.log(insertQuery);
      await client.execute(insertQuery);
    }
  } catch (error) {
    console.error(`Error processing belief event:`, error);
    throw error;
  }
}

export async function processEventStream(client: Client, payload: EventPayload) {
  const { events, referrer, visit } = payload;
  const { fingerprint_id, visit_id } = visit;

  // Handle campaign tracking
  let campaign_id: string | null = null;
  if (referrer?.utmCampaign) {
    const selectQuery = {
      sql: "SELECT id FROM campaigns WHERE name = ?",
      args: [referrer.utmCampaign],
    };
    if (DEBUG) console.log(selectQuery);
    const { rows } = await client.execute(selectQuery);

    if (rows.length > 0) {
      campaign_id = rows[0].id as string;
    } else {
      campaign_id = ulid();
      const insertQuery = {
        sql: `INSERT INTO campaigns 
              (id, name, source, medium, term, content, http_referrer)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [
          campaign_id,
          referrer.utmCampaign,
          referrer.utmSource || null,
          referrer.utmMedium || null,
          referrer.utmTerm || null,
          referrer.utmContent || null,
          referrer.httpReferrer || null,
        ],
      };
      if (DEBUG) console.log(insertQuery);
      await client.execute(insertQuery);
    }

    if (campaign_id) {
      const updateQuery = {
        sql: "UPDATE visits SET campaign_id = ? WHERE id = ?",
        args: [campaign_id, visit_id],
      };
      if (DEBUG) console.log(updateQuery);
      await client.execute(updateQuery);
    }
  }

  // Process each event
  for (const event of events) {
    try {
      if (event.type === "Belief") {
        await processBeliefEvent(client, event, visit_id, fingerprint_id);
        continue;
      }

      // Record standard action
      const actionQuery = {
        sql: `INSERT INTO actions 
              (id, object_id, object_type, visit_id, fingerprint_id, verb, duration, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        args: [
          ulid(),
          event.id,
          event.type,
          visit_id,
          fingerprint_id,
          event.verb,
          event.duration || null,
        ],
      };
      if (DEBUG) console.log(actionQuery);
      await client.execute(actionQuery);
    } catch (error) {
      console.error(`Error processing event:`, event, error);
      throw error;
    }
  }
}
