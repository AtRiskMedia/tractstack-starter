/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Row } from "@libsql/client";
import type {
  BeliefDatum,
  PaneNode,
  BgPaneDatum,
  BgColourDatum,
  MarkdownPaneDatum,
} from "../../../types";

export function getPaneNodes(row: Row): PaneNode | null {
  if (
    typeof row?.id === `string` &&
    typeof row?.title === `string` &&
    typeof row?.slug === `string` &&
    typeof row?.created === `string` &&
    typeof row?.options_payload === `string` &&
    typeof row?.height_offset_desktop === `number` &&
    typeof row?.height_offset_tablet === `number` &&
    typeof row?.height_offset_mobile === `number` &&
    typeof row?.height_ratio_desktop === `string` &&
    typeof row?.height_ratio_tablet === `string` &&
    typeof row?.height_ratio_mobile === `string`
  ) {
    const optionsPayload = JSON.parse(row.options_payload);
    const { target: codeHookTarget, ...codeHookPayload } = optionsPayload?.codeHook || {};
    const bgColour =
      optionsPayload?.paneFragmentsPayload?.find(
        (fragment: BgPaneDatum | BgColourDatum | MarkdownPaneDatum) => fragment.type === "bgColour"
      )?.bgColour || null;

    return {
      id: row.id,
      title: row.title,
      nodeType: "Pane",
      slug: row.slug,
      parentId: null,
      isDecorative: optionsPayload?.paneFragmentsPayload.some(
        (item: any) => item.type === "bgPane"
      ),
      ...(row?.height_offset_desktop != 0
        ? { heightOffsetDesktop: row?.height_offset_desktop }
        : {}),
      ...(row?.height_offset_tablet != 0 ? { heightOffsetTablet: row?.height_offset_tablet } : {}),
      ...(row?.height_offset_mobile != 0 ? { heightOffsetMobile: row?.height_offset_mobile } : {}),
      ...(row?.height_ratio_desktop != `0.00`
        ? { heightRatioDesktop: row?.height_ratio_desktop }
        : {}),
      ...(row?.height_ratio_tablet != `0.00`
        ? { heightRatioTablet: row?.height_ratio_tablet }
        : {}),
      ...(row?.height_ratio_mobile != `0.00`
        ? { heightRatioMobile: row?.height_ratio_mobile }
        : {}),
      ...(row?.is_context_pane ? { isContextPane: true } : {}),
      ...(typeof row?.created === `string` ? { created: new Date(row.created) } : {}),
      ...(typeof row?.changed === `string` ? { changed: new Date(row.changed) } : {}),
      ...(codeHookTarget ? { codeHookTarget: codeHookTarget } : {}),
      ...(codeHookTarget && Object.keys(codeHookPayload).length
        ? { codeHookPayload: codeHookPayload }
        : {}),
      ...(optionsPayload?.heldBeliefs
        ? { heldBeliefs: optionsPayload.heldBeliefs as BeliefDatum[] }
        : ({} as BeliefDatum[])),
      ...(optionsPayload?.withheldBeliefs
        ? { withheldBeliefs: optionsPayload.withheldBeliefs as BeliefDatum[] }
        : ({} as BeliefDatum[])),
      ...(bgColour ? { bgColour: bgColour } : {}),
    } as PaneNode;
  }
  return null;
}
