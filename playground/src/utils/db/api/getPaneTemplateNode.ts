import { tursoClient } from "../client";
import type { TemplateNode, TemplatePane } from "@/types";
import type { APIContext } from "@/types";

export async function getPaneTemplateNode(id: string, context?: APIContext) {
  try {
    const client = await tursoClient.getClient(context);
    if (!client) return { success: false, data: null, error: "Database client not available" };

    const { rows } = await client.execute({
      sql: `SELECT * FROM panes WHERE id = ?`,
      args: [id],
    });

    if (!rows.length) return { success: false, data: null };

    const paneRow = rows[0];
    if (!paneRow.title || !paneRow.slug) {
      return { success: false, data: null, error: "Invalid pane data" };
    }

    const optionsPayload =
      typeof paneRow.options_payload === "string" ? JSON.parse(paneRow.options_payload) : null;

    if (!optionsPayload?.nodes?.length) {
      return { success: false, data: null, error: "No nodes found in options payload" };
    }

    if (optionsPayload.nodes[0].nodeType === "Markdown") {
      const templatePane: TemplatePane = {
        nodeType: "Pane",
        id: String(paneRow.id),
        parentId: "",
        title: String(paneRow.title),
        slug: String(paneRow.slug),
        bgColour: optionsPayload.bgColour || null,
        isDecorative: optionsPayload.isDecorative || false,
        markdown: {
          nodeType: "Markdown",
          type: "markdown",
          defaultClasses: optionsPayload.nodes[0].defaultClasses || {},
          parentClasses: optionsPayload.nodes[0].parentClasses || [],
          nodes: optionsPayload.nodes.slice(1).map((node: TemplateNode) => ({
            ...node,
            id: node.id,
            parentId: node.parentId,
          })),
          id: optionsPayload.nodes[0].id,
          parentId: optionsPayload.nodes[0].parentId,
          markdownId: optionsPayload.nodes[0].markdownId,
        },
      };
      return { success: true, data: { templatePane } };
    } else if (optionsPayload.nodes[0].nodeType === "BgPane") {
      const templatePane: TemplatePane = {
        nodeType: "Pane",
        id: String(paneRow.id),
        parentId: "",
        title: String(paneRow.title),
        slug: String(paneRow.slug),
        bgColour: optionsPayload.bgColour || null,
        isDecorative: optionsPayload.isDecorative || false,
        bgPane: {
          nodeType: "BgPane",
          type: "visual-break",
          breakDesktop: optionsPayload.nodes[0].breakDesktop,
          breakTablet: optionsPayload.nodes[0].breakTablet,
          breakMobile: optionsPayload.nodes[0].breakMobile,
          id: optionsPayload.nodes[0].id,
          parentId: optionsPayload.nodes[0].parentId,
        },
      };
      return { success: true, data: { templatePane } };
    }

    return { success: false, data: null, error: "Unknown node type" };
  } catch (error) {
    console.error("Error in getPaneTemplateNode:", error);
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
