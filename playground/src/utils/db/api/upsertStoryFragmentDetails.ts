import { tursoClient } from "@/utils/db/client";
import type { APIContext } from "@/types";

export async function upsertStoryFragmentDetails(
  storyFragmentId: string,
  description: string,
  context?: APIContext
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = await tursoClient.getClient(context);
    if (!client) {
      return { success: false, error: "Database client not available" };
    }

    const { rows } = await client.execute({
      sql: `SELECT id FROM storyfragment_details WHERE storyfragment_id = ?`,
      args: [storyFragmentId],
    });

    if (description && rows.length > 0) {
      await client.execute({
        sql: `UPDATE storyfragment_details 
              SET description = ?
              WHERE storyfragment_id = ?`,
        args: [description, storyFragmentId],
      });
    } else if (description) {
      const { rows: maxIdRows } = await client.execute({
        sql: `SELECT COALESCE(MAX(id), 0) as max_id FROM storyfragment_details`,
        args: [],
      });

      const nextId = Number(maxIdRows[0].max_id) + 1;

      await client.execute({
        sql: `INSERT INTO storyfragment_details (id, storyfragment_id, description)
              VALUES (?, ?, ?)`,
        args: [nextId, storyFragmentId, description],
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Error in upsertStoryFragmentDetails:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
