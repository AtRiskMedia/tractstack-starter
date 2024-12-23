import { ulid } from "ulid";
import { getVisualBreak } from "../helpers/visualBreak";
import type { BgPaneDatum } from "../../../types";
import type { GetPaneFragmentResult } from "@/utils/db/nodes/panefragments.ts";

export function getBgPaneNode(fragment: BgPaneDatum): GetPaneFragmentResult {
  if (
    typeof fragment.hiddenViewports === `string` &&
    fragment?.type === `bgPane` &&
    typeof fragment?.optionsPayload?.artpack === `object`
  ) {
    // in pre rc, visual breaks are the only bgPanes available
    const result = getVisualBreak(fragment.optionsPayload.artpack);
    if (result)
      return {
        paneFragment: {
          id: ulid(),
          nodeType: "BgPane",
          parentId: fragment.id,
          type: `visual-break`,
          ...(fragment.hiddenViewports.includes(`mobile`) ? { hiddenViewportMobile: true } : {}),
          ...(fragment.hiddenViewports.includes(`tablet`) ? { hiddenViewportTablet: true } : {}),
          ...(fragment.hiddenViewports.includes(`desktop`) ? { hiddenViewportDesktop: true } : {}),
          ...result,
        },
        nodes: null
      };
  }
  return {paneFragment: null, nodes: null};
}
