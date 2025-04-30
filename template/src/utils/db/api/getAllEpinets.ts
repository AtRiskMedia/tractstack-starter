import { tursoClient } from "../client";
import type { EpinetDatum } from "@/types";
import type { APIContext } from "@/types";

export async function getAllEpinets(context?: APIContext): Promise<EpinetDatum[]> {
  try {
    const client = await tursoClient.getClient(context);
    if (!client) {
      return [];
    }

    const { rows } = await client.execute(`
      SELECT id, title, options_payload 
      FROM epinets
    `);

    return rows.map((row) => {
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
    });
  } catch (error) {
    console.error("Error in getAllEpinets:", error);
    return [];
  }
}
