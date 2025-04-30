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
    });
  } catch (error) {
    console.error("Error in getAllEpinets:", error);
    return [];
  }
}
