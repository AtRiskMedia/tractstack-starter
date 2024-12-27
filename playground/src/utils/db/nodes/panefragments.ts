import { getBgPaneNode } from "./bgpane";
import { getMarkdownPaneNode } from "./markdown";
import type { Row } from "@libsql/client";
import type {
  BgColourDatum,
  BgPaneDatum,
  FileNode,
  FlatNode,
  MarkdownPaneDatum,
  MarkdownPaneFragmentNode,
  PaneFragmentNode,
  TursoPane,
} from "../../../types";

export function getPaneFragmentNodes(
  row: Row,
  fileNodes: FileNode[],
  slug: string,
  isContext: boolean
): { paneFragments: PaneFragmentNode[] | null; flatNodes: FlatNode[] | null } {
  if (typeof row?.panes === `string`) {
    const panesPayloadRaw = JSON.parse(row.panes);
    if (!panesPayloadRaw) return { paneFragments: [], flatNodes: [] };

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
                  return { paneFragment: null, nodes: null };
              }
            }
          );
        }
      })
      .flat();
    const paneFragments: PaneFragmentNode[] = paneFragmentNodes
      .map((item: GetPaneFragmentResult) => item?.paneFragment)
      .filter((fragment: PaneFragmentNode) => fragment !== null);

    const nodes: FlatNode[] = paneFragmentNodes
      .map((item: GetPaneFragmentResult) => item?.nodes)
      .filter((node: FlatNode[]) => node !== null)
      .flat();

    return {
      paneFragments: paneFragments,
      flatNodes: nodes,
    };
  }
  return { paneFragments: [], flatNodes: [] };
}

export type GetPaneFragmentResult = {
  paneFragment: PaneFragmentNode | MarkdownPaneFragmentNode | null;
  nodes: FlatNode[] | null;
};
