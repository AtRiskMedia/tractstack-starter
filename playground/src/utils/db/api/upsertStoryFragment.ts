import { tursoClient } from "../client";
import { invalidateEntry, setCachedContentMap } from "@/store/contentCache";
import type { StoryFragmentRowData } from "@/store/nodesSerializer";
import { upsertTopic } from "./upsertTopic";
import { linkTopicToStoryFragment } from "./linkTopicToStoryFragment";
import { upsertStoryFragmentDetails } from "./upsertStoryFragmentDetails";

export async function upsertStoryFragment(
  rowData: StoryFragmentRowData
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = await tursoClient.getClient();
    if (!client) {
      return { success: false, error: "Database client not available" };
    }

    // Update story fragment
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

    // Handle pane relationships
    if (rowData.pane_ids?.length > 0) {
      // First delete existing relationships
      await client.execute({
        sql: "DELETE FROM storyfragment_panes WHERE storyfragment_id = ?",
        args: [rowData.id],
      });

      // Then insert new relationships
      for (let i = 0; i < rowData.pane_ids.length; i++) {
        console.log(`linking panes`, [rowData.id, rowData.pane_ids[i], i]);
        await client.execute({
          sql: "INSERT INTO storyfragment_panes (storyfragment_id, pane_id, weight) VALUES (?, ?, ?)",
          args: [rowData.id, rowData.pane_ids[i], i],
        });
      }
    }

    // Handle pending topics and details if provided
    if (rowData.pendingTopics) {
      const { topics, description } = rowData.pendingTopics;

      // Process details
      if (description) {
        await upsertStoryFragmentDetails(rowData.id, description);
      }

      // Process topics
      if (topics && Array.isArray(topics)) {
        for (const topic of topics) {
          if (!topic.title) continue;

          // Ensure the topic exists in the database
          const result = await upsertTopic(topic.title);

          if (result.success && result.id > 0) {
            // Link the topic to the story fragment
            await linkTopicToStoryFragment(rowData.id, result.id);
          }
        }
      }
    }

    invalidateEntry("storyfragment", rowData.id);
    setCachedContentMap([]);
    return { success: true };
  } catch (error) {
    console.error("Error in upsertStoryFragment:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
