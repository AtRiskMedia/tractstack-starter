import { tursoClient } from "../client";
import { invalidateEntry, setCachedContentMap } from "@/store/contentCache";
import type { TractStackRowData } from "@/store/nodesSerializer";

export async function upsertTractStack(
  rowData: TractStackRowData
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = await tursoClient.getClient();
    if (!client) {
      return { success: false, error: "Database client not available" };
    }
    await client.execute({
      sql: `INSERT INTO tractstacks (id, title, slug, social_image_path)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              title = excluded.title,
              slug = excluded.slug,
              social_image_path = excluded.social_image_path`,
      args: [rowData.id, rowData.title, rowData.slug, rowData.social_image_path || null],
    });
    invalidateEntry("tractstack", rowData.id);
    setCachedContentMap([]);
    return { success: true };
  } catch (error) {
    console.error("Error in upsertTractStack:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
