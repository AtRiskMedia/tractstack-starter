import { tursoClient } from "../client";
import { invalidateEntry, setCachedContentMap } from "@/store/contentCache";
import { getFullContentMap } from "@/utils/db/turso";
import type { StoryFragmentRowData } from "@/store/nodesSerializer";
import { upsertTopic } from "./upsertTopic";
import { upsertStoryFragmentDetails } from "./upsertStoryFragmentDetails";
import type { APIContext, TopicContentMap, Topic } from "@/types";

export async function upsertStoryFragment(
  rowData: StoryFragmentRowData,
  context?: APIContext
): Promise<{ success: boolean; error?: string; updatedTopics?: Topic[] }> {
  try {
    const client = await tursoClient.getClient(context);
    if (!client) {
      return { success: false, error: "Database client not available" };
    }

    // Check if multi-tenant mode is active
    const tenantId = context?.locals?.tenant?.id || "default";
    const isMultiTenant =
      import.meta.env.PUBLIC_ENABLE_MULTI_TENANT === "true" && tenantId !== `default`;

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

    if (rowData.pane_ids?.length > 0) {
      await client.execute({
        sql: "DELETE FROM storyfragment_panes WHERE storyfragment_id = ?",
        args: [rowData.id],
      });

      for (let i = 0; i < rowData.pane_ids.length; i++) {
        await client.execute({
          sql: "INSERT INTO storyfragment_panes (storyfragment_id, pane_id, weight) VALUES (?, ?, ?)",
          args: [rowData.id, rowData.pane_ids[i], i],
        });
      }
    }

    // Topics that had temporary IDs on client and were assigned real IDs
    const updatedTopics: Topic[] = [];

    if (rowData.pendingTopics) {
      const { topics, description } = rowData.pendingTopics;

      // Update description if provided
      if (description) {
        await upsertStoryFragmentDetails(rowData.id, description, context);
      }

      // Handle topics if provided
      if (topics && Array.isArray(topics)) {
        // First, delete all existing topic associations for this story fragment
        // This ensures removed topics are properly handled
        await client.execute({
          sql: "DELETE FROM storyfragment_has_topic WHERE storyfragment_id = ?",
          args: [rowData.id],
        });

        if (topics.length > 0) {
          // Get existing topics if in default mode
          let existingTopics: Topic[] = [];

          if (!isMultiTenant) {
            // Get the full content map to check for existing topics
            const contentMapData = await getFullContentMap(context);
            const topicsEntry = contentMapData.find(
              (entry: { type: string; id: string }) =>
                entry.type === "Topic" && entry.id === "all-topics"
            ) as TopicContentMap | undefined;

            if (topicsEntry && Array.isArray(topicsEntry.topics)) {
              existingTopics = topicsEntry.topics;
            }
          }

          // Create any new topics and collect all topic IDs for associations
          const topicIds: { id: number; title: string }[] = [];

          for (const topic of topics) {
            if (!topic.title) continue;

            // Convert client-side ID to numeric format or -1 if missing/invalid
            const clientTopicId = typeof topic.id === "string" ? parseInt(topic.id, 10) : topic.id;
            const numericClientId =
              clientTopicId === undefined || isNaN(clientTopicId) ? -1 : clientTopicId;

            // Check if this topic already exists in the system
            if (!isMultiTenant && existingTopics.length > 0) {
              const existingTopic = existingTopics.find(
                (t) => t.title.toLowerCase() === topic.title.toLowerCase()
              );

              if (existingTopic) {
                topicIds.push({ id: existingTopic.id, title: existingTopic.title });

                // If client had a temp ID but we found a real one, add to updatedTopics
                if (numericClientId === -1) {
                  updatedTopics.push({ id: existingTopic.id, title: existingTopic.title });
                }

                continue;
              }
            }

            // Topic doesn't exist, create it
            const result = await upsertTopic(topic.title, context);

            if (result.success && result.id > 0) {
              topicIds.push({ id: result.id, title: topic.title });

              // Only add to updatedTopics if client had a temp ID (-1)
              if (numericClientId === -1) {
                updatedTopics.push({ id: result.id, title: topic.title });
              }
            }
          }

          // Batch insert all topic associations if we have any topics to add
          if (topicIds.length > 0) {
            // Get the next available ID for the storyfragment_has_topic table
            const { rows: maxIdRows } = await client.execute({
              sql: `SELECT COALESCE(MAX(id), 0) as max_id FROM storyfragment_has_topic`,
              args: [],
            });
            let nextId = Number(maxIdRows[0].max_id) + 1;

            // Build a batch insert query for better performance
            const placeholders = topicIds.map(() => "(?, ?, ?)").join(", ");
            const values: (string | number)[] = [];

            topicIds.forEach(({ id }) => {
              values.push(nextId++, rowData.id, id);
            });

            await client.execute({
              sql: `INSERT INTO storyfragment_has_topic (id, storyfragment_id, topic_id) 
                    VALUES ${placeholders}`,
              args: values,
            });
          }
        }
      }
    }

    // Only invalidate cache in non-multi-tenant mode
    if (!isMultiTenant) {
      invalidateEntry("storyfragment", rowData.id);
      setCachedContentMap([]);
    }

    return {
      success: true,
      updatedTopics: updatedTopics.length > 0 ? updatedTopics : undefined,
    };
  } catch (error) {
    console.error("Error in upsertStoryFragment:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
