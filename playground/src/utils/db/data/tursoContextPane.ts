import { cleanTursoPane } from "./tursoPane";
import { getResourcesByCategorySlug } from "../utils";
import { getOptimizedImages } from "../../common/helpers";
import type { Row } from "@libsql/client";
import type {
  ContextPaneDatum,
  ResourceDatum,
  ImpressionDatum,
  PaneFileNode,
  FileNode,
} from "../../../types";

export async function cleanTursoContextPane(rows: Row[]) {
  if (!rows.length) return null;

  const contextPane: Promise<ContextPaneDatum | null> = (async () => {
    const payload = await Promise.all(
      rows?.map(async (r: Row) => {
        if (
          typeof r?.id === `string` &&
          typeof r?.title === `string` &&
          typeof r?.slug === `string` &&
          typeof r?.created === `string`
        ) {
          const files = typeof r?.files === `string` && JSON.parse(r.files);
          const thisFilesPayload: FileNode[] = await getOptimizedImages(files, r.id);
          const paneFileNodes: PaneFileNode[] = [];
          if (thisFilesPayload.length) {
            paneFileNodes.push({
              id: r.id,
              files: thisFilesPayload,
            });
          }

          // prepare panes payload
          const paneOptionsPayload =
            typeof r?.options_payload === `string` && JSON.parse(r.options_payload);

          const thisFilesArray = paneFileNodes.filter((f: PaneFileNode) => f.id === r.id).at(0);
          const panePayload = cleanTursoPane(r, thisFilesArray?.files || []);

          // impressions
          const impressions =
            (paneOptionsPayload?.impressions &&
              (paneOptionsPayload.impressions as ImpressionDatum[])) ||
            [];
          // check if resources are referenced
          const isCodeHook = !!paneOptionsPayload?.codeHook;
          const codeHookOptions =
            isCodeHook &&
            paneOptionsPayload?.codeHook?.options &&
            JSON.parse(paneOptionsPayload?.codeHook?.options);
          const resourceCategory = codeHookOptions?.category && codeHookOptions.category.split(`|`);

          // if resources are referenced, load and pass
          let resourcesPayload: ResourceDatum[] = [];
          if (resourceCategory?.length) {
            const result = await getResourcesByCategorySlug(resourceCategory);
            if (result.length) resourcesPayload = result;
          }

          return {
            id: r.id,
            title: r.title,
            slug: r.slug,
            created: new Date(r.created),
            changed: (typeof r?.changed === `string` && new Date(r.changed)) || null,
            panePayload,
            impressions,
            resourcesPayload,
            codeHookOptions,
          };
        }
        return null;
        //});
      }) ?? []
    );
    const row = payload?.at(0);
    return row || null;
  })();
  return await contextPane;
}
