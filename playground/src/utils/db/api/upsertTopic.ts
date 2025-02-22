import { tursoClient } from "@/utils/db/client";

export async function upsertTopic(
  title: string
): Promise<{ success: boolean; id: number; error?: string }> {
  try {
    const client = await tursoClient.getClient();
    if (!client) {
      return { success: false, id: -1, error: "Database client not available" };
    }

    // First, check if the topic already exists (case-insensitive match)
    const { rows: existingRows } = await client.execute({
      sql: `SELECT id FROM storyfragment_topics WHERE LOWER(title) = LOWER(?)`,
      args: [title.trim()],
    });

    if (existingRows.length > 0) {
      // Return existing topic ID
      return { success: true, id: Number(existingRows[0].id) };
    }

    // Topic doesn't exist, create new one
    // Get the next available ID
    const { rows: maxIdRows } = await client.execute({
      sql: `SELECT COALESCE(MAX(id), 0) as max_id FROM storyfragment_topics`,
      args: [], // Add empty args array
    });

    const nextId = Number(maxIdRows[0].max_id) + 1;

    // Insert new topic
    await client.execute({
      sql: `INSERT INTO storyfragment_topics (id, title) VALUES (?, ?)`,
      args: [nextId, title.trim()],
    });

    return { success: true, id: nextId };
  } catch (error) {
    console.error("Error in upsertTopic:", error);
    return {
      success: false,
      id: -1,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
