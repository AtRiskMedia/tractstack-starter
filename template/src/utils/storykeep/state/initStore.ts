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
  paneDesignType,
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
} from "../../../store/storykeep";
import { createFieldWithHistory } from "../StoryKeep_utils";
import { markdownToHtmlAst } from "./markdownUtils";
import { cleanString, findUniqueSlug } from "../../common/helpers";
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
} from "../../../types";

export function initializeStores(
  newId: string,
  tractStackId: string,
  design: PageDesign,
  mode: "storyfragment" | "context",
  contentMapSlugs: string[],
  hello: boolean,
  hasTitleSlug?: boolean
): boolean {
  if (!newId) {
    console.error("No newId found in creationStateStore");
    return false;
  }
  try {
    if (mode === "storyfragment") {
      const newStoryFragmentSlug = hello
        ? `hello`
        : findUniqueSlug(
            cleanString(design.pageTitle ?? ``).substring(0, 14) ?? "create",
            contentMapSlugs
          );
      const paneIds = design.paneDesigns.map(() => ulid());
      initializeStoryFragmentStores(
        newId,
        tractStackId,
        design,
        paneIds,
        hello,
        hasTitleSlug || false
      );
      design.paneDesigns.forEach((paneDesign, index) => {
        initializePaneStores(
          paneIds[index],
          paneDesign,
          false,
          contentMapSlugs,
          newStoryFragmentSlug,
          index
        );
      });
    } else {
      initializePaneStores(
        newId,
        design.paneDesigns[0],
        true,
        contentMapSlugs,
        ``,
        -1,
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
  hello: boolean,
  hasTitleSlug?: boolean
) {
  const storyFragmentStores = {
    init: { init: true },
    title: design.pageTitle ?? "",
    slug: hello ? `hello` : ``,
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

  initializeStoreErrors(newId, "storyFragment", hasTitleSlug || false);
}

function initializePaneStores(
  paneId: string,
  paneDesign: PaneDesign,
  isContext: boolean,
  contentMapSlugs: string[],
  newStoryFragmentSlug: string,
  index: number,
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
            : `${newStoryFragmentSlug}-${paneDesign.designType}-${index}`,
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
  paneDesignType.setKey(paneId, createFieldWithHistory(paneDesign.designType));
  paneIsHiddenPane.setKey(
    paneId,
    createFieldWithHistory(paneDesign?.panePayload?.hiddenPane || false)
  );
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

function initializeStoreErrors(id: string, type: "storyFragment" | "pane", hasTitleSlug?: boolean) {
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
      [key]: [`storyFragmentSlug`, `storyFragmentTitle`].includes(key) && !hasTitleSlug,
    }),
    {} as Record<StoreKey, boolean>
  );
  const fullState = keys.reduce(
    (acc, key) => ({
      ...acc,
      [key]: true,
    }),
    {} as Record<StoreKey, boolean>
  );

  unsavedChangesStore.setKey(id, fullState);
  uncleanDataStore.setKey(id, emptyState);
  temporaryErrorsStore.setKey(id, emptyState);
}
