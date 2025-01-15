import { ulid } from "ulid";
import type { Row } from "@libsql/client";
import type { ImpressionNode, PaneOptionsPayload } from "../../../types";

export function getImpressionNode(row: Row): ImpressionNode | null {
  if (typeof row?.id === `string` && typeof row?.options_payload === `string`) {
    try {
      const optionsPayload = JSON.parse(row.options_payload) as PaneOptionsPayload;
      const impression = optionsPayload.impressions?.[0];

      if (impression) {
        return {
          id: ulid(),
          nodeType: "Impression",
          tagName: "Impression",
          parentId: row.id,
          title: impression.title,
          body: impression.body,
          buttonText: impression.buttonText,
          actionsLisp: impression.actionsLisp,
        };
      }
    } catch (error) {
      console.error("Error parsing options payload:", error);
    }
  }
  return null;
}
