import { tursoClient } from "../client";
import { getTailwindWhitelist } from "../data/tursoTailwindWhitelist";

export async function getUniqueTailwindClasses(id: string) {
  try {
    const client = await tursoClient.getClient();
    if (!client) return [];

    // Get all pane options payloads except the current pane
    const { rows } = await client.execute({
      sql: `SELECT options_payload FROM pane WHERE id != ?`,
      args: [id],
    });

    return getTailwindWhitelist(rows);
  } catch (error) {
    console.error("Error fetching pane payloads:", error);
    throw error;
  }
}
