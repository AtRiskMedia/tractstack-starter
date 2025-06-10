import type { APIContext } from "@/types";
import { tursoClient } from "@/utils/db/client";
import { ulid } from "ulid";
import { upsertFileByIdRowData } from "@/utils/db/turso";

interface ResourceFileData {
  fileId: string;
  resourceId: string;
  filename: string;
  altDescription: string;
  src: string;
  srcSet?: string;
}

export async function upsertResourceFile(
  data: ResourceFileData,
  context?: APIContext
): Promise<boolean> {
  try {
    const client = await tursoClient.getClient(context);
    if (!client) return false;

    // First, upsert the file
    const fileData = {
      id: data.fileId,
      filename: data.filename,
      alt_description: data.altDescription,
      url: data.src,
      src_set: data.srcSet,
    };

    const fileResult = await upsertFileByIdRowData(fileData, context);
    if (!fileResult) return false;

    // Then create the resource-file relationship
    const relationId = ulid();
    await client.execute({
      sql: `INSERT INTO files_resource (id, resource_id, file_id)
            VALUES (?, ?, ?)
            ON CONFLICT(resource_id, file_id) DO NOTHING`,
      args: [relationId, data.resourceId, data.fileId],
    });

    return true;
  } catch (error) {
    console.error("Error in upsertResourceFile:", error);
    return false;
  }
}
