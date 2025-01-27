import { upsertTractStackByIdRowData } from "../turso";
import type { TractStackNode } from "@/types";
import type { TractStackRowData } from "@/store/nodesSerializer";

export async function upsertTractStackNode(
  tractStackNode: TractStackNode
): Promise<{ success: boolean; error?: string }> {
  try {
    const tractStackData: TractStackRowData = {
      id: tractStackNode.id,
      title: tractStackNode.title,
      slug: tractStackNode.slug,
      ...(typeof tractStackNode.socialImagePath === "string"
        ? { social_image_path: tractStackNode.socialImagePath }
        : {}),
    };

    await upsertTractStackByIdRowData(tractStackData);
    return { success: true };
  } catch (error) {
    console.error("Error in upsertTractStack:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to upsert tractstack",
    };
  }
}
