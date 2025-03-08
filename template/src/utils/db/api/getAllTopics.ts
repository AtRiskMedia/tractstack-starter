import { tursoClient } from "@/utils/db/client";
import type { APIContext } from "@/types";

export interface Topic {
  id: number;
  title: string;
}

export async function getAllTopics(
  context?: APIContext
): Promise<{ success: boolean; data: Topic[]; error?: string }> {
  try {
    const client = await tursoClient.getClient(context);
    if (!client) {
      return { success: false, data: [], error: "Database client not available" };
    }

    const { rows } = await client.execute({
      sql: `SELECT id, title FROM storyfragment_topics ORDER BY title ASC`,
      args: [],
    });

    const topics = rows.map((row) => ({
      id: Number(row.id),
      title: String(row.title),
    }));

    return { success: true, data: topics };
  } catch (error) {
    console.error("Error fetching getAllTopics:", error);
    return {
      success: false,
      data: [],
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
