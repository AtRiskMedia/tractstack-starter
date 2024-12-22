import { getBgPaneNode } from "./bgpane";
import { getMarkdownPaneNode } from "./markdown";
import type { Row } from "@libsql/client";
import type {
  PaneFragmentNode,
  TursoPane,
  BgPaneDatum,
  BgColourDatum,
  MarkdownPaneDatum,
  FileNode,
} from "../../../types";

export function getPaneFragmentNodes(
  row: Row,
  fileNodes: FileNode[],
  slug: string,
  isContext: boolean
): PaneFragmentNode[] {
  if (typeof row?.panes === `string`) {
    const panesPayloadRaw = JSON.parse(row.panes);
    if (!panesPayloadRaw) return [];

    const paneFragmentNodes = panesPayloadRaw
      .map((r: TursoPane) => {
        if (typeof r?.id === `string` && typeof r?.options_payload === `string`) {
          const optionsPayload = JSON.parse(r.options_payload);
          return optionsPayload?.paneFragmentsPayload?.map(
            (p: BgPaneDatum | BgColourDatum | MarkdownPaneDatum) => {
              switch (p.type) {
                case `markdown`:
                  return getMarkdownPaneNode(p, fileNodes, r, slug, isContext);
                case `bgPane`:
                  return getBgPaneNode(p);
                case `bgColour`:
                  return null;
              }
            }
          );
        }
      })
      .flat();
    return paneFragmentNodes.filter(
      (item: PaneFragmentNode | null): item is PaneFragmentNode => item !== null
    );
  }
  return [];
}
