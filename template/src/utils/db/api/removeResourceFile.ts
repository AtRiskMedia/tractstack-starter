import type { APIContext } from "@/types";
import { tursoClient } from "@/utils/db/client";

interface RemoveResourceFileData {
  resourceId: string;
  fileId: string;
}

export async function removeResourceFile(
  data: RemoveResourceFileData,
  context?: APIContext
): Promise<{ success: boolean; orphaned: boolean }> {
  try {
    const client = await tursoClient.getClient(context);
    if (!client) return { success: false, orphaned: false };

    // Get file info before removal for potential cleanup
    const { rows: fileRows } = await client.execute({
      sql: `SELECT url FROM files WHERE id = ?`,
      args: [data.fileId],
    });

    const fileUrl = fileRows[0]?.url as string | undefined;

    // Remove the relationship
    await client.execute({
      sql: `DELETE FROM files_resource WHERE resource_id = ? AND file_id = ?`,
      args: [data.resourceId, data.fileId],
    });

    // Check if file is orphaned (no other relationships)
    const { rows: paneUses } = await client.execute({
      sql: `SELECT COUNT(*) as count FROM file_panes WHERE file_id = ?`,
      args: [data.fileId],
    });

    const { rows: resourceUses } = await client.execute({
      sql: `SELECT COUNT(*) as count FROM files_resource WHERE file_id = ?`,
      args: [data.fileId],
    });

    const isOrphaned =
      Number(paneUses[0]?.count || 0) === 0 && Number(resourceUses[0]?.count || 0) === 0;

    if (isOrphaned) {
      // Delete the file record
      await client.execute({
        sql: `DELETE FROM files WHERE id = ?`,
        args: [data.fileId],
      });

      // Delete the actual file from filesystem
      if (fileUrl && context) {
        try {
          const response = await fetch("/api/fs/deleteResourceImage", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ path: fileUrl }),
          });

          if (!response.ok) {
            console.error("Failed to delete orphaned file from filesystem:", fileUrl);
          }
        } catch (error) {
          console.error("Error deleting orphaned file:", error);
        }
      }
    }

    return { success: true, orphaned: isOrphaned };
  } catch (error) {
    console.error("Error in removeResourceFile:", error);
    return { success: false, orphaned: false };
  }
}
