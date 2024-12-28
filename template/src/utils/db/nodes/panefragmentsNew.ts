import { getBgPaneNode } from "./bgpane";
import { getMarkdownPaneNode } from "./markdown";
import type { Row } from "@libsql/client";
import type {
  BgColourDatum,
  BgPaneDatum,
  ImageFileNode,
  FlatNode,
  MarkdownPaneDatum,
  MarkdownPaneFragmentNode,
  PaneFragmentNode,
  TursoPane,
} from "../../../types";

export function getPaneFragmentNodes(
  paneData: Row[],
  fileNodes: ImageFileNode[],
  slug: string,
  isContext: boolean
): { paneFragments: PaneFragmentNode[]; flatNodes: FlatNode[] } {
  if (!paneData || !paneData.length) return { paneFragments: [], flatNodes: [] };

  const paneFragmentNodes = paneData.flatMap((pane) => {
    if (!pane?.options_payload || !pane?.id) return [];

    const optionsPayload =
      typeof pane.options_payload === `string` ? JSON.parse(pane.options_payload) : null;
    return (
      optionsPayload?.paneFragmentsPayload?.map(
        (p: BgPaneDatum | BgColourDatum | MarkdownPaneDatum) => {
          switch (p.type) {
            case `markdown`:
              return getMarkdownPaneNode(p, fileNodes, pane, slug, isContext);
            case `bgPane`:
              if (typeof pane.id !== `string`) return null;
              return getBgPaneNode(p, pane.id);
            case `bgColour`:
              return { paneFragment: null, nodes: null };
          }
        }
      ) || []
    );
  });

  const paneFragments = paneFragmentNodes
    .map((item: GetPaneFragmentResult) => item?.paneFragment)
    .filter((fragment): fragment is PaneFragmentNode => fragment !== null);

  const flatNodeArrays = paneFragmentNodes
    .map((item: GetPaneFragmentResult) => item?.nodes)
    .filter((nodes): nodes is FlatNode[] => nodes !== null);

  const nodes = flatNodeArrays.flat();

  return {
    paneFragments,
    flatNodes: nodes,
  };
}

export type GetPaneFragmentResult = {
  paneFragment: PaneFragmentNode | MarkdownPaneFragmentNode | null;
  nodes: FlatNode[] | null;
};
