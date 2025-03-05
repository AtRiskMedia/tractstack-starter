import { tursoClient } from "@/utils/db/client";
import type { APIContext } from "@/types";

export interface StoryFragmentDetails {
  description?: string;
}

export async function getStoryFragmentDetails(
  storyFragmentId: string,
  context?: APIContext
): Promise<{ success: boolean; data: StoryFragmentDetails | null; error?: string }> {
  try {
    const client = await tursoClient.getClient(context);
    if (!client) {
      return { success: false, data: null, error: "Database client not available" };
    }

    const { rows } = await client.execute({
      sql: `SELECT description FROM storyfragment_details WHERE storyfragment_id = ?`,
      args: [storyFragmentId],
    });

    if (rows.length === 0) {
      return { success: true, data: null };
    }

    const description = typeof rows[0].description === "string" ? rows[0].description : "";
    if (description) return { success: true, data: { description } };
    else return { success: false, data: null };
  } catch (error) {
    console.error("Error in getStoryFragmentDetails:", error);
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
