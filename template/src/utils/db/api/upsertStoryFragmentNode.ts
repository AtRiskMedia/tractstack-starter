import { tursoClient } from "../client";
import type { StoryFragmentNode } from "@/types";
import type { StoryFragmentRowData } from "@/store/nodesSerializer";

export async function upsertStoryFragmentNode(
  node: StoryFragmentNode
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = await tursoClient.getClient();
    if (!client) {
      return { success: false, error: "Database client not available" };
    }

    // Transform StoryFragmentNode to StoryFragmentRowData
    const rowData: StoryFragmentRowData = {
      id: node.id,
      title: node.title,
      slug: node.slug,
      tractstack_id: node.parentId || "",
      pane_ids: node.paneIds,
      created: node.created?.toISOString() || new Date().toISOString(),
      changed: node.changed?.toISOString() || new Date().toISOString(),
      ...(typeof node.menuId === "string" ? { menu_id: node.menuId } : {}),
      ...(typeof node.tailwindBgColour === "string"
        ? { tailwind_background_colour: node.tailwindBgColour }
        : {}),
      ...(typeof node.socialImagePath === "string"
        ? { social_image_path: node.socialImagePath }
        : {}),
    };

    // Perform upsert operation
    await client.execute({
      sql: `INSERT INTO storyfragments (
              id, title, slug, tractstack_id, created, changed,
              menu_id, social_image_path, tailwind_background_colour
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              title = excluded.title,
              slug = excluded.slug,
              tractstack_id = excluded.tractstack_id,
              changed = excluded.changed,
              menu_id = excluded.menu_id,
              social_image_path = excluded.social_image_path,
              tailwind_background_colour = excluded.tailwind_background_colour`,
      args: [
        rowData.id,
        rowData.title,
        rowData.slug,
        rowData.tractstack_id,
        rowData.created,
        rowData.changed,
        rowData.menu_id || null,
        rowData.social_image_path || null,
        rowData.tailwind_background_colour || null,
      ],
    });

    // Handle pane relationships in storyfragment_pane table
    if (node.paneIds && node.paneIds.length > 0) {
      // First delete existing relationships
      await client.execute({
        sql: "DELETE FROM storyfragment_panes WHERE storyfragment_id = ?",
        args: [node.id],
      });

      // Then insert new relationships
      for (const paneId of node.paneIds) {
        await client.execute({
          sql: "INSERT INTO storyfragment_panes (storyfragment_id, pane_id) VALUES (?, ?)",
          args: [node.id, paneId],
        });
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Error in upsertStoryFragmentNode:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
