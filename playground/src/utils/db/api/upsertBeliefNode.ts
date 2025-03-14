import { tursoClient } from "../client";
import type { BeliefNode } from "@/types";
import type { BeliefRowData } from "@/store/nodesSerializer";
import type { APIContext } from "@/types";

export async function upsertBeliefNode(
  node: BeliefNode,
  context?: APIContext
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = await tursoClient.getClient(context);
    if (!client) {
      return { success: false, error: "Database client not available" };
    }

    const rowData: BeliefRowData = {
      id: node.id,
      title: node.title,
      slug: node.slug,
      scale: node.scale,
      ...(Array.isArray(node.customValues) ? { custom_values: node.customValues.join(",") } : {}),
    };

    await client.execute({
      sql: `INSERT INTO beliefs (id, title, slug, scale, custom_values)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              title = excluded.title,
              slug = excluded.slug,
              scale = excluded.scale,
              custom_values = excluded.custom_values`,
      args: [rowData.id, rowData.title, rowData.slug, rowData.scale, rowData.custom_values || null],
    });

    return { success: true };
  } catch (error) {
    console.error("Error in upsertBeliefNode:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
