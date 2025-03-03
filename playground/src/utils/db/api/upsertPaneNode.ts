import { tursoClient } from "../client";
import type { PaneNode } from "@/types";
import type { PaneRowData } from "@/store/nodesSerializer";

export async function upsertPaneNode(
  node: PaneNode
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = await tursoClient.getClient();
    if (!client) {
      return { success: false, error: "Database client not available" };
    }

    // Prepare options payload
    const optionsPayload = {
      isDecorative: node.isDecorative || false,
      ...(typeof node.bgColour === "string" ? { bgColour: node.bgColour } : {}),
      ...(typeof node.heightOffsetDesktop === "number" && node.heightOffsetDesktop > 0
        ? { height_offset_desktop: node.heightOffsetDesktop }
        : {}),
      ...(typeof node.heightOffsetTablet === "number" && node.heightOffsetTablet > 0
        ? { height_offset_tablet: node.heightOffsetTablet }
        : {}),
      ...(typeof node.heightOffsetMobile === "number" && node.heightOffsetMobile > 0
        ? { height_offset_mobile: node.heightOffsetMobile }
        : {}),
      ...(typeof node.heightRatioDesktop === "string"
        ? { height_ratio_desktop: node.heightRatioDesktop }
        : {}),
      ...(typeof node.heightRatioTablet === "string"
        ? { height_ratio_tablet: node.heightRatioTablet }
        : {}),
      ...(typeof node.heightRatioMobile === "string"
        ? { height_ratio_mobile: node.heightRatioMobile }
        : {}),
      ...(typeof node.codeHookTarget === "string" ? { codeHookTarget: node.codeHookTarget } : {}),
      ...(typeof node.codeHookTarget === "string" && typeof node.codeHookPayload !== "undefined"
        ? { codeHookPayload: node.codeHookPayload }
        : {}),
      ...(typeof node.heldBeliefs !== "undefined" ? { heldBeliefs: node.heldBeliefs } : {}),
      ...(typeof node.withheldBeliefs !== "undefined"
        ? { withheldBeliefs: node.withheldBeliefs }
        : {}),
    };

    // Transform PaneNode to PaneRowData
    const rowData: PaneRowData = {
      id: node.id,
      title: node.title,
      slug: node.slug,
      pane_type: node.isDecorative ? "Decorative" : "Content",
      created: node.created?.toISOString() || new Date().toISOString(),
      changed: node.changed?.toISOString() || new Date().toISOString(),
      options_payload: JSON.stringify(optionsPayload),
      is_context_pane: node.isContextPane ? 1 : 0,
    };

    // Perform upsert operation
    await client.execute({
      sql: `INSERT INTO panes (
              id, title, slug, pane_type, created, changed,
              options_payload, is_context_pane
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              title = excluded.title,
              slug = excluded.slug,
              pane_type = excluded.pane_type,
              changed = excluded.changed,
              options_payload = excluded.options_payload,
              is_context_pane = excluded.is_context_pane`,
      args: [
        rowData.id,
        rowData.title,
        rowData.slug,
        rowData.pane_type,
        rowData.created,
        rowData.changed,
        rowData.options_payload,
        rowData.is_context_pane,
      ],
    });

    return { success: true };
  } catch (error) {
    console.error("Error in upsertPaneNode:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
