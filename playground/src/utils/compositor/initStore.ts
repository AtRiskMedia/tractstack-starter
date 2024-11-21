import { ulid } from "ulid";
import {
  storyFragmentInit,
  storyFragmentTitle,
  storyFragmentSlug,
  storyFragmentTractStackId,
  storyFragmentMenuId,
  storyFragmentPaneIds,
  storyFragmentSocialImagePath,
  storyFragmentTailwindBgColour,
  paneInit,
  paneTitle,
  paneSlug,
  paneMarkdownFragmentId,
  paneIsContextPane,
  paneHeightOffsetDesktop,
  paneHeightOffsetMobile,
  paneHeightOffsetTablet,
  paneHeightRatioDesktop,
  paneHeightRatioMobile,
  paneHeightRatioTablet,
  paneFragmentIds,
  paneFragmentMarkdown,
  paneFragmentBgPane,
  paneFragmentBgColour,
  paneIsHiddenPane,
  paneHasOverflowHidden,
  paneHasMaxHScreen,
  paneFiles,
  paneCodeHook,
  paneImpression,
  paneHeldBeliefs,
  paneWithheldBeliefs,
  unsavedChangesStore,
  uncleanDataStore,
  temporaryErrorsStore,
  creationStateStore,
} from "../../store/storykeep";
import { createFieldWithHistory } from "../storykeep";
import { markdownToHtmlAst } from "./markdownUtils";
import { cleanString, findUniqueSlug } from "../helpers";
import type {
  StoreKey,
  PageDesign,
  PaneDesign,
  MarkdownEditDatum,
  BgPaneDatum,
  MarkdownPaneDatum,
  PaneDesignMarkdown,
  BeliefDatum,
  BgColourDatum,
} from "../../types";

export function initializeStores(
  newId: string,
  tractStackId: string,
  design: PageDesign,
  mode: "storyfragment" | "context",
  contentMapSlugs: string[]
): boolean {
  if (!newId) {
    console.error("No newId found in creationStateStore");
    return false;
  }

  try {
    if (mode === "storyfragment") {
      const paneIds = design.paneDesigns.map(() => ulid());
      initializeStoryFragmentStores(newId, tractStackId, design, paneIds, contentMapSlugs);
      design.paneDesigns.forEach((paneDesign, index) => {
        initializePaneStores(paneIds[index], paneDesign, false, contentMapSlugs);
      });
    } else {
      initializePaneStores(
        newId,
        design.paneDesigns[0],
        true,
        contentMapSlugs,
        design.pageTitle ?? ""
      );
    }
    creationStateStore.set({ id: newId, isInitialized: true });
    return true;
  } catch (error) {
    console.error("Error initializing stores:", error);
    return false;
  }
}

function initializeStoryFragmentStores(
  newId: string,
  tractStackId: string,
  design: PageDesign,
  paneIds: string[],
  contentMapSlugs: string[]
) {
  const storyFragmentStores = {
    init: { init: true },
    title: design.pageTitle ?? "",
    slug: findUniqueSlug(
      cleanString(design.pageTitle ?? ``).substring(0, 20) ?? "create",
      contentMapSlugs
    ),
    tractStackId: tractStackId,
    menuId: "",
    paneIds: paneIds,
    socialImagePath: "",
    tailwindBgColour: design.tailwindBgColour || "",
  };

  // Update all story fragment stores at once
  storyFragmentInit.setKey(newId, storyFragmentStores.init);
  storyFragmentTitle.setKey(newId, createFieldWithHistory(storyFragmentStores.title));
  storyFragmentSlug.setKey(newId, createFieldWithHistory(storyFragmentStores.slug));
  storyFragmentTractStackId.setKey(newId, createFieldWithHistory(storyFragmentStores.tractStackId));
  storyFragmentMenuId.setKey(newId, createFieldWithHistory(storyFragmentStores.menuId));
  storyFragmentPaneIds.setKey(newId, createFieldWithHistory(storyFragmentStores.paneIds));
  storyFragmentSocialImagePath.setKey(
    newId,
    createFieldWithHistory(storyFragmentStores.socialImagePath)
  );
  storyFragmentTailwindBgColour.setKey(
    newId,
    createFieldWithHistory(storyFragmentStores.tailwindBgColour)
  );

  initializeStoreErrors(newId, "storyFragment");
}

function initializePaneStores(
  paneId: string,
  paneDesign: PaneDesign,
  isContext: boolean,
  contentMapSlugs: string[],
  title?: string
) {
  paneInit.setKey(paneId, { init: true });
  paneTitle.setKey(paneId, createFieldWithHistory(isContext ? (title ?? ``) : paneDesign.name));
  paneSlug.setKey(
    paneId,
    createFieldWithHistory(
      findUniqueSlug(
        isContext && !title
          ? "create"
          : isContext
            ? cleanString(title ?? ``).substring(0, 20)
            : paneDesign.slug,
        contentMapSlugs
      )
    )
  );
  paneIsContextPane.setKey(paneId, createFieldWithHistory(isContext));
  paneHeightOffsetDesktop.setKey(
    paneId,
    createFieldWithHistory(paneDesign.panePayload.heightOffsetDesktop)
  );
  paneHeightOffsetMobile.setKey(
    paneId,
    createFieldWithHistory(paneDesign.panePayload.heightOffsetMobile)
  );
  paneHeightOffsetTablet.setKey(
    paneId,
    createFieldWithHistory(paneDesign.panePayload.heightOffsetTablet)
  );
  paneHeightRatioDesktop.setKey(
    paneId,
    createFieldWithHistory(paneDesign.panePayload.heightRatioDesktop)
  );
  paneHeightRatioMobile.setKey(
    paneId,
    createFieldWithHistory(paneDesign.panePayload.heightRatioMobile)
  );
  paneHeightRatioTablet.setKey(
    paneId,
    createFieldWithHistory(paneDesign.panePayload.heightRatioTablet)
  );
  paneIsHiddenPane.setKey(paneId, createFieldWithHistory(paneDesign?.panePayload?.isHiddenPane ?? false));
  paneHasOverflowHidden.setKey(paneId, createFieldWithHistory(false));
  paneHasMaxHScreen.setKey(paneId, createFieldWithHistory(false));

  paneCodeHook.setKey(paneId, createFieldWithHistory(null));
  paneImpression.setKey(paneId, createFieldWithHistory(null));
  paneHeldBeliefs.setKey(paneId, createFieldWithHistory({} as BeliefDatum));
  paneWithheldBeliefs.setKey(paneId, createFieldWithHistory({} as BeliefDatum));
  paneFiles.setKey(paneId, createFieldWithHistory([]));

  initializePaneFragments(paneId, paneDesign);
  initializeStoreErrors(paneId, "pane");
}

function initializePaneFragments(paneId: string, paneDesign: PaneDesign) {
  let bgColourFragmentId: string | false = false;
  if (paneDesign.panePayload.bgColour) {
    let bgColour: string | undefined;
    if (typeof paneDesign.panePayload.bgColour === "string") {
      if (/^var\(--[^)]+\)$/.test(paneDesign.panePayload.bgColour)) {
        bgColour = paneDesign.panePayload.bgColour.match(/var\(--([^)]+)\)/)?.[1];
      } else {
        bgColour = paneDesign.panePayload.bgColour;
      }
    }
    if (bgColour) {
      bgColourFragmentId = ulid();
      const bgColourFragment: BgColourDatum = {
        id: bgColourFragmentId,
        type: "bgColour",
        bgColour: bgColour,
        hiddenViewports: "",
      };
      paneFragmentBgColour.setKey(bgColourFragmentId, createFieldWithHistory(bgColourFragment));
    }
  }
  const fragmentIds = paneDesign.fragments.map((fragment) => {
    const fragmentId = ulid();

    switch (fragment.type) {
      case "bgColour":
        paneFragmentBgColour.setKey(fragmentId, createFieldWithHistory(fragment));
        break;
      case "bgPane":
        paneFragmentBgPane.setKey(fragmentId, createFieldWithHistory(fragment as BgPaneDatum));
        break;
      case "markdown": {
        const markdownBody = (fragment as PaneDesignMarkdown).markdownBody;
        const htmlAst = markdownToHtmlAst(markdownBody);
        const markdownData: MarkdownEditDatum = {
          markdown: {
            body: markdownBody,
            id: fragmentId,
            slug: "",
            title: "",
            htmlAst: htmlAst,
          },
          payload: fragment as MarkdownPaneDatum,
          type: "markdown",
        };
        paneFragmentMarkdown.setKey(fragmentId, createFieldWithHistory(markdownData));
        paneMarkdownFragmentId.setKey(paneId, createFieldWithHistory(fragmentId));
        break;
      }
    }

    return fragmentId;
  });

  paneFragmentIds.setKey(
    paneId,
    createFieldWithHistory([...(bgColourFragmentId ? [bgColourFragmentId] : []), ...fragmentIds])
  );
}

function initializeStoreErrors(id: string, type: "storyFragment" | "pane") {
  const keys: StoreKey[] =
    type === "storyFragment"
      ? [
          "storyFragmentTitle",
          "storyFragmentSlug",
          "storyFragmentTractStackId",
          "storyFragmentMenuId",
          "storyFragmentPaneIds",
          "storyFragmentSocialImagePath",
          "storyFragmentTailwindBgColour",
        ]
      : [
          "paneTitle",
          "paneSlug",
          "paneCodeHook",
          "paneIsContextPane",
          "paneIsHiddenPane",
          "paneHasOverflowHidden",
          "paneHasMaxHScreen",
          "paneHeightOffsetDesktop",
          "paneHeightOffsetTablet",
          "paneHeightOffsetMobile",
          "paneHeightRatioDesktop",
          "paneHeightRatioTablet",
          "paneHeightRatioMobile",
          "paneFiles",
          "paneImpression",
          "paneHeldBeliefs",
          "paneWithheldBeliefs",
        ];

  const emptyState = keys.reduce(
    (acc, key) => ({
      ...acc,
      [key]: [`storyFragmentSlug`, `storyFragmentTitle`].includes(key),
    }),
    {} as Record<StoreKey, boolean>
  );

  unsavedChangesStore.setKey(id, emptyState);
  uncleanDataStore.setKey(id, emptyState);
  temporaryErrorsStore.setKey(id, emptyState);
}
