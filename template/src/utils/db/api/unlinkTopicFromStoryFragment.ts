import { tursoClient } from "@/utils/db/client";
import type { APIContext } from "@/types";

export async function unlinkTopicFromStoryFragment(
  storyFragmentId: string,
  topicId: number,
  context?: APIContext
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = await tursoClient.getClient(context);
    if (!client) {
      return { success: false, error: "Database client not available" };
    }

    await client.execute({
      sql: `DELETE FROM storyfragment_has_topic 
            WHERE storyfragment_id = ? AND topic_id = ?`,
      args: [storyFragmentId, topicId],
    });

    return { success: true };
  } catch (error) {
    console.error("Error in unlinkTopicFromStoryFragment:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
