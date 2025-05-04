import { tursoClient } from "../client";
import type { APIContext } from "@/types";

export async function deleteEpinet(
  id: string,
  context?: APIContext
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = await tursoClient.getClient(context);
    if (!client) {
      return { success: false, error: "Database client not available" };
    }

    const { rowsAffected } = await client.execute({
      sql: `DELETE FROM epinets WHERE id = ?`,
      args: [id],
    });

    if (rowsAffected === 0) {
      return { success: false, error: `Epinet with ID ${id} not found` };
    }

    return { success: true };
  } catch (error) {
    console.error(`Error in deleteEpinet for id ${id}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
