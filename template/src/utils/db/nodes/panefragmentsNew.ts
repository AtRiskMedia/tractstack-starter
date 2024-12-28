import { getBgPaneNode } from "./bgpane";
import { getMarkdownPaneNode } from "./markdown";
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
  paneData: any[],
  fileNodes: ImageFileNode[],
  slug: string,
  isContext: boolean
): { paneFragments: PaneFragmentNode[]; flatNodes: FlatNode[] } {
  if (!paneData || !paneData.length) return { paneFragments: [], flatNodes: [] };

  const paneFragmentNodes = paneData.flatMap((pane) => {
    if (!pane?.options_payload) return [];

    const optionsPayload = JSON.parse(pane.options_payload);
    return (
      optionsPayload?.paneFragmentsPayload?.map(
        (p: BgPaneDatum | BgColourDatum | MarkdownPaneDatum) => {
          switch (p.type) {
            case `markdown`:
              return getMarkdownPaneNode(p, fileNodes, pane, slug, isContext);
            case `bgPane`:
              return getBgPaneNode(p);
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
