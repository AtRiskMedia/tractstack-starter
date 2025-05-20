import { tursoClient } from "../client";
import type { APIContext } from "@/types";

export async function deleteOrphanMenus(
  ids: string | string[],
  context?: APIContext
): Promise<{ success: boolean; deleted: number; error?: string }> {
  try {
    const client = await tursoClient.getClient(context);
    if (!client) {
      return { success: false, deleted: 0, error: "Database client not available" };
    }

    // Convert single ID to array for consistent handling
    const menuIds = Array.isArray(ids) ? ids : [ids];
    if (menuIds.length === 0) {
      return { success: true, deleted: 0 };
    }

    // Build placeholders for the SQL query
    const placeholders = menuIds.map(() => "?").join(",");

    // Delete the menus
    const { rowsAffected } = await client.execute({
      sql: `DELETE FROM menus WHERE id IN (${placeholders})`,
      args: menuIds,
    });

    return { success: true, deleted: rowsAffected };
  } catch (error) {
    console.error("Error in deleteOrphanMenus:", error);
    return {
      success: false,
      deleted: 0,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
