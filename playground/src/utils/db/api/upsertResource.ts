import { tursoClient } from "../client";
import { invalidateEntry, setCachedContentMap } from "@/store/contentCache";
import type { ResourceRowData } from "@/store/nodesSerializer";
import type { APIContext } from "@/types";

export async function upsertResource(
  rowData: ResourceRowData,
  context?: APIContext
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = await tursoClient.getClient(context);
    if (!client) {
      return { success: false, error: "Database client not available" };
    }
    await client.execute({
      sql: `INSERT INTO resources (id, title, slug, oneliner, options_payload, category_slug, action_lisp)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              title = excluded.title,
              slug = excluded.slug,
              oneliner = excluded.oneliner,
              options_payload = excluded.options_payload,
              category_slug = excluded.category_slug,
              action_lisp = excluded.action_lisp`,
      args: [
        rowData.id,
        rowData.title,
        rowData.slug,
        rowData.oneliner,
        rowData.options_payload,
        rowData.category_slug || null,
        rowData.action_lisp || null,
      ],
    });
    invalidateEntry("resource", rowData.id);
    setCachedContentMap([]);
    return { success: true };
  } catch (error) {
    console.error("Error in upsertResource:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
