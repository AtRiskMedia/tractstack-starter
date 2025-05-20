import { tursoClient } from "../client";
import type { APIContext } from "@/types";

export async function deleteOrphanStoryFragments(
  ids: string | string[],
  context?: APIContext
): Promise<{ success: boolean; deleted: number; error?: string }> {
  try {
    const client = await tursoClient.getClient(context);
    if (!client) {
      return { success: false, deleted: 0, error: "Database client not available" };
    }

    const fragmentIds = Array.isArray(ids) ? ids : [ids];
    if (fragmentIds.length === 0) {
      return { success: true, deleted: 0 };
    }
    const placeholders = fragmentIds.map(() => "?").join(",");

    try {
      await client.execute({
        sql: `DELETE FROM storyfragment_panes WHERE storyfragment_id IN (${placeholders})`,
        args: fragmentIds,
      });

      await client.execute({
        sql: `DELETE FROM storyfragment_details WHERE storyfragment_id IN (${placeholders})`,
        args: fragmentIds,
      });

      await client.execute({
        sql: `DELETE FROM storyfragment_has_topic WHERE storyfragment_id IN (${placeholders})`,
        args: fragmentIds,
      });

      await client.execute({
        sql: `DELETE FROM actions WHERE object_id IN (${placeholders}) AND object_type = 'StoryFragment'`,
        args: fragmentIds,
      });

      const { rowsAffected } = await client.execute({
        sql: `DELETE FROM storyfragments WHERE id IN (${placeholders})`,
        args: fragmentIds,
      });

      return { success: true, deleted: rowsAffected };
    } catch (error) {
      throw error;
    }
  } catch (error) {
    console.error("Error in deleteOrphanStoryFragments:", error);
    return {
      success: false,
      deleted: 0,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
