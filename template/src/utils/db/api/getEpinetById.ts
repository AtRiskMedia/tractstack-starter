import { tursoClient } from "../client";
import type { EpinetDatum } from "@/types";
import type { APIContext } from "@/types";

export async function getEpinetById(id: string, context?: APIContext): Promise<EpinetDatum | null> {
  try {
    const client = await tursoClient.getClient(context);
    if (!client) {
      return null;
    }

    const { rows } = await client.execute({
      sql: `SELECT id, title, options_payload 
            FROM epinets 
            WHERE id = ?`,
      args: [id],
    });

    if (rows.length === 0) {
      return null;
    }

    const row = rows[0];
    const epinet: EpinetDatum = {
      id: String(row.id),
      title: String(row.title),
      steps: [],
    };

    try {
      // Parse the options_payload which contains the steps
      if (row.options_payload) {
        epinet.steps = JSON.parse(String(row.options_payload));
      }
    } catch (parseError) {
      console.error(`Error parsing options_payload for epinet ${row.id}:`, parseError);
    }

    return epinet;
  } catch (error) {
    console.error(`Error in getEpinetById for id ${id}:`, error);
    return null;
  }
}
