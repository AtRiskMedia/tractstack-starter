/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Client } from "@libsql/client";
import { v4 as uuidv4 } from "uuid";

interface VisitContext {
  fingerprint_id: string;
  visit_id: string;
}

export async function getCurrentVisit(client: Client): Promise<VisitContext> {
  // Generate or retrieve fingerprint
  const fingerprint_id = await getFingerprint(client);

  // Create new visit
  const visit_id = await createVisit(client, fingerprint_id);

  return {
    fingerprint_id,
    visit_id,
  };
}

async function getFingerprint(client: Client): Promise<string> {
  const fingerprintId = uuidv4();

  await client.execute({
    sql: "INSERT INTO fingerprints (id) VALUES (?)",
    args: [fingerprintId],
  });

  return fingerprintId;
}

async function createVisit(client: Client, fingerprint_id: string): Promise<string> {
  const visitId = uuidv4();

  await client.execute({
    sql: `INSERT INTO visits (id, fingerprint_id, campaign_id) 
          VALUES (?, ?, ?)`,
    args: [visitId, fingerprint_id, null], // campaign_id can be updated later
  });

  return visitId;
}
