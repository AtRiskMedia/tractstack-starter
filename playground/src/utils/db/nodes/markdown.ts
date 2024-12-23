import { ulid } from "ulid";
import { fromMarkdown } from "mdast-util-from-markdown";
import { toHast } from "mdast-util-to-hast";
import { cleanHtmlAst } from "../../compositor/markdownUtils";
import { flattenClassNamesPayload } from "../helpers/flattenClassNamesPayload";
import { mdAstTraverse } from "../helpers/mdAstTraverse";
import { processDefaultCss } from "../helpers/processDefaultCss";
import type { Root } from "hast";
import type {
  ClassNamesPayload,
  FileNode,
  MarkdownPaneDatum,
  OptionsPayloadDatum,
  TursoPane,
} from "../../../types";
import type { GetPaneFragmentResult } from "@/utils/db/nodes/panefragments.ts";

export function getMarkdownPaneNode(
  fragment: MarkdownPaneDatum,
  fileNodes: FileNode[],
  row: TursoPane,
  slug: string,
  isContext: boolean
): GetPaneFragmentResult {
  if (
    typeof row.markdown_id === `string` &&
    typeof row.markdown_body === `string` &&
    typeof fragment.hiddenViewports === `string` &&
    fragment?.type === `markdown` &&
    typeof fragment?.optionsPayload === `object`
  ) {
    const { defaultClasses, parentClasses } = flattenClassNamesPayload(
      fragment.optionsPayload.classNamesPayload as ClassNamesPayload
    );
    const mdAstRaw = cleanHtmlAst(toHast(fromMarkdown(row.markdown_body)) as Root);
    if (!mdAstRaw) {
      console.log(`FAILED TO FIND markdown ********************************`);
      return { paneFragment: null, nodes: null };
    }

    const id = ulid();
    const elementNodes = mdAstTraverse(
      mdAstRaw,
      id,
      fileNodes,
      fragment?.optionsPayload || ({} as OptionsPayloadDatum),
      {},
      slug,
      isContext
    )
    elementNodes.forEach((el) => {
      // make sure each flat node has a parent
      if (el.parentId === null) {
        el.parentId = id;
      }
    });
    const defaultCss = fragment.optionsPayload?.classNames?.all
      ? processDefaultCss({ default: fragment.optionsPayload.classNames.all })
      : undefined;

    return {
      paneFragment: {
        id,
        parentId: row.id,
        nodeType: "Element",
        markdownId: row.markdown_id,
        type: `markdown`,
        ...(fragment.hiddenViewports.includes(`mobile`) ? { hiddenViewportMobile: true } : {}),
        ...(fragment.hiddenViewports.includes(`tablet`) ? { hiddenViewportTablet: true } : {}),
        ...(fragment.hiddenViewports.includes(`desktop`) ? { hiddenViewportDesktop: true } : {}),
        ...(typeof defaultClasses === `object` ? { defaultClasses } : {}),
        ...(typeof parentClasses === `object` ? { parentClasses } : {}),
        ...(defaultCss && Object.keys(defaultCss).length > 0 ? { defaultCss } : {}),
        ...(fragment.optionsPayload?.classNamesParent?.all
          ? { parentCss: fragment.optionsPayload.classNamesParent.all }
          : {}),
      },
      nodes: elementNodes,
    };
  }
  console.log(`FAILED TO FIND FRAGMENT ********************************`);
  return { paneFragment: null, nodes: null };
}
