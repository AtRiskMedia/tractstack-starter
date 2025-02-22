import { tursoClient } from "@/utils/db/client";

export async function linkTopicToStoryFragment(
  storyFragmentId: string,
  topicId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = await tursoClient.getClient();
    if (!client) {
      return { success: false, error: "Database client not available" };
    }

    // Check if the link already exists
    const { rows } = await client.execute({
      sql: `SELECT id FROM storyfragment_has_topic 
            WHERE storyfragment_id = ? AND topic_id = ?`,
      args: [storyFragmentId, topicId],
    });

    if (rows.length > 0) {
      // Link already exists
      return { success: true };
    }

    // Get the next available ID
    const { rows: maxIdRows } = await client.execute({
      sql: `SELECT COALESCE(MAX(id), 0) as max_id FROM storyfragment_has_topic`,
      args: [], // Add empty args array
    });

    const nextId = Number(maxIdRows[0].max_id) + 1;

    // Create the link
    await client.execute({
      sql: `INSERT INTO storyfragment_has_topic (id, storyfragment_id, topic_id)
            VALUES (?, ?, ?)`,
      args: [nextId, storyFragmentId, topicId],
    });

    return { success: true };
  } catch (error) {
    console.error("Error in linkTopicToStoryFragment:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
