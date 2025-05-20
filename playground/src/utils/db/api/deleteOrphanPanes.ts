import { tursoClient } from "../client";
import type { APIContext } from "@/types";

export async function deleteOrphanPanes(
  ids: string | string[],
  context?: APIContext
): Promise<{ success: boolean; deleted: number; error?: string }> {
  try {
    const client = await tursoClient.getClient(context);
    if (!client) {
      return { success: false, deleted: 0, error: "Database client not available" };
    }

    const paneIds = Array.isArray(ids) ? ids : [ids];
    if (paneIds.length === 0) {
      return { success: true, deleted: 0 };
    }
    const placeholders = paneIds.map(() => "?").join(",");

    try {
      const { rows: markdownRows } = await client.execute({
        sql: `SELECT markdown_id FROM panes WHERE id IN (${placeholders}) AND markdown_id IS NOT NULL`,
        args: paneIds,
      });

      const markdownIds = markdownRows
        .map((row) =>
          row.markdown_id && typeof row.markdown_id === "string" ? row.markdown_id : null
        )
        .filter(Boolean) as string[];

      await client.execute({
        sql: `DELETE FROM storyfragment_panes WHERE pane_id IN (${placeholders})`,
        args: paneIds,
      });

      await client.execute({
        sql: `DELETE FROM file_panes WHERE pane_id IN (${placeholders})`,
        args: paneIds,
      });

      await client.execute({
        sql: `DELETE FROM actions WHERE object_id IN (${placeholders}) AND object_type = 'Pane'`,
        args: paneIds,
      });

      const { rowsAffected } = await client.execute({
        sql: `DELETE FROM panes WHERE id IN (${placeholders})`,
        args: paneIds,
      });

      if (markdownIds.length > 0) {
        const markdownPlaceholders = markdownIds.map(() => "?").join(",");
        await client.execute({
          sql: `DELETE FROM markdowns WHERE id IN (${markdownPlaceholders})`,
          args: markdownIds,
        });
      }

      return { success: true, deleted: rowsAffected };
    } catch (error) {
      throw error;
    }
  } catch (error) {
    console.error("Error in deleteOrphanPanes:", error);
    return {
      success: false,
      deleted: 0,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
