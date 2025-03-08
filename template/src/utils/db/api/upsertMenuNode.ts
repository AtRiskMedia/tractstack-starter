import { upsertMenuByIdRowData } from "../turso";
import type { MenuNode } from "@/types";
import type { MenuRowData } from "@/store/nodesSerializer";
import type { APIContext } from "@/types";

export async function upsertMenuNode(
  menuNode: MenuNode,
  context?: APIContext
): Promise<{ success: boolean; error?: string }> {
  try {
    const menuData: MenuRowData = {
      id: menuNode.id,
      title: menuNode.title,
      theme: menuNode.theme,
      options_payload: JSON.stringify(menuNode.optionsPayload),
    };

    await upsertMenuByIdRowData(menuData, context);
    return { success: true };
  } catch (error) {
    console.error("Error in upsertMenu:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to upsert menu",
    };
  }
}
