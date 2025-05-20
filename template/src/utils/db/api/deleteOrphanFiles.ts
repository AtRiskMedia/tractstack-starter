import { tursoClient } from "../client";
import { invalidateEntry, setCachedContentMap } from "@/store/contentCache";
import type { APIContext } from "@/types";

export async function deleteOrphanFiles(
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

    const fileIds = Array.isArray(ids) ? ids : [ids];
    if (fileIds.length === 0) {
      return { success: true, deleted: 0 };
    }
    const placeholders = fileIds.map(() => "?").join(",");

    try {
      await client.execute({
        sql: `DELETE FROM file_panes WHERE file_id IN (${placeholders})`,
        args: fileIds,
      });
      const { rowsAffected } = await client.execute({
        sql: `DELETE FROM files WHERE id IN (${placeholders})`,
        args: fileIds,
      });

      if (!isMultiTenant && rowsAffected > 0) {
        fileIds.forEach((id) => {
          invalidateEntry("file", id);
        });
        setCachedContentMap([]);
      }

      return { success: true, deleted: rowsAffected };
    } catch (error) {
      throw error;
    }
  } catch (error) {
    console.error("Error in deleteOrphanFiles:", error);
    return {
      success: false,
      deleted: 0,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
