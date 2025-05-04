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
      promoted: false,
    };

    try {
      // Parse the options_payload which contains the steps and promoted flag
      if (row.options_payload) {
        const options = JSON.parse(String(row.options_payload));
        if (Array.isArray(options)) {
          epinet.steps = options;
        } else if (typeof options === "object") {
          if (Array.isArray(options.steps)) {
            epinet.steps = options.steps;
          }
          epinet.promoted = !!options.promoted;
        }
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
