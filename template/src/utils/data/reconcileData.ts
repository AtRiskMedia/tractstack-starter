/* eslint-disable @typescript-eslint/no-explicit-any */
import { ulid } from "ulid";
import {
  unsavedChangesStore,
  storyFragmentTitle,
  storyFragmentSlug,
  storyFragmentTractStackId,
  storyFragmentMenuId,
  storyFragmentPaneIds,
  storyFragmentSocialImagePath,
  storyFragmentTailwindBgColour,
  paneTitle,
  paneSlug,
  paneHeightOffsetDesktop,
  paneHeightOffsetMobile,
  paneHeightOffsetTablet,
  paneHeightRatioDesktop,
  paneHeightRatioMobile,
  paneHeightRatioTablet,
  paneFiles,
  paneFragmentIds,
  paneFragmentMarkdown,
  paneFragmentBgPane,
  paneFragmentBgColour,
  paneCodeHook,
  paneImpression,
  paneHeldBeliefs,
  paneWithheldBeliefs,
} from "../../store/storykeep";
import { formatDateForUrl } from "../../utils/common/helpers";
import type {
  StoryFragmentDatum,
  ContextPaneDatum,
  PaneDatum,
  TursoQuery,
  ImpressionDatum,
  ReconciledData,
  StoryFragmentQueries,
  ContextPaneQueries,
  MarkdownDatum,
  BgColourDatum,
  BgPaneDatum,
  MarkdownPaneDatum,
} from "../../types";

const isImageDataUrl = (str: string) =>
  /^data:image\/(jpeg|jpg|png|gif|webp|svg);base64,/.test(str);

function createGenericUpdateQuery<T>(
  tableName: string,
  id: string,
  changedFields: Partial<T>,
  fieldMapping: Record<keyof T, string>
): TursoQuery {
  const fields = Object.keys(changedFields) as Array<keyof T>;
  const values = fields.map((field) => {
    const value = changedFields[field];
    if (value instanceof Date) {
      return value.toISOString();
    } else if (typeof value === "object" && value !== null) {
      return JSON.stringify(value);
    } else if (value === undefined) {
      return null;
    }
    return value;
  });

  const sqlFields = fields
    .map((field) => `${fieldMapping[field] || field.toString()} = ?`)
    .join(", ");

  return {
    sql: `UPDATE ${tableName} SET ${sqlFields} WHERE id = ?`,
    args: [...values, id] as (string | number | boolean | null)[],
  };
}

export function reconcileData(
  id: string,
  isContext: boolean,
  originalData: StoryFragmentDatum | ContextPaneDatum | null
): ReconciledData {
  if (isContext) {
    return reconcileContextPane(id, originalData as ContextPaneDatum);
  } else {
    return reconcileStoryFragment(id, originalData as StoryFragmentDatum);
  }
}

function compareStoryFragmentFields(
  current: StoryFragmentDatum,
  original: StoryFragmentDatum
): Partial<StoryFragmentDatum> {
  const changedFields: Partial<StoryFragmentDatum> = {};
  const validFields: Array<keyof StoryFragmentDatum> = [
    "id",
    "title",
    "slug",
    "tractStackId",
    "menuId",
    "socialImagePath",
    "tailwindBgColour",
    "created",
    "changed",
  ];

  function setChangedField<K extends keyof StoryFragmentDatum>(
    key: K,
    value: StoryFragmentDatum[K]
  ) {
    changedFields[key] = value;
  }

  validFields.forEach((key) => {
    if (current[key] !== original[key] && current[key] != null && current[key] !== ``) {
      setChangedField(key, current[key] as NonNullable<StoryFragmentDatum[typeof key]>);
    }
  });

  return changedFields;
}

function createStoryFragmentInsertQuery(data: StoryFragmentDatum): TursoQuery {
  const fields = [
    "id",
    "title",
    "slug",
    "tractstack_id",
    "menu_id",
    "social_image_path",
    "tailwind_background_colour",
    "created",
    "changed",
  ];
  const placeholders = fields.map(() => "?").join(", ");

  return {
    sql: `INSERT INTO storyfragment (${fields.join(", ")}) VALUES (${placeholders})`,
    args: [
      data.id,
      data.title,
      data.slug,
      data.tractStackId,
      data.menuId || null,
      data.socialImagePath || null,
      data.tailwindBgColour || null,
      data.created.toISOString(),
      data.changed?.toISOString() ?? null,
    ],
  };
}

function createStoryFragmentPaneQuery(
  storyFragmentId: string,
  paneId: string,
  weight: number
): TursoQuery {
  return {
    sql: `INSERT INTO storyfragment_pane (id, storyfragment_id, pane_id, weight) VALUES (?, ?, ?, ?) ON CONFLICT(storyfragment_id, pane_id) DO UPDATE SET weight = ?`,
    args: [ulid(), storyFragmentId, paneId, weight, weight],
  };
}

function reconcilePanes(
  currentPaneIds: string[],
  originalPanes: PaneDatum[] | undefined
): PaneDatum[] {
  return currentPaneIds.map((id) => {
    const originalPane = originalPanes?.find((p) => p.id === id);
    return reconcilePanePayload(id, false, originalPane);
  });
}

function reconcilePanePayload(
  id: string,
  isContext: boolean,
  originalPayload?: PaneDatum | null
): PaneDatum {
  const fragmentIds = paneFragmentIds.get()[id].current;
  const markdownFragment = fragmentIds.find((fragId) => paneFragmentMarkdown.get()[fragId]);
  const markdownId = markdownFragment
    ? paneFragmentMarkdown.get()[markdownFragment]?.current.markdown.id
    : null;
  const thisPayload = {
    paneFragmentsPayload: reconcilePaneFragments(fragmentIds),
    codeHook: paneCodeHook.get()[id].current || undefined,
    impressions: paneImpression.get()[id].current
      ? [paneImpression.get()[id].current].filter((i): i is ImpressionDatum => i !== null)
      : [],
    heldBeliefs: paneHeldBeliefs.get()[id].current,
    withheldBeliefs: paneWithheldBeliefs.get()[id].current,
  };
  if (`codeHook` in thisPayload && typeof thisPayload.codeHook !== `object`)
    delete thisPayload.codeHook;
  if (`impressions` in thisPayload && !thisPayload.impressions?.length)
    delete (thisPayload as any).impressions;
  if (`heldBeliefs` in thisPayload && Object.keys(thisPayload.heldBeliefs).length === 0)
    delete (thisPayload as any).heldBeliefs;
  if (`withheldBeliefs` in thisPayload && Object.keys(thisPayload.withheldBeliefs).length === 0)
    delete (thisPayload as any).withheldBeliefs;

  return {
    id,
    title: paneTitle.get()[id].current,
    slug: paneSlug.get()[id].current,
    isContextPane: isContext,
    created: originalPayload?.created ?? new Date(),
    changed: new Date(),
    heightOffsetDesktop: paneHeightOffsetDesktop.get()[id].current,
    heightOffsetMobile: paneHeightOffsetMobile.get()[id].current,
    heightOffsetTablet: paneHeightOffsetTablet.get()[id].current,
    heightRatioDesktop: paneHeightRatioDesktop.get()[id].current,
    heightRatioMobile: paneHeightRatioMobile.get()[id].current,
    heightRatioTablet: paneHeightRatioTablet.get()[id].current,
    files: paneFiles.get()[id].current,
    optionsPayload: thisPayload,
    markdown:
      markdownId && markdownFragment
        ? {
            id: markdownId,
            body: paneFragmentMarkdown.get()[markdownFragment]?.current.markdown.body ?? "",
            slug: `${paneSlug.get()[id].current}-markdown`,
            title: `Copy for ${paneTitle.get()[id].current}`,
            htmlAst: paneFragmentMarkdown.get()[markdownFragment]?.current.markdown.htmlAst ?? {},
          }
        : null,
  };
}

function reconcilePaneFragments(
  fragmentIds: string[]
): (BgColourDatum | BgPaneDatum | MarkdownPaneDatum)[] {
  return fragmentIds.map((id) => {
    if (paneFragmentBgColour.get()[id]) {
      return paneFragmentBgColour.get()[id].current;
    } else if (paneFragmentBgPane.get()[id]) {
      return paneFragmentBgPane.get()[id].current;
    } else if (paneFragmentMarkdown.get()[id]) {
      const thisPayload = paneFragmentMarkdown.get()[id].current.payload;
      if ((thisPayload as any)?.markdownBody) delete (thisPayload as any).markdownBody;
      if (thisPayload?.optionsPayload?.classNames?.desktop)
        delete (thisPayload as any).optionsPayload.classNames.desktop;
      if (thisPayload?.optionsPayload?.classNames?.tablet)
        delete (thisPayload as any).optionsPayload.classNames.tablet;
      if (thisPayload?.optionsPayload?.classNames?.mobile)
        delete (thisPayload as any).optionsPayload.classNames.mobile;
      if (thisPayload?.optionsPayload?.classNamesParent?.desktop)
        delete (thisPayload as any).optionsPayload.classNamesParent.desktop;
      if (thisPayload?.optionsPayload?.classNamesParent?.tablet)
        delete (thisPayload as any).optionsPayload.classNamesParent.tablet;
      if (thisPayload?.optionsPayload?.classNamesParent?.mobile)
        delete (thisPayload as any).optionsPayload.classNamesParent.mobile;
      if (
        thisPayload?.optionsPayload?.classNamesModal &&
        Object.keys(thisPayload?.optionsPayload?.classNamesModal).length === 0
      )
        delete (thisPayload as any).optionsPayload.classNamesModal;
      if (
        thisPayload?.optionsPayload?.buttons &&
        Object.keys(thisPayload?.optionsPayload?.buttons).length === 0
      )
        delete (thisPayload as any).optionsPayload.buttons;
      if (thisPayload?.optionsPayload?.classNamesModal?.desktop)
        delete (thisPayload as any).optionsPayload.classNamesModal.desktop;
      if (thisPayload?.optionsPayload?.classNamesModal?.tablet)
        delete (thisPayload as any).optionsPayload.classNamesModal.tablet;
      if (thisPayload?.optionsPayload?.classNamesModal?.mobile)
        delete (thisPayload as any).optionsPayload.classNamesModal.mobile;
      if (thisPayload?.optionsPayload?.buttons)
        Object.keys(thisPayload.optionsPayload.buttons).forEach((b: string) => {
          if (
            typeof (thisPayload?.optionsPayload?.buttons?.[b] as any)?.desktopClassName === `string`
          )
            delete (thisPayload as any).optionsPayload.buttons[b].desktopClassName;
          if (typeof (thisPayload.optionsPayload.buttons?.[b] as any)?.tabletClassName === `string`)
            delete (thisPayload as any).optionsPayload.buttons[b].tabletClassName;
          if (typeof (thisPayload.optionsPayload.buttons?.[b] as any)?.mobileClassName === `string`)
            delete (thisPayload as any).optionsPayload.buttons[b].mobileClassName;
        });
      return thisPayload;
    }
    throw new Error(`Unknown fragment type for id: ${id}`);
  });
}

function comparePaneFields(current: PaneDatum, original: PaneDatum): Partial<PaneDatum> {
  const changedFields: Partial<PaneDatum> = {};
  const validFields: Array<keyof PaneDatum> = [
    "id",
    "title",
    "slug",
    "isContextPane",
    "created",
    "changed",
    "heightOffsetDesktop",
    "heightOffsetMobile",
    "heightOffsetTablet",
    "heightRatioDesktop",
    "heightRatioMobile",
    "heightRatioTablet",
    "optionsPayload",
  ];

  validFields.forEach((key) => {
    if (key === "optionsPayload") {
      if (JSON.stringify(current[key]) !== JSON.stringify(original[key])) {
        if (current[key]?.paneFragmentsPayload) {
          current[key].paneFragmentsPayload.forEach((p) => {
            if ("optionsPayload" in p) {
              if (p.optionsPayload.classNames?.desktop) {
                delete p.optionsPayload.classNames.desktop;
              }
              if (p.optionsPayload.classNames?.tablet) {
                delete p.optionsPayload.classNames.tablet;
              }
              if (p.optionsPayload.classNames?.mobile) {
                delete p.optionsPayload.classNames.mobile;
              }
            }
          });
        }
        changedFields[key] = current[key];
      }
    } else if (key === "isContextPane") {
      if (current[key] && !original[key]) changedFields[key] = current[key];
    } else if (current[key] !== original[key]) {
      /* eslint-disable @typescript-eslint/no-explicit-any */
      changedFields[key] = current[key] as any;
    }
  });

  return changedFields;
}

function createMarkdownUpdateQuery(markdown: MarkdownDatum): TursoQuery {
  return {
    sql: `UPDATE markdown SET body = ? WHERE id = ?`,
    args: [markdown.body, markdown.id],
  };
}

function createMarkdownInsertQuery(markdown: MarkdownDatum): TursoQuery {
  return {
    sql: `INSERT INTO markdown (id, body) VALUES (?, ?)`,
    args: [markdown.id, markdown.body],
  };
}

export const resetUnsavedChanges = (id: string, isContext: boolean) => {
  const resetChanges = (storeId: string) => {
    const currentChanges = unsavedChangesStore.get()[storeId] || {};
    const resetChanges = Object.keys(currentChanges).reduce(
      (acc, key) => {
        acc[key] = false;
        return acc;
      },
      {} as Record<string, boolean>
    );
    unsavedChangesStore.setKey(storeId, resetChanges);
  };

  if (isContext) {
    // Reset ContextPane changes
    resetChanges(id);

    // Reset PaneFragment changes
    const fragmentIds = paneFragmentIds.get()[id]?.current || [];
    fragmentIds.forEach((fragmentId) => {
      resetChanges(fragmentId);
    });
  } else {
    // Reset StoryFragment changes
    resetChanges(id);

    // Reset Pane and PaneFragment changes
    const paneIds = storyFragmentPaneIds.get()[id]?.current || [];
    paneIds.forEach((paneId) => {
      resetChanges(paneId);
      const fragmentIds = paneFragmentIds.get()[paneId]?.current || [];
      fragmentIds.forEach((fragmentId) => {
        resetChanges(fragmentId);
      });
    });
  }
};

function createStoryFragmentUpdateQuery(
  id: string,
  changedFields: Partial<StoryFragmentDatum>
): TursoQuery {
  const fieldMapping: Record<keyof StoryFragmentDatum, string> = {
    id: "id",
    title: "title",
    slug: "slug",
    tractStackId: "tractstack_id",
    tractStackTitle: "tractstack_title",
    tractStackSlug: "tractstack_slug",
    menuId: "menu_id",
    socialImagePath: "social_image_path",
    tailwindBgColour: "tailwind_background_colour",
    created: "created",
    changed: "changed",
    panesPayload: "panes_payload",
    hasMenu: "has_menu",
    menuPayload: "menu_payload",
    impressions: "impressions",
    resourcesPayload: "resources_payload",
  };
  return createGenericUpdateQuery("storyfragment", id, changedFields, fieldMapping);
}

function createPaneUpdateQuery(id: string, changedFields: Partial<PaneDatum>): TursoQuery {
  const fieldMapping: Record<keyof PaneDatum | `markdown_id`, string> = {
    id: "id",
    title: "title",
    slug: "slug",
    isContextPane: "is_context_pane",
    created: "created",
    changed: "changed",
    heightOffsetDesktop: "height_offset_desktop",
    heightOffsetMobile: "height_offset_mobile",
    heightOffsetTablet: "height_offset_tablet",
    heightRatioDesktop: "height_ratio_desktop",
    heightRatioMobile: "height_ratio_mobile",
    heightRatioTablet: "height_ratio_tablet",
    optionsPayload: "options_payload",
    files: "files",
    markdown: "markdown",
    markdown_id: "markdown_id",
  };
  return createGenericUpdateQuery("pane", id, changedFields, fieldMapping);
}

function createPaneInsertQuery(data: PaneDatum): TursoQuery {
  return {
    sql: `INSERT INTO pane (id, title, slug, is_context_pane, height_offset_desktop, height_offset_mobile, height_offset_tablet, height_ratio_desktop, height_ratio_mobile, height_ratio_tablet, options_payload, markdown_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      data.id,
      data.title,
      data.slug,
      data.isContextPane,
      data.heightOffsetDesktop,
      data.heightOffsetMobile,
      data.heightOffsetTablet,
      data.heightRatioDesktop,
      data.heightRatioMobile,
      data.heightRatioTablet,
      JSON.stringify(data.optionsPayload),
      data?.markdown ? data.markdown.id : null,
    ],
  };
}

function reconcileStoryFragment(
  id: string,
  originalData: StoryFragmentDatum | null
): ReconciledData {
  const currentData: StoryFragmentDatum = {
    id,
    title: storyFragmentTitle.get()[id].current,
    slug: storyFragmentSlug.get()[id].current,
    tractStackId: storyFragmentTractStackId.get()[id].current,
    tractStackTitle: originalData?.tractStackTitle ?? "",
    tractStackSlug: originalData?.tractStackSlug ?? "",
    menuId: storyFragmentMenuId.get()[id].current,
    socialImagePath: storyFragmentSocialImagePath.get()[id].current,
    tailwindBgColour: storyFragmentTailwindBgColour.get()[id].current,
    created: originalData?.created ?? new Date(),
    changed: new Date(),
    panesPayload: reconcilePanes(
      storyFragmentPaneIds.get()[id].current,
      originalData?.panesPayload
    ),
    hasMenu: !!storyFragmentMenuId.get()[id].current,
    menuPayload: null,
    impressions: [],
    resourcesPayload: {
      resources: [],
      headerWidget: [],
      perCodeHookPayload: {},
      perCodeHookOptions: {},
      perCodeHookResourceCategory: {},
    },
  };
  const queries: StoryFragmentQueries = {
    storyfragment: { sql: "", args: [] },
    panes: [],
    markdowns: [],
    storyfragment_pane: [],
    file_pane: [],
    file_markdown: [],
    files: [],
  };

  if (originalData) {
    const changedFields = compareStoryFragmentFields(currentData, originalData);
    if (Object.keys(changedFields).length > 0) {
      queries.storyfragment = createStoryFragmentUpdateQuery(id, changedFields);
    }
  } else {
    // If originalData is null, treat all fields as changed
    queries.storyfragment = createStoryFragmentInsertQuery(currentData);
  }

  // Reconcile panes
  currentData.panesPayload.forEach((pane, index) => {
    const originalPane = originalData?.panesPayload.find((p) => p.id === pane.id);
    const paneQueries = reconcilePaneData(pane, originalPane);
    queries.panes.push(...paneQueries.pane);
    queries.markdowns.push(...paneQueries.markdown);
    queries.file_pane.push(...paneQueries.file_pane);
    queries.file_markdown.push(...paneQueries.file_markdown);
    queries.files.push(...paneQueries.files);

    queries.storyfragment_pane.push(createStoryFragmentPaneQuery(id, pane.id, index));
  });

  return { storyFragment: { data: currentData, queries } };
}

function reconcilePaneData(currentPane: PaneDatum, originalPane: PaneDatum | null | undefined) {
  const queries = {
    pane: [] as TursoQuery[],
    markdown: [] as TursoQuery[],
    file_pane: [] as TursoQuery[],
    file_markdown: [] as TursoQuery[],
    files: [] as TursoQuery[],
  };

  if (originalPane) {
    const changedFields = comparePaneFields(currentPane, originalPane);
    if (Object.keys(changedFields).length > 0) {
      queries.pane.push(createPaneUpdateQuery(currentPane.id, changedFields));
    }
  } else {
    // If originalPane is null, treat all fields as changed
    queries.pane.push(createPaneInsertQuery(currentPane));
  }

  // Markdown handling
  if (currentPane.markdown) {
    if (originalPane?.markdown) {
      if (currentPane.markdown.body !== originalPane.markdown.body) {
        queries.markdown.push(createMarkdownUpdateQuery(currentPane.markdown));
      }
    } else {
      queries.markdown.push(createMarkdownInsertQuery(currentPane.markdown));
    }
  } else if (originalPane?.markdown) {
    queries.markdown.push({
      sql: `DELETE FROM markdown WHERE id = ?`,
      args: [originalPane.markdown.id],
    });
  }

  // Reconcile files
  reconcileFiles(currentPane, originalPane ?? null, {
    files: queries.files,
    file_pane: queries.file_pane,
    file_markdown: queries.file_markdown,
  });

  return queries;
}

function reconcileContextPane(id: string, originalData: ContextPaneDatum | null): ReconciledData {
  const currentData: ContextPaneDatum = {
    id,
    title: paneTitle.get()[id].current,
    slug: paneSlug.get()[id].current,
    created: originalData?.created ?? new Date(),
    changed: new Date(),
    panePayload: reconcilePanePayload(id, true, originalData?.panePayload) ?? ({} as PaneDatum),
    impressions: [],
    resourcesPayload: [],
    codeHookOptions: {},
  };

  const queries: ContextPaneQueries = {
    markdowns: [],
    pane: { sql: "", args: [] },
    file_pane: [],
    file_markdown: [],
    files: [],
  };

  if (originalData && currentData.panePayload) {
    const changedFields = comparePaneFields(
      currentData.panePayload,
      originalData.panePayload ?? ({} as PaneDatum)
    );
    if (Object.keys(changedFields).length > 0) {
      queries.pane = createPaneUpdateQuery(id, changedFields);
    }
  } else if (currentData.panePayload) {
    queries.pane = createPaneInsertQuery(currentData.panePayload);
  }

  // Handle markdown
  if (currentData.panePayload && currentData.panePayload.markdown) {
    if (originalData?.panePayload?.markdown) {
      if (currentData.panePayload.markdown.body !== originalData.panePayload.markdown.body) {
        queries.markdowns.push(createMarkdownUpdateQuery(currentData.panePayload.markdown));
      }
    } else {
      queries.markdowns.push(createMarkdownInsertQuery(currentData.panePayload.markdown));
    }
  }

  reconcileFiles(currentData.panePayload!, originalData?.panePayload ?? null, {
    files: queries.files,
    file_pane: queries.file_pane,
    file_markdown: queries.file_markdown,
  });

  return { contextPane: { data: currentData, queries } };
}

function reconcileFiles(
  currentPane: PaneDatum,
  originalPane: PaneDatum | null,
  queries: {
    files: TursoQuery[];
    file_pane: TursoQuery[];
    file_markdown: TursoQuery[];
  }
) {
  const currentFiles = currentPane.files || [];
  const originalFiles = originalPane?.files || [];

  const currentFileIds = new Set(currentFiles.map((f) => f.id));
  const originalFileIds = new Set(originalFiles.map((f) => f.id));

  // Handle markdown files
  if (
    currentPane.markdown &&
    typeof currentPane.markdown === "object" &&
    "body" in currentPane.markdown
  ) {
    const markdownBody = currentPane.markdown.body;
    const fileRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    let match;
    const foundFileIds = new Set<string>();

    while ((match = fileRegex.exec(markdownBody)) !== null) {
      const [, altText, filename] = match;
      const file = currentFiles.find((f) => f.filename === filename);

      if (file) {
        foundFileIds.add(file.id);
        if (!originalFileIds.has(file.id) || isImageDataUrl(file.src)) {
          const currentDate = new Date();
          const url = !file.src.includes("base64")
            ? file.src // isn't base64 data
            : `/images/${formatDateForUrl(currentDate)}/${file.filename}`;

          queries.files.push({
            sql: `INSERT INTO file (id, filename, url, alt_description, src_set) 
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT (id) DO UPDATE SET 
                filename = excluded.filename, 
                url = excluded.url, 
                alt_description = excluded.alt_description,
                src_set = excluded.src_set`,
            args: [
              file.id,
              file.filename,
              url,
              altText || file.altDescription || null,
              file.src.includes("base64") ? true : !file.filename.endsWith(".svg"),
            ],
          });

          queries.file_markdown.push({
            sql: `INSERT INTO file_markdown (id, file_id, markdown_id) VALUES (?, ?, ?)
                ON CONFLICT (file_id, markdown_id) DO NOTHING`,
            args: [ulid(), file.id, currentPane.markdown.id],
          });
        } else {
          const originalFile = originalFiles.find((f) => f.id === file.id);
          if (originalFile && originalFile.altDescription !== (altText || file.altDescription)) {
            queries.files.push({
              sql: `UPDATE file SET alt_description = ? WHERE id = ?`,
              args: [altText || file.altDescription || null, file.id],
            });
          }
        }
      }
    }

    // Remove file_markdown entries for files that are no longer referenced in the markdown body
    currentFileIds.forEach((fileId) => {
      if (!foundFileIds.has(fileId)) {
        if (
          currentPane.markdown &&
          typeof currentPane.markdown === "object" &&
          "id" in currentPane.markdown
        ) {
          queries.file_markdown.push({
            sql: `DELETE FROM file_markdown WHERE file_id = ? AND markdown_id = ?`,
            args: [fileId, currentPane.markdown.id],
          });
        }
      }
    });
  }

  // Remove files that are no longer associated with markdown
  originalFileIds.forEach((fileId) => {
    if (!currentFileIds.has(fileId)) {
      queries.files.push({
        sql: `DELETE FROM file WHERE id = ? AND NOT EXISTS (
                SELECT 1 FROM file_markdown WHERE file_id = ?
              )`,
        args: [fileId, fileId],
      });
    }
  });
}
