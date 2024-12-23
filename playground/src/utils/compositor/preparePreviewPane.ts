import { ulid } from "ulid";
import { fromMarkdown } from "mdast-util-from-markdown";
import { toHast } from "mdast-util-to-hast";
import { cleanHtmlAst } from "../../utils/compositor/markdownUtils";
import type { Root } from "hast";
import type {
  PaneDatum,
  BgPaneDatum,
  MarkdownPaneDatum,
  MarkdownDatum,
  BgColourDatum,
  PaneDesign,
} from "../../types";

const preparePreviewPane = (design: PaneDesign) => {
  const paneId = ulid();
  let markdown: MarkdownDatum | undefined;
  const paneFragments =
    design?.fragments
      ?.map((f): BgColourDatum | BgPaneDatum | MarkdownPaneDatum => {
        if (f.type === "markdown" && "markdownBody" in f) {
          markdown = {
            body: f.markdownBody,
            id: ulid(),
            slug: `new-markdown`,
            title: `Copy for new pane`,
            htmlAst: cleanHtmlAst(toHast(fromMarkdown(f.markdownBody)) as Root) as Root,
          };
          return {
            ...f,
            id: ulid(), // Generate a new ID for MarkdownPaneDatum
          } as MarkdownPaneDatum;
        } else if (f.type === "bgPane") {
          return {
            ...f,
            id: ulid(), // Generate a new ID for BgPaneDatum
          } as BgPaneDatum;
        } else if (f.type === "bgColour") {
          return f as BgColourDatum;
        }
        /* eslint-disable @typescript-eslint/no-explicit-any */
        throw new Error(`Unexpected fragment type: ${(f as any).type}`);
      })
      .filter((f): f is BgColourDatum | BgPaneDatum | MarkdownPaneDatum => f !== null) || [];

  if (design?.panePayload?.bgColour) {
    // if from paneDesigns assets, process as paneFragment
    const bgColourFragment: BgColourDatum = {
      id: ulid(),
      type: "bgColour",
      bgColour: design.panePayload.bgColour as string,
      hiddenViewports: "",
    };
    paneFragments.unshift(bgColourFragment);
  }

  const paneData: PaneDatum = {
    id: paneId,
    title: "Preview Pane",
    slug: "preview-pane",
    created: new Date(),
    changed: null,
    markdown: markdown || false,
    optionsPayload: {
      designType: design.designType,
      hiddenPane: design.panePayload.hiddenPane || false,
      paneFragmentsPayload: paneFragments,
      ...(design?.panePayload?.codeHook
        ? {
            codeHook: { target: design.panePayload.codeHook },
          }
        : {}),
    },
    isContextPane: false,
    heightOffsetDesktop: design.panePayload.heightOffsetDesktop || 0,
    heightOffsetMobile: design.panePayload.heightOffsetMobile || 0,
    heightOffsetTablet: design.panePayload.heightOffsetTablet || 0,
    heightRatioDesktop: design.panePayload.heightRatioDesktop || "0",
    heightRatioMobile: design.panePayload.heightRatioMobile || "0",
    heightRatioTablet: design.panePayload.heightRatioTablet || "0",
    files: design?.files || [],
  };
  return paneData;
};

export default preparePreviewPane;
