import { tursoClient } from "../client";
import type { PaneFileRowData } from "@/store/nodesSerializer";

export async function upsertPaneFile(
  rowData: PaneFileRowData
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = await tursoClient.getClient();
    if (!client) {
      return { success: false, error: "Database client not available" };
    }

    await client.execute({
      sql: `INSERT INTO file_pane (pane_id, file_id)
            VALUES (?, ?)
            ON CONFLICT(pane_id, file_id) DO NOTHING`,
      args: [rowData.pane_id, rowData.file_id],
    });

    return { success: true };
  } catch (error) {
    console.error("Error in upsertPaneFile:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
