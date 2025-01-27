import { upsertResourceByIdRowData } from "../turso";
import type { ResourceNode } from "@/types";
import type { ResourceRowData } from "@/store/nodesSerializer";

export async function upsertResourceNode(
  resourceNode: ResourceNode
): Promise<{ success: boolean; error?: string }> {
  try {
    const resourceData: ResourceRowData = {
      id: resourceNode.id,
      title: resourceNode.title,
      slug: resourceNode.slug,
      oneliner: resourceNode.oneliner,
      options_payload: JSON.stringify(resourceNode.optionsPayload),
      ...(typeof resourceNode.category === "string"
        ? { category_slug: resourceNode.category }
        : {}),
      ...(typeof resourceNode.actionLisp === "string"
        ? { action_lisp: resourceNode.actionLisp }
        : {}),
    };

    await upsertResourceByIdRowData(resourceData);
    return { success: true };
  } catch (error) {
    console.error("Error in upsertResource:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to upsert resource",
    };
  }
}
