import { tursoClient } from "../client";
import type { ImageFileRowData } from "@/store/nodesSerializer";

export async function upsertFile(
  rowData: ImageFileRowData
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = await tursoClient.getClient();
    if (!client) {
      return { success: false, error: "Database client not available" };
    }

    await client.execute({
      sql: `INSERT INTO files (id, filename, alt_description, url, src_set)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              filename = excluded.filename,
              alt_description = excluded.alt_description,
              url = excluded.url,
              src_set = excluded.src_set`,
      args: [
        rowData.id,
        rowData.filename,
        rowData.alt_description || "Alt description missing",
        rowData.url,
        rowData.src_set || null,
      ],
    });

    return { success: true };
  } catch (error) {
    console.error("Error in upsertFile:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
