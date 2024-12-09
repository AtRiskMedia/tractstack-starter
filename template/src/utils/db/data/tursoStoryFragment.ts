import { cleanTursoPane } from "./tursoPane";
import { getResourcesByCategorySlug } from "../utils";
//import { getOptimizedImages } from "../../common/helpers";
import type { Row } from "@libsql/client";
import type {
  TursoPane,
  PaneDatum,
  ResourceDatum,
  StoryFragmentDatum,
  ImpressionDatum,
  CodeHookDatum,
  PaneFileNode,
  FileNode,
} from "../../../types";

export async function cleanTursoStoryFragment(rows: Row[]) {
  if (!rows.length) return [];

  const storyfragments: Promise<(StoryFragmentDatum | null)[]> = (async () => {
    return await Promise.all(
      rows?.map(async (r: Row) => {
        if (
          typeof r?.id === `string` &&
          typeof r?.title === `string` &&
          typeof r?.slug === `string` &&
          typeof r?.created === `string` &&
          typeof r?.tractstack_id === `string` &&
          typeof r?.tractstack_title === `string` &&
          typeof r?.tractstack_slug === `string`
        ) {
          const panesPayloadRaw = typeof r?.panes === `string` && JSON.parse(r.panes);
          const allFiles = panesPayloadRaw.map((p: TursoPane) => p.files);
          console.log(`must fix`, allFiles);
          const thisFilesPayload: FileNode[] = []; //await getOptimizedImages(allFiles);
          const paneFileNodes: PaneFileNode[] = [];
          panesPayloadRaw.forEach((p: TursoPane) => {
            const paneFiles = thisFilesPayload.filter((f) => f.paneId === p.id);
            if (paneFiles.length) {
              paneFileNodes.push({
                id: p.id,
                files: paneFiles,
              });
            }
          });

          // prepare panes payload
          const panesPayload = panesPayloadRaw.map((payload: Row) => {
            const thisFilesArray = paneFileNodes
              .filter((f: PaneFileNode) => f.id === payload.id)
              .at(0);
            return cleanTursoPane(payload, thisFilesArray?.files || []);
          });

          // impressions
          const impressionsRaw = panesPayload
            .map((payload: PaneDatum) => payload.optionsPayload?.impressions?.at(0))
            .filter((e: ImpressionDatum | null) => e);
          const impressions = impressionsRaw as ImpressionDatum[];

          // check if resources are referenced
          const perCodeHookPayload: { [key: number]: CodeHookDatum } = {};
          const perCodeHookResourcesPayload: {
            [key: number]: ResourceDatum[];
          } = {};
          const perCodeHookResourceCategory: { [key: number]: string[] } = {};
          const setOfAllResourceCategory: Set<string[]> = new Set();
          const perCodeHookOptions: { [key: number]: string } = {};
          panesPayload?.forEach((p: PaneDatum, idx: number) => {
            if (p?.optionsPayload?.codeHook?.options) {
              const thisOptions = JSON.parse(p.optionsPayload.codeHook.options);
              if (thisOptions.category) {
                perCodeHookResourceCategory[idx] = thisOptions.category.split(`|`);
                for (const str of thisOptions.category.split(`|`)) {
                  setOfAllResourceCategory.add(str);
                }
              } else {
                perCodeHookOptions[idx] = thisOptions;
              }
            }
            if (p?.optionsPayload?.codeHook?.target)
              perCodeHookPayload[idx] = p.optionsPayload.codeHook;
          });

          // check for HeaderWidget resources
          console.log(`cleanTursoStoryFragment on HEADER_WIDGET NEEDS CONFIG`);
          const headerWidgetResourcesCategory =
            import.meta.env.HEADER_WIDGET_RESOURCE_CATEGORY || ``;
          for (const str of headerWidgetResourcesCategory.split(`|`)) {
            setOfAllResourceCategory.add(str);
          }

          // if resources are referenced, load and pass
          let codeHooksResourcePayload: ResourceDatum[] = [];
          const resourceCategory = Array.from(setOfAllResourceCategory).flat();
          if (resourceCategory?.length) {
            const result = await getResourcesByCategorySlug(resourceCategory);
            if (result.length) codeHooksResourcePayload = result;
          }

          // prepare per codeHook resource bundles
          Object.keys(perCodeHookResourceCategory).forEach((s: string) => {
            const c = parseInt(s);
            perCodeHookResourcesPayload[c] = codeHooksResourcePayload.filter((resource) =>
              perCodeHookResourceCategory[c].includes(resource?.category || ``)
            );
          });
          const resourcesPayload = {
            perCodeHookPayload,
            perCodeHookResourceCategory,
            perCodeHookOptions,
            resources: codeHooksResourcePayload,
            headerWidget: codeHooksResourcePayload?.filter(
              (resource) =>
                headerWidgetResourcesCategory.split(`|`).includes(resource?.category || ``) || []
            ),
          };

          return {
            id: r.id,
            title: r.title,
            slug: r.slug,
            tractStackId: r.tractstack_id,
            tractStackTitle: r.tractstack_title,
            tractStackSlug: r.tractstack_slug,
            created: new Date(r.created),
            changed: (typeof r?.changed === `string` && new Date(r.changed)) || null,
            socialImagePath:
              (typeof r?.social_image_path === `string` && r.social_image_path) || null,
            tailwindBgColour:
              (typeof r?.tailwind_background_colour === `string` && r.tailwind_background_colour) ||
              null,
            hasMenu: !!r.menu_title,
            menuId: (typeof r?.menu_id === `string` && r.menu_id) || null,
            menuPayload:
              (typeof r?.menu_title === `string` &&
                typeof r?.menu_theme === `string` && {
                  id: r.id,
                  title: r.menu_title,
                  theme: r.menu_theme,
                  optionsPayload:
                    typeof r?.menu_options_payload === `string` &&
                    JSON.parse(r.menu_options_payload),
                }) ||
              null,
            panesPayload,
            impressions,
            resourcesPayload,
          };
        }
        return null;
        //});
      }) ?? []
    );
  })();
  const payload = await storyfragments;
  return payload.filter((item): item is StoryFragmentDatum => item !== null);
}
