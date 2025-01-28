import { tursoClient } from "../client";
import type { PaneRowData, MarkdownRowData } from "@/store/nodesSerializer";

export async function upsertPane(
  rowData: PaneRowData,
  markdownData?: MarkdownRowData
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = await tursoClient.getClient();
    if (!client) {
      return { success: false, error: "Database client not available" };
    }

    // Handle markdown update first if provided
    if (markdownData) {
      await client.execute({
        sql: `INSERT INTO markdowns (id, markdown_body)
              VALUES (?, ?)
              ON CONFLICT(id) DO UPDATE SET
                markdown_body = excluded.markdown_body`,
        args: [markdownData.id, markdownData.markdown_body],
      });
    }

    // Update pane
    await client.execute({
      sql: `INSERT INTO panes (
              id, title, slug, pane_type, created, changed,
              options_payload, is_context_pane, markdown_id
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              title = excluded.title,
              slug = excluded.slug,
              pane_type = excluded.pane_type,
              changed = excluded.changed,
              options_payload = excluded.options_payload,
              is_context_pane = excluded.is_context_pane,
              markdown_id = excluded.markdown_id`,
      args: [
        rowData.id,
        rowData.title,
        rowData.slug,
        rowData.pane_type,
        rowData.created,
        rowData.changed,
        rowData.options_payload,
        rowData.is_context_pane,
        rowData.markdown_id || null,
      ],
    });

    return { success: true };
  } catch (error) {
    console.error("Error in upsertPane:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
