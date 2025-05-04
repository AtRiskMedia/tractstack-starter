import { tursoClient } from "../client";
import type { EpinetDatum } from "@/types";
import type { APIContext } from "@/types";

export async function upsertEpinet(
  epinet: EpinetDatum,
  context?: APIContext
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = await tursoClient.getClient(context);
    if (!client) {
      return { success: false, error: "Database client not available" };
    }

    // Create options_payload with steps and promoted flag
    const options_payload = JSON.stringify({
      steps: epinet.steps || [],
      promoted: !!epinet.promoted,
    });

    await client.execute({
      sql: `INSERT INTO epinets (id, title, options_payload)
            VALUES (?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              title = excluded.title,
              options_payload = excluded.options_payload`,
      args: [epinet.id, epinet.title, options_payload],
    });

    return { success: true };
  } catch (error) {
    console.error("Error in upsertEpinet:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
