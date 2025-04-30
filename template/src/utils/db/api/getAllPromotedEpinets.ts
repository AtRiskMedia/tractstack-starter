import { tursoClient } from "../client";
import type { EpinetDatum } from "@/types";
import type { APIContext } from "@/types";

export async function getAllPromotedEpinets(context?: APIContext): Promise<EpinetDatum[]> {
  try {
    const client = await tursoClient.getClient(context);
    if (!client) {
      return [];
    }

    const { rows } = await client.execute(`
      SELECT id, title, options_payload 
      FROM epinets
    `);

    const promotedEpinets: EpinetDatum[] = [];

    rows.forEach((row) => {
      try {
        if (row.options_payload) {
          const options = JSON.parse(String(row.options_payload));
          let steps = [];
          let promoted = false;

          if (Array.isArray(options)) {
            steps = options;
          } else if (typeof options === "object") {
            if (Array.isArray(options.steps)) {
              steps = options.steps;
            }
            promoted = !!options.promoted;
          }

          // Only include promoted epinets
          if (promoted) {
            promotedEpinets.push({
              id: String(row.id),
              title: String(row.title),
              steps,
              promoted: true,
            });
          }
        }
      } catch (parseError) {
        console.error(`Error parsing options_payload for epinet ${row.id}:`, parseError);
      }
    });

    return promotedEpinets;
  } catch (error) {
    console.error("Error in getAllPromotedEpinets:", error);
    return [];
  }
}
