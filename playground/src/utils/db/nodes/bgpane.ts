import { ulid } from "ulid";
import { getVisualBreak } from "../helpers/visualBreak";
import type { PaneFragmentNode, BgPaneDatum } from "../../../types";

export function getBgPaneNode(fragment: BgPaneDatum): PaneFragmentNode | null {
  if (
    typeof fragment.hiddenViewports === `string` &&
    fragment?.type === `bgPane` &&
    typeof fragment?.optionsPayload?.artpack === `object`
  ) {
    // in pre rc, visual breaks are the only bgPanes available
    const result = getVisualBreak(fragment.optionsPayload.artpack);
    if (result)
      return {
        id: ulid(),
        parentId: fragment.id,
        type: `visual-break`,
        ...(fragment.hiddenViewports.includes(`mobile`) ? { hiddenViewportMobile: true } : {}),
        ...(fragment.hiddenViewports.includes(`tablet`) ? { hiddenViewportTablet: true } : {}),
        ...(fragment.hiddenViewports.includes(`desktop`) ? { hiddenViewportDesktop: true } : {}),
        ...result,
      };
  }
  return null;
}
