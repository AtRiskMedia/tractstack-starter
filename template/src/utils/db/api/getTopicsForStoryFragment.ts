import { tursoClient } from "@/utils/db/client";
import type { Topic } from "./getAllTopics";

export async function getTopicsForStoryFragment(
  storyFragmentId: string
): Promise<{ success: boolean; data: Topic[]; error?: string }> {
  try {
    const client = await tursoClient.getClient();
    if (!client) {
      return { success: false, data: [], error: "Database client not available" };
    }

    const { rows } = await client.execute({
      sql: `SELECT t.id, t.title
            FROM storyfragment_topics t
            JOIN storyfragment_has_topic ht ON t.id = ht.topic_id
            WHERE ht.storyfragment_id = ?
            ORDER BY t.title ASC`,
      args: [storyFragmentId],
    });

    const topics = rows.map((row) => ({
      id: Number(row.id),
      title: String(row.title),
    }));

    return { success: true, data: topics };
  } catch (error) {
    console.error("Error in getTopicsForStoryFragment:", error);
    return {
      success: false,
      data: [],
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
