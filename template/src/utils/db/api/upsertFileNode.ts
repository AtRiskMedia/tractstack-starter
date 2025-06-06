import { upsertFileByIdRowData } from "../turso";
import type { ImageFileNode } from "@/types";
import type { ImageFileRowData } from "@/store/nodesSerializer";
import type { APIContext } from "@/types";

export async function upsertFileNode(
  fileNode: ImageFileNode,
  context?: APIContext
): Promise<{ success: boolean; error?: string }> {
  try {
    const fileData: ImageFileRowData = {
      id: fileNode.id,
      filename: fileNode.filename,
      alt_description: fileNode.altDescription || "Alt description missing",
      url: fileNode.src,
      ...(typeof fileNode.srcSet === "string" ? { src_set: fileNode.srcSet } : {}),
    };

    await upsertFileByIdRowData(fileData, context);
    return { success: true };
  } catch (error) {
    console.error("Error in upsertFile:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to upsert file",
    };
  }
}
