import { cleanTursoFile } from "./tursoFile";
import { getOptimizedImages } from "../../common/helpers";
import type { Row } from "@libsql/client";
import type {
  PaneDesign,
  PaneDesignMarkdown,
  PaneDesignBgPane,
  BgColourDatum,
  MarkdownPaneDatum,
  BgPaneDatum,
  PaneDesignOptionsPayload,
  FileNode,
  FileDatum,
} from "../../../types";

export async function cleanPaneDesigns(rows: Row[]): Promise<PaneDesign[]> {
  if (!rows || rows.length === 0) {
    return [];
  }

  const cleanedDesigns = await Promise.all(
    rows.map(async (row: Row): Promise<PaneDesign | null> => {
      const filesPayload = (typeof row?.files === `string` && JSON.parse(row.files)) || [];
      const files = cleanTursoFile(filesPayload);
      const thisFilesPayload: FileNode[] = await getOptimizedImages(
        files,
        typeof row?.id === `string` ? row.id : `none`
      );
      const thisFiles = thisFilesPayload?.map((f: FileNode, idx: number) => {
        let altText = ``;
        const regexpImage = `^.*\\[(.*)\\]\\((${f.filename})\\)`;
        const match =
          typeof row?.markdown_body === `string` &&
          row.markdown_body.replace(/[\n\r]+/g, " ").match(regexpImage);
        if (match && typeof match[1] === `string`) altText = match[1];
        return {
          ...f,
          paneId: typeof row?.id === `string` ? row.id : `none`,
          markdown: typeof row.markdown_id === `string`,
          id: f.id,
          index: idx,
          altText:
            altText ||
            f.altDescription ||
            `This should be a description of the image; we apologize for this information being unset`,
        } as FileDatum;
      });

      if (
        typeof row?.id !== "string" ||
        typeof row?.title !== "string" ||
        typeof row?.slug !== "string" ||
        typeof row?.options_payload !== "string" ||
        typeof row?.height_offset_desktop !== `number` ||
        typeof row?.height_offset_tablet !== `number` ||
        typeof row?.height_offset_mobile !== `number` ||
        typeof row?.height_ratio_desktop !== `string` ||
        typeof row?.height_ratio_tablet !== `string` ||
        typeof row?.height_ratio_mobile !== `string`
      ) {
        return null;
      }

      let optionsPayload: PaneDesignOptionsPayload;
      try {
        optionsPayload = JSON.parse(row.options_payload);
      } catch (error) {
        return null;
      }
      const codeHook = optionsPayload?.codeHook?.target ?? null;
      const fragments = await Promise.all(
        (optionsPayload.paneFragmentsPayload || []).map(
          async (
            fragment:
              | PaneDesignMarkdown
              | PaneDesignBgPane
              | BgPaneDatum
              | MarkdownPaneDatum
              | BgColourDatum
          ) => {
            if (fragment.type === "markdown") {
              // You can perform async operations here if needed
              return {
                ...fragment,
                markdownBody: row.markdown_body || "",
                optionsPayload: fragment.optionsPayload || {},
              } as PaneDesignMarkdown;
            } else if (fragment.type === "bgPane") {
              // You can perform async operations here if needed
              return {
                ...fragment,
                optionsPayload: fragment.optionsPayload || {},
              } as PaneDesignBgPane;
            } else if (fragment.type === "bgColour") {
              return fragment as BgColourDatum;
            }
            return null;
          }
        )
      );

      const design: PaneDesign = {
        id: row.id,
        slug: row.slug,
        name: row.title,
        variants: [`default`],
        designType: optionsPayload.designType || `unknown`,
        priority: 100,
        type: `reuse`,
        panePayload: {
          heightOffsetDesktop: row.height_offset_desktop || 0,
          heightOffsetMobile: row.height_offset_mobile || 0,
          heightOffsetTablet: row.height_offset_tablet || 0,
          heightRatioDesktop: row.height_ratio_desktop || "0.00",
          heightRatioMobile: row.height_ratio_mobile || "0.00",
          heightRatioTablet: row.height_ratio_tablet || "0.00",
          codeHook,
          bgColour: false,
        },
        files: thisFiles,
        fragments: fragments.filter(
          (fragment): fragment is PaneDesignMarkdown | PaneDesignBgPane | BgColourDatum =>
            fragment !== null
        ),
      };

      return design;
    })
  );

  return cleanedDesigns.filter((design): design is PaneDesign => design !== null);
}
