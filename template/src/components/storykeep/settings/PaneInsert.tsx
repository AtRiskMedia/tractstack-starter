import { useEffect, useState, useCallback } from "react";
import { ulid } from "ulid";
import preparePreviewPane from "../../../utils/compositor/preparePreviewPane";
import { useStore } from "@nanostores/react";
import {
  toolModeStore,
  storyFragmentPaneIds,
  storyFragmentSlug,
  paneInit,
  paneTitle,
  paneSlug,
  uncleanDataStore,
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
  paneHeldBeliefs,
  paneWithheldBeliefs,
  paneImpression,
  paneCodeHook,
} from "../../../store/storykeep";
import { contentMap } from "../../../store/events";
import { cleanString } from "../../../utils/helpers";
import { createFieldWithHistory, useStoryKeepUtils } from "../../../utils/storykeep";
import { cloneDeep } from "../../../utils/helpers";
import PaneTitle from "../fields/PaneTitle";
import PaneSlug from "../fields/PaneSlug";
import type {
  BgPaneDatum,
  PaneDesignBgPane,
  MarkdownPaneDatum,
  PaneDesignMarkdown,
  BgColourDatum,
  StoreKey,
  BeliefDatum,
  PaneDesign,
} from "../../../types";

export const PaneInsert = (props: {
  storyFragmentId: string;
  paneId: string;
  /* eslint-disable @typescript-eslint/no-explicit-any */
  payload: any;
  reuse: boolean;
  toggleOff: () => void;
  doInsert: (newPaneIds: string[], newPaneId: string) => void | null;
}) => {
  const { reuse, doInsert, storyFragmentId, paneId, payload, toggleOff } = props;
  const [isClient, setIsClient] = useState(false);
  const $uncleanData = useStore(uncleanDataStore, { keys: [paneId] });
  const $storyFragmentPaneIds = useStore(storyFragmentPaneIds, {
    keys: [storyFragmentId],
  });
  const $storyFragmentSlug = useStore(storyFragmentSlug, {
    keys: [storyFragmentId],
  });
  const $paneFragmentIds = useStore(paneFragmentIds);
  const $paneTitle = useStore(paneTitle);
  const $paneSlug = useStore(paneSlug);
  const $paneFragmentBgColour = useStore(paneFragmentBgColour);
  const $contentMap = useStore(contentMap);
  const usedSlugs = [
    ...$contentMap.map((item) => item.slug),
    ...Object.keys($paneSlug).map((s) => $paneSlug[s].current),
    ...Object.keys($storyFragmentSlug).map((s) => $storyFragmentSlug[s].current),
  ];
  const { updateStoreField, handleEditingChange, handleUndo } = useStoryKeepUtils(
    paneId,
    usedSlugs
  );
  const newPaneIds = [...($storyFragmentPaneIds[storyFragmentId]?.current || [])];
  newPaneIds.splice(payload.index, 0, paneId);

  useEffect(() => {
    // Initialize (or re-use) the new pane's title and slug
    if (!$paneTitle[paneId]) {
      $paneTitle[paneId] = {
        current: reuse ? payload.selectedDesign.name : ``,
        original: "",
        history: [],
      };
      uncleanDataStore.setKey(paneId, {
        ...(uncleanDataStore.get()[paneId] || {}),
        [`paneTitle`]: !reuse,
      });
    }
    if (!$paneSlug[paneId]) {
      $paneSlug[paneId] = {
        current: reuse ? payload.selectedDesign.slug : ``,
        original: "",
        history: [],
      };
      uncleanDataStore.setKey(paneId, {
        ...(uncleanDataStore.get()[paneId] || {}),
        [`paneSlug`]: !reuse,
      });
    }
    setIsClient(true);
  }, [paneId, $paneTitle, $paneSlug]);

  const handleUpdateStoreField = (storeKey: StoreKey, newValue: string) => {
    return updateStoreField(storeKey, newValue);
  };

  const handleInterceptEdit = (storeKey: StoreKey, editing: boolean) => {
    if (storeKey === `paneTitle` && $paneSlug[paneId].current === ``) {
      const clean = cleanString($paneTitle[paneId].current).substring(0, 50);
      const newVal = !usedSlugs.includes(clean) ? clean : ``;
      uncleanDataStore.setKey(paneId, {
        ...(uncleanDataStore.get()[paneId] || {}),
        [`paneSlug`]: newVal.length === 0,
      });
      paneSlug.setKey(paneId, {
        current: newVal,
        original: newVal,
        history: [],
      });
    }
    return handleEditingChange(storeKey, editing);
  };

  const getAdjacentPaneColors = useCallback(() => {
    const currentPaneIds = $storyFragmentPaneIds[storyFragmentId]?.current || [];
    const insertIndex = payload.index; // This should be the index where we're inserting the new pane

    const prevPaneId = insertIndex > 0 ? currentPaneIds[insertIndex - 1] : null;
    const nextPaneId = insertIndex < currentPaneIds.length ? currentPaneIds[insertIndex] : null;

    const getColor = (id: string | null) => {
      if (!id) return null;
      const fragmentIds = $paneFragmentIds[id]?.current || [];
      for (const fragmentId of fragmentIds) {
        const bgColor = $paneFragmentBgColour[fragmentId]?.current?.bgColour;
        if (bgColor) return bgColor;
      }
      return null;
    };
    const prevColor = getColor(prevPaneId);
    const nextColor = getColor(nextPaneId);
    if (!prevColor && !nextColor)
      return {
        prevColor: `#000000`,
        nextColor: `#FFFFFF`,
      };
    else if (!prevColor && nextColor && nextColor !== `#000000`)
      return {
        prevColor: `#000000`,
        nextColor,
      };
    else if (!prevColor && nextColor && nextColor === `#000000`)
      return {
        prevColor: `#FFFFFF`,
        nextColor,
      };
    else if (!nextColor && prevColor && prevColor !== `#000000`)
      return {
        nextColor: `#000000`,
        prevColor,
      };
    else if (!nextColor && prevColor && prevColor === `#000000`)
      return {
        nextColor: `#FFFFFF`,
        prevColor,
      };
    return { prevColor, nextColor };
  }, [
    storyFragmentId,
    payload.index,
    $storyFragmentPaneIds,
    $paneFragmentIds,
    $paneFragmentBgColour,
  ]);

  const modifyPaneDesign = useCallback(
    (design: PaneDesign) => {
      const { prevColor, nextColor } = getAdjacentPaneColors();
      const isFromAbove = payload.selectedDesign.orientation === `above`;
      const modifiedDesign = cloneDeep(design);
      let isModified = false;
      modifiedDesign.fragments =
        modifiedDesign.fragments
          ?.map((f) => {
            if (f.type === "bgPane") {
              isModified = true;
              return {
                ...f,
                optionsPayload: {
                  ...f.optionsPayload,
                  artpack: {
                    ...f.optionsPayload?.artpack,
                    desktop: {
                      ...f.optionsPayload?.artpack?.desktop,
                      svgFill: isFromAbove ? prevColor : nextColor,
                    },
                    tablet: {
                      ...f.optionsPayload?.artpack?.tablet,
                      svgFill: isFromAbove ? prevColor : nextColor,
                    },
                    mobile: {
                      ...f.optionsPayload?.artpack?.mobile,
                      svgFill: isFromAbove ? prevColor : nextColor,
                    },
                  },
                },
              } as PaneDesignBgPane;
            }
            return f;
          })
          .filter(
            (f): f is PaneDesignBgPane | PaneDesignMarkdown | BgColourDatum =>
              f.type === "bgPane" || f.type === "markdown" || f.type === "bgColour"
          ) ?? [];

      if (isModified)
        modifiedDesign.panePayload = {
          ...modifiedDesign.panePayload,
          bgColour: isFromAbove ? nextColor || `#FFFFFF` : prevColor || `#000000`,
        };
      return modifiedDesign;
    },
    [getAdjacentPaneColors, payload.selectedDesign.orientation]
  );

  const handleSave = () => {
    if (!payload.selectedDesign) {
      return;
    }
    const paneData = preparePreviewPane(modifyPaneDesign(payload.selectedDesign));
    const newPaneIds = [...$storyFragmentPaneIds[storyFragmentId].current];
    newPaneIds.splice(payload.index, 0, paneId);
    const paneStores = [
      { store: paneIsContextPane, value: paneData.isContextPane },
      {
        store: paneHeightOffsetDesktop,
        value: paneData.heightOffsetDesktop,
      },
      {
        store: paneHeightOffsetMobile,
        value: paneData.heightOffsetMobile,
      },
      {
        store: paneFiles,
        value: paneData.files,
      },
      {
        store: paneHeightOffsetTablet,
        value: paneData.heightOffsetTablet,
      },
      {
        store: paneHeightRatioDesktop,
        value: paneData.heightRatioDesktop,
      },
      {
        store: paneHeightRatioMobile,
        value: paneData.heightRatioMobile,
      },
      {
        store: paneHeightRatioTablet,
        value: paneData.heightRatioTablet,
      },
      {
        store: paneIsHiddenPane,
        value: paneData.optionsPayload?.hiddenPane || false,
      },
      {
        store: paneHasOverflowHidden,
        value: paneData.optionsPayload?.overflowHidden || false,
      },
      {
        store: paneHasMaxHScreen,
        value: paneData.optionsPayload?.maxHScreen || false,
      },
      {
        store: paneCodeHook,
        value: paneData.optionsPayload.codeHook || false,
      },
      {
        store: paneImpression,
        value: null,
      },
      {
        store: paneHeldBeliefs,
        value: {} as BeliefDatum,
      },
      {
        store: paneWithheldBeliefs,
        value: {} as BeliefDatum,
      },
    ];
    paneStores.forEach(({ store, value }) => {
      if (typeof store.get()[paneId] === `undefined`)
        store.set({
          ...store.get(),
          /* eslint-disable @typescript-eslint/no-explicit-any */
          [paneId]: createFieldWithHistory(value as any),
          /* eslint-disable @typescript-eslint/no-explicit-any */
        } as any);
    });

    // Process PaneFragments
    const thisPaneFragmentIds = paneData?.optionsPayload?.paneFragmentsPayload
      ?.map((paneFragment: BgPaneDatum | BgColourDatum | MarkdownPaneDatum) => {
        const paneFragmentId = ulid();
        switch (paneFragment.type) {
          case `bgColour`:
            paneFragmentBgColour.set({
              ...paneFragmentBgColour.get(),
              [paneFragmentId]: createFieldWithHistory(paneFragment),
            });
            return paneFragmentId;
          case `bgPane`:
            paneFragmentBgPane.set({
              ...paneFragmentBgPane.get(),
              [paneFragmentId]: createFieldWithHistory(paneFragment),
            });
            return paneFragmentId;
          case `markdown`:
            if (paneData.markdown) {
              paneFragmentMarkdown.set({
                ...paneFragmentMarkdown.get(),
                [paneFragmentId]: createFieldWithHistory({
                  markdown: paneData.markdown,
                  payload: paneFragment,
                  type: `markdown`,
                }),
              });
              paneMarkdownFragmentId.set({
                ...paneMarkdownFragmentId.get(),
                [paneId]: createFieldWithHistory(paneFragmentId),
              });
            } else console.log(`ERROR constructing markdown`, paneData);
            return paneFragmentId;
          default:
            console.log(`ERROR: Unknown paneFragment ${JSON.stringify(paneFragment)}`);
            return null;
        }
      })
      .filter((item): item is string => item !== null);
    // link pane fragments to pane
    if (thisPaneFragmentIds)
      paneFragmentIds.set({
        ...paneFragmentIds.get(),
        [paneId]: createFieldWithHistory(thisPaneFragmentIds),
      });
    else console.log(`ERROR constructing markdown`, paneData);
    // init pane
    paneInit.set({
      ...paneInit.get(),
      [paneId]: { init: true },
    });
    // finally update storyfragment paneIds
    storyFragmentPaneIds.set({
      ...storyFragmentPaneIds.get(),
      [storyFragmentId]: createFieldWithHistory(newPaneIds),
    });
    // and close edit mode
    toolModeStore.set({ value: `text` });
    if (doInsert) doInsert(newPaneIds, paneId);
    toggleOff();
  };

  if (!isClient) return <div>Loading...</div>;

  return (
    <div>
      <h2 className="text-xl font-bold mb-2 text-myblack">
        <strong>Please provide a descriptive title and slug.</strong>
      </h2>
      <p className="text-md mb-2 text-mydarkgrey">
        Note: used for analytics and may (if enabled) be used as part of the "fast travel" map shown
        to users. Enter a short but meaningful title/slug.
      </p>
      <div className="flex flex-wrap gap-x-12">
        <div className="flex-grow max-w-lg w-full">
          <PaneTitle
            id={paneId}
            handleEditingChange={handleInterceptEdit}
            updateStoreField={handleUpdateStoreField}
            handleUndo={handleUndo}
          />
        </div>
        <div className="flex-grow max-w-xs w-full">
          <PaneSlug
            id={paneId}
            handleEditingChange={handleEditingChange}
            updateStoreField={handleUpdateStoreField}
            handleUndo={handleUndo}
          />
        </div>
        <div className="w-full mt-4 flex gap-x-6">
          <button
            type="button"
            onClick={toggleOff}
            className="my-1 rounded bg-mydarkgrey px-2 py-1 text-lg text-white shadow-sm hover:bg-myorange/20 hover:text-black hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-myblack"
          >
            Cancel
          </button>
          {!$uncleanData[paneId]?.paneSlug && !$uncleanData[paneId]?.paneTitle ? (
            <button
              type="button"
              onClick={handleSave}
              className="my-1 rounded bg-myorange px-2 py-1 text-lg text-white shadow-sm hover:bg-myorange/20 hover:text-black hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-myblack"
            >
              Insert this Pane
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
};
