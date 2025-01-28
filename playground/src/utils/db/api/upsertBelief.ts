import { tursoClient } from "../client";
import type { BeliefRowData } from "@/store/nodesSerializer";

export async function upsertBelief(
  rowData: BeliefRowData
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = await tursoClient.getClient();
    if (!client) {
      return { success: false, error: "Database client not available" };
    }

    await client.execute({
      sql: `INSERT INTO beliefs (id, title, slug, scale, custom_values)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              title = excluded.title,
              slug = excluded.slug,
              scale = excluded.scale,
              custom_values = excluded.custom_values`,
      args: [rowData.id, rowData.title, rowData.slug, rowData.scale, rowData.custom_values || null],
    });

    return { success: true };
  } catch (error) {
    console.error("Error in upsertBelief:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
