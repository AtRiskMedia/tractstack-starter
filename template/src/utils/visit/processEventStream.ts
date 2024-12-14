/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Client } from "@libsql/client";
import { ulid } from "ulid";
import type { EventPayload, EventStream, ContentMap } from "../../types";

const DEBUG = true;

function debugEventProcessing(events: EventStream[], contentMap: ContentMap[]) {
  const eventNodes = new Set(events.map((e) => e.id));
  const parentNodes = new Set(events.filter((e) => e.parentId).map((e) => e.parentId));
  const tractStackNodes = new Set(
    contentMap.filter((c) => c.type === "TractStack").map((c) => c.id)
  );
  console.debug(`Event Processing Debug:
    Total Events: ${events.length}
    Content Map Entries: ${contentMap.length}
    Unique Event Nodes: ${eventNodes.size}
    Parent Nodes: ${parentNodes.size}
    TractStack Nodes: ${tractStackNodes.size}
    Event Types: ${Array.from(new Set(events.map((e) => e.type))).join(", ")}
    Content Map Types: ${Array.from(new Set(contentMap.map((c) => c.type))).join(", ")}
    
    Missing Nodes: ${Array.from(eventNodes).filter((id) => !contentMap.find((c) => c.id === id))}
    
    Missing Parents: ${Array.from(parentNodes).filter((id) => !contentMap.find((c) => c.id === id))}

    Missing TractStacks: ${Array.from(tractStackNodes).filter(
      (id) => !contentMap.find((c) => c.id === id && c.type === "TractStack")
    )}
  `);
  console.log(events);
  console.log(``);
}

function extractNeededCorpusData(
  events: EventStream[],
  fullContentMap?: ContentMap[]
): ContentMap[] {
  if (!fullContentMap || !Array.isArray(fullContentMap)) {
    return [];
  }

  const neededIds = new Set<string>();
  const neededParentIds = new Set<string>();
  const tractStackIds = new Set<string>();

  events.forEach((event) => {
    if (event.type !== "Belief") {
      neededIds.add(event.id);

      if (event.parentId) {
        neededParentIds.add(event.parentId);
        const parent = fullContentMap.find((item) => item.id === event.parentId);
        if (parent?.parentId) {
          tractStackIds.add(parent.parentId);
        }
      }

      if (event.targetId) {
        neededIds.add(event.targetId);
      }
    }
  });

  return fullContentMap.filter(
    (item) => neededIds.has(item.id) || neededParentIds.has(item.id) || tractStackIds.has(item.id)
  );
}

async function ensureNodesExist(client: Client, contentMap: ContentMap[]): Promise<void> {
  // Group nodes by type
  const tractStacks = contentMap.filter((node) => node.type === "TractStack");
  const storyFragments = contentMap.filter((node) => node.type === "StoryFragment");
  const panes = contentMap.filter((node) => node.type === "Pane");

  // Process TractStacks first
  for (const node of tractStacks) {
    const query = {
      sql: "INSERT OR IGNORE INTO corpus (id, object_id, object_type, object_name) VALUES (?, ?, ?, ?)",
      args: [ulid(), node.id, node.type, node.title || "Unknown"],
    };
    if (DEBUG) console.log(query);
    await client.execute(query);
  }

  // Then StoryFragments (which may depend on TractStacks)
  for (const node of storyFragments) {
    const insertQuery = {
      sql: "INSERT OR IGNORE INTO corpus (id, object_id, object_type, object_name) VALUES (?, ?, ?, ?)",
      args: [ulid(), node.id, node.type, node.title || "Unknown"],
    };
    if (DEBUG) console.log(insertQuery);
    await client.execute(insertQuery);

    if (node.parentId) {
      const selectNodeQuery = {
        sql: "SELECT id FROM corpus WHERE object_id = ? AND object_type = ?",
        args: [node.id, node.type],
      };
      if (DEBUG) console.log(selectNodeQuery);
      const { rows: nodeRows } = await client.execute(selectNodeQuery);

      const selectParentQuery = {
        sql: "SELECT id FROM corpus WHERE object_id = ? AND object_type = 'TractStack'",
        args: [node.parentId],
      };
      if (DEBUG) console.log(selectParentQuery);
      const { rows: parentRows } = await client.execute(selectParentQuery);

      if (nodeRows.length > 0 && parentRows.length > 0) {
        const parentQuery = {
          sql: "INSERT OR IGNORE INTO parents (id, object_id, parent_id) VALUES (?, ?, ?)",
          args: [ulid(), nodeRows[0].id, parentRows[0].id],
        };
        if (DEBUG) console.log(parentQuery);
        await client.execute(parentQuery);
      }
    }
  }

  // Finally Panes (which may depend on StoryFragments)
  for (const node of panes) {
    const insertQuery = {
      sql: "INSERT OR IGNORE INTO corpus (id, object_id, object_type, object_name) VALUES (?, ?, ?, ?)",
      args: [ulid(), node.id, node.type, node.title || "Unknown"],
    };
    if (DEBUG) console.log(insertQuery);
    await client.execute(insertQuery);

    if (node.parentId) {
      const selectNodeQuery = {
        sql: "SELECT id FROM corpus WHERE object_id = ? AND object_type = ?",
        args: [node.id, node.type],
      };
      if (DEBUG) console.log(selectNodeQuery);
      const { rows: nodeRows } = await client.execute(selectNodeQuery);

      const selectParentQuery = {
        sql: "SELECT id FROM corpus WHERE object_id = ? AND object_type = 'StoryFragment'",
        args: [node.parentId],
      };
      if (DEBUG) console.log(selectParentQuery);
      const { rows: parentRows } = await client.execute(selectParentQuery);

      if (nodeRows.length > 0 && parentRows.length > 0) {
        const parentQuery = {
          sql: "INSERT OR IGNORE INTO parents (id, object_id, parent_id) VALUES (?, ?, ?)",
          args: [ulid(), nodeRows[0].id, parentRows[0].id],
        };
        if (DEBUG) console.log(parentQuery);
        await client.execute(parentQuery);
      }
    }
  }
}

async function processBeliefEvent(
  client: Client,
  event: EventStream,
  visit_id: string,
  fingerprint_id: string
): Promise<void> {
  // Use INSERT OR IGNORE for belief corpus entry
  const beliefId = ulid();
  const insertCorpusQuery = {
    sql: "INSERT OR IGNORE INTO corpus (id, object_id, object_type, object_name) VALUES (?, ?, ?, ?)",
    args: [beliefId, event.id, "Belief", event.id],
  };
  if (DEBUG) console.log(insertCorpusQuery);
  await client.execute(insertCorpusQuery);

  // Get corpus ID for belief
  const selectQuery = {
    sql: "SELECT id FROM corpus WHERE object_id = ? AND object_type = 'Belief'",
    args: [event.id],
  };
  if (DEBUG) console.log(selectQuery);
  const { rows } = await client.execute(selectQuery);

  const beliefCorpusId = rows[0].id;

  // Always record an INTERACTED action
  const interactedQuery = {
    sql: `INSERT INTO actions (id, object_id, visit_id, fingerprint_id, verb)
          VALUES (?, ?, ?, ?, 'INTERACTED')`,
    args: [ulid(), beliefCorpusId, visit_id, fingerprint_id],
  };
  if (DEBUG) console.log(interactedQuery);
  await client.execute(interactedQuery);

  if (event.verb === "UNSET") {
    const deleteQuery = {
      sql: "DELETE FROM heldbeliefs WHERE belief_id = ? AND fingerprint_id = ?",
      args: [beliefCorpusId, fingerprint_id],
    };
    if (DEBUG) console.log(deleteQuery);
    await client.execute(deleteQuery);
    return;
  }

  // Check for existing belief state
  const checkBeliefQuery = {
    sql: "SELECT verb, object FROM heldbeliefs WHERE belief_id = ? AND fingerprint_id = ?",
    args: [beliefCorpusId, fingerprint_id],
  };
  if (DEBUG) console.log(checkBeliefQuery);
  const { rows: existingBelief } = await client.execute(checkBeliefQuery);

  if (existingBelief.length > 0) {
    const updateQuery = {
      sql: `UPDATE heldbeliefs 
            SET verb = ?, object = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE belief_id = ? AND fingerprint_id = ?`,
      args: [event.verb, event.object || null, beliefCorpusId, fingerprint_id],
    };
    if (DEBUG) console.log(updateQuery);
    await client.execute(updateQuery);
  } else {
    const insertQuery = {
      sql: `INSERT INTO heldbeliefs (id, belief_id, fingerprint_id, verb, object)
            VALUES (?, ?, ?, ?, ?)`,
      args: [ulid(), beliefCorpusId, fingerprint_id, event.verb, event.object || null],
    };
    if (DEBUG) console.log(insertQuery);
    await client.execute(insertQuery);
  }
}

export async function processEventStream(client: Client, payload: EventPayload) {
  const { events, referrer, visit, contentMap: rawContentMap } = payload;
  const { fingerprint_id, visit_id } = visit;
  const contentMap = extractNeededCorpusData(events, rawContentMap);

  if (DEBUG) debugEventProcessing(events, contentMap);

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

  // Ensure all needed nodes exist first with proper hierarchy
  if (contentMap.length) {
    await ensureNodesExist(client, contentMap);
  }

  // Process each event
  for (const event of events) {
    try {
      if (event.type === "Belief") {
        await processBeliefEvent(client, event, visit_id, fingerprint_id);
        continue;
      }

      // Get corpus ID for event
      const selectQuery = {
        sql: "SELECT id FROM corpus WHERE object_id = ? AND object_type = ?",
        args: [event.id, event.type],
      };
      if (DEBUG) console.log(selectQuery);
      const { rows } = await client.execute(selectQuery);

      if (rows.length === 0) {
        if (DEBUG) console.error(`Missing corpus entry for event:`, event);
        continue;
      }

      // Record the action
      const actionQuery = {
        sql: `INSERT INTO actions 
              (id, object_id, visit_id, fingerprint_id, verb)
              VALUES (?, ?, ?, ?, ?)`,
        args: [ulid(), rows[0].id, visit_id, fingerprint_id, event.verb],
      };
      if (DEBUG) console.log(actionQuery);
      await client.execute(actionQuery);
    } catch (error) {
      console.error(`Error processing event:`, event, error);
      throw error;
    }
  }
}
