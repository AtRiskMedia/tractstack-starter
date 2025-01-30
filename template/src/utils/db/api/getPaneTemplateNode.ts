/* eslint-disable @typescript-eslint/no-explicit-any */
import { tursoClient } from "../client";
import type { TemplatePane, TemplateMarkdown } from "@/types";

export async function getPaneTemplateNode(id: string) {
  try {
    const client = await tursoClient.getClient();
    if (!client) return { success: false, data: null, error: "Database client not available" };

    const { rows } = await client.execute({
      sql: `SELECT p.*, m.id as markdown_id, m.body as markdown_body
            FROM panes p
            LEFT JOIN markdowns m ON p.markdown_id = m.id 
            WHERE p.id = ?`,
      args: [id],
    });

    if (!rows.length) return { success: false, data: null };

    const paneRow = rows[0];
    if (!paneRow.title || !paneRow.slug) {
      return { success: false, data: null, error: "Invalid pane data" };
    }

    const optionsPayload =
      typeof paneRow.options_payload === `string` ? JSON.parse(paneRow.options_payload) : null;
    const markdownNode = optionsPayload?.nodes?.find((node: any) => node.type === "markdown");

    const templatePane: TemplatePane = {
      nodeType: "Pane",
      id: "",
      parentId: "",
      title: String(paneRow.title),
      slug: String(paneRow.slug),
      bgColour: optionsPayload?.bgColour || null,
      isDecorative: optionsPayload?.isDecorative || false,
      ...(paneRow.markdown_id &&
        paneRow.markdown_body && {
          markdown: {
            nodeType: "Markdown",
            id: "",
            parentId: "",
            type: "markdown",
            markdownId: String(paneRow.markdown_id),
            markdownBody: String(paneRow.markdown_body),
            defaultClasses: markdownNode?.defaultClasses || {},
            parentClasses: markdownNode?.parentClasses || [],
          } as TemplateMarkdown,
        }),
    };

    return { success: true, data: { templatePane } };
  } catch (error) {
    console.error("Error in getPaneTemplateNode:", error);
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
