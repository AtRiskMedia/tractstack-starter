import { tursoClient } from "../client";
import { getTailwindWhitelist } from "../data/tursoTailwindWhitelist";
import type { ClassNamesPayload } from "../../../types";

export async function getUniqueTailwindClasses(id: string) {
  try {
    const client = await tursoClient.getClient();
    if (!client) return [];

    // Get all pane options payloads except the current pane
    const { rows } = await client.execute({
      sql: `SELECT options_payload FROM pane WHERE id != ?`,
      args: [id],
    });

    // Extract and process payloads
    const payloads = rows
      .map((row) => {
        try {
          return typeof row.options_payload === "string"
            ? (JSON.parse(row.options_payload) as ClassNamesPayload)
            : null;
        } catch {
          return null;
        }
      })
      .filter((p): p is ClassNamesPayload => p !== null);

    return getTailwindWhitelist(payloads);
  } catch (error) {
    console.error("Error fetching pane payloads:", error);
    throw error;
  }
}
