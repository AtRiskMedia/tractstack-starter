import { tursoClient } from "../client";
import type { PaneRowData, MarkdownRowData } from "@/store/nodesSerializer";

interface UpsertPaneRequest {
  rowData: PaneRowData;
  markdownData?: MarkdownRowData;
}

export async function upsertPane(
  requestData: UpsertPaneRequest
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = await tursoClient.getClient();
    if (!client) {
      return { success: false, error: "Database client not available" };
    }

    // Handle markdown update first if provided
    if (requestData.markdownData) {
      await client.execute({
        sql: `INSERT INTO markdowns (id, body)
              VALUES (?, ?)
              ON CONFLICT(id) DO UPDATE SET
                body = excluded.body`,
        args: [requestData.markdownData.id, requestData.markdownData.markdown_body],
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
        requestData.rowData.id,
        requestData.rowData.title,
        requestData.rowData.slug,
        requestData.rowData.pane_type,
        requestData.rowData.created,
        requestData.rowData.changed,
        requestData.rowData.options_payload,
        requestData.rowData.is_context_pane,
        requestData.rowData.markdown_id || null,
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
