import { tursoClient } from "../client";
import { invalidateEntry, setCachedContentMap } from "@/store/contentCache";
import type { MenuRowData } from "@/store/nodesSerializer";

export async function upsertMenu(
  rowData: MenuRowData
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = await tursoClient.getClient();
    if (!client) {
      return { success: false, error: "Database client not available" };
    }
    await client.execute({
      sql: `INSERT INTO menus (id, title, theme, options_payload)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              title = excluded.title,
              theme = excluded.theme,
              options_payload = excluded.options_payload`,
      args: [rowData.id, rowData.title, rowData.theme, rowData.options_payload],
    });
    invalidateEntry("menu", rowData.id);
    setCachedContentMap([]);
    return { success: true };
  } catch (error) {
    console.error("Error in upsertMenu:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
