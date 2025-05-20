import { tursoClient } from "../client";
import { invalidateEntry, setCachedContentMap } from "@/store/contentCache";
import type { APIContext } from "@/types";

export async function deleteOrphanMenus(
  ids: string | string[],
  context?: APIContext
): Promise<{ success: boolean; deleted: number; error?: string }> {
  const tenantId = context?.locals?.tenant?.id || "default";
  const isMultiTenant =
    import.meta.env.PUBLIC_ENABLE_MULTI_TENANT === "true" && tenantId !== `default`;

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

    if (!isMultiTenant && rowsAffected > 0) {
      menuIds.forEach((id) => {
        invalidateEntry("menu", id);
      });
      setCachedContentMap([]);
    }

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
